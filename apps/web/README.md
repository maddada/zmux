# Ghostex Web

Ghostex Web is the static browser version of Ghostex's sidebar and Agents workspace. It connects directly to gxserver, opens zmx-backed terminals over the authenticated terminal WebSocket, and can merge sessions from multiple machines in one sidebar.

## Build and launch

From the repository root:

```bash
bun run start:web
```

This builds `apps/web/dist`, compiles the checkout's CLI, and starts a separate foreground server at `http://127.0.0.1:4173/`, opening it in the browser. Ctrl+C stops that web server. Resources lists its listener under Dev Servers. gxserver continues to own the API on port 58744 and does not serve the web app or its bootstrap endpoint.

Pass options through, for example `bun run start:web --port 4180 --no-open`, to select another web port or skip opening the browser. The underlying `ghostex web` command remains available but is hidden from the CLI's main help listing. It also accepts `--dist-dir <directory>` for a separately built web distribution and reads the existing `web.distDir` configuration. Desktop releases do not bundle the web distribution.

The web server's same-origin bootstrap supplies the local connection token and gxserver API address. The browser then connects directly to gxserver for authenticated HTTP and terminal/event WebSockets. gxserver must already be running; this command does not start or restart it.

## Development

Keep `bun run start:web --no-open` running on its default port for browser bootstrap, then run the Vite development server from the repository root in another terminal:

```bash
bun run web:dev
```

Vite proxies `/api/webBootstrap` to the standalone web server on port 4173 and other HTTP and WebSocket `/api` traffic to gxserver on port 58744. Use `bun run web:typecheck` and `bun run web:build` before handing off changes.

## Additional machines

Use the Machines button beside the Ghostex title, then enter a label, gxserver origin, and auth token. Added machines are persisted in browser local storage under `ghostexWeb.machines.v1`, including their tokens. Each machine gets its own presentation subscription and terminal/RPC routing.

Loopback origins on `localhost`, `127.0.0.1`, and `[::1]` are accepted on any port, which covers local development and SSH port forwards. A page hosted on a Tailscale hostname or IP needs that exact origin added to `cors.allowedOrigins` in `${XDG_CONFIG_HOME:-~/.config}/ghostex/gxserver/config.json` (or the equivalent `GHOSTEX_HOME` path); the bearer token remains required. Prefer serving the page locally and adding a machine through a loopback port forward when possible.
