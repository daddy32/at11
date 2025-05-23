// Test for FajneJedlo parser: verifies handling of wrapped "MENU" lines

import { extractMenuFromText } from "../parsers/patronka/fajnejedlo";
import { readFileSync } from "fs";
import Tesseract from "tesseract.js";
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

// Failing test for missing Exklusiv menu item (should be fixed by parser update)


// Simulate OCR output for a Friday with a wrapped Exklusiv line
function fakeOCRTextWithExklusiv() {
  return `
Piatok 23. máj
Polievka 1 Slepačia s rezancami
Polievka 2 Zeleninová
MENU 1 Bravčový rezeň, zemiaková kaša
MENU 2 Kuracie prsia na prírodno, ryža
MENU 3 Grilovane dvojičky (bravčove karé, kuracie prsia), hrášok s kukuricou na masle, pečené m
äso, zemiaky
Exklusiv Viedenský rezeň, slovenský zemiakový šalát
`;
}

function testExklusivMenuItem() {
  const date = new Date(2025, 4, 23); // May is month 4 (0-based)
  const ocrText = fakeOCRTextWithExklusiv();
  const items = extractMenuFromText(ocrText, date);

  // Find Exklusiv
  const exkl = items.find(
    (item) =>
      !item.isSoup &&
      item.text.startsWith("Viedenský rezeň")
  );

  console.log("Extracted Exklusiv:", exkl?.text);

  if (!exkl) {
    throw new Error("Exklusiv menu item not found in parsed items");
  }

  if (
    exkl.text.includes("\n") ||
    !exkl.text.includes("slovenský zemiakový šalát")
  ) {
    throw new Error(
      "Exklusiv menu item was not correctly parsed. Got: " +
        exkl.text
    );
  }
  console.log("Test passed: Exklusiv menu item is correctly parsed.");
}

testExklusivMenuItem();

// Test for Exklusiv extraction using real OCR on the provided image


async function testExklusivWithRealOCR() {
  const imagePath = "test/samples/JEDLIS-BISTRO-0519_0523.jpg";
  const imageBuffer = readFileSync(imagePath);
  const ocrResult = await Tesseract.recognize(imageBuffer, "slk");
  const ocrText = ocrResult.data.text;

  // Friday, 2025-05-23
  const date = new Date(2025, 4, 23);
  const items = extractMenuFromText(ocrText, date);

  const exkl = items.find(
    (item) =>
      !item.isSoup &&
      item.text.toLowerCase().includes("viedenský rezeň")
  );

  console.log("Extracted Exklusiv (real OCR):", exkl?.text);

  if (!exkl) {
    throw new Error("Exklusiv menu item not found in parsed items (real OCR)");
  }
  if (
    exkl.text.includes("\n") ||
    !exkl.text.toLowerCase().includes("slovenský zemiakový šalát")
  ) {
    throw new Error(
      "Exklusiv menu item was not correctly parsed (real OCR). Got: " +
        exkl.text
    );
  }
  console.log("Test passed: Exklusiv menu item is correctly parsed (real OCR).");
}

testExklusivWithRealOCR().catch(e => {
  console.error(e);
  process.exit(1);
});

// Debug: Dump OCR output for the relevant day section


async function debugDumpOCRDaySection() {
  const imagePath = "test/samples/JEDLIS-BISTRO-0519_0523.jpg";
  const imageBuffer = readFileSync(imagePath);
  const ocrResult = await Tesseract.recognize(imageBuffer, "slk");
  const ocrText = ocrResult.data.text;

  // Print the OCR output for manual inspection
  console.log("=== OCR OUTPUT START ===");
  console.log(ocrText);
  console.log("=== OCR OUTPUT END ===");
}

debugDumpOCRDaySection().catch(e => {
  console.error(e);
  process.exit(1);
});
