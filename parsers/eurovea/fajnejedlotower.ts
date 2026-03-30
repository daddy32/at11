import * as cheerio from "cheerio";
import axios from "axios";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import Tesseract from "tesseract.js";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import "../parserUtil";

const DAY_NAMES = ["Pondelok", "Utorok", "Streda", "Stvrtok", "Štvrtok", "Piatok"];
const LETTER_PATTERN = /[A-Za-zÀ-ž]/u;
const LOWERCASE_WORD_PATTERN = /[a-zà-ž]/u;

function normalizeDishText(str: string): string {
    if (!str) {
        return "";
    }

    return str
        .replace(/["]+$/g, "")
        .replace(/\s+a$/g, "")
        .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:[A-Za-zÀ-ž]{1,6})?\s*$/g, "")
        .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:[A-Za-zÀ-ž]{1,3})?\s*$/g, "")
        .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
        .removeAlergens?.()
        .removeOCRArtifacts?.()
        .replace(/\s+(?:[A-ZÀ-Ž]{2,})(?:\s+[A-ZÀ-Ž][a-zà-ž]{1,2})?\s*$/g, "")
        .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:[A-Za-zÀ-ž]{1,3})?\s*$/g, "")
        .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
        .removeMetrics?.()
        .replace(/\s{2,}/g, " ")
        .trim()
        .capitalizeFirstLetter?.();
}

function findDaySection(rawText: string, date: Date): string {
    const dayNum = date.getDate();
    const dayName = format(date, "EEEE", { locale: sk });
    const dayRegex = new RegExp(
        `(${DAY_NAMES.join("|")})\\s*[^\\d\\r\\n|]{0,8}\\|?\\s*${dayNum}\\s*\\.\\s*[A-Za-zÀ-ž]+`,
        "i"
    );
    const dateOnlyRegex = new RegExp(`\\b${dayNum}\\s*\\.\\s*[A-Za-zÀ-ž]+`, "i");
    const dayMatch = dayRegex.exec(rawText) ?? dateOnlyRegex.exec(rawText);

    if (!dayMatch) {
        console.error(`[FajneJedloTower parser] Day section not found in OCR for ${format(date, "yyyy-MM-dd")} (${dayName}).`);
        return "";
    }

    const startIdx = dayMatch.index ?? 0;
    let endIdx = rawText.length;

    for (const day of DAY_NAMES) {
        if (dayMatch[1] && day.toLowerCase() === dayMatch[1].toLowerCase()) {
            continue;
        }

        const nextDayRegex = new RegExp(
            `${day}\\s*[^\\d\\r\\n|]{0,8}\\|?\\s*\\d+\\s*\\.\\s*[A-Za-zÀ-ž]+`,
            "i"
        );
        const nextDayMatch = nextDayRegex.exec(rawText.slice(startIdx + 1));
        if (nextDayMatch) {
            endIdx = Math.min(endIdx, startIdx + 1 + nextDayMatch.index);
        }
    }

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateRegex = new RegExp(`\\b${nextDate.getDate()}\\s*\\.\\s*[A-Za-zÀ-ž]+`, "i");
    const nextDateMatch = nextDateRegex.exec(rawText.slice(startIdx + 1));
    if (nextDateMatch) {
        endIdx = Math.min(endIdx, startIdx + 1 + nextDateMatch.index);
    }

    return rawText.slice(startIdx, endIdx);
}

