import { expect } from "chai";
import NodeCache from "node-cache";
import axios from "axios";
import puppeteer from "puppeteer";
import sinon from "sinon";

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
    afterEach(() => {
        sinon.restore();
    });

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

    it("falls back to browser fetch when SME returns the security verification 403 page", async () => {
        const config = createConfig();
        const cache = new NodeCache({ useClones: false });
        const menuFetcher = new MenuFetcher(config, cache);
        const date = new Date("2026-03-30T09:00:00.000Z");
        const url = "https://restauracie.sme.sk/restauracia/kolkovna-eurovea_4138-stare-mesto_2949/denne-menu";
        const parser: IParser = {
            parse(html: string, _: Date, doneCallback: (menu: IMenuItem[]) => void): void {
                doneCallback([{ text: html.includes("browser-fetched-menu") ? "Browser menu" : "Wrong source", price: 7.5, isSoup: false }]);
            }
        };

        sinon.stub(axios, "get").rejects({
            message: "Request failed with status code 403",
            response: {
                status: 403,
                data: "<html><head><title>Security Verification | SME</title></head><body></body></html>"
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

    it("reuses a single browser instance for concurrent SME browser fetches", async () => {
        const config = { ...createConfig(), requestTimeout: 15000 };
        const cache = new NodeCache({ useClones: false });
        const menuFetcher = new MenuFetcher(config, cache) as unknown as {
            fetchHtmlWithBrowser: (url: string) => Promise<string>;
        };

        const gotoSpy = sinon.spy(async (_url: string, _options: unknown) => undefined);
        const waitForSelectorSpy = sinon.spy(async (_selector: string, _options: unknown) => undefined);
        const contentStub = sinon.stub().resolves("<html><body>ok</body></html>");
        const closeSpy = sinon.spy(async () => undefined);
        const setUserAgentSpy = sinon.spy(async (_ua: string) => undefined);
        const setExtraHTTPHeadersSpy = sinon.spy(async (_headers: Record<string, string>) => undefined);

        const browser = {
            newPage: sinon.stub()
                .onFirstCall().resolves({
                    setUserAgent: setUserAgentSpy,
                    setExtraHTTPHeaders: setExtraHTTPHeadersSpy,
                    goto: gotoSpy,
                    waitForSelector: waitForSelectorSpy,
                    content: contentStub,
                    close: closeSpy
                })
                .onSecondCall().resolves({
                    setUserAgent: setUserAgentSpy,
                    setExtraHTTPHeaders: setExtraHTTPHeadersSpy,
                    goto: gotoSpy,
                    waitForSelector: waitForSelectorSpy,
                    content: contentStub,
                    close: closeSpy
                }),
            close: sinon.spy(async () => undefined)
        };

        const launchStub = sinon.stub(puppeteer, "launch").callsFake(async () => browser as never);

        await Promise.all([
            menuFetcher.fetchHtmlWithBrowser("https://restauracie.sme.sk/a"),
            menuFetcher.fetchHtmlWithBrowser("https://restauracie.sme.sk/b")
        ]);

        expect(launchStub.callCount).to.equal(1);
        expect(gotoSpy.calledTwice).to.equal(true);
        expect(gotoSpy.firstCall.args[1]).to.deep.include({ waitUntil: "domcontentloaded", timeout: 15000 });
        expect(gotoSpy.secondCall.args[1]).to.deep.include({ waitUntil: "domcontentloaded", timeout: 15000 });
    });

    it("skips the HTTP request entirely for dummy menus and parses immediately", async () => {
        const config = createConfig();
        const cache = new NodeCache({ useClones: false });
        const menuFetcher = new MenuFetcher(config, cache);
        const date = new Date("2026-04-01T09:00:00.000Z");
        const url = "https://www.bistro.sk/restauracia/ina-haluska-ba";
        const parser: IParser = {
            parse(html: string, _: Date, doneCallback: (menu: IMenuItem[]) => void): void {
                doneCallback([{ text: html === "" ? "Dummy menu" : "Fetched unexpectedly", price: 0, isSoup: true, isDummy: true }]);
            }
        };

        const axiosGetStub = sinon.stub(axios, "get");

        const result = await new Promise<IMenuResult>(resolve => {
            menuFetcher.fetchMenu(() => url, date, parser, resolve, { forceRefresh: true, skipFetch: true });
        });

        expect(axiosGetStub.called).to.equal(false);
        expect(result.value).to.be.an("array");
        expect((result.value as IMenuItem[])[0]).to.deep.include({
            text: "Dummy menu",
            price: 0,
            isSoup: true,
            isDummy: true
        });
    });
});
