# Menučka 403 Browser Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Menučka-backed Eurovea and Patrónka restaurants working when Cloudflare returns HTTP 403 to the Axios fetch.

**Architecture:** Reuse the existing Puppeteer fallback already used for protected SME pages. Extend fallback eligibility to the Menučka host and wait for either Menučka’s `.day-title` or current `.restaurant-weekmenu` content marker instead of SME’s `.jedlo_polozka` marker, while retaining the existing retry behavior. Add a narrow DOCK7 parser path for Menučka’s current weekly `continuing-offer-block` markup while preserving the legacy day-based parser.

**Tech Stack:** TypeScript 5.5, Axios, Puppeteer, Mocha, Chai, Sinon, NodeCache.

## Global Constraints

- Do not change parser APIs or the HTML parsing rules.
- Do not add a dependency.
- Only use browser fallback for HTTP 403/429 responses from the known SME and Menučka hosts.
- Keep the existing SME fallback behavior and tests passing.
- Preserve legacy Menučka `.day-title` parsing while supporting current DOCK7 weekly offers.
- Test the regression before implementing the production change.

---

### Task 1: Add the Menučka 403 regression test

**Files:**
- Modify: `test/unit/menuFetcher.test.ts`

**Interfaces:**
- Consumes: `MenuFetcher.fetchMenu`, the existing Axios and browser-fallback stubs.
- Produces: A failing test proving that a Menučka 403 is recovered through the browser fallback.

- [ ] **Step 1: Write the failing test**

Add this test after the existing SME 403 fallback tests:

```ts
    it("falls back to browser fetch when Menučka returns 403", async () => {
        const config = createConfig();
        const cache = new NodeCache({ useClones: false });
        const menuFetcher = new MenuFetcher(config, cache);
        const date = new Date("2026-09-21T09:00:00.000Z");
        const url = "https://menucka.sk/denne-menu/bratislava/dock7";
        const parser: IParser = {
            parse(html: string, _: Date, doneCallback: (menu: IMenuItem[]) => void): void {
                doneCallback([{ text: html.includes("browser-fetched-menu") ? "Browser menu" : "Wrong source", price: 11.9, isSoup: false }]);
            }
        };

        sinon.stub(axios, "get").rejects({
            message: "Request failed with status code 403",
            response: {
                status: 403,
                data: "<!DOCTYPE html><html><title>Just a moment...</title></html>"
            }
        });

        let browserFetchCalls = 0;
        const menuFetcherWithBrowser = menuFetcher as unknown as {
            fetchHtmlWithBrowser: (_url: string) => Promise<string>;
        };
        menuFetcherWithBrowser.fetchHtmlWithBrowser = async (_url: string) => {
            browserFetchCalls += 1;
            return "<html><body>browser-fetched-menu</body></html>";
        };

        const result = await fetchMenu(menuFetcher, () => url, date, parser, true);

        expect(browserFetchCalls).to.equal(1);
        expect(result.value).to.be.an("array");
        expect((result.value as IMenuItem[])[0].text).to.equal("Browser menu");
    });
```

- [ ] **Step 2: Run the test to verify it fails for the expected reason**

Run: `npx mocha --require ts-node/register --timeout 10000 test/unit/menuFetcher.test.ts --grep "Menučka returns 403" --exit`

Expected: FAIL because `browserFetchCalls` remains `0` and `MenuFetcher` returns the Axios 403 error instead of invoking the browser fallback.

### Task 2: Route Menučka 403s through the existing browser fallback

**Files:**
- Modify: `menuFetcher.ts:109-127,185-216`

**Interfaces:**
- Consumes: Axios errors with status 403/429 and URLs on `restauracie.sme.sk` or `menucka.sk`.
- Produces: `fetchHtmlWithBrowser(url)` calls for protected Menučka pages, using `.day-title, .restaurant-weekmenu` as the rendered-content marker for Menučka and `.jedlo_polozka` for SME.

- [ ] **Step 1: Add host-aware fallback eligibility and content markers**

Update the fallback condition so the known hosts are accepted, and derive the browser wait/row marker from the host:

```ts
    private shouldUseBrowserFallback(url: string, error: unknown): boolean {
        let hostname: string;
        try {
            hostname = new URL(url).hostname;
        } catch {
            return false;
        }

        if (hostname !== "restauracie.sme.sk" && hostname !== "menucka.sk") {
            return false;
        }

        const axiosError = error as {
            response?: {
                status?: number;
            };
        };

        return axiosError.response?.status === 403 || axiosError.response?.status === 429;
    }

    private getBrowserContentMarker(url: string): { selector: string; marker: string } {
        return new URL(url).hostname === "menucka.sk"
            ? { selector: ".day-title, .restaurant-weekmenu", marker: "day-title|restaurant-weekmenu" }
            : { selector: ".jedlo_polozka", marker: "jedlo_polozka" };
    }
```

