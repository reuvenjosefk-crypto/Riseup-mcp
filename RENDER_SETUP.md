# Render deployment for ChatGPT

This branch adds a stateless Streamable HTTP endpoint at `/mcp` while retaining the original stdio entrypoint.

## Render configuration
- Runtime: Node (Node.js 20+)
- Branch: `feature/render-http-mcp` (until merged)
- Build: `npm install && npm run build`
- Start: `npm run start:http`
- Health check path: `/health`
- Environment variables: `RISEUP_PAT` (your RiseUp personal token), `MCP_ACCESS_TOKEN` (independent, random secret of 32+ characters)
- Never put either token in GitHub, logs, screenshots, or ChatGPT messages.

## Authentication
The MCP endpoint requires `Authorization: Bearer <MCP_ACCESS_TOKEN>` on every request. Unauthorized requests receive HTTP 401. This is **static bearer authentication, not OAuth**. Only use a ChatGPT custom MCP connection if its authentication options explicitly support sending a custom bearer token. If it offers only OAuth or unauthenticated access, **do not connect or remove authentication**: an OAuth-compatible gateway is required instead.

## Notes
- `GET /health` is unauthenticated and returns only `ok`.
- `POST /mcp` handles JSON-RPC MCP requests; GET and DELETE are intentionally disabled in stateless mode.
- Render free services may sleep, affecting startup time.
- The original RiseUp project is intended for local execution. Deploying a cloud version changes the privacy model: your financial data passes through Render and ChatGPT when you invoke tools. Review both services' data-handling policies.
- Do not deploy this branch until the TypeScript build and an authenticated MCP initialization/tool-list smoke test have passed.
