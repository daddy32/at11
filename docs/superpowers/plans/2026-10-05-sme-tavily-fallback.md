# SME Tavily Extract Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use Tavily Advanced Extract as a last-resort fetcher for current SME restaurant menus and pass its markdown through the existing SME menu parser.

**Architecture:** Keep the direct HTTP, browser, and SME export PDF paths first. Add a small Axios-based SME Tavily helper, gate it by SME hostname and optional `TAVILY_API_KEY`, and use a prefixed markdown input path in the shared `Sme` parser. Accept the fallback only when Tavily returned the requested URL and the parser produced menu items for the requested date.

**Tech Stack:** TypeScript, existing Axios, Cheerio, Chai, Sinon, Mocha, ts-node.

## Global Constraints

- Read the API key only from `TAVILY_API_KEY`; never hard-code, log, or persist its value.
- Call `POST https://api.tavily.com/extract` with `extract_depth: "advanced"` and `include_images: false`.
- Use the existing Axios dependency; add no SDK, Markdown package, generic provider abstraction, or Tavily Search call.
- Restrict fallback calls to `restauracie.sme.sk` and `www.restauracie.sme.sk`.
- Preserve current behavior for ordinary successful pages that parse to zero items.
- Do not overwrite or include pre-existing working-tree changes in commits.

---

### Task 1: Parse SME Tavily markdown for the requested date

**Files:**
- Modify: `parsers/sme.ts`
- Test: `test/unit/sme.test.ts`

**Interfaces:**
- Consumes: the existing `Sme.parseBase(html, date)` path and `IMenuItem` normalization.
- Produces: exported `SME_TAVILY_MARKDOWN_PREFIX` and a markdown path selected when input starts with that prefix.

- [x] **Step 1: Write the failing current-date markdown test**

Add a test to `test/unit/sme.test.ts` using this input shape:

```typescript
const markdown = `## Obedové menu Pondelok (05.10.2026)
**Polievka** Bruschetta s pažítkovým cottage cheese, pečená zelenina na mede a rukola
**Hlavné jedlo** Kuracie prsia plnené mozzarellou a prosciuttom, karfiolové pyré a smažená cibuľka
## Obedové menu Utorok (06.10.2026)
**Polievka** Krém z pečeného petržlenu, opečené orechy a bylinky`;

const menu = parser.parse(`SME_TAVILY_MARKDOWN:\n${markdown}`, new Date("2026-10-05"));

expect(menu).to.deep.equal([
    { text: "Bruschetta s pažítkovým cottage cheese, pečená zelenina na mede a rukola", price: NaN, isSoup: true },
    { text: "Kuracie prsia plnené mozzarellou a prosciuttom, karfiolové pyré a smažená cibuľka", price: NaN, isSoup: false }
]);
```

- [x] **Step 2: Run the parser test and verify the expected failure**

Run: `.\node_modules\.bin\mocha.cmd --require ts-node/register --timeout 10000 test/unit/sme.test.ts --exit`

Expected: the new assertion fails because unrecognized Tavily markdown currently produces an empty menu.

- [x] **Step 3: Implement the smallest markdown parser path**

In `parsers/sme.ts`, check for `SME_TAVILY_MARKDOWN_PREFIX` before Cheerio parsing. Parse SME daily-menu headings, select headings matching `getDateRegex(date)`, recognize bold `Polievka` and `Hlavné jedlo` labels, and collect the associated dish text. Return `IMenuItem[]` through the same normalization used by the existing parser. Ignore other dates and unrelated markdown.

- [x] **Step 4: Verify the parser tests pass**

Run: `.\node_modules\.bin\mocha.cmd --require ts-node/register --timeout 10000 test/unit/sme.test.ts --exit`

Expected: existing HTML/PDF parser cases and the new date-scoped markdown case pass.

- [x] **Step 5: Commit the parser task**

Run: `git add -- parsers/sme.ts test/unit/sme.test.ts; git diff --cached --check; git commit -m "feat: parse SME Tavily markdown"`

Expected: only `parsers/sme.ts` and `test/unit/sme.test.ts` are included in the commit.

### Task 2: Add and route the SME Tavily last resort

**Files:**
- Create: `smeTavilyFetcher.ts`
- Create: `test/unit/smeTavilyFallback.test.ts`
- Modify: `config.ts`
- Modify: `menuFetcher.ts`

