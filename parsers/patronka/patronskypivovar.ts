import axios from "axios";
import * as cheerio from "cheerio";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import Tesseract from "tesseract.js";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { parsePrice } from "../parserUtil";
import { Sme } from "../sme";

const OFFICIAL_PAGE_URL = "https://www.patronskypivovar.sk/";
const MENU_PAGE_URL = "https://restauracie.sme.sk/restauracia/patronsky-pivovar_4270-stare-mesto_2949/denne-menu";
const WEEKDAYS = new Set(["pondelok", "utorok", "streda", "stvrtok", "piatok"]);
const PORTION_PREFIX = /^\s*(?:\d+\s*g|\d+\s*[,.]\s*\d{1,2}\s*[l1])\s*/i;

function normalizeDayName(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
}

function parseOcrMenu(text: string, date: Date): IMenuItem[] {
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const requestedDay = normalizeDayName(format(date, "EEEE", { locale: sk }));
    const targetIndex = lines.findIndex(line => normalizeDayName(line) === requestedDay);

    if (targetIndex < 0) {
        return [];
    }

    const endIndex = lines.findIndex((line, index) =>
        index > targetIndex && WEEKDAYS.has(normalizeDayName(line))
    );
    const section = lines.slice(targetIndex + 1, endIndex < 0 ? lines.length : endIndex);
    const items: IMenuItem[] = [];

    for (const line of section) {
        if (!PORTION_PREFIX.test(line) && items.length > 0 && /^[a-zá-ž]/u.test(line)) {
            const continuation = line.replace(/\s*\(?\s*A\s*\d+(?:\s*,\s*\d+)*\s*\)?\s*$/iu, "").trim();
            items[items.length - 1].text = `${items[items.length - 1].text} ${continuation}`.normalizeWhitespace();
            continue;
        }
        const parsedPrice = parsePrice(line);
        const itemText = (parsedPrice.text || line)
            .replace(PORTION_PREFIX, "")
            .replace(/\(obsahuje:/i, "")
            .replace(/\s*\(?\s*A\s*\d+(?:\s*,\s*\d+)*\s*\)?\s*$/iu, "")
            .normalizeWhitespace()
            .capitalizeFirstLetter();

        if (itemText.length < 3) {
            continue;
        }

        items.push({
            text: itemText,
            price: parsedPrice.price,
            isSoup: items.length === 0
        });
    }

    return items;
}

function isCurrentOfficialMenu(text: string, date: Date): boolean {
    const range = text.match(/\b(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(?:(\d{4})\s*)?[-–]\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})\b/);
    if (!range) {
        return false;
    }
    const endYear = Number(range[6]);
    const startMonth = Number(range[2]);
    const endMonth = Number(range[5]);
    const startYear = range[3] ? Number(range[3]) : endYear - (startMonth > endMonth ? 1 : 0);
    const start = new Date(startYear, startMonth - 1, Number(range[1]));
    const end = new Date(endYear, endMonth - 1, Number(range[4]));
    const requested = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return start.getFullYear() === startYear && start.getMonth() === startMonth - 1 && start.getDate() === Number(range[1])
        && end.getFullYear() === endYear && end.getMonth() === endMonth - 1 && end.getDate() === Number(range[4])
        && requested >= start && requested <= end;
}

function getMenuImageUrl(html: string): string | undefined {
    const $ = cheerio.load(html);
    const officialLink = $("a[href]").filter((_index, element) =>
        /denné\s+menu/i.test($(element).text()) && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test($(element).attr("href") || "")
    ).first().attr("href");
    if (officialLink) {
        try {
            const officialImage = new URL(officialLink, OFFICIAL_PAGE_URL);
            if (officialImage.protocol === "https:" && officialImage.hostname === "www.patronskypivovar.sk") {
                return officialImage.toString();
            }
        } catch {
            // Continue looking for an SME image.
        }
    }
    const linkedMenuImage = $("a[href*='/pictures/menu/4270/'], a[href*='/pictures/menu43/']").first();
    const image = $(".daily-menu-container img, img[src*='/pictures/menu/4270/'], img[src*='/pictures/menu43/']").first();
    const tavilyMenuImage = Array.from(html.matchAll(/\[!\[[^\]]*\]\(([^)]+)\)\]\(([^)]+)\)/g))
        .map(([, , linkedUrl]) => linkedUrl)
        .find(url => /\/pictures\/menu(?:\/4270\/|\d+\/)/i.test(url));
    const imageUrl = linkedMenuImage.attr("href")?.trim()
        || image.closest("a").attr("href")?.trim()
        || image.attr("src")?.trim()
        || tavilyMenuImage;

    if (!imageUrl) {
        return undefined;
    }

    try {
        return new URL(imageUrl, MENU_PAGE_URL).toString();
    } catch {
        return undefined;
    }
}

export class PatronskyPivovar extends Sme implements IParser {
    public async parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): Promise<void> {
        const imageUrl = getMenuImageUrl(html);
        const menuItems = super.parseBase(html, date).filter(item => !/^\[/.test(item.text));

        if (menuItems.length > 0) {
            menuItems[0].isSoup = true;
            menuItems.forEach(item => {
                const result = parsePrice(item.text);
                item.price = Number.isNaN(result.price) ? item.price : result.price;
                item.text = result.text.replace(/^.*\|\s+/, "").replace(/\(obsahuje:/, "").removeAlergens();
            });

            doneCallback(menuItems);
            return;
        }

        if (!imageUrl) {
            doneCallback([]);
            return;
        }

        let ocrMenu: IMenuItem[];
        try {
            let response;
            try {
                response = await axios.get(imageUrl, { responseType: "arraybuffer" });
            } catch (error) {
                const smallUrl = imageUrl.replace(/_orig(\.[a-z]+)(?=\?|$)/i, "_small$1");
                if (smallUrl === imageUrl) {
                    throw error;
                }
                response = await axios.get(smallUrl, { responseType: "arraybuffer" });
            }
            const ocrResult = await Tesseract.recognize(response.data, "slk");
            if (new URL(imageUrl).hostname === "www.patronskypivovar.sk" && !isCurrentOfficialMenu(ocrResult.data.text, date)) {
                console.info("[PatronskyPivovar parser] Official image has no matching menu date range", { date });
                doneCallback([]);
                return;
            }
            ocrMenu = parseOcrMenu(ocrResult.data.text, date);
        } catch (error) {
            console.error("[PatronskyPivovar parser] Image OCR failed:", error instanceof Error ? error.message : error);
            doneCallback([]);
            return;
        }

        doneCallback(ocrMenu);
    }
}
