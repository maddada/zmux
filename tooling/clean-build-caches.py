#!/usr/bin/env python3
"""Inspect generated caches; --apply cleans eligible caches, --install schedules it."""

import argparse
import contextlib
import datetime
import fcntl
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
LABEL = "com.madda.ghostex.build-cache-cleanup"
STATE = Path.home() / "Library/Application Support/Ghostex/build-cache-cleanup"
GIB = 1024**3
BUDGET = 10 * GIB
STALE_SECONDS = 14 * 86400
QUIET_SECONDS = 6 * 3600

# CDXC:Build 2026-09-07 DECISION:
# User requested periodic build-cache cleanup and reduced Rust debug info, and explicitly chose to keep Time Machine snapshots.
# SEE-ALSO: .cargo/config.toml. The schedule and thresholds below are local maintenance policy.
RUST_TARGETS = (
    "apps/desktop/target", "server/target", "apps/editor/desktop/target",
    "apps/history-cli/target", "packages/find/target", "packages/paths/target",
    ".dependencies/codex-swap/target",
)
NATIVE_CACHES = (
    "apps/editor/macos/.build", ".dependencies/ghostty/.zig-cache",
    ".dependencies/zmx/.zig-cache", "build/arm64", "build/x86_64",
    "build/DerivedData", "build/ghostex-native-compile-check",
    "build/automation-payload-verify", "apps/desktop/build/macos",
    "apps/mobile/app/ios/build", "apps/mobile/app/android/app/build",
    "apps/mobile/app/android/app/.cxx",
    "apps/mobile/app/modules/ghostex-native/android/build",
    *(f"apps/mobile/app/node_modules/{package}/android/{folder}"
      for package in ("react-native-reanimated", "react-native-worklets", "expo-modules-core")
      for folder in ("build", ".cxx")),
)
BUILDERS = {
    "cargo", "rustc", "zig", "clang", "clang++", "cc", "c++",
    "xcodebuild", "swift", "swiftc", "swift-frontend", "ninja", "cmake", "make",
    "ld", "ld.lld",
}


def run(*args, cwd=ROOT):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True)


def active_builds():
    busy, java = [], []
    for line in run("/bin/ps", "-axo", "pid=,comm=").stdout.splitlines():
        parts = line.strip().split(None, 1)
        if len(parts) != 2:
            continue
        if Path(parts[1]).name in BUILDERS:
            busy.append(line.strip())
        elif Path(parts[1]).name == "java":
            java.append(parts[0])
    if java:
        result = subprocess.run(["/usr/sbin/lsof", "-nP", "-a", "-p", ",".join(java), "-Fn"],
                                capture_output=True, text=True)
        if result.returncode not in (0, 1):
            raise RuntimeError("Cannot inspect Gradle processes")
        if any(line.startswith("n" + str(ROOT) + "/") for line in result.stdout.splitlines()):
            busy.append("Java/Gradle process has this checkout open")
    return busy


def measure(path):
    size, newest, seen = 0, 0, set()
    stack = [path]
    while stack:
        item = stack.pop()
        stat = item.lstat()
        if (stat.st_dev, stat.st_ino) in seen:
            continue
        seen.add((stat.st_dev, stat.st_ino))
        size += stat.st_blocks * 512
        newest = max(newest, stat.st_mtime)
        if item.is_dir() and not item.is_symlink():
            with os.scandir(item) as children:
                stack.extend(Path(child.path) for child in children)
    return size, newest


def verify_generated(path):
    if path.resolve() != path or not path.is_relative_to(ROOT) or not path.is_dir():
        raise RuntimeError(f"Refusing redirected or missing cache: {path}")
    repo = Path(run("/usr/bin/git", "rev-parse", "--show-toplevel", cwd=path.parent).stdout.strip())
    relative = str(path.relative_to(repo))
    run("/usr/bin/git", "check-ignore", "-q", "--", relative, cwd=repo)
    protected = run("/usr/bin/git", "ls-files", "--cached", "--others", "--exclude-standard",
                    "-z", "--", relative, cwd=repo).stdout
    if protected:
        raise RuntimeError(f"Tracked or nonignored content inside {path}; leaving it intact")


def in_use(path):
    result = subprocess.run(["/usr/sbin/lsof", "-nP", "-Fn"], capture_output=True, text=True)
    if result.returncode not in (0, 1):
        raise RuntimeError("Cannot check open files")
    prefix = str(path) + "/"
    return any(line.startswith("n") and (line[1:] == str(path) or line[1:].startswith(prefix))
               for line in result.stdout.splitlines())


def rust_profiles(target):
    if not target.exists():
        return []
    verify_generated(target)
    children = [child for child in target.iterdir() if child.is_dir() and not child.is_symlink()]
    profiles = []
    for child in children:
        if (child / ".cargo-lock").is_file():
            profiles.append(child)
        else:
            profiles.extend(profile for profile in child.iterdir()
                            if profile.is_dir() and not profile.is_symlink()
                            and (profile / ".cargo-lock").is_file())
    return profiles


