import "../../parsers/parserUtil";
import { expect } from "chai";
import axios from "axios";
import NodeCache from "node-cache";
import sinon from "sinon";

import { Config, IConfig } from "../../config";
import { getDefaultLocation, getLocations } from "../../locations";
import { IMenuItem } from "../../parsers/IMenuItem";
import { IParser } from "../../parsers/IParser";
import { BrasserieLaMarine } from "../../parsers/eurovea/brasserielamarine";
import { MenuFetcher, IMenuResult } from "../../menuFetcher";

const menuUrl = "https://restauracie.sme.sk/restauracia/brasserie-la-marine_4200-stare-mesto_2949/denne-menu";
const menuMarkdown = `## Obedové menu Pondelok (05.10.2026)
**Polievka** Bruschetta s pažítkovým cottage cheese, pečená zelenina na mede a rukola
**Hlavné jedlo** Kuracie prsia plnené mozzarellou a prosciuttom, karfiolové pyré a smažená cibuľka
## Obedové menu Utorok (06.10.2026)
**Polievka** Krém z pečeného petržlenu, opečené orechy a bylinky`;
const apiKey = "unit-test-tavily-key";

function createConfig(tavilyApiKey?: string): IConfig {
    const defaultLocation = getDefaultLocation();
    const locations = new Map(getLocations().map(location => [location.slug, location] as const));
    const config: IConfig & { tavilyApiKey?: string } = {
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
        restaurants: new Map(),
        tavilyApiKey
    };

    return config;
}

function fetchMenu(
    menuFetcher: MenuFetcher,
    url: string,
    date: Date,
    parser: IParser
): Promise<IMenuResult> {
    return new Promise(resolve => menuFetcher.fetchMenu(() => url, date, parser, resolve, { forceRefresh: true }));
}

function createMenuFetcher(tavilyApiKey?: string): MenuFetcher {
    return new MenuFetcher(createConfig(tavilyApiKey), new NodeCache({ useClones: false }));
}

function stubBrowserFallback(menuFetcher: MenuFetcher, result: () => Promise<string>): void {
    const menuFetcherWithBrowser = menuFetcher as unknown as {
        fetchHtmlWithBrowser: (_url: string) => Promise<string>;
    };
    menuFetcherWithBrowser.fetchHtmlWithBrowser = result;
}

function createHttpError(status = 403): Error {
    const error = new Error(`Request failed with status code ${status}`);
    (error as Error & { response?: { status: number } }).response = { status };
    return error;
}

function tavilyResponse(url: string, rawContent: string): { status: number; data: unknown } {
    return {
        status: 200,
        data: {
            results: [{ url, raw_content: rawContent }],
            failed_results: []
        }
    };
}

