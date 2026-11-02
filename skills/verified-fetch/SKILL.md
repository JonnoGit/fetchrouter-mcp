---
name: verified-fetch
description: Fetch a web page and confirm it really loaded, using the Fetch Router fetch_page tool. Use when a page may be blocked (Cloudflare, DataDome, CAPTCHA), may be an empty JavaScript app, or when a wrong page would cause a wrong answer; also when the built-in fetch returned an error page, a challenge or almost no text.
---

# Verified fetch with Fetch Router

Use the `fetch_page` tool from the `fetchrouter` MCP server.

1. If you know text that must be on the right page (a product name, a heading, a price label), pass it as `expect_text`. The fetch then fails, unbilled, if that text is missing.
2. Leave `max_cost` at the default (2) so a headless browser is tried when plain HTTP fails. Use `max_cost: 1` when a static page is enough and you're fetching many URLs.
3. For a hard site, call `domain_reliability` first (free) to see which route has worked recently.
4. If the result says `Not fetched`, read the reason:
   - `blocked:<vendor>`: the site blocks automated access. Don't retry with the same settings. Tell the user, or try another source.
   - `http_404` / `http_410`: the URL is wrong. Look for the right URL.
   - `empty_shell` / `too_short`: the page didn't render real content. Try `mode: "rendered"` once if you haven't.
   - `expect_text_missing`: the page loaded but isn't the one you wanted.
5. Failed fetches aren't billed, but don't loop on the same URL.

Don't use it for pages behind a login or paywall (not supported), or to crawl whole sites.
