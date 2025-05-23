import * as cheerio from "cheerio";
import { IMenuItem } from "../IMenuItem";
import { IParser } from "../IParser";
import Tesseract from "tesseract.js";
import axios from "axios";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import fs from "fs";
import "../parserUtil";

export class FajneJedlo implements IParser {
  public async parse(html: string, date: Date, doneCallback: (menu: IMenuItem[]) => void): Promise<void> {
    try {
      // Use Cheerio to extract the image URL from the provided HTML
      const $ = cheerio.load(html);
      const img = $("section#content img").first();
      const imageUrl = img.attr("src");
      if (!imageUrl) throw new Error("Menu image not found in HTML");
      const fullUrl = imageUrl.startsWith("http") ? imageUrl : `https://fajnejedlo.sk${imageUrl}`;

      const response = await axios.get(fullUrl, { responseType: "arraybuffer" });
      const ocrResult = await Tesseract.recognize(response.data, "slk");
      let rawText = ocrResult.data.text;

      // Dump raw OCR text for debugging.
      /* fs.writeFileSync("fajnejedlo-ocr-debug.txt", rawText, "utf-8"); // Debug output disabled */
      // Post-process the OCR text.
      /* console.log("[OCR DEBUG] raw: ", rawText); // Debug output disabled */
      let normalizedText = rawText.tidyAfterOCR();
      normalizedText = normalizedText.normalizeWhitespace();
      /* console.log("[OCR DEBUG] normalized: ", normalizedText); // Debug output disabled */

      // Extract menu items for the given date.
      const items: IMenuItem[] = extractMenuFromText(rawText, date);
      doneCallback(items);
    } catch (e) {
      console.error("[FajneJedlo parser] Error:", e);
      doneCallback([]);
    }
  }
}

export function extractMenuFromText(text: string, date: Date): IMenuItem[] {
  // Helper: Slovak day names as they appear in OCR
  const dayNames = [
    "Pondelok", "Utorok", "Streda", "Stvrtok", "Štvrtok", "Piatok"
  ];

  // Normalization helper (based on foodseason/bigger)
  function normalize(str: string): string {
    if (!str) return "";
    return str
      .replace(/["]+$/, "") // Remove trailing quotes
      .replace(/\s+a$/, "") // Remove trailing ' a' if present
      .removeAlergens?.()
      .removeOCRArtifacts?.()
      .removeMetrics?.()
      .trim()
      .capitalizeFirstLetter?.();
  }

  // 1. Extract "Týždňový špeciál" (if present)
  let special = "";
  const specialMatch = text.match(/Týždňový špeciál.*?\n([\s\S]+?)\n(?:Pondelok|Utorok|Streda|Stvrtok|Štvrtok|Piatok)/i);
  if (specialMatch) {
    special = normalize(specialMatch[1].replace(/\n/g, " ").trim());
  }

  // 2. Find current day header (e.g., "Stvrtok 15. máj")
  const dayNum = date.getDate();
  const monthNum = date.getMonth() + 1;
  const dayName = format(date, "EEEE", { locale: sk });
  // OCR may use "Štvrtok" or "Stvrtok" etc.
  const dayRegex = new RegExp(`(${dayNames.join("|")})\\s+${dayNum}\\.\\s*\\w+`, "i");
  const dayMatch = text.match(dayRegex);
  if (!dayMatch) return [];

  // 3. Find start and end indices for the day's section
  const startIdx = dayMatch.index ?? 0;
  // Find next day header after current
  let endIdx = text.length;
  for (const dn of dayNames) {
    if (dn === dayMatch[1]) continue;
    const nextDayRegex = new RegExp(`${dn}\\s+\\d+\\.\\s*\\w+`, "i");
    const m = nextDayRegex.exec(text.slice(startIdx + 1));
    if (m && (startIdx + 1 + m.index) < endIdx) {
      endIdx = startIdx + 1 + m.index;
    }
  }
  const daySection = text.slice(startIdx, endIdx);

  // 4. Extract soups (lines starting with "Polievka")
  const soups: IMenuItem[] = [];
  const soupRegex = /^Polievka\s*\d*\s*(.+)$/gim;
  let soupMatch;
  while ((soupMatch = soupRegex.exec(daySection)) !== null) {
    soups.push({ isSoup: true, text: normalize(soupMatch[1]), price: 0 });
  }

  // 5. Extract main dishes (lines starting with "MENU", "Exklusiv", or the special)
  const mains: IMenuItem[] = [];
  // Add special if present
  if (special) {
    mains.push({ isSoup: false, text: special, price: 0 });
  }
  // MENU lines
  // Match MENU lines, including wrapped lines (lines not starting with MENU, Exklusiv, Polievka)
  const menuRegex = /^MENU\s*\d*\s*((?:.+(?:\r?\n(?!\s*(?:MENU|Exklusiv|Polievka|\w+ok|\w+tok|\w+eda|\w+atok)).+)*)+)/gim;
  let menuMatch;
  while ((menuMatch = menuRegex.exec(daySection)) !== null) {
    // Join wrapped lines and normalize whitespace
    let joined = menuMatch[1].replace(/\r?\n\s*/g, " ");
    // Fix word splits: e.g., "m äso" -> "mäso"
    joined = joined.replace(/(\w)\s+([aáäeéiíoóuúyýžščřďťňĺľŕ])/gi, "$1$2");
    mains.push({ isSoup: false, text: normalize(joined), price: 0 });
  }
  // Exklusiv lines
  // Match Exklusiv lines, including wrapped lines and optional colon (lines not starting with MENU, Exklusiv, Polievka)
  const exklRegex = /^Exklusiv[:\s]+\s*((?:.+(?:\r?\n(?!\s*(?:MENU|Exklusiv|Polievka|\w+ok|\w+tok|\w+eda|\w+atok)).+)*)+)/gim;
  let exklMatch;
  while ((exklMatch = exklRegex.exec(daySection)) !== null) {
    // Join wrapped lines and normalize whitespace
    let joined = exklMatch[1].replace(/\r?\n\s*/g, " ");
    // Fix word splits: e.g., "m äso" -> "mäso"
    joined = joined.replace(/(\w)\s+([aáäeéiíoóuúyýžščřďťňĺľŕ])/gi, "$1$2");
    mains.push({ isSoup: false, text: normalize(joined), price: 0 });
  }

  return [...soups, ...mains];
}
