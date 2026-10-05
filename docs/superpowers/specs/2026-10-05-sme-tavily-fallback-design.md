# SME Tavily Extract Fallback

**Status:** Approved design, 2026-10-05

## Goal

Add Tavily Advanced Extract as a last-resort fetcher for restaurant pages on `restauracie.sme.sk`, using the existing restaurant parsers to return only menu items for the requested date.

## Evidence and project context

- Direct Axios returned Cloudflare HTTP 403 for Brasserie La Marine's daily-menu and base URLs.
- The existing local browser fallback retrieved the daily-menu HTML on its first pass and the existing parser returned two dishes for 2026-10-05.
- Tavily Basic Extract failed for both URLs. Advanced Extract returned the requested daily-menu URL with 12,946 characters of markdown, including the current date, soup, and main dish. Advanced Extract on the base URL returned 376 characters with no menu data.
- Passing Tavily's markdown directly to `BrasserieLaMarine` returned zero items. The parser expects the SME page structure; a markdown input path is needed.
- The project already uses Axios and its shared `Sme` parser supports HTML and SME export PDF text.

## Design

Keep the current fetch path first: direct HTTP, the SME browser fallback, then the SME export PDF. When those routes end in an explicit fetch or challenge failure, try Tavily only for `restauracie.sme.sk` and `www.restauracie.sme.sk`. An ordinary successful page with no menu items remains an empty-menu result and does not trigger an API call.

Read the optional key from `TAVILY_API_KEY` through `Config`. If it is missing, skip Tavily and preserve the existing failure result. Use the project's Axios dependency to POST to `https://api.tavily.com/extract` with the requested URL, `extract_depth: "advanced"`, and `include_images: false`. Use a bounded 30-second timeout. Never log or persist the key.

Add a small SME-specific Tavily request helper. It must require an HTTP success, a `results` entry matching the requested URL, and non-empty `raw_content`. Do not add a Tavily SDK, generic provider abstraction, or markdown library.

Add a Tavily markdown input prefix to the shared `Sme` parser. Parse the supported SME markdown subset: daily-menu headings, their dates, bold soup/main labels, and the text or price lines associated with those labels. Select only the requested date and ignore other days and unrelated page text. Reuse the existing menu normalization and restaurant-specific parser behavior. An extraction that lacks a parseable current-date menu remains a failure, never a successful stale menu.

If Tavily is unavailable, rejects the URL, returns malformed content, times out, or produces no menu for the requested date, log a concise sanitized diagnostic and retain the existing failure result. Search API is out of scope because Advanced Extract returned useful current content in the experiment.

## Components

- `MenuFetcher`: invoke the helper only at the approved last-resort point after an SME fetch/challenge failure.
- `Config`: expose optional `TAVILY_API_KEY` without adding a tracked secret.
- SME Tavily helper: issue and validate the Advanced Extract request using Axios.
- `parsers/sme.ts`: parse the prefixed markdown for the requested date into the existing `IMenuItem` model.
- Unit tests: cover key/domain/result gates, request parameters, markdown date selection and item extraction, and fallback routing/failure behavior.

## Acceptance criteria

1. No Tavily request is made for non-SME URLs or when `TAVILY_API_KEY` is absent.
2. SME Advanced Extract uses the configured key only in the Authorization header and does not expose it in logs or persisted diagnostics.
3. A matching response with menu markdown for the requested date reaches the existing parser and returns the current day's items.
4. Other dates, unrelated text, missing results, failed results, and empty or malformed markdown do not produce a successful menu.
5. Existing direct, browser, and SME PDF behavior remains first in the fetch order.
6. No production fallback is added for Tavily Search, and no new dependency is introduced.
