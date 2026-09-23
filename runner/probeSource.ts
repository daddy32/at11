import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import pdf from "pdf-parse";
import type { Browser, Page } from "puppeteer";

import { IMenuItem } from "../parsers/IMenuItem";
import { getDateRegex } from "../parsers/parserUtil";
import { SME_PDF_TEXT_PREFIX } from "../parsers/sme";
import { ProbeResult, RunnerTarget } from "./types";

interface HttpProbeResponse {
    status: number;
    finalUrl: string;
    body: string;
}

export interface ProbeOptions {
    requestTimeoutMs: number;
    saveRaw: boolean;
    rawOutputDirectory?: string;
    browser?: Browser;
    httpGet?: (url: string, timeoutMs: number) => Promise<HttpProbeResponse>;
    pdfToText?: (bytes: Buffer) => Promise<string>;
    sleep?: (ms: number) => Promise<void>;
}

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function defaultHttpGet(url: string, timeoutMs: number): Promise<HttpProbeResponse> {
    const response = await axios.get<string>(url, {
        timeout: timeoutMs,
        responseType: "text",
        validateStatus: () => true,
        headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,*/*",
            "Accept-Language": "sk"
        }
    });
    const request = response.request as { res?: { responseUrl?: string } } | undefined;
    return {
        status: response.status,
        finalUrl: request?.res?.responseUrl || url,
        body: response.data
    };
}

function isKnownMenuHost(url: string): boolean {
    const hostname = new URL(url).hostname;
    return hostname === "restauracie.sme.sk" || hostname === "www.restauracie.sme.sk"
        || hostname === "menucka.sk" || hostname === "www.menucka.sk";
}

function getSmeExportUrl(url: string): string | undefined {
    const parsed = new URL(url);
    if (parsed.hostname !== "restauracie.sme.sk" && parsed.hostname !== "www.restauracie.sme.sk") {
        return undefined;
    }
    const restaurantId = parsed.pathname.match(/\/restauracia\/.*_(\d+)-/)?.[1];
    return restaurantId ? `${parsed.origin}/export/resmenu/${restaurantId}` : undefined;
}

function contentMarker(url: string): string {
    const hostname = new URL(url).hostname;
    return hostname === "menucka.sk" || hostname === "www.menucka.sk"
        ? ".day-title, .restaurant-weekmenu"
        : ".jedlo_polozka";
}

function hasContentMarker(url: string, html: string): boolean {
    return countContentMarkers(url, html) > 0;
}

function countContentMarkers(url: string, html: string): number {
    return cheerio.load(html)(contentMarker(url)).length;
}

function emptyMenuClassification(date: Date, content: string, markerCount: number): "no-menu" | "empty" {
    return markerCount > 0 && !getDateRegex(date).test(content) ? "no-menu" : "empty";
}

function pageTitle(html: string): string {
    return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
}

function isChallenge(status: number | null, title: string, html: string, markerCount: number): boolean {
    return status === 403 || status === 429
        || /len chvíľu|just a moment|attention required/i.test(title)
        || (markerCount === 0 && /cloudflare.*challenge|cf-chl-|cf-browser-verification|captcha|checking your browser/i.test(html));
}

function safeError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message
        .replace(/https?:\/\/[^\s)]+/g, value => {
            try {
                const parsed = new URL(value);
                parsed.username = "";
                parsed.password = "";
                parsed.search = "";
                return parsed.toString();
            } catch {
                return "[URL redacted]";
            }
        })
        .replace(/\b(authorization|api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

async function saveRawText(options: ProbeOptions, target: RunnerTarget, startedAt: string, kind: string, content: string, isHtml: boolean): Promise<void> {
    if (!options.saveRaw) {
        return;
    }
    if (!options.rawOutputDirectory) {
        throw new Error("Raw output directory is required when --save-raw is enabled");
    }
    let text = content;
    if (isHtml) {
        const $ = cheerio.load(content);
        $("script, style, noscript, iframe, form, input, meta").remove();
        text = $.root().text();
    }
    text = text.replace(/\s+/g, " ").trim()
        .replace(/\b(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret|cookie)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
    await fs.mkdir(options.rawOutputDirectory, { recursive: true, mode: 0o700 });
    const filename = `${target.sourceId}-${startedAt.replace(/[:.]/g, "-")}-${process.pid}-${kind}.txt`;
    await fs.writeFile(path.join(options.rawOutputDirectory, filename), text + "\n", { flag: "wx", mode: 0o600 });
}

function parseMenu(target: RunnerTarget, html: string, date: Date, timeoutMs: number): Promise<IMenuItem[]> {
    return new Promise((resolve, reject) => {
        let complete = false;
        const timer = setTimeout(() => {
            complete = true;
            reject(new Error("Parser timeout"));
        }, timeoutMs);
        try {
            target.parser.parse(html, date, items => {
                if (!complete) {
                    complete = true;
                    clearTimeout(timer);
                    resolve(items);
                }
            });
        } catch (error) {
            if (!complete) {
                complete = true;
                clearTimeout(timer);
                reject(error);
            }
        }
    });
}

async function fetchPdfText(page: Page, exportUrl: string, pdfToText: (bytes: Buffer) => Promise<string>): Promise<string> {
    const base64 = await page.evaluate(async url => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`SME export returned HTTP ${response.status}`);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/pdf") && String.fromCharCode(...bytes.subarray(0, 4)) !== "%PDF") {
            throw new Error("SME export did not return a PDF");
        }
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        }
        return btoa(binary);
    }, exportUrl);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.subarray(0, 4).toString() !== "%PDF") {
        throw new Error("SME export did not return a PDF");
    }
    return pdfToText(bytes);
}

export async function probeSource(target: RunnerTarget, date: Date, options: ProbeOptions): Promise<ProbeResult> {
    const startedAt = new Date();
    const result: ProbeResult = {
        sourceId: target.sourceId,
        restaurant: target.restaurantName,
        requestedUrl: "",
        finalUrl: null,
        transport: "none",
        httpStatus: null,
        title: "",
        contentLength: 0,
        contentMarkerCount: 0,
        classification: "error",
        challengeDetected: false,
        menuItemCount: 0,
        items: [],
        startedAt: startedAt.toISOString(),
        elapsedMs: 0,
        error: null
    };

    try {
        const url = target.urlFactory(date);
        result.requestedUrl = url;
        const response = await (options.httpGet || defaultHttpGet)(url, options.requestTimeoutMs);
        result.transport = "direct-http";
        result.httpStatus = response.status;
        result.finalUrl = response.finalUrl;
        result.title = pageTitle(response.body);
        result.contentLength = response.body.length;
        result.contentMarkerCount = countContentMarkers(url, response.body);
        result.challengeDetected = isChallenge(response.status, result.title, response.body, result.contentMarkerCount);
        await saveRawText(options, target, result.startedAt, "http", response.body, true);

        if (response.status === 200 && !result.challengeDetected) {
            const items = await parseMenu(target, response.body, date, options.requestTimeoutMs);
            if (items.length > 0) {
                result.items = items;
                result.menuItemCount = items.length;
                result.classification = "success";
                return result;
            }
            result.classification = emptyMenuClassification(date, response.body, result.contentMarkerCount);
            return result;
        }

        if (!isKnownMenuHost(url) || !options.browser || (response.status !== 403 && response.status !== 429 && !result.challengeDetected)) {
            result.classification = result.challengeDetected ? "challenge" : "error";
            result.error = result.classification === "error" ? `HTTP ${response.status}` : null;
            return result;
        }

        const page = await options.browser.newPage();
        try {
            await page.setUserAgent(userAgent);
            await page.setExtraHTTPHeaders({ "Accept-Language": "sk" });
            let html = "";
            for (let attempt = 0; attempt < 2; attempt += 1) {
                const navigation = await page.goto(url, { waitUntil: "domcontentloaded", timeout: options.requestTimeoutMs });
                await page.waitForSelector(contentMarker(url), { timeout: Math.min(options.requestTimeoutMs, 15000) }).catch(() => undefined);
                html = await page.content();
                result.transport = "browser-html";
                result.httpStatus = navigation?.status() || null;
                result.finalUrl = page.url();
                result.title = await page.title().catch(() => "");
                result.contentLength = html.length;
                result.contentMarkerCount = countContentMarkers(url, html);
                result.challengeDetected = isChallenge(result.httpStatus, result.title, html, result.contentMarkerCount);
                await saveRawText(options, target, result.startedAt, `browser-${attempt + 1}`, html, true);

                if (hasContentMarker(url, html) && !result.challengeDetected) {
                    const items = await parseMenu(target, html, date, options.requestTimeoutMs);
                    if (items.length > 0) {
                        result.items = items;
                        result.menuItemCount = items.length;
                        result.classification = "success";
                        return result;
                    }
                    result.classification = emptyMenuClassification(date, html, result.contentMarkerCount);
                    return result;
                }

                if (attempt === 0) {
                    await (options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms))))(1000);
                }
            }

            const exportUrl = getSmeExportUrl(url);
            if (exportUrl) {
                try {
                    const pdfText = await fetchPdfText(page, exportUrl, options.pdfToText || (async bytes => (await pdf(bytes)).text));
                    await saveRawText(options, target, result.startedAt, "pdf-text", pdfText, false);
                    const items = await parseMenu(target, SME_PDF_TEXT_PREFIX + pdfText, date, options.requestTimeoutMs);
                    result.transport = "sme-export-pdf";
                    result.contentLength = pdfText.length;
                    result.contentMarkerCount = 0;
                    if (items.length > 0) {
                        result.items = items;
                        result.menuItemCount = items.length;
                        result.classification = "success";
                        return result;
                    }
                    result.classification = getDateRegex(date).test(pdfText) ? "empty" : "no-menu";
                    return result;
                } catch (error) {
                    result.error = safeError(error);
                }
            }

            result.classification = result.challengeDetected ? "challenge" : "empty";
            return result;
        } finally {
            await page.close().catch(() => undefined);
        }
    } catch (error) {
        result.classification = "error";
        result.error = safeError(error);
        return result;
    } finally {
        result.elapsedMs = Date.now() - startedAt.getTime();
    }
}
