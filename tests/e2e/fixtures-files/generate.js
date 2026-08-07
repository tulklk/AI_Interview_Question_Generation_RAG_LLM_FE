// One-off generator for the binary fixture files used by manual-question.spec.ts.
// Run with: node tests/e2e/fixtures-files/generate.js
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const dir = __dirname;

// Valid file: matches the template's 3-column shape (Question | Type | Difficulty)
const validRows = [
  ["Question", "Type", "Difficulty"],
  ["Describe your experience with React hooks.", "Technical", "Medium"],
  ["Tell me about a conflict you resolved within your team.", "Behavioral", "Easy"],
];
const wbValid = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbValid, XLSX.utils.aoa_to_sheet(validRows), "Questions");
XLSX.writeFile(wbValid, path.join(dir, "valid-questions.xlsx"));

// Empty file: header only, no data rows -> parseExcel() returns [] -> "importEmpty" toast
const wbEmpty = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbEmpty, XLSX.utils.aoa_to_sheet([["Question", "Type", "Difficulty"]]), "Questions");
XLSX.writeFile(wbEmpty, path.join(dir, "empty-questions.xlsx"));

// Corrupted file: real .xlsx extension, but random binary bytes (not a valid zip/OOXML
// payload, not valid CSV-ish text either) -> XLSX.read() throws -> "importError" toast
const crypto = require("crypto");
fs.writeFileSync(path.join(dir, "corrupted.xlsx"), crypto.randomBytes(256));

// Wrong type: valid content, but a .pdf extension -> rejected before any parsing is attempted
fs.writeFileSync(path.join(dir, "not-excel.pdf"), "%PDF-1.4 fake pdf content for extension-rejection test");

console.log("Fixture files written to", dir);