def clear_rust_profile(path, entry):
    """CDXC:Build 2026-09-07 WHY:
    Whole-directory `cargo clean` deliberately skips locking. Keep Cargo's lock inode and profile directory in place while clearing their contents under the same exclusive flock used by Cargo.
    """
    lock = path / ".cargo-lock"
    if lock.is_symlink():
        raise RuntimeError(f"Redirected Cargo lock: {lock}")
    with lock.open("r+") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if measure(path) != (entry["bytes"], entry["newest"]):
            return False
        for child in path.iterdir():
            if child.name in (".cargo-lock", ".cargo-build-lock", ".cargo-artifact-lock"):
                continue
            if child.is_dir() and not child.is_symlink():
                shutil.rmtree(child)
            else:
                child.unlink()
    return True


def clean(apply, report):
    if busy := active_builds():
        report.update(status="skipped-active-build", processes=busy)
        return
    entries = []
    profiles = [profile for relative in RUST_TARGETS for profile in rust_profiles(ROOT / relative)]
    for path in (*profiles, *(ROOT / relative for relative in NATIVE_CACHES)):
        if not path.exists():
            continue
        verify_generated(path)
        size, newest = measure(path)
        entries.append(dict(path=str(path.relative_to(ROOT)), bytes=size, newest=newest, action="keep"))
    total = sum(entry["bytes"] for entry in entries)
    report.update(status="complete", measured_cache_bytes=total, entries=entries)
    # Oldest trees go first, preserving recent build outputs while the budget permits.
    for entry in sorted(entries, key=lambda item: item["newest"]):
        age = time.time() - entry["newest"]
        if age < QUIET_SECONDS or (age < STALE_SECONDS and total <= BUDGET):
            continue
        path = ROOT / entry["path"]
        entry["reason"] = "unchanged-14-days" if age >= STALE_SECONDS else "cache-budget"
        if not apply:
            entry["action"] = "would-remove"
            total -= entry["bytes"]
            continue
        if busy := active_builds():
            report.update(status="stopped-active-build", processes=busy)
            break
        verify_generated(path)
        if in_use(path) or measure(path) != (entry["bytes"], entry["newest"]):
            entry["action"] = "skipped-in-use-or-changed"
            continue
        if path in profiles:
            try:
                if not clear_rust_profile(path, entry):
                    entry["action"] = "skipped-changed"
                    continue
            except BlockingIOError:
                entry["action"] = "skipped-cargo-lock"
                continue
            remaining, _ = measure(path)
            entry["action"] = "cleared-profile"
        else:
            shutil.rmtree(path)
            remaining = 0
            entry["action"] = "removed"
        total -= entry["bytes"] - remaining
    report["remaining_cache_bytes_estimate"] = total


def install():
    agent = Path.home() / "Library/LaunchAgents" / f"{LABEL}.plist"
    job = {
        "Label": LABEL,
        "ProgramArguments": [shutil.which("python3"), str(Path(__file__).resolve()), "--apply"],
        "WorkingDirectory": str(ROOT),
        "EnvironmentVariables": {"PATH": f"{Path.home()}/.cargo/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"},
        "StartCalendarInterval": {"Hour": 4, "Minute": 30},
        "RunAtLoad": True,
        "ProcessType": "Background",
        "LowPriorityIO": True,
        "Nice": 10,
    }
    agent.parent.mkdir(parents=True, exist_ok=True)
    agent.write_bytes(plistlib.dumps(job))
    run("/usr/bin/plutil", "-lint", str(agent))
    service = f"gui/{os.getuid()}/{LABEL}"
    present = subprocess.run(["/bin/launchctl", "print", service], capture_output=True)
    if present.returncode == 0:
        run("/bin/launchctl", "bootout", service)
    run("/bin/launchctl", "bootstrap", f"gui/{os.getuid()}", str(agent))
    print(f"Installed {agent}; runs daily at 04:30 local time and at login.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    options = parser.add_mutually_exclusive_group()
    options.add_argument("--apply", action="store_true")
    options.add_argument("--install", action="store_true")
    args = parser.parse_args()
    if sys.platform != "darwin":
        parser.error("This local maintenance job is for macOS")
    if args.install:
        install()
        return
    STATE.mkdir(parents=True, exist_ok=True)
    report = dict(time=datetime.datetime.now().astimezone().isoformat(), root=str(ROOT),
                  mode="apply" if args.apply else "dry-run", budget_bytes=BUDGET)
    try:
        with contextlib.ExitStack() as stack:
            (ROOT / "build").mkdir(exist_ok=True)
            # CDXC:Build 2026-09-07 WHY:
            # Share the launcher's BSD lockf locks so a scheduled cleanup and a canonical local start cannot mutate build outputs simultaneously.
            for path in (STATE / "cleanup.lock", ROOT / "build/ghostex-gpui-local-start.lock",
                         ROOT / "build/ghostex-local-start.lock"):
                handle = stack.enter_context(path.open("a+"))
                fcntl.lockf(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            clean(args.apply, report)
    except BlockingIOError:
        report["status"] = "skipped-build-lock"
    except Exception as error:
        report.update(status="error", error=str(error))
    output = json.dumps(report, indent=2) + "\n"
    if args.apply:
        # One replacement report bounds maintenance logging regardless of schedule age.
        destination = STATE / "last-run.json"
        temporary = STATE / f"last-run-{os.getpid()}.json"
        temporary.write_text(output)
        temporary.replace(destination)
    print(output, end="")
    return 1 if report.get("status") == "error" else 0


if __name__ == "__main__":
    sys.exit(main())
