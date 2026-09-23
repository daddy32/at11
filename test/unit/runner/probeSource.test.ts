import { expect } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import type { Browser, Page } from "puppeteer";

import { probeSource } from "../../../runner/probeSource";
import { getRunnerTargets } from "../../../runner/targets";

const date = new Date(2026, 8, 21, 12);
const smeTarget = getRunnerTargets(["eurovea-4"])[0];
const menuTarget = getRunnerTargets(["eurovea-1"])[0];

function makeBrowser(html: string, title: string, pdfBase64?: string) {
    let closed = false;
    const page = {
        setUserAgent: async () => undefined,
        setExtraHTTPHeaders: async () => undefined,
        goto: async () => ({ status: () => 200 }),
        waitForSelector: async () => undefined,
        content: async () => html,
        title: async () => title,
        url: () => smeTarget.urlFactory(date),
        evaluate: async () => {
            if (!pdfBase64) {
                throw new Error("PDF unavailable");
            }
            return pdfBase64;
        },
        close: async () => { closed = true; }
    } as unknown as Page;
    const browser = { newPage: async () => page } as unknown as Browser;
    return { browser, wasClosed: () => closed };
}

describe("source probe", () => {
    it("parses a normal direct HTML menu for the requested date", async () => {
        const html = `<div class="dnesne_menu"><h2>Pondelok (21.09.2026)</h2>
            <div class="jedlo_polozka"><div class="left">Polievka</div></div>
            <div class="jedlo_polozka"><div class="left">Hubový krém</div></div>
            <div class="jedlo_polozka"><div class="left">Hlavné jedlo</div></div>
            <div class="jedlo_polozka"><div class="left">Kuracie prsia</div><div class="right">8.90 €</div></div>
        </div>`;

        const result = await probeSource(smeTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            httpGet: async url => ({ status: 200, finalUrl: url, body: html })
        });

        expect(result.classification).to.equal("success");
        expect(result.transport).to.equal("direct-http");
        expect(result.menuItemCount).to.equal(2);
        expect(result.items[1].text).to.equal("Kuracie prsia");
    });

    it("does not treat a menu page with a reCAPTCHA script as a challenge", async () => {
        const html = "<script src=\"https://www.google.com/recaptcha/api.js\"></script>"
            + "<div class=\"dnesne_menu\"><h2>Pondelok (21.09.2026)</h2>"
            + "<div class=\"jedlo_polozka\"><div class=\"left\">Polievka</div></div>"
            + "<div class=\"jedlo_polozka\"><div class=\"left\">Vývar</div></div></div>";

        const result = await probeSource(smeTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            httpGet: async url => ({ status: 200, finalUrl: url, body: html })
        });

        expect(result.classification).to.equal("success");
    });

    it("redacts a challenge token from a redirected diagnostic URL", async () => {
        const html = "<div class=\"dnesne_menu\"><h2>Pondelok (21.09.2026)</h2>"
            + "<div class=\"jedlo_polozka\"><div class=\"left\">Polievka</div></div>"
            + "<div class=\"jedlo_polozka\"><div class=\"left\">Vývar</div></div></div>";
        const result = await probeSource(smeTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            httpGet: async url => ({ status: 200, finalUrl: `${url}?__cf_chl_tk=fake-sensitive-value`, body: html })
        });

        expect(result.classification).to.equal("success");
        expect(result.finalUrl).to.include("__cf_chl_tk");
        expect(result.finalUrl).not.to.include("fake-sensitive-value");
    });

    it("classifies a browser HTTP 200 challenge as a failed fetch", async () => {
        const { browser, wasClosed } = makeBrowser("<html><title>Len chvíľu...</title><body>Cloudflare challenge</body></html>", "Len chvíľu...");

        const result = await probeSource(smeTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            browser,
            sleep: async () => undefined,
            httpGet: async url => ({ status: 403, finalUrl: url, body: "Blocked" })
        });

        expect(result.classification).to.equal("challenge");
        expect(result.challengeDetected).to.equal(true);
        expect(result.httpStatus).to.equal(200);
        expect(result.items).to.deep.equal([]);
        expect(wasClosed()).to.equal(true);
    });

    it("records browser menu markers and parses the browser page", async () => {
        const html = "<html><title>Denné menu</title><div class=\"dnesne_menu\"><h2>Pondelok (21.09.2026)</h2>"
            + "<div class=\"jedlo_polozka\"><div class=\"left\">Polievka</div></div>"
            + "<div class=\"jedlo_polozka\"><div class=\"left\">Vývar</div></div></div></html>";
        const { browser } = makeBrowser(html, "Denné menu");

        const result = await probeSource(smeTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            browser,
            httpGet: async url => ({ status: 403, finalUrl: url, body: "Blocked" })
        });

        expect(result.classification).to.equal("success");
        expect(result.transport).to.equal("browser-html");
        expect(result).to.have.property("contentMarkerCount", 2);
        expect(result).to.have.property("contentLength", html.length);
        expect(result.items[0].text).to.equal("Vývar");
    });

    it("uses the SME export PDF text with the configured parser", async () => {
        const { browser } = makeBrowser("<html><title>Len chvíľu...</title></html>", "Len chvíľu...", Buffer.from("%PDFfake").toString("base64"));
        const pdfText = "Pondelok 21.09.2026\nDenná polievka\nHríbová polievka 0,33 l\n1.99 €\nJedlo dňa č.1\nKuracie prsia 150 g\n7.29 €";

        const result = await probeSource(smeTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            browser,
            sleep: async () => undefined,
            pdfToText: async () => pdfText,
            httpGet: async url => ({ status: 403, finalUrl: url, body: "Blocked" })
        });

        expect(result.classification).to.equal("success");
        expect(result.transport).to.equal("sme-export-pdf");
        expect(result.menuItemCount).to.equal(2);
        expect(result.items[0].text).to.equal("Hríbová polievka");
    });

    it("classifies a normal page without menu rows as empty", async () => {
        const { browser } = makeBrowser("<html><title>Denné menu</title><body>Restaurant information</body></html>", "Denné menu");

        const result = await probeSource(menuTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            browser,
            sleep: async () => undefined,
            httpGet: async url => ({ status: 403, finalUrl: url, body: "Blocked" })
        });

        expect(result.classification).to.equal("empty");
        expect(result.items).to.deep.equal([]);
    });

    it("does not call a dated but unparseable menu a no-menu day", async () => {
        const html = "<div class=\"dnesne_menu\"><h2>Pondelok (21.09.2026)</h2>"
            + "<div class=\"jedlo_polozka\"></div></div>";
        const result = await probeSource(smeTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            httpGet: async url => ({ status: 200, finalUrl: url, body: html })
        });

        expect(result.classification).to.equal("empty");
    });

    it("returns an error result when the HTTP transport fails", async () => {
        const result = await probeSource(menuTarget, date, {
            requestTimeoutMs: 1000,
            saveRaw: false,
            httpGet: async () => { throw new Error("network unavailable"); }
        });

        expect(result.classification).to.equal("error");
        expect(result.error).to.equal("network unavailable");
        expect(result.items).to.deep.equal([]);
    });

    it("saves only sanitized page text when raw capture is enabled", async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "at11-raw-test-"));
        const html = "<html><script>token=example-secret</script><body>"
            + "<div class=\"day-title\">Other day</div><p>Lunch available</p></body></html>";
        try {
            const result = await probeSource(menuTarget, date, {
                requestTimeoutMs: 1000,
                saveRaw: true,
                rawOutputDirectory: directory,
                httpGet: async url => ({ status: 200, finalUrl: url, body: html })
            });
            const files = await fs.readdir(directory);
            expect(result.classification).to.equal("no-menu");
            expect(files).to.have.length(1);
            const content = await fs.readFile(path.join(directory, files[0]), "utf8");
            expect(content).to.include("Lunch available");
            expect(content).not.to.include("example-secret");
            expect(content).not.to.include("<script>");
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    });
});
