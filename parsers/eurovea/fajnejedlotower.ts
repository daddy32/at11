import * as cheerio from "cheerio";
import axios from "axios";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import Tesseract from "tesseract.js";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import "../parserUtil";

const DAY_NAMES = ["Pondelok", "Utorok", "Streda", "Stvrtok", "Štvrtok", "Piatok"];
const LETTER_PATTERN = /\p{L}/u;
const LOWERCASE_WORD_PATTERN = /\p{Ll}/u;

function normalizeDishText(str: string): string {
    if (!str) {
        return "";
    }

    return str
        .replace(/["]+$/g, "")
        .replace(/\s+a$/g, "")
        .replace(/^\p{Lu}\p{Ll}{0,2}\s+(?=\p{Lu}\p{Ll}{2,})/u, "")
        .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:\p{L}{1,6})?\s*$/gu, "")
        .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:\p{L}{1,3})?\s*$/gu, "")
        .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
        .removeAlergens?.()
        .removeOCRArtifacts?.()
        .replace(/\s+(?:\p{Lu}{2,})(?:\s+\p{Lu}\p{Ll}{1,2})?\s*$/gu, "")
        .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:\p{L}{1,3})?\s*$/gu, "")
        .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
        .removeMetrics?.()
        .replace(/\s{2,}/g, " ")
        .trim()
        .capitalizeFirstLetter?.();
}

function findDaySection(rawText: string, date: Date): string {
    const dayNum = date.getDate();
    const dayName = format(date, "EEEE", { locale: sk });
    const dateToken = `${dayNum}\\s*\\.?\\s*\\p{L}+`;
    const dayRegex = new RegExp(
        `(${DAY_NAMES.join("|")})\\s*[^\\d\\r\\n|]{0,8}\\|?\\s*${dateToken}`,
        "iu"
    );
    const dateOnlyRegex = new RegExp(`\\b${dateToken}`, "iu");
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
            `${day}\\s*[^\\d\\r\\n|]{0,8}\\|?\\s*\\d+\\s*\\.?\\s*\\p{L}+`,
            "iu"
        );
        const nextDayMatch = nextDayRegex.exec(rawText.slice(startIdx + 1));
        if (nextDayMatch) {
            endIdx = Math.min(endIdx, startIdx + 1 + nextDayMatch.index);
        }
    }

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateRegex = new RegExp(`\\b${nextDate.getDate()}\\s*\\.?\\s*\\p{L}+`, "iu");
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
        .replace(/\bPENU\b/gi, "MENU")
        .replace(/ExKlus[^\s:]*/giu, "Exklusiv")
        .replace(/Bxklus[^\s:]*/giu, "Exklusiv")
        .replace(/\bMENU\s*T:/gi, "MENU 1:")
        .replace(/\bMENU\s*T\b/gi, "MENU 1")
        .replace(/\bMENU\s*\$?3:/gi, "MENU 3:")
        .replace(/\bMENU\s*4:/gi, "MENU 4:")
        .replace(/^.*?\bPolievka\b/i, "Polievka")
        .replace(/^.*?\bMENU\b/i, "MENU")
        .replace(/^.*?\bExklusiv\b/i, "Exklusiv")
        .replace(/^[^\p{L}0-9]+/gu, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function extractLabeledText(line: string, type: "soup" | "main" | "special"): string | undefined {
    const patterns = {
        soup: /^Polievka\s*\d*\s*[:>]?\s*(.+)$/i,
        main: /^MENU(?:\s*(?:\d+|[TI]))?\s*[:>]?\s+(.+)$/i,
        special: /^Exklusiv\s*[:>]?\s*(.+)$/i
    };

    const match = line.match(patterns[type]);
    return match ? match[1].trim() : undefined;
}

function cleanupContinuationPrefix(line: string): string {
    return line
        .replace(/^[^\p{L}]+/gu, "")
        .replace(/^(?:\p{Lu}{1,6}\s+){1,4}/u, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function looksLikeStandaloneMain(line: string): string | undefined {
    const candidate = cleanupContinuationPrefix(line)
        .replace(/^\p{Lu}\p{Ll}{0,2}\s+(?=\p{Lu}\p{Ll}{2,})/u, "");
    const candidateMatch = candidate.match(/(\p{Lu}\p{Ll}+(?:\s+[\p{L}\-.,]+){1,}.*)/u);
    if (!candidateMatch) {
        return undefined;
    }

    const standalone = candidateMatch[1].trim();
    if (!standalone || !LETTER_PATTERN.test(standalone)) {
        return undefined;
    }

    const firstWord = standalone.split(/\s+/)[0].toLocaleLowerCase("sk");
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

    return standalone;
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
