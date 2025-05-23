// Mdvsr parser for http://intelsys.sk/jedalnylistok.pdf

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import axios from "axios";
import pdf from "pdf-parse";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { parsePrice } from "../parserUtil";
import "../parserUtil";

export class Mdvsr implements IParser {
    public async parse(_: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): Promise<void> {
        try {
            const response = await axios.get("http://intelsys.sk/jedalnylistok.pdf", {
                responseType: "arraybuffer"
            });

            const rawText = (await pdf(response.data)).text;

            const dayName = format(date, "EEEE", { locale: sk }).toLowerCase();
            // console.log("DEBUG: dayName:", dayName);

            const lines = extractDayLines(rawText, dayName);
            // console.log("DEBUG: lines after extractDayLines:", lines);

            // Merge price lines into previous dish line (append only price, not portion/weight)
            const merged: string[] = [];
            const priceRegex = /(\d{1,3}(?:[.,]\d{2}))\s*€?/g;
            let i = 0;
            while (i < lines.length) {
                const line = lines[i];
                // If next line contains a price, merge it into this line
                if (
                    i + 1 < lines.length &&
                    priceRegex.test(lines[i + 1])
                ) {
                    // Always merge the next line if it contains a price, regardless of allergens or extra tokens
                    merged.push(line + " " + lines[i + 1]);
                    i += 2;
                    continue;
                }
                merged.push(line);
                i += 1;
            }

            // Post-process merged lines: merge price-only lines into previous line
            for (let j = 1; j < merged.length; ) {
                if (!/(\d{1,3}(?:[.,]\d{2}))\s*€/.test(merged[j - 1]) && /(\d{1,3}(?:[.,]\d{2}))\s*€/.test(merged[j])) {
                    merged[j - 1] += " " + merged[j];
                    merged.splice(j, 1);
                } else {
                    j++;
                }
            }
            // console.log("DEBUG: merged lines after merging:", merged);
            const menu: IMenuItem[] = [];
            for (const [i, line] of merged.entries()) {
                // DEBUG: Output merged line and price extraction to console
                // console.log("DEBUG: merged line:", line);
                let price = NaN;
                let priceMatch = [...line.matchAll(/(\d{1,3}(?:[.,]\d{2}))\s*€/g)];
                // console.log("DEBUG: priceMatch:", priceMatch);
                if (priceMatch.length > 0) {
                    const last = priceMatch[priceMatch.length - 1][1];
                    price = parseFloat(last.replace(",", "."));
                }

                // Remove price and trailing portion/weight info from dish text
                let text = line
                    .normalizeWhitespace()
                    .removeAlergens()
                    .replace(/(\d{1,3}(?:[.,]\d{2}))\s*€?$/, "") // remove last price at end
                    .replace(/\b\d{1,3}(?:,\d{1,3})*(?:ks)?\b/gi, "") // remove portion/weight info
                    .removeMetrics()
                    .capitalizeFirstLetter()
                    .replace(/[\s,]+$/, "") // remove trailing commas and whitespace
                    .trim();

                // Drop lines that are just numbers/commas/ks or empty after cleaning
                if (
                    !text ||
                    /^[\d,\s]+(ks)?$/.test(text) ||
                    price < 1 || price > 20 // only keep reasonable prices
                ) continue;

                // Only first two items are soup for PIATOK, or if text contains "polievka"
                const isSoup = /polievka/i.test(line) || i < 2;
                menu.push({ text, price, isSoup });
            }
            // REMOVE DUPLICATE MENU LOOP AND DECLARATION

            doneCallback(menu);
        } catch (e) {
            try {
                require("fs").writeFileSync("parser-error-debug.txt", String(e), { encoding: "utf8" });
            } catch (_) {}
            doneCallback([]);
        }
    }
}

function extractDayLines(text: string, dayName: string): string[] {
    const lines = text.split("\n").map(l => l.trim());

    const dayHeaders = ["pondelok", "utorok", "streda", "štvrtok", "piatok"];
    // Find all indices of day headers (case-insensitive, exact match)
    const headerIndices = lines
        .map((l, i) => dayHeaders.includes(l.toLowerCase()) ? i : -1)
        .filter(i => i !== -1);

    // Find the index for today's header
    const todayIdx = lines.findIndex(l => l.toLowerCase() === dayName);
    if (todayIdx < 0) return [];

    // Find the next header after today
    const nextHeaderIdx = headerIndices.find(i => i > todayIdx);
    const endIdx = nextHeaderIdx !== undefined ? nextHeaderIdx : lines.length;

    // Filter out unwanted lines (dates, allergens, footer)
    return lines.slice(todayIdx + 1, endIdx).filter(l => {
        if (l.length < 3) return false;
        return !shouldSkipLine(l);
    });
}

// Helper to skip lines that are just dates, allergens, or footer
function shouldSkipLine(line: string): boolean {
    // Date: dd.mm.yyyy or d.m.yyyy
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(line)) return true;
    // "Jedálny lístok" footer
    if (/^jedálny lístok/i.test(line)) return true;
    // Allergen legend
    if (/alergény|alergén/i.test(line)) return true;
    // Only allergens (e.g. "1,3,7,10")
    if (/^\d{1,2}(,\d{1,2})*$/.test(line)) return true;
    // Only numbers and commas (portion/weight info)
    if (/^[\d,\s]+$/.test(line)) return true;
    // Only allergens/ingredients legend
    if (/orechy|zeler|horčica|sezam|kysličník|obilniny|kôro|ryby|arašidy|sójové|mlieko/i.test(line)) return true;
    return false;
}
