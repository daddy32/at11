import Axios from "axios";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";

import { IConfig } from "./config";
import { IMenuItem } from "./parsers/IMenuItem";
import { IParser } from "./parsers/IParser";
import { sanitizeUrl, isValidUrl } from "./parsers/parserUtil";
import NodeCache from "node-cache";

export interface IMenuResult {
    timestamp: Date;
    value: IMenuItem[] | Error;
}

export interface IFetchMenuOptions {
    forceRefresh?: boolean;
}

export class MenuFetcher {
    private readonly _runningRequests: { [url: string]: ((error: Error, menu: IMenuItem[]) => void)[] } = {};
    private _browserPromise?: Promise<Browser>;

    constructor(private readonly _config: IConfig, private readonly _cache: NodeCache) { }

    public fetchMenu(
        urlFactory: (date: Date) => string,
        date: Date,
        parser: IParser,
        doneCallback: (result: IMenuResult) => void,
        options: IFetchMenuOptions = {}
    ): void {
        let url = urlFactory(date);
        url = sanitizeUrl(url);

        if (!isValidUrl(url)) {
            doneCallback({ value: new Error("Invalid URL provided"), timestamp: new Date() });
            return;
        }

        const cacheKey = date + ":" + url;
        const cached = this._cache.get<IMenuResult>(cacheKey);
        if (cached && !this._config.bypassCache && !options.forceRefresh) {
            doneCallback(cached);
        } else {
            this.load(url, date, parser, (error: Error, menu: IMenuItem[]) => {
                if (!error) {
                    this._cache.set<IMenuResult>(cacheKey, { value: menu, timestamp: new Date() }, this._config.cacheExpiration);
                } else {
                    this._cache.set<IMenuResult>(cacheKey, { value: error, timestamp: new Date() }, this._config.cacheExpiration / 2);
                }
                doneCallback(this._cache.get<IMenuResult>(cacheKey));
            });
        }
    }

    private load(url: string, date: Date, parser: IParser, doneCallback: (error: Error, menu: IMenuItem[]) => void) {
        // on production (azure) use scraper api for zomato requests, otherwise zomato blocks them
        if (this._config.isProduction && url.search("zomato") >= 0) {
            url = sanitizeUrl(`http://api.scraperapi.com?api_key=${this._config.scraperApiKey}&url=${encodeURIComponent(url)}`);
        }

        if (!isValidUrl(url)) {
            doneCallback(new Error("Invalid URL provided"), null);
            return;
        }

        if (this._runningRequests[url]) { // if request is already running, just add additional callback
            this._runningRequests[url].push(doneCallback);
            return;
        }
        this._runningRequests[url] = [doneCallback];

        const done = (e: Error, m: IMenuItem[]) => {
            const doneCallbacks = this._runningRequests[url];
            delete this._runningRequests[url];
            if (e) {
                console.error("Error for %s: %s", url, e);
            }
            if (doneCallbacks) {
                doneCallbacks.forEach(dc => dc(e, m));
            }
        };

        Axios.get<string>(url, {
            method: "get",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "text/html,*/*",
                "Accept-Language": "sk" // we want response in slovak (useful for menu portals that use localization, like zomato)
            },
            timeout: this._config.requestTimeout
        }).then(response => {
            if (response.status === 200) {
                this.parseFetchedHtml(response.data, date, parser, done);
            }
        }).catch(error => {
            if (this.shouldUseBrowserFallback(url, error)) {
                this.fetchHtmlWithBrowser(url)
                    .then(html => {
                        this.parseFetchedHtml(html, date, parser, done);
                    })
                    .catch(browserError => {
                        console.error("Browser fallback failed for %s: %s", url, browserError && browserError.message ? browserError.message : browserError);
                        done(browserError, null);
                    });
                return;
            }

            console.error("Axios request failed for %s: %s", url, error && error.message ? error.message : error);
            done(error, null);
        });
    }

    private parseFetchedHtml(
        html: string,
        date: Date,
        parser: IParser,
        done: (error: Error, menu: IMenuItem[]) => void
    ): void {
        let timer = setTimeout(() => {
            timer = null; // clear needed as value is kept even after timeout fired
            done(new Error("Parser timeout"), null);
        }, this._config.parserTimeout);

        try {
            parser.parse(html, date, (menu) => {
                if (!timer) {
                    // multiple calls in parser or parser called back after timeout
                    return;
                }
                clearTimeout(timer);
                timer = null;

                done(null, menu);
            });
        } catch (err) {
            clearTimeout(timer);
            timer = null;
            done(err, null);
        }
    }

    private shouldUseBrowserFallback(url: string, error: unknown): boolean {
        if (!url.includes("restauracie.sme.sk")) {
            return false;
        }

        const axiosError = error as {
            response?: {
                status?: number;
                data?: unknown;
            };
        };

        return axiosError.response?.status === 403
            && String(axiosError.response?.data ?? "").includes("Security Verification | SME");
    }

    private async fetchHtmlWithBrowser(url: string): Promise<string> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            await page.setExtraHTTPHeaders({ "Accept-Language": "sk" });
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: this._config.requestTimeout });
            await page.waitForSelector(".dnesne_menu, .ostatne_menu", { timeout: this._config.requestTimeout }).catch(() => undefined);
            return await page.content();
        } finally {
            await page.close().catch(() => undefined);
        }
    }

    private async getBrowser(): Promise<Browser> {
        if (!this._browserPromise) {
            this._browserPromise = puppeteer.launch({ headless: true });
        }

        try {
            return await this._browserPromise;
        } catch (error) {
            this._browserPromise = undefined;
            throw error;
        }
    }
}
