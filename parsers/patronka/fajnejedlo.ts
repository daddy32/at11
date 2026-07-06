import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";
import axios from "axios";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import "../parserUtil";

const DAY_NAMES = ["Pondelok", "Utorok", "Streda", "Stvrtok", "\u0160tvrtok", "Piatok"];
const DAY_HEADER_REGEX = new RegExp(`^(?:${DAY_NAMES.join("|")})\\b`, "i");
const LETTER_PATTERN = /[A-Za-z\u00C0-\u017F]/u;
const LOWERCASE_WORD_PATTERN = /[a-z\u00C0-\u017F]/u;

function normalizeDishText(str: string): string {
  if (!str) {
    return "";
  }

  return str
    .replace(/^Za\s+See/iu, "")
    .replace(/^(?:(?:[A-Z\u00C0-\u017F]{1,4}|[A-Za-z\u00C0-\u017F]{1,3}|\d+)\s+){1,4}(?=[A-Z\u00C0-\u017F][a-z\u00C0-\u017F]{4,})/u, "")
    .replace(/["]+$/, "")
    .replace(/\s+a$/, "")
    .replace(/\s+-\s+(?:[A-Za-z\u00C0-\u017F]{1,3}\s+){4,}.*$/gu, "")
    .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:[A-Za-z\u00C0-\u017F]{1,3})?\s*$/g, "")
    .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
    .removeAlergens?.()
    .removeOCRArtifacts?.()
    .replace(/\s+(?:[A-Z\u00C0-\u017F]{2,})(?:\s+[A-Z\u00C0-\u017F][a-z\u00C0-\u017F]{1,2})?\s*$/g, "")
    .replace(/\s*\((?:\d{1,2}\s*,\s*)*\d{1,2}\)\s*(?:[A-Za-z\u00C0-\u017F]{1,3})?\s*$/g, "")
    .replace(/\s+\d{1,2}(?:\s*,\s*\d{1,2})+\s*$/g, "")
    .replace(/(Tvarohov[éeý]?)(knedl)/giu, "$1 $2")
    .replace(/(Viedensk[ýy]?)(reze)/giu, "$1 $2")
    .replace(/(majon[eé]zov[ýy]?)([sš]al)/giu, "$1 $2")
    .replace(/(bylinkov[aá]?)(om)/giu, "$1 $2")
    .replace(/(dusen[aá]?)(ry)/giu, "$1 $2")
    .replace(/(grilovan[eé]?)(lusk)/giu, "$1 $2")
    .replace(/(Pe(?:c|č)en[aá]?)(tresk)/giu, "$1 $2")
    .replace(/(Brav(?:c|č)ov[ýy]?)(steak)/giu, "$1 $2")
    .replace(
      /([a-z\u00C0-\u017F])(?=(brav(?:c|č)|maslov|zemiak|enci|(?:c|č)erven|ry(?:z|ž)|lusk|steak|tresk|om[aá](?:c|č)|knedl|reze[nň]|[sš]al[aá]t|polni|krust))/giu,
      "$1 "
    )
    .replace(/(Tvarohov\S{0,12}?)(knedl)/giu, "$1 $2")
    .replace(/(Viedensk\S{0,12}?)(reze)/giu, "$1 $2")
    .replace(/(majon\S{0,12}?)([sĹˇ]al)/giu, "$1 $2")
    .replace(/(bylinkov\S{0,12}?)(om)/giu, "$1 $2")
    .replace(/(dusen\S{0,12}?)(ry)/giu, "$1 $2")
    .replace(/(grilovan\S{0,12}?)(lusk)/giu, "$1 $2")
    .replace(/(Pe\S{0,12}?)(tresk)/giu, "$1 $2")
    .replace(/(Brav\S{0,12}?)(steak)/giu, "$1 $2")
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
    .replace(/\b(?:\u0160peci[aá]l|Special)(?:\s+na\s+t[ýy]\u017ede[nň])?:?/gi, "")
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
    const match = nextDayRegex.exec(rawText.slice(startIdx + 1));
    if (match && startIdx + 1 + match.index < endIdx) {
      endIdx = startIdx + 1 + match.index;
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
    .replace(/\b[mM][iI1l]\s*:/g, "\nMENU 1: ")
    .replace(/\b(?:[EAF]?\s*)?MENU\s*([1-4])\s*:/gi, "\nMENU $1: ")
    .replace(/\b(?:F?EXK[^\s:]{0,10}|Exklusiv|Exktusiv)\s*:/giu, "\nExklusiv: ")
    .replace(/\)\s+(?=[A-Z\u00C0-\u017F])/gu, ")\n")
    .replace(/[?!]\s*(?=[A-Z\u00C0-\u017F])/gu, "\n")
    .replace(/\s+(?=(?:Polievka|Rolievka|MENU|Exklusiv)\b)/giu, "\n")
    .split(/\r?\n/)
    .map((line) => line
      .replace(/[\u201C\u201D\u201E"]/g, "")
      .replace(/^[^A-Za-z0-9\u00C0-\u017F]+/g, "")
      .replace(/^.*?\bPolievka\b/i, "Polievka")
      .replace(/^.*?\b(?:MENU|AMEN|ENU|MB)\b/i, "MENU")
      .replace(/^.*?\b(?:F?EXK[^\s:]{0,10}|Exklusiv|Exktusiv)\b/iu, "Exklusiv")
      .trim()
    )
    .join("\n");
}

function parseSoups(daySection: string): IMenuItem[] {
  const soups: IMenuItem[] = [];
  let beforeFirstMain = true;

  daySection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      if (DAY_HEADER_REGEX.test(line)) {
        return;
      }

      if (/^(MENU|Exklusiv)\b/i.test(line)) {
        beforeFirstMain = false;
        return;
      }

      const explicitSoup = line.match(/^Polievka[\s.:-]*[\dIiLl]*[\s.:-]*(.+)$/i);
      if (explicitSoup) {
        const text = normalizeDishText(explicitSoup[1]);
        if (text) {
          soups.push({ isSoup: true, text, price: 0 });
        }
        return;
      }

      if (beforeFirstMain) {
        const text = normalizeDishText(line);
        if (text && looksLikeImplicitSoup(line)) {
          soups.push({ isSoup: true, text, price: 0 });
        }
      }
    });

  return soups;
}

