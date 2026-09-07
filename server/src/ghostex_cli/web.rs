mod bootstrap;
mod static_files;

use std::{path::PathBuf, process::Command, sync::Arc};

use axum::{
    body::Body,
    extract::State,
    http::{header, Method, Request, StatusCode},
    response::{IntoResponse, Response},
    Router,
};

use crate::{
    config::{read_gxserver_config, GxserverConfig},
    ghostex_cli::rpc::{CliError, CliResult},
    paths::get_gxserver_paths,
};

const USAGE: &str = "Usage: ghostex web [--port <port>] [--dist-dir <directory>] [--no-open]\n\nStart Ghostex Web on http://127.0.0.1:4173 and open it in the default browser.\nRuns in the foreground; Ctrl+C stops only the web server.\nRequires a separate web build (bun run web:build) and a running gxserver.";

/// CDXC:ServerApi 2026-09-06 DECISION:
/// User: `ghostex web` must run its own separate server, not be served automatically on gxserver's ports.
/// Static files and the browser bootstrap belong to this foreground CLI process; the browser uses gxserver directly for authenticated HTTP and WebSocket APIs.
/// SEE-ALSO: apps/desktop/src/app/helpers/os_cli/process_and_constants.rs, apps/web/vite.config.ts.
pub fn web_command(args: &[String]) -> CliResult<()> {
    let mut port = 4173_u16;
    let mut dist_dir = None;
    let mut open_browser = true;
    let mut args = args.iter();
    while let Some(argument) = args.next() {
        match argument.as_str() {
            "help" | "-h" | "--help" => {
                println!("{USAGE}");
                return Ok(());
            }
            "--no-open" => open_browser = false,
            "--port" => {
                port = args
                    .next()
                    .and_then(|value| value.parse().ok())
                    .filter(|port| *port > 0)
                    .ok_or_else(|| {
                        CliError::Other("--port requires a number from 1 to 65535.".into())
                    })?;
            }
            "--dist-dir" => {
                dist_dir = Some(PathBuf::from(args.next().ok_or_else(|| {
                    CliError::Other("--dist-dir requires a directory.".into())
                })?));
            }
            _ => {
                return Err(CliError::Other(format!(
                    "Unknown web argument: {argument}\n\n{USAGE}"
                )))
            }
        }
    }
    let mut config = read_gxserver_config(&get_gxserver_paths(None))?;
    if let Some(dist_dir) = dist_dir {
        config.web.dist_dir = Some(dist_dir);
    }
    let dist_dir = static_files::resolve_web_dist_dir(&config);
    if !dist_dir.join("index.html").is_file() {
        return Err(CliError::Other(format!("Ghostex Web is not built at {}. Run `bun run web:build` from the checkout or pass --dist-dir <directory>.", dist_dir.display())));
    }
    config.web.dist_dir = Some(dist_dir.canonicalize()?);
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;
    runtime.block_on(serve(config, port, open_browser))
}

struct WebState {
    config: GxserverConfig,
    port: u16,
    api_url: String,
}

async fn serve(config: GxserverConfig, port: u16, open_browser: bool) -> CliResult<()> {
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port))
        .await
        .map_err(|error| {
            CliError::Other(format!("Cannot start Ghostex Web on port {port}: {error}"))
        })?;
    let url = format!("http://127.0.0.1:{port}/");
    let api_url = format!(
        "http://{}:{}",
        config.listeners.local.host, config.listeners.local.port
    );
    let router = Router::new()
        .fallback(handle_request)
        .with_state(Arc::new(WebState {
            config,
            port,
            api_url,
        }));
    println!("Ghostex Web: {url}\nPress Ctrl+C to stop the web server.");
    if open_browser {
        browser_open_command()?
            .arg(&url)
            .spawn()
            .map_err(|error| CliError::Other(format!("Failed to open {url}: {error}")))?;
    }
    axum::serve(listener, router)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}

async fn handle_request(State(state): State<Arc<WebState>>, request: Request<Body>) -> Response {
    let headers = request.headers();
    let authority = headers
        .get(header::HOST)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    let allowed_host = authority == format!("127.0.0.1:{}", state.port)
        || authority == format!("localhost:{}", state.port);
    let expected_origin = format!("http://{authority}");
    let allowed_origin = headers
        .get_all(header::ORIGIN)
        .iter()
        .all(|origin| origin.to_str().ok() == Some(expected_origin.as_str()));
    if !allowed_host || !allowed_origin {
        return StatusCode::FORBIDDEN.into_response();
    }
    let path = request.uri().path();
    if path == "/api/webBootstrap" {
        return if request.method() == Method::POST {
            bootstrap::bootstrap(headers, &state.api_url)
        } else {
            StatusCode::METHOD_NOT_ALLOWED.into_response()
        };
    }
    if path.starts_with("/api/") || path.starts_with("/ext/") {
        return StatusCode::NOT_FOUND.into_response();
    }
    if request.method() != Method::GET && request.method() != Method::HEAD {
        return StatusCode::METHOD_NOT_ALLOWED.into_response();
    }
    let mut response = static_files::serve_web_static(&state.config, path).await;
    if request.method() == Method::HEAD {
        *response.body_mut() = Body::empty();
    }
    response
}

#[cfg(target_os = "macos")]
fn browser_open_command() -> CliResult<Command> {
    Ok(Command::new("open"))
}

#[cfg(target_os = "linux")]
fn browser_open_command() -> CliResult<Command> {
    Ok(Command::new("xdg-open"))
}

#[cfg(target_os = "windows")]
fn browser_open_command() -> CliResult<Command> {
    let mut command = Command::new("rundll32.exe");
    command.arg("url.dll,FileProtocolHandler");
    Ok(command)
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
fn browser_open_command() -> CliResult<Command> {
    Err(CliError::Other(
        "Browser opening is unsupported on this platform. Use --no-open.".into(),
    ))
}
