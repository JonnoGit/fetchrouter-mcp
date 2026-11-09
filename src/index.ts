#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const BASE = (process.env.FETCHROUTER_BASE_URL ?? "https://fetchrouter.dev").replace(/\/$/, "");
const KEY = process.env.FETCHROUTER_API_KEY ?? "";
/** Keep tool output inside a sensible context budget. */
const MAX_CHARS = Number(process.env.FETCHROUTER_MAX_CHARS ?? 60_000);

const VERSION = "0.1.2";

/** e.g. "fetchrouter-mcp/0.1.2 (claude-code/2.1.0)": tells us which agents use the package. */
function userAgent(): string {
  const client = server.server.getClientVersion();
  return `fetchrouter-mcp/${VERSION}${client?.name ? ` (${client.name}/${client.version ?? "?"})` : ""}`;
}

async function call(path: string, init?: { method?: string; body?: string }) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "user-agent": userAgent(), "x-fr-via": "mcp", ...(KEY ? { authorization: `Bearer ${KEY}` } : {}) },
  });
  const json = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as Record<string, any>;
  return { status: res.status, json };
}

const server = new McpServer({ name: "fetchrouter", version: VERSION });
// Without a key, fetch_page uses the free daily allowance.
registerTools(server, call, { base: BASE, hasKey: Boolean(KEY), keyHint: "set FETCHROUTER_API_KEY in this MCP server's env", maxChars: MAX_CHARS });
await server.connect(new StdioServerTransport());
