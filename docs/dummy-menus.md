# Dummy Menus

Use a dummy menu when a restaurant should be listed on the page, but we do not want to parse a real daily menu yet.

## What a dummy menu does

- Shows the restaurant tile in the selected location.
- Links directly to the restaurant menu page.
- Returns a single placeholder menu row from the shared dummy parser.
- Applies dummy-only visual tweaks:
  - narrower tile
  - hidden `timeago`
  - hidden soup icon
  - smaller dummy heading

## How to add one

1. Reuse `Dummy` from `parsers/patronka/dummy.ts`.
2. Add the restaurant entry to the location config, for example `locations/eurovea.ts`.
3. Set:
   - `urlFactory` to the external menu page
   - `parser` to `new Dummy()`
   - `isDummy` to `true`
4. Add or update tests:
   - location registry test
   - location page-model test
   - venue config test
   - dummy rendering test if visuals change

## Why `isDummy` matters

`isDummy` is not only for parsed menu items. It is also used during initial page render so the tile already has the `dummy-menu` class before the AJAX load finishes. Without that, Masonry first lays the tile out at full width and only shrinks it after the menu response arrives.

Relevant files:

- `locations/types.ts`
- `locations/buildPageModel.ts`
- `views/index.html`
- `static/script.js`
- `static/style.css`

## Current example

`Kinka Ramen` in Eurovea is the current reference implementation.
