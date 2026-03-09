import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";
import axios from "axios";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import "../parserUtil";

const DAY_NAMES = ["Pondelok", "Utorok", "Streda", "Stvrtok", "Štvrtok", "Piatok"];

function normalizeDishText(str: string): string {
  if (!str) {
    return "";
  }

  return str
    .replace(/["]+$/, "")
    .replace(/\s+a$/, "")
    .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:[A-Za-z\u00C0-\u017F]{1,3})?\s*$/g, "")
    .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
    .removeAlergens?.()
    .removeOCRArtifacts?.()
    .replace(/\s+(?:[A-Z\u00C0-\u017F]{2,})(?:\s+[A-Z\u00C0-\u017F][a-z\u00C0-\u017F]{1,2})?\s*$/g, "")
    .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:[A-Za-z\u00C0-\u017F]{1,3})?\s*$/g, "")
    .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
    .replace(/([a-z\u00C0-\u017F])(?=(bravč|maslov|zemiak|enci|červen))/giu, "$1 ")
    .removeMetrics?.()
    .replace(/\s{2,}/g, " ")
    .trim()
    .capitalizeFirstLetter?.();
}

function normalizeWeeklySpecial(str: string): string {
  if (!str) {
    return "";
  }

  return str
    .replace(/\*\*/g, "")
    .replace(/\b(?:Špeci[aá]l|Special)(?:\s+na\s+t[ýy]žde[nň])?:?/gi, "")
    .replace(/^.*?\b([QO]uesadilla\b)/i, "$1")
    .replace(/\bOuesadilla\b/i, "Quesadilla")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractWeeklySpecial(rawText: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/[\u201C\u201D\u201E"]/g, "").trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalized = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    if (/(quesad|ouesad)/.test(normalized)) {
      return line;
    }

    if (/(specia|special|tyzden)/.test(normalized)) {
      const neighbors = [lines[i + 1], lines[i + 2]].filter(Boolean);
      const candidate = neighbors.find((nextLine) => /(quesad|ouesad)/i.test(nextLine));
      if (candidate) {
        return candidate;
      }

      if (line.includes(":")) {
        const afterColon = line.split(":").slice(1).join(":").trim();
        if (afterColon.length > 12 && afterColon.includes(" ")) {
          return afterColon;
        }
      }
    }
  }

  return "";
}

function findDaySection(rawText: string, date: Date): string {
  const dayNum = date.getDate();
  const dayName = format(date, "EEEE", { locale: sk });
  const dayRegex = new RegExp(
    `(${DAY_NAMES.join("|")})\\s*[^\\d\\r\\n]{0,8}\\s*${dayNum}\\s*\\.\\s*[A-Za-z\\u00C0-\\u017F]+`,
    "i"
  );
  const dateOnlyRegex = new RegExp(`\\b${dayNum}\\s*\\.\\s*[A-Za-z\\u00C0-\\u017F]+`, "i");
  const dayMatch = dayRegex.exec(rawText) ?? dateOnlyRegex.exec(rawText);

  if (!dayMatch) {
    console.error(`[FajneJedlo parser] Day section not found in OCR for ${format(date, "yyyy-MM-dd")} (${dayName}).`);
    return "";
  }

  const startIdx = dayMatch.index ?? 0;
  let endIdx = rawText.length;
  for (const day of DAY_NAMES) {
    if (day === dayMatch[1]) {
      continue;
    }

    const nextDayRegex = new RegExp(
      `${day}\\s*[^\\d\\r\\n]{0,8}\\s*\\d+\\s*\\.\\s*[A-Za-z\\u00C0-\\u017F]+`,
      "i"
    );
    const m = nextDayRegex.exec(rawText.slice(startIdx + 1));
    if (m && startIdx + 1 + m.index < endIdx) {
      endIdx = startIdx + 1 + m.index;
    }
  }

  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateRegex = new RegExp(`\\b${nextDate.getDate()}\\s*\\.\\s*[A-Za-z\\u00C0-\\u017F]+`, "i");
  const nextDateMatch = nextDateRegex.exec(rawText.slice(startIdx + 1));
  if (nextDateMatch) {
    const nextDateIdx = startIdx + 1 + nextDateMatch.index;
    if (nextDateIdx < endIdx) {
      endIdx = nextDateIdx;
    }
  }

  return rawText.slice(startIdx, endIdx);
}

