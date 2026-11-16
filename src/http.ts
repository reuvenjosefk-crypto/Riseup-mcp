import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerBudgetTool } from './tools/budget.js';
import { registerTransactionsTool } from './tools/transactions.js';
import { registerMortgagesTool } from './tools/mortgages.js';
import { registerBalancesTools } from './tools/balances.js';
import { registerBenchmarksTool } from './tools/benchmarks.js';
import { registerFutureBalancesTool } from './tools/future-balances.js';
import { registerSavingsInvestmentsTools } from './tools/savings-investments.js';

const riseupToken = process.env.RISEUP_PAT;
const accessToken = process.env.MCP_ACCESS_TOKEN;
if (!riseupToken || !accessToken || accessToken.length < 32) {
  throw new Error('RISEUP_PAT and a random MCP_ACCESS_TOKEN of at least 32 characters are required');
}
const secret = Buffer.from(accessToken, 'utf8');

function authorized(req: IncomingMessage): boolean {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer ')) return false;
  const candidate = Buffer.from(value.slice(7), 'utf8');
  return candidate.length === secret.length && timingSafeEqual(candidate, secret);
}

function makeMcpServer(): McpServer {
  const server = new McpServer({ name: 'riseup-mcp', version: '0.9.0' });
  registerBudgetTool(server);
  registerTransactionsTool(server);
  registerMortgagesTool(server);
  registerBalancesTools(server);
  registerBenchmarksTool(server);
  registerFutureBalancesTool(server);
  registerSavingsInvestmentsTools(server);
  return server;
}

function respond(res: ServerResponse, code: number, body: string, headers: Record<string,string> = {}): void {
  res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(body);
}

const httpServer = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (path === '/health' && req.method === 'GET') {
    respond(res, 200, 'ok');
    return;
  }
  if (path !== '/mcp') {
    respond(res, 404, 'Not found');
    return;
  }
  if (!authorized(req)) {
    respond(res, 401, 'Unauthorized', { 'www-authenticate': 'Bearer realm="riseup-mcp"' });
    return;
  }
  if (req.method !== 'POST') {
    respond(res, 405, 'Method not allowed', { allow: 'POST' });
    return;
  }
  const server = makeMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    res.once('close', () => {
      void transport.close();
      void server.close();
    });
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('MCP request failed', error instanceof Error ? error.message : 'unknown error');
    if (!res.headersSent) respond(res, 500, 'Internal server error');
  }
});
const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, '0.0.0.0', () => console.log('RiseUp MCP HTTP listening on port', port));
