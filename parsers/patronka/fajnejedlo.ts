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
      fs.writeFileSync("fajnejedlo-ocr-debug.txt", rawText, "utf-8");

      // Post-process the OCR text.
      console.log("[OCR DEBUG] raw: ", rawText);
      let normalizedText = rawText.tidyAfterOCR();
      normalizedText = normalizedText.normalizeWhitespace();
      console.log("[OCR DEBUG] normalized: ", normalizedText);

      // Extract menu items for the given date.
      const items: IMenuItem[] = extractMenuFromText(rawText, date);
      doneCallback(items);
    } catch (e) {
      console.error("[FajneJedlo parser] Error:", e);
      doneCallback([]);
    }
  }
}

function extractMenuFromText(text: string, date: Date): IMenuItem[] {
  // Locate section for the specified day using Slovak day names.
  const dayName = format(date, "EEEE", { locale: sk });
  // TODO: Implement detailed parsing logic using regex.
  // For now, return an empty array.
  return [];
}