function normalizeDaySection(daySection: string): string {
  return daySection
    .split(/\r?\n/)
    .map((line) => line
      .replace(/[\u201C\u201D\u201E"]/g, "")
      .replace(/^[^A-Za-z0-9\u00C0-\u017F]+/g, "")
      .replace(/^.*?\bPolievka\b/i, "Polievka")
      .replace(/^.*?\b(?:MENU|AMEN|ENU|MB)\b/i, "MENU")
      .replace(/^.*?\b(?:Exklusiv|Exktusiv)\b/i, "Exklusiv")
      .trim()
    )
    .join("\n");
}

function parseSoups(daySection: string): IMenuItem[] {
  const soups: IMenuItem[] = [];
  const soupRegex = /^Polievka[\s.:-]*\d*[\s.:-]*(.+)$/gim;
  let soupMatch: RegExpExecArray | null;
  while ((soupMatch = soupRegex.exec(daySection)) !== null) {
    soups.push({ isSoup: true, text: normalizeDishText(soupMatch[1]), price: 0 });
  }
  return soups;
}

function parseMains(daySection: string): IMenuItem[] {
  const mains: IMenuItem[] = [];
  const menuRegex = /^MENU[\s.:-]*\d*[\s.:-]*((?:.+(?:\r?\n(?!\s*(?:MENU|Exklusiv|Polievka|\w+ok|\w+tok|\w+eda|\w+atok)).+)*)+)/gim;
  let menuMatch: RegExpExecArray | null;
  while ((menuMatch = menuRegex.exec(daySection)) !== null) {
    let joined = menuMatch[1].replace(/\r?\n\s*/g, " ");
    joined = joined.replace(/\b([A-Za-z\u00C0-\u017F])\s+([A-Za-z\u00C0-\u017F]{2,})/g, (m, first, rest) => {
      const preserved = ["a", "i", "k", "o", "s", "u", "v", "z"];
      return preserved.includes(first.toLowerCase()) ? `${first} ${rest}` : `${first}${rest}`;
    });
    mains.push({ isSoup: false, text: normalizeDishText(joined), price: 0 });
  }

  const exklRegex = /^Exklusiv[\s.:-]*((?:.+(?:\r?\n(?!\s*(?:MENU|Exklusiv|Polievka|\w+ok|\w+tok|\w+eda|\w+atok)).+)*)+)/gim;
  let exklMatch: RegExpExecArray | null;
  while ((exklMatch = exklRegex.exec(daySection)) !== null) {
    let joined = exklMatch[1].replace(/\r?\n\s*/g, " ");
    joined = joined.replace(/\b([A-Za-z\u00C0-\u017F])\s+([A-Za-z\u00C0-\u017F]{2,})/g, (m, first, rest) => {
      const preserved = ["a", "i", "k", "o", "s", "u", "v", "z"];
      return preserved.includes(first.toLowerCase()) ? `${first} ${rest}` : `${first}${rest}`;
    });
    mains.push({ isSoup: false, text: normalizeDishText(joined), price: 0 });
  }

  return mains;
}

export class FajneJedlo implements IParser {
  public async parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): Promise<void> {
    const debugEnabled = process.env.FAJNEJEDLO_DEBUG === "1";

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
      const rawText = ocrResult.data.text;

      if (debugEnabled) {
        console.log(`[FajneJedlo parser] OCR text length: ${rawText.length}`);
      }

      const items = extractMenuFromText(rawText, date);
      if (items.length === 0) {
        console.error(`[FajneJedlo parser] Parsed 0 items for date ${format(date, "yyyy-MM-dd")}`);
        if (debugEnabled) {
          console.log("[FajneJedlo parser] OCR preview:", rawText.slice(0, 1000));
        }
      }

      doneCallback(items);
    } catch (e) {
      if (e instanceof Error) {
        console.error("[FajneJedlo parser] Error:", e.stack || e.message);
      } else {
        console.error("[FajneJedlo parser] Error:", e);
      }
      doneCallback([]);
    }
  }
}

export function extractMenuFromText(text: string, date: Date): IMenuItem[] {
  const special = normalizeDishText(normalizeWeeklySpecial(extractWeeklySpecial(text)));
  const daySection = findDaySection(text, date);
  if (!daySection) {
    return [];
  }

  const cleanedDaySection = normalizeDaySection(daySection);
  const soups = parseSoups(cleanedDaySection);
  const mains = parseMains(cleanedDaySection);

  if (special) {
    mains.unshift({ isSoup: false, text: special, price: 0 });
  }

  const result = [...soups, ...mains].filter((item) => item.text.length > 0);
  if (result.length === 0) {
    console.error(`[FajneJedlo parser] Day section found but no menu items parsed for ${format(date, "yyyy-MM-dd")}.`);
  }

  return result;
}
