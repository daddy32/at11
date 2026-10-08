# Patrónsky pivovar Image OCR Fallback

**Status:** Approved design, 2026-10-08

## Goal

Keep Patrónsky pivovar menus available when SME supplies the weekly menu as an image with weekday headings instead of text rows. Use the requested `Date` to select the relevant Slovak weekday and return its soup and main dishes through the existing `IMenuItem` parser contract.

## Evidence and project context

- `PatronskyPivovar` currently extends the shared `Sme` parser. The fixture page still has a `.dnesne_menu` heading and date range, but no `.jedlo_polozka` dish rows.
- The page puts the menu image inside `.daily-menu-container`. Its anchor links to `menu_1_1791144731_orig.jpg`; the nested `<img>` uses a smaller WebP thumbnail.
- The project already depends on `tesseract.js`; other image-menu parsers recognize Slovak using language code `slk`.
- `Tesseract.recognize` on both the fixture thumbnail and original JPG returned the full Monday-to-Friday menu. For 2026-10-08, the Thursday section yielded the expected soup and two mains with prices 8.40 and 10.40.
- OCR consistently reads the soup volume `0,25 l` as `0,251` or `0,25 1`. Dish names and prices in the Thursday section were recognized correctly.
- The user-supplied fixture is in `test/samples/patronsky_pivovar/`.

## Design

Keep the existing SME text parser as the first path. If it returns no menu rows, locate the menu image within `.daily-menu-container`, preferring the image link's `href` to the nested thumbnail `src`. Resolve a relative image URL against Patrónsky pivovar's SME daily-menu URL, fetch the image as binary data with Axios, and recognize it with the existing Tesseract dependency using `slk`.

Extract only the section for `format(date, "EEEE", { locale: sk })`, comparing weekday headings case-insensitively and tolerating OCR's occasional loss of the accent in `Štvrtok`. End the section at the next weekday heading. Ignore the image title and date range; individual dishes are grouped by day name.

Treat the first non-empty dish row in the selected section as soup and subsequent rows as mains. Parse euro prices with the shared price helper, strip portion measures and trailing allergen labels, and normalize the soup's OCR variants of the `0,25 l` prefix so the quantity does not remain in its name. Preserve the existing menu model behavior for an item without a printed price by returning `NaN` for the soup price.

If the page has no menu image, the OCR fails, no requested weekday is present, or the selected section has no dish rows, complete the parser callback with an empty menu. Keep diagnostics concise and do not log the full OCR text. Add no new package dependency or generic OCR abstraction.

## Components

- `parsers/patronka/patronskypivovar.ts`: retain the current text parse and invoke image OCR only when that parse returns no items.
- A focused OCR text extraction function: select the requested weekday, clean rows, and build `IMenuItem` values.
- Existing dependencies: Cheerio for page markup, Axios for image bytes, `tesseract.js` for Slovak OCR, `date-fns` for the localized weekday, and shared menu normalization/price helpers where applicable.

## Acceptance criteria

1. Existing text-based SME menu rows continue to use the current parser path.
2. Image-only SME HTML selects the linked full-size menu image, with its `<img src>` as a fallback.
3. For 2026-10-08, the fixture parser returns exactly the Thursday soup and two mains, with main prices 8.40 and 10.40 and no quantity/allergen labels in the item names.
4. OCR variants `0,251` and `0,25 1` do not leak into the soup name.
5. Other weekday sections are excluded, and a missing weekday or image yields an empty menu.
6. No package dependency or change to the shared `Sme` parser is required.