function normalizeLine(line: string): string {
    return line
        .replace(/[\u201C\u201D\u201E"]/g, "")
        .replace(/\bRolievka\b/gi, "Polievka")
        .replace(/ExKlus[^\s:]*/giu, "Exklusiv")
        .replace(/\bMENU\s*T:/gi, "MENU 1:")
        .replace(/\bMENU\s*\$?3:/gi, "MENU 3:")
        .replace(/\bMENU\s*4:/gi, "MENU 4:")
        .replace(/^.*?\bPolievka\b/i, "Polievka")
        .replace(/^.*?\bMENU\b/i, "MENU")
        .replace(/^.*?\bExklusiv\b/i, "Exklusiv")
        .replace(/^[^A-Za-zÀ-ž0-9]+/gu, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function extractLabeledText(line: string, type: "soup" | "main" | "special"): string | undefined {
    const patterns = {
        soup: /^Polievka\s*\d*:\s*(.+)$/i,
        main: /^MENU(?:\s*\d+)?:\s*(.+)$/i,
        special: /^Exklusiv:\s*(.+)$/i
    };

    const match = line.match(patterns[type]);
    return match ? match[1].trim() : undefined;
}

function cleanupContinuationPrefix(line: string): string {
    return line
        .replace(/^[^A-Za-zÀ-ž]+/gu, "")
        .replace(/^(?:[A-ZÀ-Ž]{1,6}\s+){1,4}/u, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function looksLikeStandaloneMain(line: string): string | undefined {
    const candidateMatch = line.match(/([A-ZÀ-Ž][a-zà-ž]+(?:\s+[a-zà-ž]+){1,}.*)/u);
    if (!candidateMatch) {
        return undefined;
    }

    const candidate = candidateMatch[1].trim();
    if (!candidate || !LETTER_PATTERN.test(candidate)) {
        return undefined;
    }

    const firstWord = candidate.split(/\s+/)[0].toLocaleLowerCase("sk");
    const continuationStarters = new Set([
        "pečenou",
        "pečené",
        "pečená",
        "šalát",
        "hranolky",
        "jogurtový",
        "jogurtová",
        "jogurtove",
        "syr",
        "syrom",
        "omáčka",
        "omáčkou",
        "rukola",
        "zemiaky",
        "ryža",
        "tarhoňa",
        "mrkvou"
    ]);

    if (continuationStarters.has(firstWord)) {
        return undefined;
    }

    return candidate;
}

function finalizeItem(item: IMenuItem | undefined, items: IMenuItem[]): IMenuItem | undefined {
    if (!item) {
        return undefined;
    }

    const cleaned = normalizeDishText(item.text);
    if (cleaned) {
        items.push({
            ...item,
            text: cleaned
        });
    }

    return undefined;
}

function mergeContinuationItems(items: IMenuItem[]): IMenuItem[] {
    const merged: IMenuItem[] = [];
    const continuationStartRegex = /^(?:Pečenou|Čenou|Šalát|Hranolky|Jogurtov|Mrkvou|Syrom|Omáčkou|Rukola)\b/i;

    items.forEach(item => {
        const previous = merged[merged.length - 1];
        if (
            previous &&
            !previous.isSoup &&
            !item.isSoup &&
            continuationStartRegex.test(item.text)
        ) {
            previous.text = normalizeDishText(`${previous.text} ${item.text}`);
            return;
        }

        merged.push({ ...item });
    });

    return merged;
}

export function extractTowerMenuFromText(text: string, date: Date): IMenuItem[] {
    const daySection = findDaySection(text, date);
    if (!daySection) {
        return [];
    }

    const items: IMenuItem[] = [];
    let currentMain: IMenuItem | undefined;
    let currentKind: "main" | "special" | undefined;

    daySection
        .split(/\r?\n/)
        .map(normalizeLine)
        .filter(line => line.length > 0)
        .forEach(line => {
            if (/^(Pondelok|Utorok|Streda|Stvrtok|Štvrtok|Piatok)\b/i.test(line)) {
                currentMain = finalizeItem(currentMain, items);
                currentKind = undefined;
                return;
            }

            const soup = extractLabeledText(line, "soup");
            if (soup) {
                currentMain = finalizeItem(currentMain, items);
                currentKind = undefined;
                items.push({ isSoup: true, text: normalizeDishText(soup), price: 0 });
                return;
            }

            const main = extractLabeledText(line, "main");
            if (main) {
                currentMain = finalizeItem(currentMain, items);
                currentMain = { isSoup: false, text: main, price: 0 };
                currentKind = "main";
                return;
            }

            const special = extractLabeledText(line, "special");
            if (special) {
                currentMain = finalizeItem(currentMain, items);
                currentMain = { isSoup: false, text: special, price: 0 };
                currentKind = "special";
                return;
            }

            const standaloneMain = currentKind === "main" ? looksLikeStandaloneMain(line) : undefined;
            if (standaloneMain) {
                currentMain = finalizeItem(currentMain, items);
                currentMain = { isSoup: false, text: standaloneMain, price: 0 };
                currentKind = "main";
                return;
            }

            if (!currentMain) {
                return;
            }

            const continuation = cleanupContinuationPrefix(line);
            if (!continuation || !LOWERCASE_WORD_PATTERN.test(continuation)) {
                return;
            }

            currentMain.text += ` ${continuation}`;
        });

    finalizeItem(currentMain, items);
    return mergeContinuationItems(items).filter(item => item.text.length > 0);
}

export class FajneJedloTower implements IParser {
    public async parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): Promise<void> {
        try {
            const $ = cheerio.load(html);
            const imageElem = $("section#content img").first();
            const imageUrl = imageElem.attr("src");
            if (!imageUrl) {
                throw new Error("Menu image not found in HTML");
            }

            const fullUrl = imageUrl.startsWith("http") ? imageUrl : `https://fajnejedlo.sk${imageUrl}`;
            const response = await axios.get(fullUrl, { responseType: "arraybuffer" });
            const ocrResult = await Tesseract.recognize(response.data, "slk");
            doneCallback(extractTowerMenuFromText(ocrResult.data.text, date));
        } catch (e) {
            if (e instanceof Error) {
                console.error("[FajneJedloTower parser] Error:", e.stack || e.message);
            } else {
                console.error("[FajneJedloTower parser] Error:", e);
            }

            doneCallback([]);
        }
    }
}
