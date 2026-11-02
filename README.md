# fetchrouter-mcp

MCP server for [Fetch Router](https://fetchrouter.dev): web fetch for AI agents that only bills when the page actually loaded.

Agents often get a `200 OK` that is really a Cloudflare challenge, a DataDome block or an empty React shell, and then summarise the error page. Fetch Router checks every page for HTTP errors, block and challenge pages (Cloudflare, DataDome, PerimeterX, Akamai, Imperva, Kasada…), login walls, empty JavaScript shells and text you expect to see. If a check fails it retries through another route, such as a headless browser. Failed fetches cost nothing.

## When to use it

- Your agent reads pages it didn't choose: search results, links from users, sites you don't control.
- You need to know whether a page *really* loaded, not just that the request returned 200.
- Some targets are single-page apps that need a browser, and you don't want to run Playwright yourself.
- You want to pay per page that works, not per request.

## When not to use it

- **Crawling a whole site, mapping links or search.** Use a crawler (Firecrawl, Crawl4AI, Apify). Fetch Router does one URL at a time.
- **Pages behind a login or paywall.** Not supported, by policy.
- **One or two sites you know well.** A plain `fetch` or your own Playwright script is cheaper.
- **Heavily protected retail and travel sites today.** Premium unblocking routes aren't live for customer traffic yet. See [the benchmark](https://fetchrouter.dev/benchmark) for what passes.

## Setup

Get a free key (500 credits, no card) at https://fetchrouter.dev/#signup.

**Remote (no install).** Streamable HTTP at `https://fetchrouter.dev/mcp`, with your key in a header:

```sh
claude mcp add --transport http fetchrouter https://fetchrouter.dev/mcp --header "Authorization: Bearer fr_..."
```

Other clients: URL `https://fetchrouter.dev/mcp`, header `Authorization: Bearer fr_...` (or `X-API-Key: fr_...`).

**Claude Code plugin** (MCP server plus a `verified-fetch` skill; asks for your key once and stores it securely):

```sh
claude plugin marketplace add JonnoGit/fetchrouter-mcp
claude plugin install fetchrouter@fetchrouter
```

**Local (stdio via npx).**

```json
{
  "mcpServers": {
    "fetchrouter": {
      "command": "npx",
      "args": ["-y", "fetchrouter-mcp"],
      "env": { "FETCHROUTER_API_KEY": "fr_..." }
    }
  }
}
```

Claude Code: `claude mcp add fetchrouter -e FETCHROUTER_API_KEY=fr_... -- npx -y fetchrouter-mcp`

## Tools

- **`fetch_page`** `(url, mode?, expect_text?, expect_selector?, max_cost?)`: returns markdown (default) or HTML, plus which route delivered it and what was tried. `max_cost` caps credits: 1 = plain HTTP only, 2 (default) allows a browser. If the page can't be loaded, the error says why (`blocked:cloudflare`, `http_404`, `expect_text_missing`…) and nothing is billed.
- **`domain_reliability`** `(domain)`: pass rate per route for a site over the last 30 days, from real verified fetches. Free, no key needed.

## How well does it work?

A fixed list of 166 public pages in six site types is fetched every night with plain HTTP and with a headless browser, from a datacenter IP. Results, method and CSV: https://fetchrouter.dev/benchmark

## Pricing

1 credit ($0.001) per static page, 2 per browser-rendered page, failures free. Details: https://fetchrouter.dev/#pricing

## Environment (stdio)

| Variable | Default |
|---|---|
| `FETCHROUTER_API_KEY` | required |
| `FETCHROUTER_BASE_URL` | `https://fetchrouter.dev` |
| `FETCHROUTER_MAX_CHARS` | `60000` (longer pages are truncated) |

## Development

```sh
npm install
npm run build
FETCHROUTER_API_KEY=fr_... node dist/index.js
```

The tool definitions live in `src/tools.ts` and are shared with the hosted endpoint at https://fetchrouter.dev/mcp.

MIT licensed. Operated by One + Done LLC. Contact: hello@fetchrouter.dev
