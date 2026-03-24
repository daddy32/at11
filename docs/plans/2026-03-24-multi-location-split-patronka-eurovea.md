# Multi-Location Split (Patronka + Eurovea) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the current single-location Patrónka app into a monorepo multi-location app with canonical path-based front pages at `/patronka` and `/eurovea`, while keeping shared server/UI logic and separating location-specific parsers and config.

**Architecture:** Introduce explicit location modules that own slug, display name, page copy, and restaurant definitions. Keep Express, caching, menu fetching, and the main template shared, but refactor routing and rendering to consume a typed location model instead of relying on Patrónka-specific strings and the first entry in a restaurant map. Use slug-based restaurant IDs and per-location cookie keys so both front pages remain isolated inside one deployment.

**Tech Stack:** Node.js, TypeScript, Express, hbs, NodeCache, Mocha, Chai, existing parser modules under `parsers/`

---

## Naming Decision

- User-facing location name: `Eurovea`
- URL slug: `eurovea`
- Do not use `Eurovea II` in URLs or UI; keep that only as optional historical/internal context if needed later.

## Scope Notes

- This plan covers the codebase split needed for multi-location support.
- This plan intentionally does not commit to concrete Eurovea venue parser files yet, because the article links describe the venue but do not provide stable machine-readable menu endpoints for each restaurant.
- The first deliverable after this plan should be a working `/patronka` and `/eurovea` structure, even if `eurovea` initially contains an empty restaurant list plus clear TODO markers.

### Task 1: Create typed location modules

**Files:**
- Create: `locations/types.ts`
- Create: `locations/patronka.ts`
- Create: `locations/eurovea.ts`
- Create: `locations/index.ts`
- Test: `test/unit/locations/index.test.ts`

**Step 1: Write the failing test**

```ts
import { expect } from "chai";
import { getDefaultLocation, getLocationBySlug, getLocations } from "../../../locations";

describe("locations registry", () => {
    it("exports both canonical location slugs", () => {
        expect(getLocations().map(x => x.slug)).to.deep.equal(["patronka", "eurovea"]);
    });

    it("returns patronka as the default location", () => {
        expect(getDefaultLocation().slug).to.equal("patronka");
    });

    it("resolves eurovea by slug", () => {
        expect(getLocationBySlug("eurovea")?.displayName).to.equal("Eurovea");
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/index.test.ts --exit`

Expected: FAIL with module-not-found errors for `locations/*`

**Step 3: Write minimal implementation**

```ts
// locations/types.ts
import { IParser } from "../parsers/IParser";

export interface IRestaurantConfig {
    readonly id: number;
    readonly name: string;
    readonly urlFactory: (date: Date) => string;
    readonly parser: IParser;
}

export interface ILocationConfig {
    readonly slug: string;
    readonly displayName: string;
    readonly metaDescription: string;
    readonly footerLabel: string;
    readonly restaurants: ReadonlyArray<IRestaurantConfig>;
}
```

```ts
// locations/index.ts
import { euroveaLocation } from "./eurovea";
import { patronkaLocation } from "./patronka";
import { ILocationConfig } from "./types";

const locations: ReadonlyArray<ILocationConfig> = [patronkaLocation, euroveaLocation];

export function getLocations(): ReadonlyArray<ILocationConfig> {
    return locations;
}

export function getDefaultLocation(): ILocationConfig {
    return locations[0];
}

export function getLocationBySlug(slug: string): ILocationConfig | undefined {
    return locations.find(x => x.slug === slug);
}
```

```ts
// locations/eurovea.ts
import { ILocationConfig } from "./types";

export const euroveaLocation: ILocationConfig = {
    slug: "eurovea",
    displayName: "Eurovea",
    metaDescription: "Obedové menu v Eurovei",
    footerLabel: "Eurovea version",
    restaurants: []
};
```

**Step 4: Run test to verify it passes**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/index.test.ts --exit`

Expected: PASS

**Step 5: Commit**

```bash
git add locations/types.ts locations/patronka.ts locations/eurovea.ts locations/index.ts test/unit/locations/index.test.ts
git commit -m "refactor: introduce typed location modules"
```

### Task 2: Move current Patrónka restaurant definitions into the location layer

**Files:**
- Modify: `locations/patronka.ts`
- Modify: `config.ts`
- Test: `test/unit/config.test.ts`

**Step 1: Write the failing test**

```ts
import { expect } from "chai";
import { Config } from "../../config";

