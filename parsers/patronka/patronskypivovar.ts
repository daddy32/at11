import axios from "axios";
import * as cheerio from "cheerio";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import Tesseract from "tesseract.js";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import { parsePrice } from "../parserUtil";
import { Sme } from "../sme";

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

function getMenuImageUrl(html: string): string | undefined {
    const $ = cheerio.load(html);
    const linkedMenuImage = $("a[href*='/pictures/menu/4270/']").first();
    const image = $(".daily-menu-container img, img[src*='/pictures/menu/4270/']").first();
    const tavilyMenuImage = Array.from(html.matchAll(/\[!\[[^\]]*\]\(([^)]+)\)\]\(([^)]+)\)/g))
        .map(([, , linkedUrl]) => linkedUrl)
        .find(url => url.includes("/pictures/menu/4270/"));
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
        const menuItems = super.parseBase(html, date);

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

        const imageUrl = getMenuImageUrl(html);
        if (!imageUrl) {
            doneCallback([]);
            return;
        }

        let ocrMenu: IMenuItem[];
        try {
            const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
            const ocrResult = await Tesseract.recognize(response.data, "slk");
            ocrMenu = parseOcrMenu(ocrResult.data.text, date);
        } catch (error) {
            console.error("[PatronskyPivovar parser] Image OCR failed:", error instanceof Error ? error.message : error);
            doneCallback([]);
            return;
        }

        doneCallback(ocrMenu);
    }
}
