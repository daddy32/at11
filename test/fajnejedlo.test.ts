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

  // Simulate OCR output for a Friday with a wrapped Exklusiv line
  function fakeOCRTextWithExklusiv() {
    return `
  Piatok 23. máj
  Polievka 1 Slepačia s rezancami
  Polievka 2 Zeleninová
  MENU 1 Bravčový rezeň, zemiaková kaša
  MENU 2 Kuracie prsia na prírodno, ryža
  MENU 3 Grilovane dvojičky (bravčove karé, kuracie prsia), hrášok s kukuricou na masle, pečené mäso, zemiaky
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

// Test: OCR-based artifact "1:" and "1-" are not removed (real image)
async function testUnremovedArtifactsWithOCR() {
  const imagePath = "test/samples/JEDLIS_BISTRO_0602_0606-1200x1779.jpg";
  const imageBuffer = readFileSync(imagePath);
  const ocrResult = await Tesseract.recognize(imageBuffer, "slk");
  const ocrText = ocrResult.data.text;

  // Friday, 2025-06-06
  const date = new Date(2025, 6, 6);
  const items = extractMenuFromText(ocrText, date);
  console.log("Extracted items:", items.map(item => item.text).join("\n"));

  const menu1 = items.find(item => !item.isSoup && item.text.includes("1:"));
  const menu2 = items.find(item => !item.isSoup && item.text.includes("1-"));

  if (menu1 || menu2) {
    throw new Error(
      "Artifacts '1:' or '1-' were not removed (OCR): " +
      [menu1?.text, menu2?.text].filter(Boolean).join(" | ")
    );
  }
  console.log("Test passed: Artifacts '1:' and '1-' are removed (OCR).");
}

testUnremovedArtifactsWithOCR().catch(e => {
  console.error(e);
  process.exit(1);
});
// Test: artifact "1:" and "1-" are not removed
function fakeOCRTextWithUnremovedArtifacts() {
  return `
Piatok 6. jún
MENU 1 Vyprážané rybacie filé, zemiaková kaša s pečenou karotkou, valeriánšalát 1:
MENU 2 Vyprážané rezne z bravčovej panenky, zemiakový šmykľavý šalát s jarnou cibuľkou, citrón 1-
`;
}

function testUnremovedArtifacts() {
  const date = new Date(2025, 5, 6); // June is month 5 (0-based)
  const ocrText = fakeOCRTextWithUnremovedArtifacts();
  const items = extractMenuFromText(ocrText, date);

  const menu1 = items.find(item => !item.isSoup && item.text.includes("1:"));
  const menu2 = items.find(item => !item.isSoup && item.text.includes("1-"));

  if (menu1 || menu2) {
    throw new Error(
      "Artifacts '1:' or '1-' were not removed: " +
      [menu1?.text, menu2?.text].filter(Boolean).join(" | ")
    );
  }
  console.log("Test passed: Artifacts '1:' and '1-' are removed.");
}

testUnremovedArtifacts();
// Test for Friday artifact removal (1:, 1-, diod])
function fakeOCRTextWithFridayArtifacts() {
  return `
Piatok 6. jún
Polievka 1 Slepačia s rezancami
MENU 1 Vyprážané rybacie filé, zemiaková kaša s pečenou karotkou, valeriánšalát 1:
MENU 2 Vyprážané rezne z bravčovej panenky, zemiakový šmykľavý šalát s jarnou cibuľkou, citrón 1-
MENU 3 Chrumkavé opekané hovädzie rezančeky, pražená jasmínová ryža diod] s chrumkavou zeleninou a vajíčkom, koriander, biely sezam
`;
}

function testFridayArtifactRemoval() {
  const date = new Date(2025, 5, 6); // June is month 5 (0-based)
  const ocrText = fakeOCRTextWithFridayArtifacts();
  const items = extractMenuFromText(ocrText, date);

  const menu1 = items.find(item => !item.isSoup && item.text.startsWith("Vyprážané rybacie filé"));
  const menu2 = items.find(item => !item.isSoup && item.text.startsWith("Vyprážané rezne z bravčovej panenky"));
  const menu3 = items.find(item => !item.isSoup && item.text.startsWith("Chrumkavé opekané hovädzie rezančeky"));

  if (!menu1 || !menu2 || !menu3) {
    throw new Error("One or more Friday menu items not found in parsed items");
  }

  if (/\b1[:\-]\b/.test(menu1.text) || /\b1[:\-]\b/.test(menu2.text) || /\bdiod\]/.test(menu3.text)) {
    throw new Error(
      "Friday artifact removal failed: " +
      [menu1.text, menu2.text, menu3.text].join(" | ")
    );
  }
  console.log("Test passed: Friday artifact removal works.");
}

testFridayArtifactRemoval();
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

// Test for Weekly Special OCR Junk Issue (real image, June 9-13, 2025)
async function testWeeklySpecialJunkRemovalWithOCR() {
  const imagePath = "test/samples/JEDLIS_BISTRO_0609_0613-1-1200x1806.jpg";
  const imageBuffer = readFileSync(imagePath);
  const ocrResult = await Tesseract.recognize(imageBuffer, "slk");
  const ocrText = ocrResult.data.text;

  // Use Wednesday, June 11, 2025
  const date = new Date(2025, 5, 11);
  const items = extractMenuFromText(ocrText, date);

  // Find the weekly special (should be present for every day)
  const special = items.find(
    (item) =>
      !item.isSoup &&
      (item.text.toLowerCase().includes("špeciál") ||
        item.text.toLowerCase().includes("poké"))
  );

  console.log("Extracted Weekly Special:", special?.text);

  if (!special) {
    throw new Error("Weekly special not found in parsed items");
  }

  // Assert that known junk artifacts are not present
  const junkPatterns = [
    /Y VY/i,
    />/,
    /\bPA\b/,
    /\*\*/,
    /\bSpecial\b.*\*\*/
  ];
  for (const pattern of junkPatterns) {
    if (pattern.test(special.text)) {
      throw new Error(
        "Weekly special contains OCR junk artifact: " +
          pattern +
          " in: " +
          special.text
      );
    }
  }

  // Assert that the special is a clean, readable dish description
  if (special.text.length < 20) {
    throw new Error(
      "Weekly special is too short, likely not parsed correctly: " +
        special.text
    );
  }
  console.log("Test passed: Weekly special OCR junk is removed.");
}

testWeeklySpecialJunkRemovalWithOCR().catch((e) => {
  console.error(e);
  process.exit(1);
});
