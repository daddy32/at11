import { expect } from "chai";
import NodeCache from "node-cache";

import { IConfig } from "../../config";
import { getDefaultLocation, getLocations } from "../../locations";
import { IMenuItem } from "../../parsers/IMenuItem";
import { IParser } from "../../parsers/IParser";
import { MenuFetcher, IMenuResult } from "../../menuFetcher";

class NoopParser implements IParser {
    public parse(_: string, __: Date, doneCallback: (menu: IMenuItem[]) => void): void {
        doneCallback([]);
    }
}

function createConfig(): IConfig {
    const defaultLocation = getDefaultLocation();
    const locations = new Map(getLocations().map(location => [location.slug, location] as const));

    return {
        isProduction: false,
        scraperApiKey: "",
        appInsightsInstrumentationKey: "",
        port: 0,
        bypassCache: false,
        cacheExpiration: 120,
        requestTimeout: 1000,
        parserTimeout: 1000,
        defaultLocation,
        locations,
        restaurants: new Map()
    };
}

function fetchMenu(
    menuFetcher: MenuFetcher,
    urlFactory: (date: Date) => string,
    date: Date,
    parser: IParser,
    forceRefresh: boolean
): Promise<IMenuResult> {
    return new Promise(resolve => {
        menuFetcher.fetchMenu(urlFactory, date, parser, resolve, { forceRefresh });
    });
}

describe("MenuFetcher", () => {
    it("should bypass cached error when forceRefresh is true", async () => {
        const config = createConfig();
        const cache = new NodeCache({ useClones: false });
        const menuFetcher = new MenuFetcher(config, cache);
        const parser = new NoopParser();
        const date = new Date("2026-02-09T09:00:00.000Z");
        const url = "https://example.com/menu";
        const urlFactory = () => url;
        const cacheKey = date + ":" + url;

        cache.set(cacheKey, { value: new Error("stale error"), timestamp: new Date("2026-02-09T08:00:00.000Z") }, 60);

        let loadCalls = 0;
        const menuFetcherWithLoad = menuFetcher as unknown as {
            load: (_url: string, _date: Date, _parser: IParser, doneCallback: (error: Error, menu: IMenuItem[]) => void) => void
        };
        menuFetcherWithLoad.load = (_url: string, _date: Date, _parser: IParser, doneCallback: (error: Error, menu: IMenuItem[]) => void) => {
            loadCalls += 1;
            doneCallback(null, [{ text: "Test menu", price: 7.5, isSoup: false }]);
        };

        const refreshed = await fetchMenu(menuFetcher, urlFactory, date, parser, true);
        expect(loadCalls).to.equal(1);
        expect(refreshed.value).to.be.an("array");
        expect((refreshed.value as IMenuItem[])[0].text).to.equal("Test menu");

        const cachedAfterRefresh = await fetchMenu(menuFetcher, urlFactory, date, parser, false);
        expect(loadCalls).to.equal(1);
        expect(cachedAfterRefresh.value).to.be.an("array");
        expect((cachedAfterRefresh.value as IMenuItem[])[0].text).to.equal("Test menu");
    });
});
