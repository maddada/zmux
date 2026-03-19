# ZMX Usage Notes

This file explains how VS-AGENT-MUX uses `zmx` on macOS/Linux, and how to
inspect or attach to those sessions from a normal terminal outside VS Code.

## What VS-AGENT-MUX Is Doing

On macOS/Linux, VS-AGENT-MUX uses `zmx` as the persistent terminal session
backend.

That means:

- the real terminal session lives in `zmx`
- VS Code terminals attach back to those sessions
- you can inspect or attach to the same sessions from a regular shell if you
  use the same runtime directory and `zmx` binary

## Find The Values On Your Machine

These values are machine- and profile-specific:

- the `zmx` runtime directory
- the workspace id for the current repo
- the installed `zmx` binary path under VS Code global storage

You should derive them from your own running environment instead of copying
hard-coded paths from this repo.

## Typical Binary Path Pattern

The managed `zmx` binary usually lives under your VS Code global storage:

```bash
"$HOME/Library/Application Support/Code/User/globalStorage/<publisher>.<extension>/zmx/<version>/<platform>/zmx"
```

On Linux, the base path may use the equivalent VS Code storage location for
your install/profile.

## List Sessions

Once you know the runtime directory and binary path, list all sessions with:

```bash
XDG_RUNTIME_DIR="<runtime-dir>" "<path-to-zmx>" list --short
```

If you want to filter to sessions for just the current repo, use the workspace
prefix that VS-AGENT-MUX generated for that workspace:

```bash
XDG_RUNTIME_DIR="<runtime-dir>" "<path-to-zmx>" list --short | rg '^vam-<workspace-id>-'
```

## Why Plain `zmx l` Can Show Nothing

If you run:

```bash
zmx l
```

from a normal terminal and it shows no sessions, that usually does not mean
there are no VS-AGENT-MUX sessions.

It usually means your current `zmx` process is looking at the wrong runtime
directory.

VS-AGENT-MUX may not use zmx's default socket location. If the extension forces
a custom runtime dir, you need to pass the same `XDG_RUNTIME_DIR` when running
`zmx` manually.

Example:

```bash
XDG_RUNTIME_DIR="<runtime-dir>" zmx l --short
```

## Attach To A Session

If you want to attach to a specific session from a normal terminal, use:

```bash
XDG_RUNTIME_DIR="<runtime-dir>" "<path-to-zmx>" attach "vam-<workspace-id>-s1" /bin/zsh
```

Example session names look like:

- `vam-<workspace-id>-s1`
- `vam-<workspace-id>-s2`

## Detach Without Killing The Session

While attached to a zmx session:

- `Ctrl+\\` detaches only your current client
- `exit` exits the shell inside the session, which usually ends the session

You can also run:

```bash
zmx detach
```

from inside the session to detach all attached clients.