describe("SME Tavily fallback", () => {
    afterEach(() => sinon.restore());

    it("loads TAVILY_API_KEY from the environment", () => {
        const previousValue = process.env.TAVILY_API_KEY;
        process.env.TAVILY_API_KEY = apiKey;
        try {
            const config = new Config() as Config & { tavilyApiKey?: string };
            expect(config.tavilyApiKey).to.equal(apiKey);
        } finally {
            if (previousValue === undefined) {
                delete process.env.TAVILY_API_KEY;
            } else {
                process.env.TAVILY_API_KEY = previousValue;
            }
        }
    });

    it("uses Advanced Extract after SME HTTP, browser, and PDF fallback fail", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const date = new Date("2026-10-05T09:00:00.000Z");
        const originalError = createHttpError();
        const getStub = sinon.stub(axios, "get").rejects(originalError);
        const postStub = sinon.stub(axios, "post").resolves(tavilyResponse(menuUrl, menuMarkdown));
        stubBrowserFallback(menuFetcher, async () => { throw new Error("Browser and SME PDF fallback failed"); });

        const result = await fetchMenu(menuFetcher, menuUrl, date, new BrasserieLaMarine());

        expect(result.value).to.deep.equal([
            { text: "Bruschetta s pažítkovým cottage cheese, pečená zelenina na mede a rukola", price: NaN, isSoup: true },
            { text: "Kuracie prsia plnené mozzarellou a prosciuttom, karfiolové pyré a smažená cibuľka", price: NaN, isSoup: false }
        ]);
        expect(getStub.calledOnce).to.equal(true);
        expect(postStub.calledOnce).to.equal(true);
        expect(postStub.firstCall.args[0]).to.equal("https://api.tavily.com/extract");
        expect(postStub.firstCall.args[1]).to.deep.include({
            urls: menuUrl,
            extract_depth: "advanced",
            include_images: false,
            format: "markdown"
        });
        expect(postStub.firstCall.args[2]).to.deep.include({
            timeout: 30000,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });
    });

    it("skips Tavily when the API key is missing", async () => {
        const menuFetcher = createMenuFetcher();
        const originalError = createHttpError();
        const postStub = sinon.stub(axios, "post");
        sinon.stub(axios, "get").rejects(originalError);
        stubBrowserFallback(menuFetcher, async () => { throw new Error("Browser and SME PDF fallback failed"); });

        const result = await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), new BrasserieLaMarine());

        expect(postStub.notCalled).to.equal(true);
        expect(result.value).to.be.instanceOf(Error);
        expect((result.value as Error).message).to.equal(originalError.message);
    });

    it("does not call Tavily for a non-SME host", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const postStub = sinon.stub(axios, "post");
        const getStub = sinon.stub(axios, "get").rejects(new Error("origin failed"));

        const result = await fetchMenu(menuFetcher, "https://example.com/menu", new Date("2026-10-05"), new BrasserieLaMarine());

        expect(getStub.calledOnce).to.equal(true);
        expect(postStub.notCalled).to.equal(true);
        expect(result.value).to.be.instanceOf(Error);
    });

    it("does not accept mismatched or failed Tavily result URLs", async () => {
        for (const response of [
            tavilyResponse("https://restauracie.sme.sk/a-different-menu", menuMarkdown),
            { status: 200, data: { results: [], failed_results: [{ url: menuUrl, error: "Failed to fetch URL" }] } }
        ]) {
            sinon.restore();
            const menuFetcher = createMenuFetcher(apiKey);
            const originalError = createHttpError();
            const postStub = sinon.stub(axios, "post").resolves(response);
            sinon.stub(axios, "get").rejects(originalError);
            stubBrowserFallback(menuFetcher, async () => { throw new Error("Browser and SME PDF fallback failed"); });

            const result = await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), new BrasserieLaMarine());

            expect(postStub.calledOnce).to.equal(true);
            expect(result.value).to.be.instanceOf(Error);
            expect((result.value as Error).message).to.equal(originalError.message);
        }
    });

    it("does not accept an extract that contains only another menu date", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const tomorrowMarkdown = `## Obedové menu Utorok (06.10.2026)
**Polievka** Krém z pečeného petržlenu, opečené orechy a bylinky`;
        sinon.stub(axios, "post").resolves(tavilyResponse(menuUrl, tomorrowMarkdown));
        sinon.stub(axios, "get").rejects(createHttpError());
        stubBrowserFallback(menuFetcher, async () => { throw new Error("Browser and SME PDF fallback failed"); });

        const result = await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), new BrasserieLaMarine());

        expect(result.value).to.be.instanceOf(Error);
        expect((result.value as Error).message).to.equal("Request failed with status code 403");
    });

    it("uses Tavily for an SME HTTP failure without an existing browser route", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const postStub = sinon.stub(axios, "post").resolves(tavilyResponse(menuUrl, menuMarkdown));
        sinon.stub(axios, "get").rejects(createHttpError(500));

        const result = await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), new BrasserieLaMarine());

        expect(postStub.calledOnce).to.equal(true);
        expect(result.value).to.be.an("array").with.length(2);
    });

    it("allows the www SME restaurant hostname", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const wwwUrl = menuUrl.replace("restauracie.sme.sk", "www.restauracie.sme.sk");
        const postStub = sinon.stub(axios, "post").resolves(tavilyResponse(wwwUrl, menuMarkdown));
        sinon.stub(axios, "get").rejects(createHttpError(500));

        const result = await fetchMenu(menuFetcher, wwwUrl, new Date("2026-10-05"), new BrasserieLaMarine());

        expect(postStub.calledOnce).to.equal(true);
        expect(postStub.firstCall.args[1]).to.deep.include({ urls: wwwUrl });
        expect(result.value).to.be.an("array").with.length(2);
    });

    it("keeps a working browser result ahead of Tavily", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const parser: IParser = {
            parse(_html: string, _date: Date, done: (menu: IMenuItem[]) => void): void {
                done([{ text: "Browser menu", price: 8.5, isSoup: false }]);
            }
        };
        const postStub = sinon.stub(axios, "post");
        sinon.stub(axios, "get").rejects(createHttpError());
        stubBrowserFallback(menuFetcher, async () => "browser html");

        const result = await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), parser);

        expect(result.value).to.deep.equal([{ text: "Browser menu", price: 8.5, isSoup: false }]);
        expect(postStub.notCalled).to.equal(true);
    });

    it("does not use Tavily for an ordinary successful page with no parsed dishes", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const postStub = sinon.stub(axios, "post");
        sinon.stub(axios, "get").resolves({ status: 200, data: "ordinary page without a menu" });

        const result = await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), new BrasserieLaMarine());

        expect(result.value).to.deep.equal([]);
        expect(postStub.notCalled).to.equal(true);
    });

    it("routes a 200 security challenge through browser/PDF before Tavily", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const postStub = sinon.stub(axios, "post").resolves(tavilyResponse(menuUrl, menuMarkdown));
        sinon.stub(axios, "get").resolves({ status: 200, data: "<html><title>Security Verification</title></html>" });
        let browserCalls = 0;
        stubBrowserFallback(menuFetcher, async () => { throw new Error("Browser and SME PDF fallback failed"); });
        const browserMethod = menuFetcher as unknown as { fetchHtmlWithBrowser: (_url: string) => Promise<string> };
        const originalBrowserMethod = browserMethod.fetchHtmlWithBrowser;
        browserMethod.fetchHtmlWithBrowser = url => {
            browserCalls += 1;
            return originalBrowserMethod(url);
        };

        const result = await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), new BrasserieLaMarine());

        expect(browserCalls).to.equal(1);
        expect(postStub.calledOnce).to.equal(true);
        expect(result.value).to.be.an("array").with.length(2);
    });

    it("never writes the configured API key to logs", async () => {
        const menuFetcher = createMenuFetcher(apiKey);
        const errorStub = sinon.stub(console, "error");
        const infoStub = sinon.stub(console, "info");
        sinon.stub(axios, "get").rejects(createHttpError());
        sinon.stub(axios, "post").rejects(new Error("Tavily unavailable"));
        stubBrowserFallback(menuFetcher, async () => { throw new Error("Browser failed"); });

        await fetchMenu(menuFetcher, menuUrl, new Date("2026-10-05"), new BrasserieLaMarine());

        const loggedText = [...errorStub.args, ...infoStub.args].flat().join(" ");
        expect(loggedText).not.to.contain(apiKey);
    });
});
