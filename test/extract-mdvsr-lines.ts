// Utility script: extract lines for PIATOK from jedalnylistok.pdf

import pdf from "pdf-parse";
import fs from "fs";
import path from "path";

async function main() {
    const pdfPath = path.join(__dirname, "samples", "jedalnylistok.pdf");
    const pdfBuffer = fs.readFileSync(pdfPath);
    const text = (await pdf(pdfBuffer)).text;
    const lines = text.split("\n").map(l => l.trim());

    // Find PIATOK section
    const startIdx = lines.findIndex(l => l.toLowerCase().startsWith("piatok"));
    const nextHeaderIdx = lines.slice(startIdx + 1).findIndex(l =>
        ["pondelok", "utorok", "streda", "štvrtok", "sobota", "nedeľa"].includes(l.toLowerCase())
    );
    const endIdx = nextHeaderIdx === -1 ? lines.length : startIdx + 1 + nextHeaderIdx;

    const piatokLines = lines.slice(startIdx, endIdx);
    fs.writeFileSync("piatok-lines-debug.txt", piatokLines.join("\n"), { encoding: "utf8" });
    console.log("Extracted PIATOK lines written to piatok-lines-debug.txt");
}

main().catch(console.error);
