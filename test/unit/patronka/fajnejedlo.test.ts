import "../../../parsers/parserUtil";
import { expect } from "chai";
import path from "path";
import Tesseract from "tesseract.js";

import { extractMenuFromText } from "../../../parsers/patronka/fajnejedlo";

describe("FajneJedlo Parser", () => {
  describe("Wrapped MENU line parsing", () => {
    it("should correctly join wrapped MENU 3 lines", () => {
      const date = new Date(2025, 4, 23); // month is 0-based
      const ocrText = `
Piatok 23. maj
Polievka 1 Slepacia s rezancami
Polievka 2 Zeleninova
MENU 1 Bravcovy rezen, zemiakova kasa
MENU 2 Kuracie prsia na prirodno, ryza
MENU 3 Grilovane dvojicky (bravcove kare, kuracie prsia), hrasok s kukuricou na masle, pecene m
aso, zemiaky
Exklusiv Losos na masle, salat
`;

      const items = extractMenuFromText(ocrText, date);
      const menu3 = items.find((item) => !item.isSoup && item.text.startsWith("Grilovane dvojicky"));

      expect(menu3, "MENU 3 not found in parsed items").to.not.equal(undefined);
      expect(menu3!.text).to.not.include("\n");
      expect(menu3!.text).to.not.match(/m$/);
      expect(menu3!.text).to.include("maso, zemiaky");
    });
  });

  describe("Exklusiv menu item parsing", () => {
    it("should correctly parse Exklusiv menu item", () => {
      const date = new Date(2025, 4, 23); // month is 0-based
      const ocrText = `
Piatok 23. maj
Polievka 1 Slepacia s rezancami
Polievka 2 Zeleninova
MENU 1 Bravcovy rezen, zemiakova kasa
MENU 2 Kuracie prsia na prirodno, ryza
MENU 3 Grilovane dvojicky (bravcove kare, kuracie prsia), hrasok s kukuricou na masle, pecene maso, zemiaky
Exklusiv Viedensky rezen, slovensky zemiakovy salat
`;

      const items = extractMenuFromText(ocrText, date);
      const exkl = items.find((item) => !item.isSoup && item.text.startsWith("Viedensky rezen"));

      expect(exkl, "Exklusiv menu item not found in parsed items").to.not.equal(undefined);
      expect(exkl!.text).to.not.include("\n");
      expect(exkl!.text).to.include("slovensky zemiakovy salat");
    });
  });

  describe("OCR image regression", () => {
    it("should parse Monday menu from JEDLIS-BISTRO-0209_0213.jpg", async function() {
      this.timeout(180000);

      const date = new Date("2026-02-09T00:00:00.000Z");
      const imagePath = path.resolve(process.cwd(), "test/samples/JEDLIS-BISTRO-0209_0213.jpg");
      const ocrResult = await Tesseract.recognize(imagePath, "slk");
      const items = extractMenuFromText(ocrResult.data.text, date);
      const soups = items.filter((item) => item.isSoup);
      const mains = items.filter((item) => !item.isSoup);
      const normalizedTexts = items.map((item) =>
        item.text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      );

      expect(items.length).to.be.greaterThan(0);
      expect(soups.length).to.be.greaterThan(0);
      expect(mains.some((item) => item.text.toLowerCase().includes("quesadilla con polo"))).to.equal(true);
      expect(items.every((item) => !/\(\s*\d{1,2}(\s*,\s*\d{1,2})*\s*\)/.test(item.text))).to.equal(true);
      expect(normalizedTexts.some((text) => text.includes("masovy vyvar"))).to.equal(true);
      expect(normalizedTexts.some((text) => /vyprazany\s*bravcovy\s*rezen/.test(text))).to.equal(true);
    });
  });
});
