import "../../../parsers/parserUtil";
import { expect } from "chai";
import path from "path";
import Tesseract from "tesseract.js";

import { extractMenuFromText } from "../../../parsers/patronka/fajnejedlo";

describe("FajneJedlo Parser", () => {
  describe("Wrapped MENU line parsing", () => {
    it("should correctly join wrapped MENU 3 lines", () => {
      const date = new Date(2025, 4, 23);
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
      const date = new Date(2025, 4, 23);
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

    it("should parse Monday menu from JEDLIS-BISTRO-0309_0313.jpg", async function() {
      this.timeout(180000);

      const date = new Date("2026-03-09T00:00:00.000Z");
      const imagePath = path.resolve(process.cwd(), "test/samples/JEDLIS-BISTRO-0309_0313.jpg");
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
      expect(mains.length).to.be.greaterThan(0);
      expect(normalizedTexts.some((text) => text.includes("kacaci vyvar"))).to.equal(true);
      expect(normalizedTexts.some((text) => /grilovana\s*zelenina/.test(text))).to.equal(true);
    });

    it("should strip OCR prefixes from Monday menu in JEDLIS-BISTRO-0601_0605-1.jpg", async function() {
      this.timeout(180000);

      const date = new Date("2026-06-01T00:00:00.000Z");
      const imagePath = path.resolve(process.cwd(), "test/samples/JEDLIS-BISTRO-0601_0605-1.jpg");
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

      expect(items).to.have.length(7);
      expect(soups).to.have.length(2);
      expect(mains).to.have.length(5);
      expect(normalizedTexts.some((text) => text.startsWith("prav sv 2"))).to.equal(false);
      expect(normalizedTexts.some((text) => text.startsWith("so sen: nu 1:"))).to.equal(false);
      expect(normalizedTexts.some((text) => text === "sr")).to.equal(false);
      expect(normalizedTexts.some((text) => text.startsWith("ze s plnene"))).to.equal(false);
      expect(normalizedTexts).to.include("hovadzi vyvar s cestovinou");
      expect(normalizedTexts).to.include("kapustova s mrkvou");
      expect(normalizedTexts.some((text) => text.startsWith("morcacie medailoniky s grilovanou zeleninou"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("bravcovy rezen v ochutenej struhanke"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("plnene zemiakove knedlicky s udenym masom"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("grilo. haloumi"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("grilovana tortilla plnena hovadzim masom"))).to.equal(true);
    });

    it("should drop 1-2 letter OCR junk items from Monday menu in JEDLIS-BISTRO-0706_0710.jpg", async function() {
      this.timeout(180000);

      const date = new Date("2026-07-06T00:00:00.000Z");
      const imagePath = path.resolve(process.cwd(), "test/samples/JEDLIS-BISTRO-0706_0710.jpg");
      const ocrResult = await Tesseract.recognize(imagePath, "slk");
      const items = extractMenuFromText(ocrResult.data.text, date);
      const normalizedTexts = items.map((item) =>
        item.text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      );

      expect(items).to.have.length(7);
      expect(items.every((item) => item.text.trim().length > 2)).to.equal(true);
      expect(normalizedTexts).to.include("hovadzi vyvar s cestovinou");
      expect(normalizedTexts).to.include("sampinonova so smotanou a zemiakmi");
      expect(normalizedTexts.some((text) => text.startsWith("kuraci steak na bylinkach"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("bravcove na sampinonoch"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("spagety ala amatriciana"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("grilovany camembert na bulgurovom salate"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.startsWith("pecena bravcova panenka"))).to.equal(true);
      expect(normalizedTexts).to.not.include("c");
      expect(normalizedTexts).to.not.include("z");
      expect(normalizedTexts).to.not.include("sk");
      expect(normalizedTexts).to.not.include("a");
    });
  });

  describe("Single-line OCR fallback parsing", () => {
    it("recovers soups and mains when OCR glues the whole day into one line", () => {
      const date = new Date(2025, 4, 23);
      const ocrText = `
Piatok 23. maj
Polievka I: Kačací vývar s mäsom
Paradajková minestrone mI: Kuracie soté s koreňovou zeleninou, dusenáryža, syr (1,3,7) Za SeeBravčovýsteak, BBO omáčka, grilovanélusky so slaninkou, tlačené zemiaky s paži ?Pečenátreskasorechovošpenátovou krustou, bylinkováomáčka, peč. zemiaky, polniček EMENU 4: Tvarohovéknedle s nugátovou náplňou preliate maslom, orechomak posýpka FEXKIUsiv: Viedenskýrezeň, majonézovýšalát, citrón (1,3,7) - a a a a A EJ KY S az SRO KA ž
`;

      const items = extractMenuFromText(ocrText, date);
      const normalizedTexts = items.map((item) =>
        item.text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
      );

      expect(items.length).to.be.at.least(6);
      expect(items.filter((item) => item.isSoup).length).to.be.at.least(2);
      expect(normalizedTexts.some((text) => text.includes("kacaci vyvar s masom"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.includes("paradajkova minestrone"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.includes("kuracie sote"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.includes("treska"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.includes("tvarohove knedle"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.includes("viedensky rezen"))).to.equal(true);
      expect(normalizedTexts.some((text) => text.includes("majonezovy salat"))).to.equal(true);
      expect(items.every((item) => !item.text.includes("(1,3,7)"))).to.equal(true);
      expect(normalizedTexts).to.not.include("za see");
    });
  });

  describe("OCR date header parsing", () => {
    it("parses a day header when OCR drops the period after the day number", () => {
      const date = new Date("2026-08-24T00:00:00.000Z");
      const ocrText = `
PONDELOK 24august S
Polievka: Kačací vývar s mäsom
MENU 1: Zapekané kuracie prsia so syrom a slaninou, ryža
UTOROK 25august
Polievka 1: Zeleninová s písmenkami
`;

      const items = extractMenuFromText(ocrText, date);

      expect(items.some((item) => item.isSoup && item.text.includes("Kačací vývar"))).to.equal(true);
      expect(items.some((item) => !item.isSoup && item.text.includes("Zapekané kuracie prsia"))).to.equal(true);
    });
  });
});
