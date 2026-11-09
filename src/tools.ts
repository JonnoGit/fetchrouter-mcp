import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Calls the Fetch Router HTTP API. The stdio server uses fetch; the hosted /mcp endpoint calls the app in-process. */
export type ApiCall = (path: string, init?: { method?: string; body?: string }) => Promise<{ status: number; json: Record<string, any> }>;

export interface ToolOptions {
  base: string;
  hasKey: boolean;
  /** How to tell a user without a key where to put it. */
  keyHint: string;
  maxChars: number;
}

const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], isError });

/** Shared by the npm package (stdio) and https://fetchrouter.dev/mcp (Streamable HTTP). */
export function registerTools(server: McpServer, call: ApiCall, opts: ToolOptions) {
  const getKey = `Get a free key (500 credits) at ${opts.base}/#signup, then ${opts.keyHint}.`;

  server.registerTool(
    "fetch_page",
    {
      title: "Fetch a web page (verified)",
      description:
        "Fetch a public URL and get its content only if it really loaded. Use it when a page comes back as a block page, CAPTCHA, login wall or empty JavaScript shell, or when you need to know the content is real. It checks the page, retries through other routes (including a headless browser) automatically, and bills only on success. Works without a key up to a free daily allowance; a free key (500 credits) lifts it. Returns markdown by default. If ok is false, the reason says why (e.g. blocked:cloudflare, http_404, expect_text_missing): don't retry the same URL with the same settings.",
      inputSchema: {
        url: z.string().describe("Public http(s) URL"),
        mode: z.enum(["markdown", "html", "rendered"]).optional().describe("markdown (default, main content), html (raw page), rendered (always use a browser)"),
        expect_text: z.string().optional().describe("Text that must appear on the page for it to count as loaded, e.g. a product name"),
        expect_selector: z.string().optional().describe("CSS selector that must match"),
        max_cost: z.number().int().min(1).max(25).optional().describe("Most credits to pay: 1 static only, 2 (default) allows a browser, 10-25 allows premium unblocking (needs a key)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url, mode, expect_text, expect_selector, max_cost }) => {
      const expect = expect_text || expect_selector ? { text: expect_text, selector: expect_selector } : undefined;
      const { status, json } = await call("/v1/fetch", { method: "POST", body: JSON.stringify({ url, mode: mode ?? "markdown", expect, maxCost: max_cost }) });
      if (status === 401) return text(`${opts.hasKey ? "This Fetch Router API key isn't valid." : "Fetch Router needs an API key here."} ${getKey}`, true);
      if (status === 429 && String(json.error ?? "").startsWith("keyless")) return text(`${json.message ?? "The free allowance without a key is used up."} With a key: ${opts.keyHint}.`, true);
      if (status !== 200) return text(`Error ${status}: ${json.message ?? json.error ?? "request failed"}`, true);
      const tried = (json.attempts ?? []).map((a: any) => `${a.provider}${a.rendered ? "(browser)" : ""}: ${a.verdict?.passed ? "pass" : a.verdict?.reason ?? a.error}`).join(" → ");
      if (!json.ok) return text(`Not fetched: ${json.verdict?.reason}. Tried ${tried}. Not billed.`, true);
      let content: string = json.content ?? "";
      const truncated = content.length > opts.maxChars;
      if (truncated) content = content.slice(0, opts.maxChars);
      const cost = json.keyless
        ? `free without a key: ${json.keyless.remaining} of ${json.keyless.limit} left today (free key, 500 credits: ${opts.base}/#signup)`
        : `${json.costCredits} credits · balance ${json.balanceCredits}`;
      const meta = `<!-- fetched ${json.finalUrl ?? url} via ${json.provider} · ${cost} · tried ${tried}${truncated ? ` · truncated to ${opts.maxChars} chars` : ""} -->`;
      return text(`${meta}\n\n${content}`);
    },
  );

  server.registerTool(
    "domain_reliability",
    {
      title: "Which fetch routes work for a site",
      description: "Pass rates per route (plain HTTP, browser, providers) for a domain over the last 30 days, from real verified fetches. Use it to choose mode/max_cost before fetching a hard site. Free, no key needed.",
      inputSchema: { domain: z.string().describe("Domain or URL, e.g. zillow.com") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ domain }) => {
      const { status, json } = await call(`/v1/reliability?domain=${encodeURIComponent(domain)}`);
      if (status !== 200) return text(`Error ${status}: ${json.error ?? "request failed"}`, true);
      if (!json.providers?.length) return text(`No data yet for ${json.domain}.`);
      const lines = json.providers.map((p: any) => `- ${p.provider}${p.rendered ? " (browser)" : ""}: ${Math.round(p.pass_rate * 100)}% of ${p.attempts}, p50 ${p.p50_latency_ms} ms`);
      return text(`${json.domain}, last 30 days:\n${lines.join("\n")}`);
    },
  );
}