**Interfaces:**
- Consumes: `SME_TAVILY_MARKDOWN_PREFIX` from Task 1 and the existing `MenuFetcher` callback flow.
- Produces: optional `IConfig.tavilyApiKey` and `fetchSmeTavilyMarkdown(url: string, apiKey: string): Promise<string>`.

- [x] **Step 1: Write fallback routing tests before implementation**

Create `test/unit/smeTavilyFallback.test.ts` with tests that instantiate `MenuFetcher`, stub `axios.get`/`axios.post`, and stub `fetchHtmlWithBrowser` through a narrow test cast. First test: direct SME HTTP returns 403, browser/PDF fallback rejects, Tavily returns a matching markdown result, and `BrasserieLaMarine` returns the two expected current-date items. Also assert the Tavily request URL, `extract_depth`, `include_images`, and Authorization header. Add cases proving a missing key and a non-SME URL make no Tavily request, a mismatched/failed Tavily result does not become a successful menu, a working browser result avoids Tavily, an ordinary 200 empty-menu result avoids Tavily, a 200 security challenge enters the failure route, and logs do not contain the configured key.

- [x] **Step 2: Run the fallback tests and verify they fail for missing behavior**

Run: `.\node_modules\.bin\mocha.cmd --require ts-node/register --timeout 10000 test/unit/smeTavilyFallback.test.ts --exit`

Expected: the valid Tavily fallback assertion fails because `MenuFetcher` does not make a Tavily request yet; unrelated test setup errors must be corrected before implementation.

- [x] **Step 3: Add optional environment configuration**

In `config.ts`, add `readonly tavilyApiKey?: string` to `IConfig` and set `Config.tavilyApiKey` from `process.env.TAVILY_API_KEY`. Keep the key optional so existing test and runtime configurations continue to work when unset.

- [x] **Step 4: Implement `fetchSmeTavilyMarkdown`**

In `smeTavilyFetcher.ts`, validate the exact SME restaurant hostname, POST to Tavily Extract with the requested URL, Advanced depth, images disabled, a 30-second timeout, and `Authorization: Bearer ${apiKey}`. Require HTTP success, a normalized `results[].url` matching the requested URL, and non-empty string `raw_content`. Throw generic sanitized errors that never include the key or response headers.

- [x] **Step 5: Wire Tavily after explicit SME fetch/challenge failure**

In `menuFetcher.ts`, leave successful HTTP, browser HTML, and SME PDF parsing first. Detect an explicit SME security challenge even when the origin responds with HTTP 200. After the existing browser/PDF route fails, call `fetchSmeTavilyMarkdown` only for the two allowed SME hostnames and only when the configured key is non-empty. Prefix the returned markdown and pass it through `parseFetchedHtml`. If parsing returns no current-date items or the request fails, log a concise sanitized reason and complete with the original fetch error. Leave ordinary HTTP 200 pages that parse empty unchanged.

- [x] **Step 6: Run the fallback and parser unit tests**

Run: `.\node_modules\.bin\mocha.cmd --require ts-node/register --timeout 10000 test/unit/sme.test.ts test/unit/smeTavilyFallback.test.ts --exit`

Expected: markdown parsing, Advanced request parameters, key/domain gates, URL validation, challenge routing, and original-error handling pass.

- [x] **Step 7: Run project build and full test suite**

Run: `npm run build`

Run: `npm test`

Observed: TypeScript build passes. The focused SME suites pass (17 tests). Direct full Mocha run reports 135 passing and 3 timeouts/assertion failures in the pre-existing Debian wrapper tests on this Windows checkout. `npm test` stops at its ESLint precheck, which reports 12 existing errors outside this task.

- [x] **Step 8: Stage and commit only this task's changes**

Run `git add -- smeTavilyFetcher.ts config.ts test/unit/smeTavilyFallback.test.ts`, then use `git add -p -- menuFetcher.ts` to stage only the Tavily integration hunks. Inspect `git diff --cached -- menuFetcher.ts` and confirm the pre-existing ScraperAPI/browser timeout edits are absent before running `git commit -m "feat: add Tavily fallback for SME menus"`.

Expected: the commit contains this task only; all pre-existing user changes remain unstaged and intact.
