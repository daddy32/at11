# Patrónsky pivovar Image OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return the requested weekday's soup and main dishes when Patrónsky pivovar's SME page contains only its weekly menu image.

**Architecture:** Keep `PatronskyPivovar`'s current SME text parse first. When it returns no items, use Cheerio to select the linked menu image, Axios to fetch it, and Tesseract's Slovak model to recognize it; a focused text extractor selects the date's Slovak weekday and creates `IMenuItem` values.

**Tech Stack:** TypeScript, Cheerio, Axios, `tesseract.js` with `slk`, date-fns Slovak locale, Mocha, Chai, Sinon.

## Global Constraints

- Keep the existing SME text parser as the first path.
- Use the existing `tesseract.js` dependency with language code `slk`.
- Add no new package dependency or generic OCR abstraction.
- Return an empty menu if the image is absent, OCR fails, the weekday is missing, or the selected section has no dish rows.
- Do not log the full OCR text.

---

### Task 1: Add Failing Tests for Image-Only SME Menus

**Files:**
- Test: `test/unit/patronka/patronskypivovar.test.ts`
- Fixture: `test/samples/patronsky_pivovar/menu_1_1791144731_orig.jpg`

**Interfaces:**
- Consumes: The existing public `PatronskyPivovar.parse(html, date, doneCallback)` contract.
- Produces: Tests that demonstrate image-only pages return the requested Thursday menu, preserve price and soup semantics, and use the source image.

- [x] **Step 1: Write the failing mock-backed page test**

Stub Axios to return image bytes and Tesseract to return controlled OCR text. Assert the parser returns three Thursday items, strips the OCR quantity/allergens, parses the two prices, uses the full-size image link, and supplies language `slk`.

```ts
const imageUrl = "https://restauracie.smedata.sk/usmedata/pictures/menu/4270/31/menu_1_1791144731_orig.jpg?670";
const html = `<div class="dnesne_menu"><h2>Obedové menu (05.10.2026 - 09.10.2026)</h2>
  <div class="daily-menu-container"><a href="${imageUrl}"><img src="/thumb.webp"></a></div>
</div>`;
const ocrText = `Stvrtok
0,251 Boršč s chlebom (A 1)
130 g Bravčový čiernohorský rezeň s pečenými zemiakmi a coleslaw šalátom (A 1,3,7) 8,40 €
150 g Restovaná kačacia pečeň so zemiakovými lokšami /2ks/ (A 1,3,7) 10,40 €
Piatok
250 g Kuracie stehno ala bažant s dusenou ryžou 8,40 €`;
const imageRequest = sinon.stub(axios, "get").resolves({ data: Buffer.from("image") });
const ocr = sinon.stub(Tesseract, "recognize").resolves({ data: { text: ocrText } } as any);
const items = await new Promise<IMenuItem[]>(resolve => parser.parse(html, new Date(2026, 9, 8), resolve));

expect(items.map(item => item.text)).to.deep.equal([
  "Boršč s chlebom",
  "Bravčový čiernohorský rezeň s pečenými zemiakmi a coleslaw šalátom",
  "Restovaná kačacia pečeň so zemiakovými lokšami /2ks/"
]);
expect(items[0].isSoup).to.equal(true);
expect(Number.isNaN(items[0].price)).to.equal(true);
expect(items[1].price).to.equal(8.4);
expect(items[2].price).to.equal(10.4);
expect(imageRequest.firstCall.args[0]).to.equal(imageUrl);
expect(ocr.firstCall.args[1]).to.equal("slk");
```

- [x] **Step 2: Write the failing original-image test**

Read the supplied JPG bytes, stub only the external Axios fetch to return those bytes, and let the real Tesseract dependency run. Call the public parser with image-only SME HTML and expect the same three Thursday rows. This test also fails against the current parser because it returns an empty menu before fetching the image.

```ts
const imagePath = path.resolve(process.cwd(), "test/samples/patronsky_pivovar/menu_1_1791144731_orig.jpg");
sinon.stub(axios, "get").resolves({ data: fs.readFileSync(imagePath) } as any);
const items = await new Promise<IMenuItem[]>(resolve => parser.parse(IMAGE_ONLY_HTML, new Date(2026, 9, 8), resolve));

expect(items).to.have.length(3);
expect(items[0].text).to.equal("Boršč s chlebom");
expect(items[1].price).to.equal(8.4);
expect(items[2].price).to.equal(10.4);
```

