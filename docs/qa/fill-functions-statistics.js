// Fills the "Functions" (function list) and "Statistics" (unit test report)
// sheets the user added, using the same testCases data gen-testcases.js
// builds the 114 test-case sheets from.
//
// Usage: node fill-functions-statistics.js <liveFile>

const ExcelJS = require("exceljs");
const { testCases, sheetNameFor } = require("./gen-testcases");

const REQUIREMENT_NAME_BY_MODULE = {
  ManualQuestionModule: "Manual Question Creation (HR)",
  HRRAGFlowGenerateQuestions: "AI Question Generation Flow (Studio / Generate Form)",
  HRRAGAuthErrorHandling: "Auth / Session Error Handling",
  UIVisualLayoutModule: "UI Visual & Responsive Layout",
  AuthModule: "Authentication (Register / Login / Verify / Reset)",
  AuthAdminModule: "Admin Access Control",
  ProfileModule: "HR Profile Management",
  AdminModule: "Admin User Management",
  HRRAGBackendAPITest: "Backend API (RAG_IQGS)",
};

// Same de-dup logic gen-testcases.js's main loop uses, so Sheet Name always
// matches the sheet that actually exists for each function code.
function buildSheetNames(cases) {
  const used = new Set();
  const byId = {};
  for (const tc of cases) {
    let name = sheetNameFor(tc);
    let i = 2;
    while (used.has(name)) {
      const suffix = `_${i}`;
      name = sheetNameFor(tc).slice(0, 31 - suffix.length) + suffix;
      i++;
    }
    used.add(name);
    byId[tc.id] = name;
  }
  return byId;
}

function firstPrecondition(tc) {
  const group = tc.conditionGroups.find((g) => /precondition/i.test(g.title)) ?? tc.conditionGroups[0];
  if (!group) return "";
  return group.items.map((i) => i.label).join("; ");
}

const THIN = { style: "thin", color: { argb: "FF000000" } };
const CELL_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const FONT = { name: "Tahoma", size: 8 };

function setDataCell(ws, r, c, value) {
  const cell = ws.getCell(r, c);
  cell.value = value;
  cell.font = FONT;
  cell.border = CELL_BORDER;
  cell.alignment = { vertical: "middle", wrapText: true };
  return cell;
}

async function main() {
  const livePath = process.argv[2];
  if (!livePath) {
    console.error("Usage: node fill-functions-statistics.js <liveFile>");
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(livePath);

  const sheetNameById = buildSheetNames(testCases);

  // ---- Functions sheet ----
  const funcWs = wb.getWorksheet("Functions");
  const FUNC_HEADER_ROW = 10;
  const FUNC_DATA_START = FUNC_HEADER_ROW + 1;
  testCases.forEach((tc, i) => {
    const r = FUNC_DATA_START + i;
    setDataCell(funcWs, r, 1, i + 1); // No
    setDataCell(funcWs, r, 2, REQUIREMENT_NAME_BY_MODULE[tc.module] ?? tc.module); // Requirement Name
    setDataCell(funcWs, r, 3, tc.module); // Class Name
    setDataCell(funcWs, r, 4, tc.method); // Function Name
    setDataCell(funcWs, r, 5, tc.id); // Function Code (Optional)
    const sheetName = sheetNameById[tc.id];
    const sheetCell = setDataCell(funcWs, r, 6, sheetName); // Sheet Name (linked)
    sheetCell.value = { text: sheetName, hyperlink: `#'${sheetName}'!A1` };
    sheetCell.font = { ...FONT, color: { argb: "FF0563C1" }, underline: true };
    setDataCell(funcWs, r, 7, tc.description); // Description
    setDataCell(funcWs, r, 8, firstPrecondition(tc)); // Pre-Condition
    funcWs.getRow(r).height = Math.max(18, Math.ceil(tc.description.length / 60) * 13 + 6);
  });
  console.log(`Functions: filled ${testCases.length} rows starting at row ${FUNC_DATA_START}`);

  // ---- Statistics sheet ----
  const statWs = wb.getWorksheet("Statistics");
  const STAT_HEADER_ROW = 11;
  const STAT_DATA_START = STAT_HEADER_ROW + 1;
  testCases.forEach((tc, i) => {
    const r = STAT_DATA_START + i;
    const sheetName = sheetNameById[tc.id];
    const ref = (col) => ({ formula: `'${sheetName}'!${col}5` });
    setDataCell(statWs, r, 1, i + 1); // No
    setDataCell(statWs, r, 2, tc.id); // Function code
    setDataCell(statWs, r, 3, ref("A")); // Passed
    setDataCell(statWs, r, 4, ref("C")); // Failed
    setDataCell(statWs, r, 5, ref("F")); // Untested
    setDataCell(statWs, r, 6, ref("L")); // N
    setDataCell(statWs, r, 7, ref("M")); // A
    setDataCell(statWs, r, 8, ref("N")); // B
    setDataCell(statWs, r, 9, ref("O")); // Total Test Cases
    for (let c = 1; c <= 9; c++) statWs.getColumn(c).width = Math.max(statWs.getColumn(c).width || 0, 12);
  });
  const statDataEnd = STAT_DATA_START + testCases.length - 1;

  // The template originally put "Sub total" at row 17 and the 5 percentage
  // rows at 19-23, sized for a 5-row (12-16) example. With 114 real data rows
  // (12-125) those fixed rows now sit INSIDE the data range, so they must
  // move to right after the data instead of overwriting row 17/19-23 in place
  // (which the per-row data loop above already re-fills with correct
  // test-case content regardless, since it unconditionally writes every row
  // 12..125).
  const subtotalRow = statDataEnd + 1;
  setDataCell(statWs, subtotalRow, 2, "Sub total");
  statWs.getCell(subtotalRow, 2).font = { ...FONT, bold: true };
  for (let c = 3; c <= 9; c++) {
    const col = String.fromCharCode(64 + c); // C..I
    setDataCell(statWs, subtotalRow, c, { formula: `SUM(${col}${STAT_DATA_START}:${col}${statDataEnd})` });
  }

  const pctRows = [
    { label: "Test coverage", formula: `(C${subtotalRow}+D${subtotalRow})*100/(I${subtotalRow})` },
    { label: "Test successful coverage", formula: `C${subtotalRow}*100/(I${subtotalRow})` },
    { label: "Normal case", formula: `F${subtotalRow}*100/I${subtotalRow}` },
    { label: "Abnormal case", formula: `G${subtotalRow}*100/I${subtotalRow}` },
    { label: "Boundary case", formula: `H${subtotalRow}*100/I${subtotalRow}` },
  ];
  pctRows.forEach((row, i) => {
    const r = subtotalRow + 2 + i; // one blank row after Sub total, matching the original template's spacing
    setDataCell(statWs, r, 2, row.label);
    setDataCell(statWs, r, 4, { formula: row.formula });
    setDataCell(statWs, r, 5, "%");
  });

  console.log(`Statistics: filled ${testCases.length} rows starting at row ${STAT_DATA_START}, sub-total at row ${subtotalRow}, percentages at ${subtotalRow + 2}-${subtotalRow + 6}`);

  await wb.xlsx.writeFile(livePath);
  console.log("Saved:", livePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
