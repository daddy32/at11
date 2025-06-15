// Test for FajneJedlo parser: verifies handling of wrapped "MENU" lines and Exklusiv items

import "../../../parsers/parserUtil";
import { expect } from "chai";
import { extractMenuFromText } from "../../../parsers/patronka/fajnejedlo";
import { TestHelper } from "../../helpers/TestHelper";

describe("FajneJedlo Parser", () => {
  describe("Wrapped MENU line parsing", () => {
    it("should correctly join wrapped MENU 3 lines", () => {
      const date = new Date(2025, 4, 23); // May is month 4 (0-based)
      const ocrText = `
Piatok 23. máj
Polievka 1 Slepačia s rezancami
Polievka 2 Zeleninová
MENU 1 Bravčový rezeň, zemiaková kaša
MENU 2 Kuracie prsia na prírodno, ryža
MENU 3 Grilovane dvojičky (bravčove karé, kuracie prsia), hrášok s kukuricou na masle, pečené m
äso, zemiaky
Exklusiv Losos na masle, šalát
`;
      const items = extractMenuFromText(ocrText, date);
      const menu3 = items.find(
        (item) =>
          !item.isSoup &&
          item.text.startsWith("Grilovane dvojičky")
      );
      expect(menu3, "MENU 3 not found in parsed items").to.exist;
      expect(menu3!.text).to.not.include("\n");
      expect(menu3!.text).to.not.match(/m$/);
      expect(menu3!.text).to.include("mäso, zemiaky");
    });
  });

  describe("Exklusiv menu item parsing", () => {
    it("should correctly parse Exklusiv menu item", () => {
      const date = new Date(2025, 4, 23); // May is month 4 (0-based)
      const ocrText = `
Piatok 23. máj
Polievka 1 Slepačia s rezancami
Polievka 2 Zeleninová
MENU 1 Bravčový rezeň, zemiaková kaša
MENU 2 Kuracie prsia na prírodno, ryža
MENU 3 Grilovane dvojičky (bravčove karé, kuracie prsia), hrášok s kukuricou na masle, pečené mäso, zemiaky
Exklusiv Viedenský rezeň, slovenský zemiakový šalát
`;
      const items = extractMenuFromText(ocrText, date);
      const exkl = items.find(
        (item) =>
          !item.isSoup &&
          item.text.startsWith("Viedenský rezeň")
      );
      expect(exkl, "Exklusiv menu item not found in parsed items").to.exist;
      expect(exkl!.text).to.not.include("\n");
      expect(exkl!.text).to.include("slovenský zemiakový šalát");
    });
  });

  // Additional artifact removal and OCR-based tests should be migrated here,
  // including mocking Tesseract for async OCR scenarios.
});