- [x] **Step 3: Run both new tests and confirm they fail on the missing OCR fallback**

Run: `node C:/PKZ/Synced_dirs/Devel/Weby/at11_patronka/node_modules/mocha/bin/mocha.js --require ts-node/register --timeout 180000 --extension ts test/unit/patronka/patronskypivovar.test.ts --grep "image-only SME page|original menu image" --exit`

Expected: Both new tests fail because the current parser returns zero items; the legacy SME text test still passes.

---

### Task 2: Implement OCR Fallback and Verify Parser Behavior

**Files:**
- Modify: `parsers/patronka/patronskypivovar.ts`
- Test: `test/unit/patronka/patronskypivovar.test.ts`

**Interfaces:**
- Consumes: The existing `Sme.parseBase(html, date)` result.
- Produces: `PatronskyPivovar.parse(html, date, doneCallback)` invokes Slovak OCR only if the existing text parse has no menu items.

- [x] **Step 1: Implement the minimal fallback**

Keep `super.parseBase(html, date)` first. If it returns no rows, use Cheerio to select the first `.daily-menu-container img`; prefer its parent anchor's `href`, then its `src`. Resolve relative URLs against `https://restauracie.sme.sk/restauracia/patronsky-pivovar_4270-stare-mesto_2949/denne-menu`. Fetch with `axios.get(url, { responseType: "arraybuffer" })`, recognize with `Tesseract.recognize(response.data, "slk")`, and pass `data.text` and `date` to a private extraction function.

The extractor formats the requested date with `format(date, "EEEE", { locale: sk })`, matches weekday headings case-insensitively after Unicode diacritic normalization (so `Štvrtok` and `Stvrtok` both match), and takes rows through the next weekday heading. The first non-empty row is soup; later rows are mains. Strip a leading `g` or liter quantity, including OCR spellings `0,251` and `0,25 1`; use `parsePrice` to remove euro amounts; remove trailing `(A 1,3,7)` labels with a focused regex because the shared `removeAlergens` helper also strips the `/2` part from serving notes such as `/2ks/`. If no image, fetch/OCR error, matching weekday, or dish rows exist, call back once with `[]`. Keep current text-path cleanup and soup handling unchanged.

- [x] **Step 2: Run the mock-backed red/green test**

Run: `node C:/PKZ/Synced_dirs/Devel/Weby/at11_patronka/node_modules/mocha/bin/mocha.js --require ts-node/register --timeout 10000 --extension ts test/unit/patronka/patronskypivovar.test.ts --grep "image-only SME page uses linked image" --exit`

Expected: PASS; the test observes real parser output and verifies the full-size URL and `slk` language argument.

- [x] **Step 3: Run the original-image OCR regression and the full parser test file**

Run: `node C:/PKZ/Synced_dirs/Devel/Weby/at11_patronka/node_modules/mocha/bin/mocha.js --require ts-node/register --timeout 180000 --extension ts test/unit/patronka/patronskypivovar.test.ts --exit`

Expected: PASS for legacy SME text parsing and image-only Thursday parsing from the original JPG. The high-resolution OCR may take up to 180 seconds.

- [x] **Step 4: Build the project**

Run: `node C:/PKZ/Synced_dirs/Devel/Weby/at11_patronka/node_modules/typescript/bin/tsc --noEmit`

Expected: TypeScript compilation succeeds with no package dependency changes.

---

### Task 3: Accept Image-Only SME Pages in the Browser Fallback

**Files:**
- Modify: `menuFetcher.ts`
- Test: `test/unit/menuFetcher.test.ts`

**Interfaces:**
- Consumes: The browser fallback HTML after the initial SME HTTP request is blocked.
- Produces: Image-only SME menu HTML reaches the Patronsky OCR parser instead of being rejected for lacking `.jedlo_polozka` rows.

- [x] **Step 1: Add a failing end-to-end 403 test**

Simulate the page request returning 403, make the browser fallback return image-only HTML, and serve the supplied original JPG to the parser. Assert the normal OCR menu items are returned.

- [x] **Step 2: Include SME menu images in browser content detection**

Wait for `.daily-menu-container img` as well as `.jedlo_polozka`; accept the page when either image or text menu content is present.

- [x] **Step 3: Run the 403-to-OCR regression and full Mocha suite**

The mocked 403 regression passes, the live browser/OCR flow returns three Thursday items, and the full suite passes with 124 tests.