function extractLabeledText(line: string, type: "soup" | "main" | "special"): string | undefined {
  const patterns = {
    soup: /^Polievka[\s.:-]*\d*[\s.:-]*(.+)$/i,
    main: /^MENU[\s.:-]*\d*[\s.:-]*(.+)$/i,
    special: /^Exklusiv[\s.:-]*(.+)$/i
  };

  const match = line.match(patterns[type]);
  return match ? match[1].trim() : undefined;
}

function cleanupStandaloneText(line: string): string {
  return line
    .replace(/^[^A-Za-z\u00C0-\u017F]+/gu, "")
    .replace(/^(?:[A-Z\u00C0-\u017F][a-z\u00C0-\u017F]{0,3}\s*){1,2}(?=[A-Z\u00C0-\u017F][a-z\u00C0-\u017F]{4,})/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeImplicitSoup(line: string): boolean {
  const candidate = cleanupStandaloneText(line);
  if (
    !candidate ||
    !LETTER_PATTERN.test(candidate) ||
    !LOWERCASE_WORD_PATTERN.test(candidate) ||
    /[,;:]/.test(candidate)
  ) {
    return false;
  }

  const words = candidate.split(/\s+/);
  if (words.length < 2 || words.length > 7) {
    return false;
  }

  return !/^[A-Z\u00C0-\u017F]{1,3}$/u.test(candidate);
}

function looksLikeStandaloneMain(line: string): string | undefined {
  const baseCandidate = cleanupStandaloneText(line);
  const candidate = baseCandidate.match(/([A-Z\u00C0-\u017F][a-z\u00C0-\u017F]+(?:\s+[a-zA-Z\u00C0-\u017F.,-]+){1,}.*)/u)?.[1] ?? baseCandidate;
  if (
    !candidate ||
    !LETTER_PATTERN.test(candidate) ||
    !LOWERCASE_WORD_PATTERN.test(candidate) ||
    !/^[A-Z\u00C0-\u017F]/u.test(candidate)
  ) {
    return undefined;
  }

  const firstWord = candidate
    .split(/\s+/)[0]
    .toLocaleLowerCase("sk")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const continuationStarters = new Set([
    "pecene",
    "pecena",
    "peceny",
    "salat",
    "hranolky",
    "jogurtova",
    "jogurtovy",
    "syr",
    "syrom",
    "omacka",
    "rukola",
    "zemiaky",
    "ryza",
    "tarhona",
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

function parseMains(daySection: string): IMenuItem[] {
  const mains: IMenuItem[] = [];
  let currentMain: IMenuItem | undefined;
  let sawSoup = false;
  let sawExplicitMain = false;

  daySection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      if (DAY_HEADER_REGEX.test(line)) {
        currentMain = finalizeItem(currentMain, mains);
        return;
      }

      const soup = extractLabeledText(line, "soup");
      if (soup) {
        sawSoup = true;
        currentMain = finalizeItem(currentMain, mains);
        return;
      }

      const main = extractLabeledText(line, "main");
      if (main) {
        currentMain = finalizeItem(currentMain, mains);
        currentMain = { isSoup: false, text: main, price: 0 };
        sawExplicitMain = true;
        return;
      }

      const special = extractLabeledText(line, "special");
      if (special) {
        currentMain = finalizeItem(currentMain, mains);
        currentMain = { isSoup: false, text: special, price: 0 };
        sawExplicitMain = true;
        return;
      }

      const standalone = looksLikeStandaloneMain(line);
      if (!sawExplicitMain && standalone && looksLikeImplicitSoup(line)) {
        sawSoup = true;
        return;
      }

      if (!sawSoup && mains.length === 0 && !currentMain && standalone) {
        sawSoup = true;
        return;
      }

      if (standalone) {
        currentMain = finalizeItem(currentMain, mains);
        currentMain = { isSoup: false, text: standalone, price: 0 };
        return;
      }

      const continuation = cleanupStandaloneText(line);
      if (currentMain && continuation && LOWERCASE_WORD_PATTERN.test(continuation)) {
        const joinsBrokenWord =
          /[A-Za-z\u00C0-\u017F]$/u.test(currentMain.text) &&
          /^[a-z\u00C0-\u017F]{2,}/u.test(continuation);
        currentMain.text += joinsBrokenWord ? continuation : ` ${continuation}`;
      }
    });

  finalizeItem(currentMain, mains);
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

  if (soups.length === 0) {
    const fallbackSoupLine = cleanedDaySection
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !DAY_HEADER_REGEX.test(line) && !/^(MENU|Exklusiv)\b/i.test(line));
    const fallbackSoup = fallbackSoupLine ? normalizeDishText(cleanupStandaloneText(fallbackSoupLine)) : "";
    if (fallbackSoup) {
      soups.push({ isSoup: true, text: fallbackSoup, price: 0 });
    }
  }

  if (special) {
    mains.unshift({ isSoup: false, text: special, price: 0 });
  }

  const result = [...soups, ...mains].filter((item) => item.text.trim().length > 2);
  if (result.length === 0) {
    console.error(`[FajneJedlo parser] Day section found but no menu items parsed for ${format(date, "yyyy-MM-dd")}.`);
  }

  return result;
}
