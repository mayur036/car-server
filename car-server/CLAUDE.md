# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Socket.IO relay server for controlling a remote car. A browser-based remote control (`public/index.html`) sends directional commands to a physical car client over WebSockets. The server also relays telemetry data (battery, RSSI, status) back from the car to the remote.

## Commands

- `npm run dev` — start dev server with nodemon + ts-node (ESM loader)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled JS from `dist/server.js`

## Architecture

Single-file server (`server.ts`) using Express 5 + Socket.IO 4. Clients connect and register as either `"car"` or `"remote"` via a `register` event, which places them into Socket.IO rooms. Commands from remotes are broadcast to the `car` room; telemetry from the car is broadcast to the `remote` room.

**Socket.IO event flow:**
- `register(role)` — joins the `"car"` or `"remote"` room
- `command({ action, speed })` — remote → server → car room
- `telemetry({ battery, rssi, status })` — car → server → remote room

Static files are served from `public/`. The frontend uses press-and-hold controls (mousedown/touchstart sends a direction, mouseup/touchend sends stop).

## Notes

- `tsconfig.json` has `rootDir: "./src"` but the entry point is `server.ts` at the project root — the dev script bypasses tsc and uses ts-node directly, so this only matters for `npm run build`
- Server binds to `0.0.0.0:3000` so it's accessible from other devices on the LAN
- CORS is wide open (`origin: '*'`) — intentional for local network use