describe("Config", () => {
    it("exposes locations keyed by slug", () => {
        const config = new Config();

        expect([...config.locations.keys()]).to.deep.equal(["patronka", "eurovea"]);
        expect(config.locations.get("patronka")?.displayName).to.equal("Patrónka");
        expect(config.locations.get("eurovea")?.displayName).to.equal("Eurovea");
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/config.test.ts --exit`

Expected: FAIL because `Config` still exposes `restaurants` keyed by display name

**Step 3: Write minimal implementation**

```ts
// config.ts
import { getDefaultLocation, getLocations } from "./locations";
import { ILocationConfig } from "./locations/types";

export interface IConfig {
    readonly defaultLocation: ILocationConfig;
    readonly locations: ReadonlyMap<string, ILocationConfig>;
    // keep the existing runtime settings
}

export class Config implements IConfig {
    public readonly defaultLocation = getDefaultLocation();
    public readonly locations = new Map(
        getLocations().map(location => [location.slug, location] as const)
    );
}
```

```ts
// locations/patronka.ts
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Priatelia } from "../parsers/patronka/priatelia";
import { VegLife } from "../parsers/patronka/veglife";
import { PatronskyPivovar } from "../parsers/patronka/patronskypivovar";
import { Kari } from "../parsers/patronka/kari";
import { SavDoma } from "../parsers/patronka/savdoma";
import { Bigger } from "../parsers/patronka/bigger";
import { LunchBreak } from "../parsers/patronka/lunchbreak";
import { FajneJedlo } from "../parsers/patronka/fajnejedlo";
import { Mdvsr } from "../parsers/patronka/mdvsr";
import { ILocationConfig } from "./types";

export const patronkaLocation: ILocationConfig = {
    slug: "patronka",
    displayName: "Patrónka",
    metaDescription: "Obedové menu pri Patrónke",
    footerLabel: "Patrónka version",
    restaurants: [
        // move the current restaurant objects here unchanged
    ]
};
```

**Step 4: Run test to verify it passes**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/config.test.ts --exit`

Expected: PASS

**Step 5: Commit**

```bash
git add locations/patronka.ts config.ts test/unit/config.test.ts
git commit -m "refactor: move restaurant definitions into location modules"
```

### Task 3: Refactor route and page-model logic around location slugs

**Files:**
- Create: `locations/buildPageModel.ts`
- Modify: `app.ts`
- Test: `test/unit/locations/buildPageModel.test.ts`

**Step 1: Write the failing test**

```ts
import { expect } from "chai";
import { buildPageModel } from "../../../locations/buildPageModel";
import { euroveaLocation, patronkaLocation } from "../../../locations";

describe("buildPageModel", () => {
    it("builds canonical nav links from slugs", () => {
        const model = buildPageModel(patronkaLocation, [patronkaLocation, euroveaLocation], new Date("2026-03-24"));

        expect(model.locations.map(x => x.href)).to.deep.equal(["/patronka", "/eurovea"]);
        expect(model.restaurants.every(x => x.id.startsWith("patronka-"))).to.equal(true);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/buildPageModel.test.ts --exit`

Expected: FAIL because `buildPageModel` does not exist

**Step 3: Write minimal implementation**

```ts
// locations/buildPageModel.ts
import { ILocationConfig } from "./types";

export function buildPageModel(
    currentLocation: ILocationConfig,
    allLocations: ReadonlyArray<ILocationConfig>,
    now: Date
) {
    return {
        currentLocation,
        pageTitle: `@11 - ${currentLocation.displayName}`,
        metaDescription: currentLocation.metaDescription,
        locations: allLocations.map(location => ({
            slug: location.slug,
            name: location.displayName,
            href: `/${location.slug}`,
            selected: location.slug === currentLocation.slug
        })),
        restaurants: currentLocation.restaurants.map(restaurant => ({
            id: `${currentLocation.slug}-${restaurant.id}`,
            name: restaurant.name,
            url: restaurant.urlFactory(now)
        }))
    };
}
```

```ts
// app.ts
app.get("/", (_, res) => {
    res.redirect(302, `/${config.defaultLocation.slug}`);
});

app.get("/:locationSlug", (req, res) => {
    const location = config.locations.get(req.params.locationSlug);
    if (!location) {
        res.status(404).send(`Location '${req.params.locationSlug}' not found`);
        return;
    }

    res.render(__dirname + "/../views/index.html", {
        ...buildPageModel(location, [...config.locations.values()], new Date()),
        appInsightsKey: config.appInsightsInstrumentationKey
    });
});
```

**Step 4: Run test to verify it passes**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/buildPageModel.test.ts --exit`

Expected: PASS

**Step 5: Commit**

```bash
git add locations/buildPageModel.ts app.ts test/unit/locations/buildPageModel.test.ts
git commit -m "refactor: route pages by canonical location slugs"
```

### Task 4: Make the shared template and frontend location-aware

**Files:**
- Modify: `views/index.html`
- Modify: `static/script.js`
- Modify: `app.ts`
- Test: `test/unit/locations/buildPageModel.test.ts`

**Step 1: Write the failing test**

```ts
it("uses slug-based restaurant ids for client state isolation", () => {
    const model = buildPageModel(euroveaLocation, [patronkaLocation, euroveaLocation], new Date("2026-03-24"));
    expect(model.restaurants.every(x => x.id.startsWith("eurovea-"))).to.equal(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/buildPageModel.test.ts --exit`

Expected: FAIL until the template/view model changes are wired consistently

**Step 3: Write minimal implementation**

```html
<!-- views/index.html -->
<title>{{pageTitle}}</title>
<meta name="description" content="{{metaDescription}}">
<body data-location-slug="{{currentLocation.slug}}">
...
{{#each locations}}
<a href="{{this.href}}" {{#if this.selected}}class="selected"{{/if}}>{{this.name}}</a>
{{/each}}
```

```js
// static/script.js
function getLocationSlug() {
    return document.body.getAttribute("data-location-slug") || "patronka";
}

function getHiddenRestaurantsCookieKey() {
    return "hiddenRestaurants:" + getLocationSlug();
}

// replace all hardcoded "hiddenRestaurants" reads/writes with getHiddenRestaurantsCookieKey()
```

```ts
// app.ts
// pass currentLocation, pageTitle, metaDescription, and slug-based nav hrefs from buildPageModel()
```

**Step 4: Run test to verify it passes**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/buildPageModel.test.ts --exit`

Expected: PASS

**Step 5: Commit**

```bash
git add views/index.html static/script.js app.ts test/unit/locations/buildPageModel.test.ts
git commit -m "feat: make shared frontend location-aware"
```

### Task 5: Create the Eurovea parser workspace and onboarding placeholder

**Files:**
- Create: `parsers/eurovea/README.md`
- Create: `test/unit/eurovea/.gitkeep`
- Modify: `locations/eurovea.ts`
- Test: `test/unit/locations/index.test.ts`

**Step 1: Write the failing test**

```ts
it("starts eurovea as a valid empty location", () => {
    const eurovea = getLocationBySlug("eurovea");
    expect(eurovea).to.not.equal(undefined);
    expect(eurovea?.restaurants).to.deep.equal([]);
});
```

**Step 2: Run test to verify it fails**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/index.test.ts --exit`

Expected: FAIL until the Eurovea placeholder is explicit and documented

**Step 3: Write minimal implementation**

```md
<!-- parsers/eurovea/README.md -->
# Eurovea Parser Workspace

- Put one venue parser per file in this directory.
- Keep parser names lowercase and venue-based.
- Add a matching test file under `test/unit/eurovea/`.
- Do not add a venue to `locations/eurovea.ts` until it has a stable source URL and a passing parser test.
```

```ts
// locations/eurovea.ts
export const euroveaLocation: ILocationConfig = {
    slug: "eurovea",
    displayName: "Eurovea",
    metaDescription: "Obedové menu v Eurovei",
    footerLabel: "Eurovea version",
    restaurants: [] // fill only after individual venue parsers are tested
};
```

**Step 4: Run test to verify it passes**

Run: `npx mocha --require ts-node/register --timeout 10000 --extension ts test/unit/locations/index.test.ts --exit`

Expected: PASS

**Step 5: Commit**

```bash
git add parsers/eurovea/README.md test/unit/eurovea/.gitkeep locations/eurovea.ts test/unit/locations/index.test.ts
git commit -m "chore: scaffold eurovea parser workspace"
```

### Task 6: Update developer documentation and verify the split end-to-end

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-03-24-multi-location-split-patronka-eurovea.md`

**Step 1: Write the failing documentation checklist**

```md
- README explains canonical URLs: `/patronka`, `/eurovea`
- README explains where location configs live: `locations/`
- README explains where location parsers live: `parsers/<slug>/`
- README explains that `/` redirects to the default location
```

**Step 2: Run verification before editing docs**

Run: `npm run build`

Expected: PASS before the doc refresh begins

**Step 3: Write minimal implementation**

```md
## Locations

- Canonical URLs are `/patronka` and `/eurovea`.
- `/` redirects to the default location.
- Shared server and frontend code stay in the project root.
- Location-specific metadata lives in `locations/`.
- Location-specific parsers live in `parsers/<slug>/`.
```

**Step 4: Run full verification**

Run: `npm test`

Expected: PASS

Run: `npm run build`

Expected: PASS

Manual verification:
- Open `/` and confirm it redirects to `/patronka`
- Open `/patronka` and confirm only Patrónka venues render
- Open `/eurovea` and confirm the Eurovea page renders with its own heading/metadata
- Hide a restaurant on `/patronka`, then open `/eurovea` and confirm the cookie state does not leak across locations

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document multi-location structure and canonical urls"
```

## Follow-Up Plan Required After This Split

- Inventory actual Eurovea venues with stable menu URLs.
- Implement one parser at a time under `parsers/eurovea/`.
- Add one matching test file per venue under `test/unit/eurovea/`.
- Add each venue to `locations/eurovea.ts` only after its parser test passes.
