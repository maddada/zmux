//! Machine-wide development server discovery for the native Dev servers dropdown.
use crate::app::helpers::*;
use crate::*;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

struct DevListener {
    pid: u32,
    port: u16,
    command: String,
}

/// CDXC:Browser 2026-09-06 DECISION:
/// User: detect running services using Blink's method (https://github.com/megootronic/Blink), across the local computer rather than only the active project.
/// Enumerate TCP listeners, identify development runtimes, and inspect process arguments and working directories for framework/project metadata.
/// Keep each distinct port because this menu opens individual localhost locations, including multiple services hosted by one process.
pub(crate) fn discover_local_dev_servers(
    canceled: Arc<AtomicBool>,
    progress: futures::channel::mpsc::UnboundedSender<RemoteBrowserSite>,
) -> Result<Vec<RemoteBrowserSite>, String> {
    let listeners = local_dev_listeners()?;
    let pids = listeners
        .iter()
        .map(|listener| listener.pid)
        .collect::<Vec<_>>();
    #[cfg(not(target_os = "linux"))]
    let cwds = gpui_read_native_resource_process_cwds(&pids);
    #[cfg(target_os = "linux")]
    let cwds = pids
        .iter()
        .filter_map(|pid| {
            fs::read_link(format!("/proc/{pid}/cwd"))
                .ok()
                .map(|cwd| (*pid, cwd))
        })
        .collect::<HashMap<_, _>>();
    let mut sites = Vec::new();
    for batch in listeners.chunks(6) {
        if canceled.load(Ordering::Relaxed) {
            break;
        }
        let mut results = std::thread::scope(|scope| {
            let jobs = batch
                .iter()
                .map(|listener| {
                    let canceled = &canceled;
                    let progress = &progress;
                    let cwd = cwds.get(&listener.pid);
                    scope.spawn(move || {
                        let args = local_process_arguments(listener.pid);
                        let framework = dev_server_framework(&args).unwrap_or(&listener.command);
                        let project = cwd.and_then(|path| dev_server_project_name(path));
                        let process = match project {
                            Some(project) => format!("{project} · {framework}"),
                            None => framework.to_string(),
                        };
                        let port = GpuiRemoteListeningPort {
                            address: "localhost".into(),
                            port: listener.port,
                            process: Some(process),
                            remotely_reachable: false,
                        };
                        let site = probe_browser_site(&port, None, canceled);
                        let _ = progress.unbounded_send(site.clone());
                        site
                    })
                })
                .collect::<Vec<_>>();
            jobs.into_iter()
                .filter_map(|job| job.join().ok())
                .collect::<Vec<_>>()
        });
        sites.append(&mut results);
    }
    sites.sort_by_key(|site| site.port);
    Ok(sites)
}

#[cfg(not(target_os = "windows"))]
fn local_dev_listeners() -> Result<Vec<DevListener>, String> {
    #[cfg(target_os = "macos")]
    let executable = "/usr/sbin/lsof";
    #[cfg(not(target_os = "macos"))]
    let executable = "lsof";
    let output = Command::new(executable)
        .args(["-iTCP", "-sTCP:LISTEN", "-n", "-P", "-F", "pcn"])
        .stdin(Stdio::null())
        .output()
        .map_err(|error| format!("Could not list local services with lsof: {error}"))?;
    // lsof returns 1 when there are no matching sockets. A diagnostic instead of records is a failed scan.
    if !output.status.success() && output.stdout.is_empty() && !output.stderr.is_empty() {
        return Err("Could not inspect local listening ports with lsof.".into());
    }
    let mut pid = None;
    let mut command = String::new();
    let mut ports = std::collections::BTreeMap::new();
    for line in String::from_utf8_lossy(&output.stdout).lines() {
        if let Some(value) = line.strip_prefix('p') {
            pid = value.parse::<u32>().ok();
            command.clear();
        } else if let Some(value) = line.strip_prefix('c') {
            command = value.to_string();
        } else if let Some(value) = line.strip_prefix('n') {
            let Some(pid) = pid else { continue };
            if !is_dev_server_command(&command) {
                continue;
            }
            let Some((_, port)) = value.rsplit_once(':') else {
                continue;
            };
            let Ok(port) = port.parse::<u16>() else {
                continue;
            };
            ports.entry(port).or_insert_with(|| DevListener {
                pid,
                port,
                command: command.clone(),
            });
        }
    }
    Ok(ports.into_values().collect())
}

