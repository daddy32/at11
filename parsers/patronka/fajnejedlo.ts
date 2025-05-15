import puppeteer from "puppeteer";
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
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.goto("https://fajnejedlo.sk/menu-tyzdnove-bistro/", { waitUntil: "networkidle2" });

      // Use the first image inside #content section (menu image)
      const imageUrl = await page.$eval("section#content img", (el: any) => el.getAttribute("src"));
      const fullUrl = imageUrl.startsWith("http") ? imageUrl : `https://fajnejedlo.sk${imageUrl}`;
      await browser.close();

      const response = await axios.get(fullUrl, { responseType: "arraybuffer" });
      const ocrResult = await Tesseract.recognize(response.data, "slk");
      let rawText = ocrResult.data.text;

      // Dump raw OCR text for debugging.
      fs.writeFileSync("fajnejedlo-ocr-debug.txt", rawText, "utf-8");

      // Post-process the OCR text.
      rawText = rawText.tidyAfterOCR();
      rawText = rawText.normalizeWhitespace();
      console.log("[OCR DEBUG]", rawText);

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