Use `getBrowserContentMarker(url)` in `fetchHtmlWithBrowser` for `waitForSelector` and the existing rendered-content count. Keep the two-attempt loop and the existing page cleanup unchanged.

- [ ] **Step 2: Run the focused regression test**

Run: `npx mocha --require ts-node/register --timeout 10000 test/unit/menuFetcher.test.ts --grep "Menučka returns 403" --exit`

Expected: PASS.

### Task 3: Parse current DOCK7 weekly Menučka markup

**Files:**
- Modify: `parsers/eurovea/dock7.ts`
- Modify: `test/unit/eurovea/dock7.test.ts`

**Interfaces:**
- Consumes: `.restaurant-weekmenu .continuing-offer-title` and `.continuing-offer-line` HTML with inline `#cena` prices.
- Produces: The same `IMenuItem[]` output and soup/main grouping used by the legacy DOCK7 parser.

- [ ] **Step 1: Write the failing parser test**

Add a test fixture containing a weekly title and inline price nodes:

```ts
    it("parses the current weekly Menučka offer with inline prices", (done) => {
        const html = `
            <div class="restaurant-weekmenu">
                <div class="continuing-offer-block">
                    <div class="continuing-offer-title">Týždenná ponuka 21.-25.9.2026</div>
                    <div class="continuing-offer-line">
                        POLIEVKA<br>
                        Boršč – cvikla, kapusta a zemiaky 7,9,12 –
                        <div id="cena"><b>2,50 €</b></div><br>
                        HLAVNÉ JEDLÁ<br>
                        Kačacie stehno, pyré a fazuľky 7,9 –
                        <div id="cena"><b>13,50 €</b></div><br>
                    </div>
                </div>
            </div>
        `;

        parser.parse(html, TestHelper.createMockDate("2026-09-21"), menu => {
            expect(menu).to.deep.include.members([
                { text: "Boršč – cvikla, kapusta a zemiaky", price: 2.5, isSoup: true },
                { text: "Kačacie stehno, pyré a fazuľky", price: 13.5, isSoup: false }
            ]);
            done();
        });
    });
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npx mocha --require ts-node/register --timeout 10000 test/unit/eurovea/dock7.test.ts --grep "current weekly" --exit`

Expected: FAIL because DOCK7 only searches for `.day-title` and returns an empty menu for the weekly block.

- [ ] **Step 3: Implement the minimal weekly extraction path**

In `Dock7.parse`, use the legacy `findCurrentDay` path when a day title exists; otherwise select a weekly offer title whose date range contains the requested date, extract text segments terminated by `<br>` and their adjacent `#cena` values, remove the trailing separator dash from each segment, and pass the rows to the existing `buildMenu` method. If no matching weekly title exists, return an empty menu.

- [ ] **Step 4: Run the parser test to verify it passes**

Run: `npx mocha --require ts-node/register --timeout 10000 test/unit/eurovea/dock7.test.ts --grep "current weekly" --exit`

Expected: PASS with one soup and one main item, preserving the parsed numeric prices.

### Task 4: Verify fallback behavior, parsers, and build integrity

**Files:**
- Modify: `test/unit/menuFetcher.test.ts` only if an assertion is needed to cover the Menučka selector.

**Interfaces:**
- Consumes: Existing SME fallback tests, the new Menučka regression tests, the DOCK7 parser regression test, and the TypeScript compiler.
- Produces: Evidence that both protected hosts retain fallback behavior and the implementation compiles.

- [ ] **Step 1: Run the complete MenuFetcher unit test file**

Run: `npx mocha --require ts-node/register --timeout 10000 test/unit/menuFetcher.test.ts test/unit/eurovea/dock7.test.ts --exit`

Expected: All tests pass. Existing SME tests must still invoke the browser fallback.

- [ ] **Step 2: Run the full unit test suite without the failing pretest lint hook**

Run: `npm run test:unit`

Expected: Unit tests pass, or any failure is reported separately from the known repository-wide lint errors in `npm test`.

- [ ] **Step 3: Run the TypeScript build**

Run: `npm run build`

Expected: TypeScript compilation succeeds with exit code 0.

- [ ] **Step 4: Run the repository test command for final baseline evidence**

Run: `npm test`

Expected: The command still reports the pre-existing lint errors in `locations/eurovea.ts`, `test/unit/eurovea/dummyvenues.test.ts`, `test/unit/patronka/fajnejedlo.test.ts`, and the view tests; no new lint error is introduced by this change.