#[cfg(target_os = "windows")]
fn local_dev_listeners() -> Result<Vec<DevListener>, String> {
    let output = windows_terminal_backend::resource_server_snapshot()
        .ok_or_else(|| "Could not inspect local WSL listening ports.".to_string())?;
    let processes = gpui_read_native_resource_processes();
    let mut ports = std::collections::BTreeMap::new();
    for listener in gpui_parse_native_resource_servers(&output) {
        let Some(process) = processes.iter().find(|process| process.pid == listener.pid) else {
            continue;
        };
        let command = process
            .command
            .split_whitespace()
            .next()
            .unwrap_or_default()
            .rsplit('/')
            .next()
            .unwrap_or_default();
        if is_dev_server_command(command) {
            ports.entry(listener.port).or_insert_with(|| DevListener {
                pid: listener.pid,
                port: listener.port,
                command: command.into(),
            });
        }
    }
    Ok(ports.into_values().collect())
}

fn is_dev_server_command(command: &str) -> bool {
    matches!(
        command.to_ascii_lowercase().as_str(),
        "node"
            | "python"
            | "python3"
            | "ruby"
            | "cargo"
            | "go"
            | "php"
            | "java"
            | "deno"
            | "bun"
            | "tsx"
            | "npx"
            | "next-serv"
            | "next-server"
            | "uvicorn"
            | "gunicorn"
            | "puma"
    )
}

fn local_process_arguments(pid: u32) -> String {
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "args="])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .ok()
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string());
    #[cfg(target_os = "windows")]
    let output = gpui_read_native_resource_processes()
        .into_iter()
        .find(|process| process.pid == pid)
        .map(|process| process.command);
    output.unwrap_or_default()
}

fn dev_server_framework(arguments: &str) -> Option<&'static str> {
    let args = arguments.to_ascii_lowercase();
    [
        ("Next.js", &["next"][..]),
        ("Vite", &["vite", "vitest"][..]),
        ("Nuxt", &["nuxt"][..]),
        ("Remix", &["remix"][..]),
        ("Astro", &["astro"][..]),
        ("Webpack", &["webpack"][..]),
        ("Django", &["manage.py", "django"][..]),
        ("Flask", &["flask"][..]),
        ("Rails", &["rails", "puma", "unicorn"][..]),
        ("Cargo", &["cargo"][..]),
        ("Go", &["go run", "go build"][..]),
        ("PHP", &["php", "artisan"][..]),
    ]
    .into_iter()
    .find(|(_, patterns)| patterns.iter().any(|pattern| args.contains(pattern)))
    .map(|(name, _)| name)
}

fn dev_server_project_name(directory: &Path) -> Option<String> {
    if let Ok(file) = fs::File::open(directory.join("package.json")) {
        use std::io::Read as _;
        if let Ok(value) = serde_json::from_reader::<_, serde_json::Value>(file.take(64 * 1024)) {
            if let Some(name) = value
                .get("name")
                .and_then(serde_json::Value::as_str)
                .filter(|name| !name.trim().is_empty())
            {
                return Some(name.to_string());
            }
        }
    }
    if let Ok(file) = fs::File::open(directory.join("Cargo.toml")) {
        use std::io::Read as _;
        let mut manifest = String::new();
        let _ = file.take(64 * 1024).read_to_string(&mut manifest);
        let mut package = false;
        for line in manifest.lines().map(str::trim) {
            if line.starts_with('[') {
                package = line == "[package]";
            }
            if package {
                if let Some(("name", value)) = line
                    .split_once('=')
                    .map(|(key, value)| (key.trim(), value.trim()))
                {
                    if let Some(name) = value
                        .strip_prefix('"')
                        .and_then(|value| value.split('"').next())
                        .filter(|name| !name.is_empty())
                    {
                        return Some(name.into());
                    }
                }
            }
        }
    }
    directory
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
}
