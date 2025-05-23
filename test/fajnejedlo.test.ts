// Test for FajneJedlo parser: verifies handling of wrapped "MENU" lines

import { extractMenuFromText } from "../parsers/patronka/fajnejedlo";
import { format } from "date-fns";

function fakeOCRTextForWrappedMenu() {
  // Simulate OCR output for a Friday with a wrapped MENU 3 line
  return `
Piatok 23. máj
Polievka 1 Slepačia s rezancami
Polievka 2 Zeleninová
MENU 1 Bravčový rezeň, zemiaková kaša
MENU 2 Kuracie prsia na prírodno, ryža
MENU 3 Grilovane dvojičky (bravčove karé, kuracie prsia), hrášok s kukuricou na masle, pečené m
äso, zemiaky
Exklusiv Losos na masle, šalát
`;
}

function testWrappedMenuLine() {
  const date = new Date(2025, 4, 23); // May is month 4 (0-based)
  const ocrText = fakeOCRTextForWrappedMenu();
  const items = extractMenuFromText(ocrText, date);

  // Find MENU 3
  const menu3 = items.find(
    (item) =>
      !item.isSoup &&
      item.text.startsWith("Grilovane dvojičky")
  );

  console.log("Extracted MENU 3:", menu3?.text);

  if (!menu3) {
    throw new Error("MENU 3 not found in parsed items");
  }

  if (
    menu3.text.includes("\n") ||
    menu3.text.endsWith("m") ||
    !menu3.text.includes("mäso, zemiaky")
  ) {
    throw new Error(
      "MENU 3 was not correctly joined from wrapped lines. Got: " +
        menu3.text
    );
  }
  console.log("Test passed: Wrapped MENU line is correctly parsed.");
}

testWrappedMenuLine();
