const ExcelJS = require("exceljs");

const wb = new ExcelJS.Workbook();

// Column layout + styling mirror the hand-built "Form" reference sheet
// (Tahoma 8, black borders, navy FF000080, item label in column D with a
// group-header column B and blank spacer columns C/E, UTCID marks starting
// at column F) rather than an independently invented style.
const UTCID_SLOTS = 17;
const FIRST_UTCID_COL = 6; // column F, matches "Form"
const LAST_UTCID_COL = FIRST_UTCID_COL + UTCID_SLOTS - 1; // column V

const SHEET_COLUMNS = [
  { width: 9.29 },  // A - navy section label (Condition/Confirm/Result)
  { width: 15.29 }, // B - group header (e.g. "Precondition")
  { width: 12.29 }, // C - spacer
  { width: 13 },    // D - item label (right-aligned)
  { width: 2 },     // E - spacer
  ...Array.from({ length: UTCID_SLOTS }, () => ({ width: 4.3 })),
];

const NAVY = "FF000080";
const BORDER_ARGB = "FF000000";
const FONT_NAME = "Tahoma";
const FONT_SIZE = 8;
const thin = { style: "thin", color: { argb: BORDER_ARGB } };
const doubleTop = { style: "double", color: { argb: BORDER_ARGB } };
const borderAll = { top: thin, left: thin, bottom: thin, right: thin };
const navyFill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
const whiteBold = { bold: true, color: { argb: "FFFFFFFF" } };

// "O" = applies, "-" = explicitly does not apply. Both are real, always-selectable
// list items, so a cell can be flipped back from "O" to "-" straight from the dropdown.
const DV_O = { type: "list", allowBlank: true, formulae: ['"O,-"'] };
const DV_TYPE = { type: "list", allowBlank: true, formulae: ['"N,A,B"'] };
const DV_PF = { type: "list", allowBlank: true, formulae: ['"P,F"'] };

// Sum of SHEET_COLUMNS widths for columns c1..c2 inclusive (1-indexed) — the
// effective wrap width of a merged range spanning those columns.
function mergedWidth(c1, c2) {
  let total = 0;
  for (let c = c1; c <= c2; c++) total += SHEET_COLUMNS[c - 1]?.width ?? 9;
  return total;
}

// Row-height estimate for wrapped text. `charsPerUnit` is font-dependent —
// ExcelJS "width units" are calibrated to the workbook's default font
// (Calibri 11, ~0.85 chars fit per unit), but the 114 test-case sheets use
// Tahoma 8 which is noticeably narrower/smaller (~1.1 chars per unit fits).
// Using the Calibri estimate everywhere previously made every row far taller
// than the actual (small) Tahoma text needed — e.g. a 6-char label like
// "Chrome" was getting a 2-line-tall row for no reason.
function heightForWrappedText(text, widthUnits, charsPerUnit = 0.85) {
  const charsPerLine = Math.max(6, Math.round(widthUnits * charsPerUnit));
  const lines = Math.max(1, Math.ceil(String(text ?? "").length / charsPerLine));
  return Math.max(13.5, lines * 12.5 + 3);
}

// Bump a row's height up to fit `text` wrapped across columns c1..c2 —
// never shrinks a row that's already taller (e.g. the rotated UTCID header).
// Uses the Tahoma-8 char-per-unit rate since this is only ever called from
// the test-case-sheet builders below.
function growRowForText(ws, r, text, c1, c2) {
  const needed = heightForWrappedText(text, mergedWidth(c1, c2), 1.1);
  const row = ws.getRow(r);
  row.height = Math.max(row.height || 0, needed);
}

// Em dashes read as an AI-writing tell in a document meant to look
// hand-authored. Rewrite them to plain punctuation everywhere EXCEPT inside
// double-quoted substrings, which are verbatim real UI copy (toast/tooltip
// text) quoted from the actual app and must stay byte-for-byte accurate.
function humanizeEmDash(value) {
  if (typeof value !== "string" || !value.includes("—")) return value;
  const quotes = [];
  const masked = value.replace(/"[^"]*"/g, (m) => {
    quotes.push(m);
    return `\u0000${quotes.length - 1}\u0000`;
  });
  const rewritten = masked
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*\./g, ".")
    .replace(/,\s*,/g, ",");
  return rewritten.replace(/\u0000(\d+)\u0000/g, (_m, i) => quotes[Number(i)]);
}

function setCell(ws, row, col, value, opts = {}) {
  const cell = ws.getCell(row, col);
  cell.value = humanizeEmDash(value);
  const font = { name: FONT_NAME, size: FONT_SIZE };
  if (opts.bold) font.bold = true;
  if (opts.italic) font.italic = true;
  if (opts.navy) { font.bold = true; font.color = { argb: "FFFFFFFF" }; }
  cell.font = font;
  if (opts.border !== false) cell.border = opts.doubleTop ? { ...borderAll, top: doubleTop } : borderAll;
  if (opts.fill === "navy") cell.fill = navyFill;
  const align = { vertical: "middle", wrapText: true, ...(opts.align || {}) };
  cell.alignment = align;
  if (opts.dataValidation) cell.dataValidation = opts.dataValidation;
  return cell;
}

function mergeRange(ws, r1, c1, r2, c2) {
  ws.mergeCells(r1, c1, r2, c2);
}

// Excel sheet names: max 31 chars, no \ / ? * [ ] :
// Bare tc.method (no id prefix) — matches the naming convention the live
// workbook's ~97 existing sheets already use (e.g. tc.method
// "DisplayManualQuestionForm" -> sheet "DisplayManualQuestionForm"). An
// id-prefixed variant was tried once but never actually rolled out to the
// live file, so keeping this bare so merge-into-live.js's by-name matching
// keeps recognizing the existing sheets instead of duplicating them.
function sheetNameFor(tc) {
  return tc.method.slice(0, 31).replace(/[\\/?*[\]:]/g, "-");
}

// Bold, left-aligned group heading row (e.g. "Company Name") - label in
// column B, matching "Form"'s group-header column.
function addGroupHeader(ws, r, title) {
  setCell(ws, r, 1, "");
  setCell(ws, r, 2, title, { bold: true, align: { horizontal: "left", vertical: "top" } });
  setCell(ws, r, 3, "");
  setCell(ws, r, 4, "");
  setCell(ws, r, 5, "");
  for (let i = 0; i < UTCID_SLOTS; i++) setCell(ws, r, FIRST_UTCID_COL + i, "");
  growRowForText(ws, r, title, 2, 2);
}

// One atomic decision-table row: label in col D (right-aligned, matching
// "Form"), "O"/"-" per real UTCID column, blank (still dropdown-ready) for
// the padding columns.
function addMarkRow(ws, r, label, marks) {
  setCell(ws, r, 1, "");
  setCell(ws, r, 2, "");
  setCell(ws, r, 3, "");
  setCell(ws, r, 4, label, { align: { horizontal: "right", vertical: "top" } });
  setCell(ws, r, 5, "");
  for (let i = 0; i < UTCID_SLOTS; i++) {
    const isReal = i < marks.length;
    setCell(ws, r, FIRST_UTCID_COL + i, isReal ? (marks[i] ? "O" : "-") : "", {
      align: { horizontal: "center" },
      dataValidation: DV_O,
    });
  }
  growRowForText(ws, r, label, 4, 4);
}

function addGroups(ws, r, groups) {
  for (const group of groups) {
    addGroupHeader(ws, r, group.title);
    r++;
    for (const item of group.items) {
      addMarkRow(ws, r, item.label, item.marks);
      r++;
    }
  }
  return r;
}

/**
 * Renders one QA test case block starting at `startRow`.
 */
function addTestCaseBlock(ws, startRow, tc) {
  let r = startRow;

  // Row: Code Module | <module> (italic) | Method | <method> — column
  // boundaries match "Form": label A:B, value C:E, label F:K, value L:LAST.
  setCell(ws, r, 1, "Code Module", { bold: true, doubleTop: true });
  mergeRange(ws, r, 2, r, 5);
  setCell(ws, r, 2, tc.module, { italic: true, doubleTop: true });
  mergeRange(ws, r, 6, r, 11);
  setCell(ws, r, 6, "Method", { bold: true, doubleTop: true });
  mergeRange(ws, r, 12, r, LAST_UTCID_COL);
  setCell(ws, r, 12, tc.method, { doubleTop: true });
  growRowForText(ws, r, tc.module, 2, 5);
  growRowForText(ws, r, tc.method, 12, LAST_UTCID_COL);
  r++;

  // Row: Created By | SU26SE102-GSU26SE52 | Executed By | (blank)
  setCell(ws, r, 1, "Created By", { bold: true });
  mergeRange(ws, r, 2, r, 5);
  setCell(ws, r, 2, tc.createdBy || "SU26SE102-GSU26SE52", {});
  mergeRange(ws, r, 6, r, 11);
  setCell(ws, r, 6, "Executed By", { bold: true });
  mergeRange(ws, r, 12, r, LAST_UTCID_COL);
  setCell(ws, r, 12, tc.executedBy || "", {});
  growRowForText(ws, r, tc.createdBy || "SU26SE102-GSU26SE52", 2, 5);
  r++;

  // Row: Test requirement | <id> - <description> (merged, full width)
  setCell(ws, r, 1, "Test requirement", { bold: true });
  mergeRange(ws, r, 2, r, LAST_UTCID_COL);
  setCell(ws, r, 2, `${tc.id} - ${tc.description}`, {});
  growRowForText(ws, r, `${tc.id} - ${tc.description}`, 2, LAST_UTCID_COL);
  r++;

  // Summary bar: Passed | Failed | Untested | N/A/B | Total Test Cases —
  // white background (not filled), matching "Form".
  const total = tc.types.length;
  const nCount = tc.types.filter((t) => t === "N").length;
  const aCount = tc.types.filter((t) => t === "A").length;
  const bCount = tc.types.filter((t) => t === "B").length;

  mergeRange(ws, r, 1, r, 2);
  setCell(ws, r, 1, "Passed", { bold: true, align: { horizontal: "center" } });
  mergeRange(ws, r, 3, r, 5);
  setCell(ws, r, 3, "Failed", { bold: true, align: { horizontal: "center" } });
  mergeRange(ws, r, 6, r, 11);
  setCell(ws, r, 6, "Untested", { bold: true, align: { horizontal: "center" } });
  mergeRange(ws, r, 12, r, 14);
  setCell(ws, r, 12, "N/A/B", { bold: true, align: { horizontal: "center" } });
  mergeRange(ws, r, 15, r, LAST_UTCID_COL);
  setCell(ws, r, 15, "Total Test Cases", { bold: true, align: { horizontal: "center" } });
  r++;

  mergeRange(ws, r, 1, r, 2);
  setCell(ws, r, 1, total, { align: { horizontal: "center" } });
  mergeRange(ws, r, 3, r, 5);
  setCell(ws, r, 3, 0, { align: { horizontal: "center" } });
  mergeRange(ws, r, 6, r, 11);
  setCell(ws, r, 6, 0, { align: { horizontal: "center" } });
  setCell(ws, r, 12, nCount, { align: { horizontal: "center" } });
  setCell(ws, r, 13, aCount, { align: { horizontal: "center" } });
  setCell(ws, r, 14, bCount, { align: { horizontal: "center" } });
  mergeRange(ws, r, 15, r, LAST_UTCID_COL);
  setCell(ws, r, 15, total, { align: { horizontal: "center" } });
  r++;

  // UTCID header row - navy fill, white bold, rotated -90° text (matches "Form")
  const realCount = tc.types.length;
  setCell(ws, r, 1, "", { doubleTop: true });
  setCell(ws, r, 2, "", { doubleTop: true });
  setCell(ws, r, 3, "", { doubleTop: true });
  setCell(ws, r, 4, "", { doubleTop: true });
  setCell(ws, r, 5, "", { doubleTop: true });
  for (let i = 0; i < UTCID_SLOTS; i++) {
    const isReal = i < realCount;
    setCell(ws, r, FIRST_UTCID_COL + i, isReal ? `UTCID0${i + 1}` : "", {
      fill: "navy",
      navy: true,
      doubleTop: true,
      align: { horizontal: "center", vertical: "middle", textRotation: -90 },
    });
  }
  ws.getRow(r).height = 40;
  r++;

  const sectionStartRows = {};

  // Condition section
  sectionStartRows.condition = r;
  r = addGroups(ws, r, tc.conditionGroups);
  const conditionEndRow = r - 1;

  // Confirm section (Return / Exception / Log message all nested under one Confirm band)
  sectionStartRows.confirm = r;
  r = addGroups(ws, r, tc.confirmGroups);
  const confirmEndRow = r - 1;

  // Result section — label merged B:D (matches "Form"'s B36:D36 pattern),
  // left-aligned rather than the Condition/Confirm rows' right-aligned D-only label.
  function resultLabelRow(r, label) {
    mergeRange(ws, r, 2, r, 4);
    setCell(ws, r, 2, label, { align: { horizontal: "left", vertical: "top" } });
    setCell(ws, r, 5, "");
  }

  sectionStartRows.result = r;
  resultLabelRow(r, "Type (N: Normal, A: Abnormal, B: Boundary)");
  for (let i = 0; i < UTCID_SLOTS; i++) {
    setCell(ws, r, FIRST_UTCID_COL + i, i < realCount ? tc.types[i] ?? "" : "", {
      align: { horizontal: "center" },
      dataValidation: DV_TYPE,
    });
  }
  r++;

  resultLabelRow(r, "Passed/Failed");
  for (let i = 0; i < UTCID_SLOTS; i++) {
    setCell(ws, r, FIRST_UTCID_COL + i, i < realCount ? "P" : "", {
      align: { horizontal: "center" },
      dataValidation: DV_PF,
    });
  }
  r++;

  resultLabelRow(r, "Executed Date");
  for (let i = 0; i < UTCID_SLOTS; i++) setCell(ws, r, FIRST_UTCID_COL + i, "");
  r++;

  resultLabelRow(r, "Defect ID");
  for (let i = 0; i < UTCID_SLOTS; i++) setCell(ws, r, FIRST_UTCID_COL + i, "");
  r++;
  const resultEndRow = r - 1;

  // Vertically merge + navy-fill the left-hand section labels (Condition / Confirm / Result)
  mergeRange(ws, sectionStartRows.condition, 1, conditionEndRow, 1);
  setCell(ws, sectionStartRows.condition, 1, "Condition", {
    fill: "navy",
    navy: true,
    align: { horizontal: "center", vertical: "middle" },
  });

  mergeRange(ws, sectionStartRows.confirm, 1, confirmEndRow, 1);
  setCell(ws, sectionStartRows.confirm, 1, "Confirm", {
    fill: "navy",
    navy: true,
    align: { horizontal: "center", vertical: "middle" },
  });

  mergeRange(ws, sectionStartRows.result, 1, resultEndRow, 1);
  setCell(ws, sectionStartRows.result, 1, "Result", {
    fill: "navy",
    navy: true,
    align: { horizontal: "center", vertical: "middle" },
  });

  return r;
}

// ---- Test case data, grounded in src/features/interview/components/generate/manual-question-page.tsx
// and the AI-quota "Create manually" cross-links (generate-form.tsx / studio-page.tsx) ----

const MODULE = "ManualQuestionModule";
const T = true;
const F = false;

const testCases = [
  {
    id: "FE_MQ_001",
    module: MODULE,
    method: "DisplayManualQuestionForm",
    description: "Display manual question creation form with default fields when HR opens /hr/generate/manual",
    conditionGroups: [
      {
        title: "Precondition",
        items: [
          { label: "HR user is logged in", marks: [T, T, T] },
          { label: "Network is connected", marks: [T, T, T] },
        ],
      },
      {
        title: "Browser",
        items: [
          { label: "Chrome", marks: [T, F, F] },
          { label: "Firefox", marks: [F, T, F] },
          { label: "Safari", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Job title field is displayed empty", marks: [T, T, T] },
          { label: "Level dropdown defaults to \"Mid-level\"", marks: [T, T, T] },
          { label: "Interview duration input defaults to 60", marks: [T, T, T] },
          { label: "5 empty question rows are shown", marks: [T, T, T] },
          { label: "Save / Export .txt / Import from Excel buttons are visible", marks: [T, T, T] },
        ],
      },
      {
        title: "Log message",
        items: [{ label: "\"Manual question page rendered successfully\"", marks: [T, T, T] }],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_MQ_002",
    module: MODULE,
    method: "ValidateJobTitleRequired",
    description: "Validate that saving a question set requires a non-blank job title",
    conditionGroups: [
      {
        title: "Precondition",
        items: [
          { label: "HR is on the manual question page", marks: [T, T, T] },
          { label: "At least 1 question row is filled", marks: [T, T, T] },
        ],
      },
      {
        title: "Job title",
        items: [
          { label: "Empty", marks: [T, F, F] },
          { label: "Whitespace only (\"   \")", marks: [F, T, F] },
          { label: "Valid (\"Backend Developer\")", marks: [F, F, T] },
        ],
      },
      {
        title: "Action",
        items: [{ label: "Click \"Save question set\"", marks: [T, T, T] }],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [{ label: "Save succeeds, success toast is shown", marks: [F, F, T] }],
      },
      {
        title: "Exception",
        items: [
          { label: "\"Please enter the job title.\" + red border on the field", marks: [T, T, F] },
        ],
      },
    ],
    types: ["A", "A", "N"],
  },
  {
    id: "FE_MQ_003",
    module: MODULE,
    method: "ValidateQuestionContentRequired",
    description: "Validate question content requirement rules before a question set can be saved",
    conditionGroups: [
      {
        title: "Precondition",
        items: [{ label: "Job title is valid (\"QA Engineer\")", marks: [T, T, T] }],
      },
      {
        title: "Question rows",
        items: [
          { label: "One row has blank content while others are filled", marks: [T, F, F] },
          { label: "All rows are blank (0 filled)", marks: [F, T, F] },
          { label: "All rows are filled with content", marks: [F, F, T] },
        ],
      },
      {
        title: "Action",
        items: [{ label: "Click \"Save question set\"", marks: [T, T, T] }],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [{ label: "Save succeeds, toast \"Saved ... (N questions).\"", marks: [F, F, T] }],
      },
      {
        title: "Exception",
        items: [
          { label: "\"Question content cannot be empty.\"", marks: [T, F, F] },
          { label: "\"Please add at least 1 question.\"", marks: [F, T, F] },
        ],
      },
    ],
    types: ["A", "A", "N"],
  },
  {
    id: "FE_MQ_004",
    module: MODULE,
    method: "ValidateDurationBoundaryValue",
    description: "Verify interview duration input clamping at its min/max boundaries (input: min=15, max=240, step=5)",
    conditionGroups: [
      {
        title: "Duration input value",
        items: [
          { label: "14 (below min 15)", marks: [T, F, F] },
          { label: "240 (at max)", marks: [F, T, F] },
          { label: "9999 (above max 240)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Value is clamped up to 15", marks: [T, F, F] },
          { label: "Value is accepted as 240", marks: [F, T, F] },
          { label: "Value is accepted as 9999 (should clamp to 240)", marks: [F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Known defect: onChange only clamps the lower bound, not the upper bound", marks: [F, F, T] },
        ],
      },
    ],
    types: ["B", "B", "B"],
  },
  {
    id: "FE_MQ_005",
    module: MODULE,
    method: "SaveQuestionSetSuccess",
    description: "Verify the save flow's loading/success UX across browsers (client-side only, no real persistence)",
    conditionGroups: [
      {
        title: "Precondition",
        items: [{ label: "Job title and all question rows are valid", marks: [T, T, T] }],
      },
      {
        title: "Browser",
        items: [
          { label: "Chrome", marks: [T, F, F] },
          { label: "Firefox", marks: [F, T, F] },
          { label: "Safari", marks: [F, F, T] },
        ],
      },
      {
        title: "Action",
        items: [{ label: "Click \"Save question set\"", marks: [T, T, T] }],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Save button disables, spinner + \"Saving…\" shown for ~800ms", marks: [T, T, T] },
          { label: "Success toast \"Saved \"{role}\" ({count} questions).\" is shown", marks: [T, T, T] },
        ],
      },
      {
        title: "Log message",
        items: [{ label: "\"Question set saved (client-side only, no backend call)\"", marks: [T, T, T] }],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_MQ_006",
    module: MODULE,
    method: "DeleteQuestionMinLimitGuard",
    description: "Verify the delete (trash) action is guarded so at least 1 question row always remains",
    conditionGroups: [
      {
        title: "Question count",
        items: [
          { label: "Starts with 5 questions, delete down to 1", marks: [T, F, F] },
          { label: "Starts with 2 questions, delete 1", marks: [F, T, F] },
          { label: "Exactly 1 question remaining", marks: [F, F, T] },
        ],
      },
      {
        title: "Action",
        items: [{ label: "Click the trash icon", marks: [T, T, T] }],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Trash icon becomes disabled once only 1 question remains", marks: [T, F, T] },
          { label: "Delete succeeds, 1 question remains", marks: [F, T, F] },
          { label: "Click has no effect, question count stays at 1", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "B"],
  },
  {
    id: "FE_MQ_007",
    module: MODULE,
    method: "ImportExcelValidFile",
    description: "Verify importing questions from a valid .xlsx file (downloaded template)",
    conditionGroups: [
      {
        title: "Import file",
        items: [
          { label: "Existing rows present, valid .xlsx from the template", marks: [T, T, F] },
          { label: "Contains a typo'd Type value (e.g. \"Techncal\")", marks: [F, F, T] },
        ],
      },
      {
        title: "Import mode",
        items: [
          { label: "Append", marks: [T, F, T] },
          { label: "Replace all", marks: [F, T, F] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Imported questions appended to the end, existing rows kept", marks: [T, F, F] },
          { label: "Existing rows cleared, replaced with imported ones", marks: [F, T, F] },
          { label: "Toast \"Imported {count} questions from Excel.\" is shown", marks: [T, T, T] },
          { label: "Unrecognized Type silently falls back to \"Technical\" (no error shown)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A"],
  },
  {
    id: "FE_MQ_008",
    module: MODULE,
    method: "ImportExcelInvalidFile",
    description: "Verify rejection handling for unsupported, empty, or unreadable import files",
    conditionGroups: [
      {
        title: "Selected file",
        items: [
          { label: "a .pdf or .docx file", marks: [T, F, F] },
          { label: "a valid .xlsx with all rows blank", marks: [F, T, F] },
          { label: "a corrupted/renamed .xlsx (not a real Excel binary)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Exception",
        items: [
          { label: "\"Only .xlsx or .xls files are supported.\"", marks: [T, F, F] },
          { label: "\"No valid data found. Please check the file format.\"", marks: [F, T, F] },
          { label: "\"Could not read the file. Please use the provided Excel template.\"", marks: [F, F, T] },
        ],
      },
    ],
    types: ["A", "A", "A"],
  },
  {
    id: "FE_MQ_009",
    module: MODULE,
    method: "ExportTxtValidation",
    description: "Verify \"Export .txt\" requires a job title and at least 1 filled question before downloading",
    conditionGroups: [
      {
        title: "Job title / question state",
        items: [
          { label: "Empty title, 0 questions", marks: [T, F, F] },
          { label: "Valid title, 0 filled questions", marks: [F, T, F] },
          { label: "Valid title, >=1 filled question", marks: [F, F, T] },
        ],
      },
      {
        title: "Action",
        items: [{ label: "Click \"Export .txt\"", marks: [T, T, T] }],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [{ label: ".txt file downloads with role/level/duration/questions", marks: [F, F, T] }],
      },
      {
        title: "Exception",
        items: [
          { label: "\"Enter a role and at least 1 question before exporting.\"", marks: [T, T, F] },
        ],
      },
    ],
    types: ["A", "A", "N"],
  },
  {
    id: "FE_MQ_010",
    module: MODULE,
    method: "AiQuotaExceededManualLink",
    description: "Verify HR can reach manual creation from the AI-quota-exceeded banner/dialog once the Free-plan cooldown is hit",
    conditionGroups: [
      {
        title: "Subscription / quota state",
        items: [
          { label: "Free plan, quota exhausted, on /hr/generate", marks: [T, F, F] },
          { label: "Free plan, quota exhausted, on Studio JD flow", marks: [F, T, F] },
          { label: "Premium plan, generateUnlimited = true", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Amber banner + \"Create manually\" link is shown", marks: [T, F, F] },
          { label: "Full-screen alertdialog + \"Create manually\" button is shown", marks: [F, T, F] },
          { label: "No quota banner/modal is shown, AI generation proceeds normally", marks: [F, F, T] },
          { label: "Clicking \"Create manually\" navigates to /hr/generate/manual", marks: [T, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_MQ_011",
    module: MODULE,
    method: "UnauthorizedRoleAccessManualPage",
    description: "Verify behavior when a non-HR account directly navigates to /hr/generate/manual by URL (no client-side role guard found in code)",
    conditionGroups: [
      {
        title: "Session",
        items: [
          { label: "Candidate role", marks: [T, F, F] },
          { label: "Admin role", marks: [F, T, F] },
          { label: "Guest (not logged in)", marks: [F, F, T] },
        ],
      },
      {
        title: "Action",
        items: [{ label: "Enter /hr/generate/manual directly in the address bar", marks: [T, T, T] }],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Expected: access is blocked/redirected (TBD - confirm with dev)", marks: [T, T, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Flagged as potential access-control gap for dev confirmation", marks: [T, T, T] },
        ],
      },
    ],
    types: ["A", "A", "A"],
  },
];

// ---- HR RAG Flow - Generate Questions (Studio JD flow + GenerateForm flow) ----
// Grounded in src/features/studio/components/studio-page.tsx, src/features/studio/hooks/use-studio.ts,
// src/features/interview/components/generate/generate-form.tsx, jd-input-card.tsx, file-upload-area.tsx

const RAG_MODULE = "HRRAGFlowGenerateQuestions";

const ragTestCases = [
  {
    id: "FE_RAG_001",
    module: RAG_MODULE,
    method: "JdInputPasteValidation",
    description: "Studio: validate JD paste input behavior - no minimum length enforced, Save & Analyze disabled only when empty",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "HR is on the Studio JD input step", marks: [T, T, T, T] }] },
      {
        title: "JD paste content",
        items: [
          { label: "Textarea is completely empty", marks: [T, F, F, F] },
          { label: "Contains only 10 characters", marks: [F, T, F, F] },
          { label: "Contains a full valid JD (500+ characters)", marks: [F, F, T, F] },
          { label: "Contains only whitespace", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "\"Save & Analyze\" button is disabled", marks: [T, F, F, T] },
          { label: "\"Save & Analyze\" button is enabled", marks: [F, T, T, F] },
          { label: "Live word/char counter updates as typed", marks: [F, T, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "No minimum-length warning shown even for a 10-char JD (gap vs. GenerateForm's 400-char rule)", marks: [F, T, F, F] },
        ],
      },
    ],
    types: ["N", "A", "N", "A"],
  },
  {
    id: "FE_RAG_002",
    module: RAG_MODULE,
    method: "JdInputUploadFileTypes",
    description: "Studio: validate accepted JD upload file types (.pdf/.docx/.txt/.jpg/.jpeg/.png) and the missing client-side size check",
    conditionGroups: [
      {
        title: "File selected",
        items: [
          { label: ".pdf file", marks: [T, F, F, F, F, F] },
          { label: ".docx file", marks: [F, T, F, F, F, F] },
          { label: ".txt file", marks: [F, F, T, F, F, F] },
          { label: ".jpg / .png image file", marks: [F, F, F, T, F, F] },
          { label: "unsupported type (.xlsx)", marks: [F, F, F, F, T, F] },
          { label: "accepted type but file is well over the \"max 20MB\" label", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "File is accepted and uploaded", marks: [T, T, T, T, F, T] },
          { label: "File is rejected (unsupported type)", marks: [F, F, F, F, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Oversized file is still accepted - no client-side size check despite the \"max 20MB\" label (DEFECT)", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "A", "B"],
  },
  {
    id: "FE_RAG_003",
    module: RAG_MODULE,
    method: "KnowledgeDocumentIngestionStatus",
    description: "Studio: verify RAG ingestion status chips for attached Knowledge Base documents and checkbox gating",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "HR has uploaded/attached a knowledge document", marks: [T, T, T, T] }] },
      {
        title: "RAG ingestion status",
        items: [
          { label: "Queued", marks: [T, F, F, F] },
          { label: "Processing", marks: [F, T, F, F] },
          { label: "Completed", marks: [F, F, T, F] },
          { label: "Failed", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Status chip displays the matching label", marks: [T, T, T, T] },
          { label: "Checkbox is disabled with tooltip \"requires RAG Completed\"", marks: [T, T, F, T] },
          { label: "Checkbox is enabled, document can be used as a source", marks: [F, F, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_RAG_004",
    module: RAG_MODULE,
    method: "SourcesPanelLockOnGenerate",
    description: "Studio: verify Sources/Inspector panels lock once generation starts or questions already exist",
    conditionGroups: [
      {
        title: "State",
        items: [
          { label: "Not generating, no questions yet", marks: [T, F, F] },
          { label: "Generation in progress (isGeneratingQuestions)", marks: [F, T, F] },
          { label: "Questions already exist from a prior generation", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Panels are fully editable", marks: [T, F, F] },
          { label: "Panels show 60% opacity + click-blocked overlay", marks: [F, T, T] },
          { label: "Tooltip \"Locked — click New Set to edit Studio\" shown on hover", marks: [F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAG_005",
    module: RAG_MODULE,
    method: "GenerateQuestionsSuccessFlow",
    description: "Studio: verify the happy-path Generate Questions flow (toast, 2.5s polling, success)",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "Plan is approved and ready to generate", marks: [T, T, T] }] },
      {
        title: "Job progression",
        items: [
          { label: "Completes on the first poll", marks: [T, F, F] },
          { label: "Pending -> Completed after the 2nd poll", marks: [F, T, F] },
          { label: "Generating for several polls before Completed", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Toast \"Sent to RAG — generating questions…\" shown immediately on submit", marks: [T, T, T] },
          { label: "Toast \"{{count}} questions generated.\" shown on completion", marks: [T, T, T] },
          { label: "Question list refetches and displays the new questions", marks: [T, T, T] },
        ],
      },
      {
        title: "Log message",
        items: [{ label: "\"generationStarted\" then \"generationDone\" toasts fire in order", marks: [T, T, T] }],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAG_006",
    module: RAG_MODULE,
    method: "GenerateQuestionsAutoRetryReplace",
    description: "Studio: verify auto-retry with replaceExisting:true when backend returns QUESTIONS_ALREADY_EXIST",
    conditionGroups: [
      {
        title: "Precondition",
        items: [
          { label: "Plan has no existing questions yet", marks: [T, F, F] },
          { label: "Plan already has questions from a prior generation", marks: [F, T, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Generates normally, no retry needed", marks: [T, F, F] },
          { label: "1st call fails with QUESTIONS_ALREADY_EXIST, auto-retries with replaceExisting:true, succeeds silently", marks: [F, T, F] },
          { label: "Retry also fails, error toast shown", marks: [F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "No confirmation dialog warns HR that existing questions will be replaced (GAP)", marks: [F, T, F] },
        ],
      },
    ],
    types: ["N", "A", "A"],
  },
  {
    id: "FE_RAG_007",
    module: RAG_MODULE,
    method: "GenerateQuestionsFailedStatus",
    description: "Studio: verify a Failed generation run surfaces the backend errorCode/errorMessage via toast",
    conditionGroups: [
      {
        title: "Job status",
        items: [
          { label: "Failed, errorCode and errorMessage both present", marks: [T, F, F] },
          { label: "Failed, only errorCode present", marks: [F, T, F] },
          { label: "Failed, neither errorCode nor errorMessage present", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Toast shows \"[errorCode] errorMessage\"", marks: [T, F, F] },
          { label: "Toast shows \"[errorCode] RAG sinh câu hỏi thất bại.\" (fallback text, Vietnamese even in EN UI)", marks: [F, T, F] },
          { label: "Toast shows \"[FAILED] RAG sinh câu hỏi thất bại.\" (both fallbacks)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A"],
  },
  {
    id: "FE_RAG_008",
    module: RAG_MODULE,
    method: "GenerateQuestionsTimeoutDeadline",
    description: "Studio: verify behavior when a generation run exceeds the 5-minute polling deadline",
    conditionGroups: [
      {
        title: "Job duration",
        items: [
          { label: "Completes just under 5 minutes", marks: [T, F] },
          { label: "Still Pending/Generating past the 5-minute mark", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Completes normally, questions shown", marks: [T, F] },
          { label: "Timeout message \"Job vẫn {status} sau 5 phút… bấm Làm mới trạng thái.\" (Vietnamese-only, not localized)", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_RAG_009",
    module: RAG_MODULE,
    method: "BackgroundPollResumeOnReload",
    description: "Studio: verify a Pending/Generating run resumes polling automatically after page reload/tab-switch",
    conditionGroups: [
      {
        title: "State at reload",
        items: [
          { label: "Run status is Pending", marks: [T, F, F] },
          { label: "Run status is Generating", marks: [F, T, F] },
          { label: "Run already Completed before reload", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Background poll (3s interval, no deadline) resumes automatically", marks: [T, T, F] },
          { label: "No polling needed, questions already shown", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAG_010",
    module: RAG_MODULE,
    method: "QuotaCooldownBlockingModal",
    description: "Studio: verify the full-page blocking quota modal (Free plan cooldown), including the new suppression while a run is already in flight",
    conditionGroups: [
      {
        title: "Subscription / run state",
        items: [
          { label: "Free plan, within 24h cooldown, no generation currently in flight", marks: [T, F, F, F, F] },
          { label: "Free plan, cooldown period has passed", marks: [F, T, F, F, F] },
          { label: "Premium plan (generateUnlimited = true)", marks: [F, F, T, F, F] },
          { label: "Free plan quota exceeded, but a generation run is currently in flight (isGeneratingQuestions, or generationRun.status is Generating/Pending, or isStreaming)", marks: [F, F, F, T, F] },
          { label: "Free plan quota exceeded; the previously in-flight run just completed or failed", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Full-screen alertdialog blocks the entire page (JD/plan editing also blocked)", marks: [T, F, F, F, T] },
          { label: "Title \"Daily generation limit reached\" with cooldown end time shown", marks: [T, F, F, F, T] },
          { label: "\"View plans & billing\" / \"Create manually\" are the only escape hatches", marks: [T, F, F, F, T] },
          { label: "No modal shown, Studio fully usable", marks: [F, T, T, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Dialog is suppressed while quotaBlocked is true if a run is already in flight - avoids blocking work that already consumed the quota; it surfaces automatically the moment the run completes/fails", marks: [F, F, F, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N", "B", "N"],
  },
  {
    id: "FE_RAG_011",
    module: RAG_MODULE,
    method: "PlanApprovedLocksRefine",
    description: "Studio: verify refine/apply-settings are blocked once a plan is approved, without hitting the API",
    conditionGroups: [
      {
        title: "Plan state",
        items: [
          { label: "Plan is in draft / not approved", marks: [T, F, F] },
          { label: "Plan is approved, HR sends a refine chat message", marks: [F, T, F] },
          { label: "Plan is approved, HR tries to apply settings", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Refine/chat message sends normally", marks: [T, F, F] },
          { label: "Toast \"Plan is approved — cannot refine. Re-create plan to edit.\", no API call made", marks: [F, T, F] },
          { label: "Toast \"Plan is approved — cannot apply settings. Re-create plan.\", no API call made", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A"],
  },
  {
    id: "FE_RAG_012",
    module: RAG_MODULE,
    method: "QuestionEditDeleteRegenerate",
    description: "Studio: verify per-question edit/delete/AI-regenerate actions after generation, including the hard-coded estimatedMinutes bug",
    conditionGroups: [
      {
        title: "Action",
        items: [
          { label: "HR edits a question's content/difficulty/type and saves", marks: [T, F, F, F] },
          { label: "HR deletes a question", marks: [F, T, F, F] },
          { label: "HR clicks AI-regenerate on a single question", marks: [F, F, T, F] },
          { label: "HR double-clicks AI-regenerate rapidly on the same question", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "PUT sent with new content/difficulty/type; estimatedMinutes always sent as 5 regardless of actual value (DEFECT)", marks: [T, F, F, F] },
          { label: "DELETE removes the question from the list", marks: [F, T, F, F] },
          { label: "POST regenerate replaces question content via RAG, list refetches", marks: [F, F, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "No loading-state guard found - rapid double-click may fire duplicate regenerate requests (GAP)", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["A", "N", "N", "A"],
  },
  {
    id: "FE_RAG_013",
    module: RAG_MODULE,
    method: "SaveDraftPublishShare",
    description: "Studio: verify Save Draft / Publish / Unpublish / Create Share link / New Session actions",
    conditionGroups: [
      {
        title: "Action",
        items: [
          { label: "Click Save Draft", marks: [T, F, F, F, F] },
          { label: "Click Publish", marks: [F, T, F, F, F] },
          { label: "Click Unpublish on a published set", marks: [F, F, T, F, F] },
          { label: "Click Create Share link", marks: [F, F, F, T, F] },
          { label: "Start a new session from a shared link", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Toast \"draftSaved\" shown", marks: [T, F, F, F, F] },
          { label: "Toast \"published\" shown", marks: [F, T, F, F, F] },
          { label: "Toast \"unpublished\" shown", marks: [F, F, T, F, F] },
          { label: "Toast \"shareCreated\" shown with a shareable link", marks: [F, F, F, T, F] },
          { label: "Toast \"newSessionCreated\" shown", marks: [F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "N"],
  },
  {
    id: "FE_RAG_014",
    module: RAG_MODULE,
    method: "GenerateFormRetired",
    description:
      "Superseded 2026-08-10: /hr/generate (\"GenerateForm\", the old wizard-style entry point previously covered by 16 removed test cases - JD 400-char/100-word rule mismatch, file upload rules, hardcoded plan-creation payload, multi-step polling, retry-state screen, chat-based Ask-AI, quota banner, localStorage session persistence, background job list, duplicate save-draft, plan-regenerate limit, KB picker, Notes-for-AI field, question reorder, and 2 UI layout/theme cases) has been fully retired. src/app/hr/generate/page.tsx now just client-side redirects (router.replace) to /hr/generate-question (Studio) on mount - none of that GenerateForm-specific UI/behavior is reachable anymore. Studio's equivalent behavior (generate flow, quota gating, KB library, sample JD, sources panel, chat-refine, CTA states, question edit/delete/regenerate, save/publish/share) is already covered by FE_RAG_001-013 and the remaining FE_RAG_02x/03x sheets above.",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "HR navigates to /hr/generate", marks: [T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Client-side redirect fires on mount, landing on /hr/generate-question (Studio)", marks: [T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "All GenerateForm-specific UI/copy/mechanics are dead code as of this redirect - do not write new test cases against /hr/generate itself", marks: [T] },
        ],
      },
    ],
    types: ["N"],
  },
];

// ---- HR RAG Auth Error Handling ----
// Grounded in src/core/interceptors/auth.interceptor.ts, error.interceptor.ts,
// src/core/auth/token.service.ts, src/core/auth/permissions.ts

const RAGAUTH_MODULE = "HRRAGAuthErrorHandling";

const ragAuthTestCases = [
  {
    id: "FE_RAGAUTH_001",
    module: RAGAUTH_MODULE,
    method: "Token401SilentRefreshSuccess",
    description: "Verify a 401 on any HR/RAG-adjacent call triggers a silent token refresh + transparent retry when refresh succeeds",
    conditionGroups: [
      {
        title: "Request that receives 401",
        items: [
          { label: "Studio getGenerationRun poll request", marks: [T, F, F] },
          { label: "GenerateForm getGenerationJob poll request", marks: [F, T, F] },
          { label: "A normal HR action call (e.g. Save Draft)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "refreshAccessToken() called, POST /api/auth/refresh-token succeeds", marks: [T, T, T] },
          { label: "Original request retried transparently with the new token, no visible interruption", marks: [T, T, T] },
          { label: "In-progress polling continues seamlessly", marks: [T, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAGAUTH_002",
    module: RAGAUTH_MODULE,
    method: "Token401RefreshFailureRedirect",
    description: "Verify a 401 with a failed refresh results in silent clearAuth + hard redirect to /login, with zero toast/message",
    conditionGroups: [
      {
        title: "Refresh attempt outcome",
        items: [
          { label: "Refresh endpoint returns a non-2xx response", marks: [T, F, F] },
          { label: "Refresh call fails due to a network error", marks: [F, T, F] },
          { label: "Refresh response has no parseable accessToken/access_token/token field", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "clearAuth() removes interviewai_auth, interviewai_user_role, tokens, cached profile", marks: [T, T, T] },
          { label: "window.location.assign(\"/login\") triggers a hard full-page navigation", marks: [T, T, T] },
          { label: "No toast or \"session expired\" message is shown anywhere before the redirect", marks: [T, T, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Any in-progress RAG generation polling is silently abandoned since the page unloads (GAP)", marks: [T, T, T] },
        ],
      },
    ],
    types: ["A", "A", "A"],
  },
  {
    id: "FE_RAGAUTH_003",
    module: RAGAUTH_MODULE,
    method: "Token401NoRefreshTokenStored",
    description: "Verify immediate redirect when no refresh token exists in storage at all",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "getRefreshToken() returns null (no refresh token stored)", marks: [T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "performRefresh() short-circuits to false without any network call", marks: [T] },
          { label: "clearAuth() + redirectToLogin() fire immediately", marks: [T] },
        ],
      },
    ],
    types: ["A"],
  },
  {
    id: "FE_RAGAUTH_004",
    module: RAGAUTH_MODULE,
    method: "Token401OnRefreshEndpointItself",
    description: "Verify a 401 on the refresh-token call itself is treated as unrecoverable (no further retry)",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "The failing request's URL matches the refresh-token endpoint itself", marks: [T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [{ label: "clearAuth() + redirectToLogin() fire immediately, no further refresh attempt", marks: [T] }],
      },
    ],
    types: ["A"],
  },
  {
    id: "FE_RAGAUTH_005",
    module: RAGAUTH_MODULE,
    method: "Token401AlreadyRetriedOnce",
    description: "Verify a second 401 on an already-retried request is treated as unrecoverable",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "The request already has _retry=true from a prior refresh-and-retry cycle", marks: [T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [{ label: "clearAuth() + redirectToLogin() fire immediately, no second refresh attempted", marks: [T] }],
      },
    ],
    types: ["A"],
  },
  {
    id: "FE_RAGAUTH_006",
    module: RAGAUTH_MODULE,
    method: "PublicAuthEndpoint401NoInterceptor",
    description: "Verify 401s on public auth endpoints (login/register/verify-email/etc.) bypass the refresh/redirect interceptor entirely",
    conditionGroups: [
      {
        title: "Failing endpoint",
        items: [
          { label: "/api/auth/login returns 401 (wrong credentials)", marks: [T, F, F] },
          { label: "/api/auth/register returns 401", marks: [F, T, F] },
          { label: "/api/auth/verify-email returns 401 (expired link)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Interceptor rejects without attempting refresh or redirect", marks: [T, T, T] },
          { label: "The calling page's own error handling shows the appropriate inline message", marks: [T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAGAUTH_007",
    module: RAGAUTH_MODULE,
    method: "Forbidden403NoDedicatedHandling",
    description: "Verify 403 responses on HR/Studio/RAG-adjacent endpoints have no dedicated handling and fall through to generic messaging",
    conditionGroups: [
      {
        title: "403 response shape",
        items: [
          { label: "Backend returns response.data.detail with a specific message", marks: [T, F, F] },
          { label: "Backend returns 403 with no parseable body", marks: [F, T, F] },
          { label: "403 occurs inside a function that swallows errors and returns false (e.g. approvePlan)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "extractErrorMessage surfaces the backend's detail text via toast", marks: [T, F, F] },
          { label: "Generic fallback \"Something went wrong. Please try again.\" shown", marks: [F, T, F] },
          { label: "Hard-coded generic message shown, indistinguishable from any other failure type", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A"],
  },
  {
    id: "FE_RAGAUTH_008",
    module: RAGAUTH_MODULE,
    method: "NoRoleGateOnHrRoutes",
    description: "Verify there is no client-side role gate on /hr/* routes - wrong-role users can load the pages",
    conditionGroups: [
      {
        title: "Session role / target URL",
        items: [
          { label: "Candidate role navigates directly to /hr/generate", marks: [T, F, F] },
          { label: "Candidate role navigates directly to /hr/generate-v2 (Studio)", marks: [F, T, F] },
          { label: "Admin role navigates directly to /hr/generate", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Page renders the full HR UI client-side with no immediate redirect or \"access denied\" screen", marks: [T, T, T] },
          { label: "Blocking only occurs later, generically, when an actual API call 403s", marks: [T, T, T] },
        ],
      },
    ],
    types: ["A", "A", "A"],
  },
  {
    id: "FE_RAGAUTH_009",
    module: RAGAUTH_MODULE,
    method: "SubscriptionErrorCodeCannedMessages",
    description: "Verify subscription-specific backend error codes map to canned bilingual messages via extractErrorMessage",
    conditionGroups: [
      {
        title: "Backend errorCode",
        items: [
          { label: "QUOTA_EXCEEDED", marks: [T, F, F, F] },
          { label: "COOLDOWN_ACTIVE", marks: [F, T, F, F] },
          { label: "FEATURE_REQUIRES_PREMIUM", marks: [F, F, T, F] },
          { label: "PLAN_REGENERATE_LIMIT", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "\"You've used up your quota for this period. Upgrade to Premium or buy an extra Ask-AI pack.\"", marks: [T, F, F, F] },
          { label: "\"Free plan allows one question set per 24 hours. Please wait or upgrade to Premium.\"", marks: [F, T, F, F] },
          { label: "\"This feature requires the Premium plan.\"", marks: [F, F, T, F] },
          { label: "\"You've used all plan regenerations for this draft (max 5).\"", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_RAGAUTH_010",
    module: RAGAUTH_MODULE,
    method: "UnrecognizedErrorCodeFallback",
    description: "Verify the extractErrorMessage fallback chain for unrecognized error codes / missing response bodies",
    conditionGroups: [
      {
        title: "Error response shape",
        items: [
          { label: "errorCode present but not one of the 4 known codes", marks: [T, F, F, F, F] },
          { label: "No errorCode, but data.detail is present", marks: [F, T, F, F, F] },
          { label: "No errorCode/detail, only data.title present", marks: [F, F, T, F, F] },
          { label: "No parseable body at all, only axios error.message (e.g. timeout text)", marks: [F, F, F, T, F] },
          { label: "Nothing usable anywhere in the error object", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Unknown errorCode is ignored, falls through to the detail/title/message/error chain", marks: [T, F, F, F, F] },
          { label: "Falls through to data.detail/title as available", marks: [F, T, T, F, F] },
          { label: "Shows the raw axios message text (e.g. \"timeout of 60000ms exceeded\")", marks: [F, F, F, T, F] },
          { label: "Shows the final generic fallback \"Something went wrong. Please try again.\"", marks: [F, F, F, F, T] },
        ],
      },
    ],
    types: ["A", "N", "N", "A", "A"],
  },
  {
    id: "FE_RAGAUTH_011",
    module: RAGAUTH_MODULE,
    method: "TimeoutRaw5xxNoFriendlyMessage",
    description: "Verify timeouts and 5xx errors on RAG-adjacent calls show raw/generic text, and that no 429 handling exists",
    conditionGroups: [
      {
        title: "Failure type",
        items: [
          { label: "generatePlan or refinePlan exceeds its 180s timeout", marks: [T, F, F, F] },
          { label: "generateQuestions start-call exceeds its 60s timeout", marks: [F, T, F, F] },
          { label: "Backend responds with 500 Internal Server Error", marks: [F, F, T, F] },
          { label: "Backend responds with 429 Too Many Requests", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Raw axios message shown, e.g. \"timeout of 180000ms exceeded\" (not a friendly message)", marks: [T, F, F, F] },
          { label: "Raw axios message shown, e.g. \"timeout of 60000ms exceeded\"", marks: [F, T, F, F] },
          { label: "Generic extractErrorMessage fallback chain applies, no 5xx-specific copy", marks: [F, F, T, F] },
          { label: "No 429-specific handling exists anywhere in the codebase; falls through to the same generic chain", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["B", "B", "A", "A"],
  },
  {
    id: "FE_RAGAUTH_012",
    module: RAGAUTH_MODULE,
    method: "SessionExpiryMidGenerationPolling",
    description: "Verify what happens when the access token expires mid-poll during a long-running RAG generation",
    conditionGroups: [
      {
        title: "Refresh outcome mid-poll",
        items: [
          { label: "Access token expires during polling, refresh token still valid", marks: [T, F] },
          { label: "Access token expires during polling, refresh token also expired/invalid", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Next poll 401s, silent refresh+retry succeeds, polling continues with zero visible interruption", marks: [T, F] },
          { label: "Refresh fails, hard redirect to /login fires mid-poll, in-progress generation silently abandoned", marks: [F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "HR must return to Studio/History after next login to discover whether the job actually completed server-side", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_RAGAUTH_013",
    module: RAGAUTH_MODULE,
    method: "ConcurrentRequests401Dedup",
    description: "Verify multiple simultaneous 401s trigger only one refresh-token call, de-duplicated via refreshInFlight",
    conditionGroups: [
      {
        title: "Concurrent 401 count",
        items: [
          { label: "Exactly 2 requests fail with 401 at the same time", marks: [T, F] },
          { label: "3 or more requests fail with 401 at the same time", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Only ONE POST /api/auth/refresh-token call is made, all failed requests await the same promise", marks: [T, T] },
          { label: "All original requests are retried with the same new token once refresh resolves", marks: [T, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAGAUTH_014",
    module: RAGAUTH_MODULE,
    method: "RagServiceDeadCodeNoAuthHeader",
    description: "Static finding: rag.service.ts / /api/rag/* proxy routes have zero interceptor coverage (latent risk, not exercisable via current UI)",
    conditionGroups: [
      {
        title: "Code path audited",
        items: [
          { label: "src/features/interview/services/rag.service.ts (bare axios.create(), no interceptors)", marks: [T, F] },
          { label: "src/app/api/rag/*/route.ts proxy routes (no caller-session/JWT check, only a static internal API key)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Confirmed dead code - not imported/called by any active component currently", marks: [T, F] },
          { label: "If ever reactivated, requests would carry no Authorization header and get no 401-refresh handling (LATENT RISK)", marks: [T, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Not exercisable as a manual UI test case today; tracked here as a static-analysis finding", marks: [T, T] },
        ],
      },
    ],
    types: ["B", "B"],
  },
];

// ---- Additional coverage to round out the suite ----

const ragTestCasesMore = [
  {
    id: "FE_RAG_027",
    module: RAG_MODULE,
    method: "SampleJdModalCopyUse",
    description: "Studio: verify the Sample JD modal's Copy and Use buttons",
    conditionGroups: [
      {
        title: "Action",
        items: [
          { label: "Open Sample JD modal, click Copy", marks: [T, F] },
          { label: "Open Sample JD modal, click Use", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Sample JD text copied to clipboard, modal stays open", marks: [T, F] },
          { label: "Sample JD text inserted directly into the JD textarea, modal closes", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAG_029",
    module: RAG_MODULE,
    method: "PublishedSetEditRestrictions",
    description: "Verify the backend rejects add/edit/delete/reorder while a question set is PUBLISHED",
    conditionGroups: [
      {
        title: "Question set state",
        items: [
          { label: "Set is a DRAFT", marks: [T, F] },
          { label: "Set is PUBLISHED", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Add/edit/delete/reorder actions succeed", marks: [T, F] },
          { label: "Add/edit/delete/reorder actions are rejected by the backend", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_RAG_030",
    module: RAG_MODULE,
    method: "ApplyPlanSettingsTimeout",
    description: "Studio: verify applyPlanSettings behavior around its 30s timeout",
    conditionGroups: [
      {
        title: "Request duration",
        items: [
          { label: "Completes within 30s", marks: [T, F] },
          { label: "Exceeds the 30s timeout", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Toast \"settingsApplied\" shown", marks: [T, F] },
          { label: "Raw axios timeout message surfaces via extractErrorMessage fallback (no friendly copy)", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_RAG_031",
    module: RAG_MODULE,
    method: "RefinePlanChatFlow",
    description: "Studio: verify the refine-plan chat flow (180s timeout, distinct from generatePlan)",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Refine message sent, plan updates in response", marks: [T, F] },
          { label: "Refine request exceeds its 180s timeout", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Toast \"planRefining\" then \"planRefined\" shown, updated plan rendered", marks: [T, F] },
          { label: "Raw axios timeout message surfaces (e.g. \"timeout of 180000ms exceeded\")", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_RAG_032",
    module: RAG_MODULE,
    method: "StudioGenerationSettingsToggles",
    description: "Studio: verify includeSampleAnswers / includeScoringRubric toggles are respected on Generate",
    conditionGroups: [
      {
        title: "Toggle state",
        items: [
          { label: "Both toggles off", marks: [T, F, F, F] },
          { label: "includeSampleAnswers on only", marks: [F, T, F, F] },
          { label: "includeScoringRubric on only", marks: [F, F, T, F] },
          { label: "Both toggles on", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Generated questions omit sample answers and scoring rubric", marks: [T, F, F, F] },
          { label: "Generated questions include sample answers only", marks: [F, T, F, F] },
          { label: "Generated questions include scoring rubric only", marks: [F, F, T, F] },
          { label: "Generated questions include both sample answers and scoring rubric", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_RAG_033",
    module: RAG_MODULE,
    method: "NewSetResetsLockedPanels",
    description: "Studio: verify the \"New Set\" action unlocks and resets the Sources/Inspector panels",
    conditionGroups: [
      {
        title: "Precondition",
        items: [
          { label: "Panels are locked (questions exist) and HR clicks New Set", marks: [T, F] },
          { label: "HR has unsaved plan-refine edits when clicking New Set", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Panels unlock, JD/sources/questions reset to a blank state", marks: [T, T] },
        ],
      },
      {
        title: "Exception",
        items: [{ label: "No confirmation prompt found before discarding unsaved edits (GAP, needs confirmation)", marks: [F, T] }],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_RAG_034",
    module: RAG_MODULE,
    method: "KnowledgeDocLibraryAttachVsUploadNew",
    description: "Studio: verify attaching an existing library document vs. uploading a brand-new one",
    conditionGroups: [
      {
        title: "Action",
        items: [
          { label: "Attach an existing document from the library", marks: [T, F] },
          { label: "Upload a brand-new document", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Existing doc attached immediately, status reflects its current ingestion state", marks: [T, F] },
          { label: "New doc uploaded, toast \"Uploaded — RAG ingestion queued.\", starts at Queued/Processing", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAG_035",
    module: RAG_MODULE,
    method: "StudioChatRefineMultiTurn",
    description: "Studio: verify multiple sequential refine-chat messages before approving the plan",
    conditionGroups: [
      {
        title: "Refine turn",
        items: [
          { label: "1st refine message sent", marks: [T, F, F] },
          { label: "2nd refine message, builds on the 1st refined plan", marks: [F, T, F] },
          { label: "3rd refine message, builds on the 2nd refined plan", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Each turn updates the plan and chat history incrementally, prior refinements preserved", marks: [T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAG_037",
    module: RAG_MODULE,
    method: "StudioApprovePlanButtonStates",
    description: "Studio: verify the Approve Plan button's loading/disabled/error states",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Approve request is in flight", marks: [T, F, F] },
          { label: "Approve succeeds", marks: [F, T, F] },
          { label: "Approve fails (network error)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Button disabled with a loading spinner", marks: [T, F, F] },
          { label: "Toast \"planApprovedMsg\" shown, chat locks", marks: [F, T, F] },
          { label: "Generic error toast shown via extractErrorMessage, plan remains unapproved", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A"],
  },
  {
    id: "FE_RAG_039",
    module: RAG_MODULE,
    method: "StudioQuestionListEmptyStateBeforeGenerate",
    description: "Studio: verify the question list's empty-state variants before/around generation",
    conditionGroups: [
      {
        title: "State",
        items: [
          { label: "No plan created yet", marks: [T, F, F] },
          { label: "Plan approved but generation not yet run", marks: [F, T, F] },
          { label: "Generation failed, list still empty", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Empty state prompts HR to create/approve a plan first", marks: [T, T, F] },
          { label: "Empty state reflects the failed generation with a retry affordance", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A"],
  },
];

const ragAuthTestCasesMore = [
  {
    id: "FE_RAGAUTH_015",
    module: RAGAUTH_MODULE,
    method: "LoginSpecificAuthErrors",
    description: "Verify login-page-owned 401/403 handling is separate from the mid-session interceptor path",
    conditionGroups: [
      {
        title: "Login attempt",
        items: [
          { label: "401 - invalid credentials", marks: [T, F] },
          { label: "403 - account disabled", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Inline \"invalidCredentials\" message shown on the login form, no redirect", marks: [T, F] },
          { label: "Inline \"accountDisabled\" message shown on the login form, no redirect", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAGAUTH_016",
    module: RAGAUTH_MODULE,
    method: "CandidateForbiddenErrorMessages",
    description: "Verify the candidate-scoped ForbiddenError messages on practice-session/feedback 403s (distinct from HR/RAG generic handling)",
    conditionGroups: [
      {
        title: "403 scenario",
        items: [
          { label: "Candidate accesses another account's practice session", marks: [T, F] },
          { label: "Candidate views another account's feedback", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "\"You don't have access to practice this question set.\"", marks: [T, F] },
          { label: "\"This session belongs to another account, so we can't show its feedback here.\"", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAGAUTH_017",
    module: RAGAUTH_MODULE,
    method: "TokenStorageLocalStorageNotHttpOnly",
    description: "Static finding: access/refresh tokens are stored in plain localStorage, not httpOnly cookies (XSS exposure risk)",
    conditionGroups: [
      {
        title: "Token audited",
        items: [
          { label: "interviewai_access_token key in localStorage", marks: [T, F] },
          { label: "interviewai_refresh_token key in localStorage", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Token is readable by any JS running on the page (e.g. via DevTools console), not httpOnly-protected", marks: [T, T] },
        ],
      },
      {
        title: "Exception",
        items: [{ label: "Flag as a security hardening candidate for the dev/security team (LATENT RISK)", marks: [T, T] }],
      },
    ],
    types: ["B", "B"],
  },
  {
    id: "FE_RAGAUTH_018",
    module: RAGAUTH_MODULE,
    method: "SsrNoTokenAttachNoOp",
    description: "Verify the auth request interceptor no-ops during SSR (window === undefined) and attaches correctly after hydration",
    conditionGroups: [
      {
        title: "Render context",
        items: [
          { label: "Server-side render pass (window undefined)", marks: [T, F] },
          { label: "Client-side after hydration", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "No Authorization header attached, no crash during SSR", marks: [T, F] },
          { label: "Authorization header attached correctly on subsequent client-side requests", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAGAUTH_019",
    module: RAGAUTH_MODULE,
    method: "ClearAuthClearsCachedUserProfile",
    description: "Verify clearAuth() also clears the cached user profile, not just tokens/role",
    conditionGroups: [
      {
        title: "Precondition",
        items: [
          { label: "Cached user profile present before a 401-triggered clearAuth()", marks: [T, F] },
          { label: "Cached user profile already absent (already cleared)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "clearCachedUserProfile() removes the cached profile alongside tokens/role", marks: [T, F] },
          { label: "No-op, nothing to clear, no error thrown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAGAUTH_020",
    module: RAGAUTH_MODULE,
    method: "RefreshTokenRotationOnSuccess",
    description: "Verify token persistence behavior after a successful refresh call (rotation vs. access-token-only response)",
    conditionGroups: [
      {
        title: "Refresh response shape",
        items: [
          { label: "Response includes both a new access token and a new refresh token", marks: [T, F] },
          { label: "Response includes only a new access token (refresh token unchanged)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Both tokens persisted via setAuthTokens, old refresh token replaced", marks: [T, F] },
          { label: "Only the access token is updated, prior refresh token remains valid for the next cycle", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
];

// ---- UI Visual / Responsive / Theme test cases ----
// Covers layout, dark/light theme, component visual states across the HR pages already
// exercised above (Manual Question, Studio, GenerateForm) plus shared UI chrome
// (nav, modals, toasts, tooltips, tables, buttons, form fields, accessibility).

const UI_MODULE = "UIVisualLayoutModule";

const uiTestCases = [
  {
    id: "FE_UI_001",
    module: UI_MODULE,
    method: "ManualQuestionPageResponsiveLayout",
    description: "Verify the manual question page layout adapts correctly across viewport sizes",
    conditionGroups: [
      {
        title: "Viewport",
        items: [
          { label: "Desktop 1920x1080", marks: [T, F, F, F] },
          { label: "Laptop 1366x768", marks: [F, T, F, F] },
          { label: "Tablet 768x1024 portrait", marks: [F, F, T, F] },
          { label: "Mobile 375x667", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Question cards display full width, all fields visible without horizontal scroll", marks: [T, T, F, F] },
          { label: "Layout stacks to a single column, sticky footer Save button stays accessible", marks: [F, F, T, T] },
          { label: "No content is clipped or overlapping at any breakpoint", marks: [T, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_UI_002",
    module: UI_MODULE,
    method: "ManualQuestionPageDarkLightTheme",
    description: "Verify the manual question page renders correctly in both light and dark theme",
    conditionGroups: [
      { title: "Theme", items: [{ label: "Light theme", marks: [T, F] }, { label: "Dark theme", marks: [F, T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Text contrast remains readable in both themes", marks: [T, T] },
          { label: "Card backgrounds, borders, and buttons switch correctly to the active theme's palette", marks: [T, T] },
          { label: "No hardcoded light-only colors leak through in dark mode (e.g. a white card on a dark page)", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_UI_003",
    module: UI_MODULE,
    method: "StudioPageResponsiveLayout",
    description: "Verify Studio's 3-panel layout (Sources | Chat/Plan | Inspector) adapts across viewport sizes",
    conditionGroups: [
      {
        title: "Viewport",
        items: [
          { label: "Desktop wide (>=1440px)", marks: [T, F, F, F] },
          { label: "Laptop (1024-1439px)", marks: [F, T, F, F] },
          { label: "Tablet (768-1023px)", marks: [F, F, T, F] },
          { label: "Mobile (<768px)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "All 3 panels visible side by side", marks: [T, F, F, F] },
          { label: "Panels remain usable but narrower, no overlap", marks: [F, T, F, F] },
          { label: "Panels stack or become tabbed/collapsible sections", marks: [F, F, T, T] },
          { label: "Locked-panel overlay/tooltip still renders correctly at this size", marks: [T, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_UI_004",
    module: UI_MODULE,
    method: "StudioPageDarkLightTheme",
    description: "Verify the Studio page renders correctly in both light and dark theme",
    conditionGroups: [
      { title: "Theme", items: [{ label: "Light theme", marks: [T, F] }, { label: "Dark theme", marks: [F, T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "RAG status chips, locked-panel overlay, and chat bubbles remain legible in both themes", marks: [T, T] },
          { label: "No hardcoded light-only colors leak through in dark mode", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_UI_007",
    module: UI_MODULE,
    method: "QuotaModalResponsiveDisplay",
    description:
      "Verify the Studio full-page blocking quota modal renders correctly across viewport sizes (GenerateForm's separate inline banner variant no longer applies - /hr/generate now just redirects to Studio, see FE_RAG_014 GenerateFormRetired)",
    conditionGroups: [
      {
        title: "Viewport",
        items: [
          { label: "Desktop (1920x1080)", marks: [T, F, F, F] },
          { label: "Laptop (1366x768)", marks: [F, T, F, F] },
          { label: "Tablet (768x1024)", marks: [F, F, T, F] },
          { label: "Mobile (375x667)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Modal is centered, fully covers the page, text readable without zooming", marks: [T, T, T, T] },
          { label: "Modal buttons (\"View plans & billing\" / \"Create manually\") stay tappable, not cut off at the bottom", marks: [T, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_UI_008",
    module: UI_MODULE,
    method: "ToastNotificationPositioning",
    description: "Verify toast notification display, stacking, wrapping, and mobile behavior",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Single toast shown", marks: [T, F, F, F] },
          { label: "Multiple toasts fired in quick succession", marks: [F, T, F, F] },
          { label: "Toast with a long message", marks: [F, F, T, F] },
          { label: "Toast shown on a mobile viewport", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Toast appears in a consistent corner/position, auto-dismisses after its duration", marks: [T, F, F, F] },
          { label: "Multiple toasts stack without overlapping each other", marks: [F, T, F, F] },
          { label: "Long text wraps within the toast width instead of overflowing", marks: [F, F, T, F] },
          { label: "Toast remains fully visible and readable on a mobile viewport", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_UI_009",
    module: UI_MODULE,
    method: "FileUploadDropzoneVisualStates",
    description: "Verify the Studio JD/document upload dropzone's visual states",
    conditionGroups: [
      {
        title: "State",
        items: [
          { label: "Idle / default", marks: [T, F, F, F] },
          { label: "Drag-over highlight", marks: [F, T, F, F] },
          { label: "Uploading in progress", marks: [F, F, T, F] },
          { label: "Error (invalid type / too large)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Dashed border, upload icon, and hint text shown in idle state", marks: [T, F, F, F] },
          { label: "Border/background highlights while a file is dragged over the dropzone", marks: [F, T, F, F] },
          { label: "Progress indicator or disabled state shown while uploading", marks: [F, F, T, F] },
          { label: "Border turns red/error color with inline error text on an invalid file", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_UI_010",
    module: UI_MODULE,
    method: "ButtonLoadingDisabledStates",
    description: "Verify primary action buttons (Save/Generate/Submit) show correct visual states across pages",
    conditionGroups: [
      {
        title: "Button state",
        items: [
          { label: "Default enabled", marks: [T, F, F, F] },
          { label: "Hover", marks: [F, T, F, F] },
          { label: "Disabled (invalid form)", marks: [F, F, T, F] },
          { label: "Loading (submit in flight)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Button shows its default color/label", marks: [T, F, F, F] },
          { label: "Button shows a hover state (color/elevation change)", marks: [F, T, F, F] },
          { label: "Button is visibly greyed out and unclickable when the form is invalid", marks: [F, F, T, F] },
          { label: "Button shows a spinner, label changes (e.g. \"Saving…\"), unclickable while in flight", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_UI_011",
    module: UI_MODULE,
    method: "FormFieldValidationVisualStates",
    description: "Verify text input/textarea visual states across HR forms (default/focus/error/disabled)",
    conditionGroups: [
      {
        title: "Field state",
        items: [
          { label: "Default", marks: [T, F, F, F] },
          { label: "Focused", marks: [F, T, F, F] },
          { label: "Error (invalid value, after submit attempt)", marks: [F, F, T, F] },
          { label: "Disabled", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Neutral border/background shown", marks: [T, F, F, F] },
          { label: "Focus ring/outline shown", marks: [F, T, F, F] },
          { label: "Red border + inline error message shown", marks: [F, F, T, F] },
          { label: "Muted background, not editable, cursor shows not-allowed", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A", "N"],
  },
  {
    id: "FE_UI_012",
    module: UI_MODULE,
    method: "NavigationSidebarResponsive",
    description: "Verify the HR shell sidebar/navigation adapts across viewport sizes",
    conditionGroups: [
      {
        title: "Viewport / state",
        items: [
          { label: "Desktop, sidebar expanded", marks: [T, F, F, F] },
          { label: "Desktop, sidebar collapsed to icon-only", marks: [F, T, F, F] },
          { label: "Tablet", marks: [F, F, T, F] },
          { label: "Mobile", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Full sidebar with labels shown", marks: [T, F, F, F] },
          { label: "Icon-only sidebar, tooltips on hover reveal labels", marks: [F, T, F, F] },
          { label: "Sidebar adapts to tablet width without overlapping content", marks: [F, F, T, F] },
          { label: "Sidebar becomes a hamburger-triggered drawer on mobile", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_UI_013",
    module: UI_MODULE,
    method: "ModalDialogPositioningZIndex",
    description: "Verify modal dialogs (Confirm Import, Payment QR, Quota, Downgrade confirm) are positioned and layered correctly",
    conditionGroups: [
      {
        title: "Modal",
        items: [
          { label: "Confirm Import modal (Excel import)", marks: [T, F, F, F] },
          { label: "Payment QR modal (SePay)", marks: [F, T, F, F] },
          { label: "Quota-exceeded modal", marks: [F, F, T, F] },
          { label: "Downgrade-to-Free confirm modal", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Modal is centered with a dimmed backdrop, sits above all page content", marks: [T, T, T, T] },
          { label: "Backdrop click / Escape closes the modal where applicable", marks: [T, F, T, T] },
          { label: "Modal content does not overflow its container on smaller screens", marks: [T, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_UI_014",
    module: UI_MODULE,
    method: "TableGridResponsiveOverflow",
    description: "Verify data tables/grids (payment history, question list) handle overflow responsively",
    conditionGroups: [
      {
        title: "Viewport",
        items: [
          { label: "Desktop (no scroll needed)", marks: [T, F, F] },
          { label: "Tablet", marks: [F, T, F] },
          { label: "Mobile", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "All columns visible without scrolling", marks: [T, F, F] },
          { label: "Table scrolls horizontally within its own container, page layout stays intact", marks: [F, T, T] },
          { label: "Column headers remain readable while scrolling", marks: [F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "B"],
  },
  {
    id: "FE_UI_015",
    module: UI_MODULE,
    method: "TooltipHoverDisplay",
    description: "Verify tooltip display on hover and keyboard focus (locked panel, RAG status chip, disabled trash icon)",
    conditionGroups: [
      {
        title: "Trigger",
        items: [
          { label: "Mouse hover on locked panel overlay", marks: [T, F, F, F] },
          { label: "Mouse hover on RAG status chip", marks: [F, T, F, F] },
          { label: "Mouse hover on disabled trash icon", marks: [F, F, T, F] },
          { label: "Keyboard focus (Tab) instead of mouse hover", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Tooltip text appears near the cursor after a short hover delay", marks: [T, T, T, F] },
          { label: "Tooltip dismisses when the pointer moves away", marks: [T, T, T, F] },
          { label: "Tooltip also appears on keyboard focus, not just mouse hover", marks: [F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [{ label: "Keyboard-focus tooltip support is unverified (possible accessibility gap)", marks: [F, F, F, T] }],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_UI_016",
    module: UI_MODULE,
    method: "LoadingSpinnerSkeletonStates",
    description: "Verify loading skeletons and AI generation spinners across pages",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Initial page load (skeleton placeholders)", marks: [T, F, F] },
          { label: "AI generation in progress (spinner + status text)", marks: [F, T, F] },
          { label: "Slow network - spinner shown for an unusually long time", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Skeleton placeholders match the eventual content's layout, no layout shift on load", marks: [T, F, F] },
          { label: "Spinner + status text (e.g. \"Generating plan...\") shown during AI calls", marks: [F, T, T] },
          { label: "No indefinite spinner without feedback (matches the 5-min Studio deadline UX)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "B"],
  },
  {
    id: "FE_UI_017",
    module: UI_MODULE,
    method: "AccessibilityKeyboardNavigation",
    description: "Verify keyboard-only navigation across key interactive flows",
    conditionGroups: [
      {
        title: "Interaction",
        items: [
          { label: "Tab through Manual Question form fields", marks: [T, F, F, F] },
          { label: "Tab through Studio's 3-panel layout", marks: [F, T, F, F] },
          { label: "Escape key while a modal is open", marks: [F, F, T, F] },
          { label: "Enter/Space activates a focused button", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Tab order follows the visual/logical reading order, no focus traps", marks: [T, T, F, F] },
          { label: "Focus ring/outline is visible on the currently focused element", marks: [T, T, F, F] },
          { label: "Escape closes the topmost open modal", marks: [F, F, T, F] },
          { label: "Enter/Space activates the focused button, matching a mouse click", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["A", "A", "N", "N"],
  },
  {
    id: "FE_UI_018",
    module: UI_MODULE,
    method: "BrandingLogoHeaderConsistency",
    description: "Verify header/logo/branding render consistently across HR pages",
    conditionGroups: [
      {
        title: "Page",
        items: [
          { label: "Manual Question page", marks: [T, F, F, F] },
          { label: "Studio page", marks: [F, T, F, F] },
          { label: "Admin Manage Users page", marks: [F, F, T, F] },
          { label: "Settings/Billing page", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Logo, page title, and user menu render consistently in the same position", marks: [T, T, T, T] },
          { label: "Active nav item is visually highlighted to match the current page", marks: [T, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
];

// ---- Auth / Profile / Admin (already implemented by the team - reconstructed here in the
// same decision-table format for reference, grounded in the actual auth/profile/admin code) ----

const AUTH_MODULE = "AuthModule";
const AUTHADMIN_MODULE = "AuthAdminModule";
const PROFILE_MODULE = "ProfileModule";
const ADMIN_MODULE = "AdminModule";

const authTestCases = [
  {
    id: "FE_AUTH_001",
    module: AUTH_MODULE,
    method: "RegisterHR",
    description: "Check HR Manager registration form and validations",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "Can connect with server", marks: [T, T, T, T, T, T, T] }] },
      {
        title: "Company Name",
        items: [
          { label: "\"Tech ABC\" (Valid)", marks: [T, F, T, T, T, T, T] },
          { label: "Null / Empty", marks: [F, T, F, F, F, F, F] },
        ],
      },
      {
        title: "Full Name",
        items: [
          { label: "\"John Doe\" (Valid)", marks: [T, T, F, T, T, T, T] },
          { label: "Null / Empty", marks: [F, F, T, F, F, F, F] },
        ],
      },
      {
        title: "Work Email",
        items: [
          { label: "hr@techabc.com (Valid)", marks: [T, T, T, F, T, T, T] },
          { label: "Null / Empty", marks: [F, F, F, T, F, F, F] },
        ],
      },
      {
        title: "Password",
        items: [
          { label: "\"Pass$123\" (Valid)", marks: [T, T, T, T, F, T, T] },
          { label: "Null / Empty", marks: [F, F, F, F, T, F, F] },
        ],
      },
      {
        title: "Confirm Password",
        items: [
          { label: "\"Pass$123\" (Matched)", marks: [T, T, T, T, T, F, F] },
          { label: "Null / Empty", marks: [F, F, F, F, F, T, F] },
          { label: "\"Pass$456\" (Mismatched)", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Redirect \"Verify your email\"", marks: [T, F, F, F, F, F, F] },
          { label: "Stay on form", marks: [F, T, T, T, T, T, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "\"Company Name is required\"", marks: [F, T, F, F, F, F, F] },
          { label: "\"Full Name is required\"", marks: [F, F, T, F, F, F, F] },
          { label: "\"Work Email is required\"", marks: [F, F, F, T, F, F, F] },
          { label: "\"Password is required\"", marks: [F, F, F, F, T, F, F] },
          { label: "\"Confirm Password is required\"", marks: [F, F, F, F, F, T, F] },
          { label: "\"Passwords do not match\"", marks: [F, F, F, F, F, F, T] },
        ],
      },
      {
        title: "Log message",
        items: [{ label: "\"Register HR Success\"", marks: [T, F, F, F, F, F, F] }],
      },
    ],
    types: ["N", "A", "A", "A", "A", "A", "A"],
  },
  {
    id: "FE_AUTH_002",
    module: AUTH_MODULE,
    method: "Login",
    description: "Validate HR/Candidate login form fields, error handling, and role-based redirect",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "Can connect with server", marks: [T, T, T, T, T, T, T] }] },
      {
        title: "Login attempt",
        items: [
          { label: "Email field left empty", marks: [T, F, F, F, F, F, F] },
          { label: "Password field left empty (valid email entered)", marks: [F, T, F, F, F, F, F] },
          { label: "Valid HR credentials", marks: [F, F, T, F, F, F, F] },
          { label: "Valid email, wrong password", marks: [F, F, F, T, F, F, F] },
          { label: "Valid credentials, account disabled", marks: [F, F, F, F, T, F, F] },
          { label: "Valid credentials, email not verified", marks: [F, F, F, F, F, T, F] },
          { label: "Valid Jobseeker credentials", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Redirects to /hr/dashboard", marks: [F, F, T, F, F, F, F] },
          { label: "Redirects to /jobseeker", marks: [F, F, F, F, F, F, T] },
          { label: "Stays on the login form", marks: [T, T, F, T, T, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "\"Email is required\"", marks: [T, F, F, F, F, F, F] },
          { label: "\"Password is required\"", marks: [F, T, F, F, F, F, F] },
          { label: "\"Email or password is incorrect. Please try again.\"", marks: [F, F, F, T, F, F, F] },
          { label: "\"Your account has been disabled. Please contact the administrator.\"", marks: [F, F, F, F, T, F, F] },
          { label: "Unverified-email confirm dialog opens with Resend/Close options", marks: [F, F, F, F, F, T, F] },
        ],
      },
    ],
    types: ["A", "A", "N", "A", "A", "A", "N"],
  },
  {
    id: "FE_AUTH_003",
    module: AUTH_MODULE,
    method: "RegisterJobSeeker",
    description: "Check Job Seeker registration form (step 1) validations",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "Can connect with server", marks: [T, T, T, T, T, T, T] }] },
      {
        title: "Full Name",
        items: [
          { label: "Valid", marks: [T, F, T, T, T, T, T] },
          { label: "Null / Empty", marks: [F, T, F, F, F, F, F] },
        ],
      },
      {
        title: "Email",
        items: [
          { label: "Valid format", marks: [T, T, F, T, T, T, T] },
          { label: "Invalid format", marks: [F, F, T, F, F, F, F] },
        ],
      },
      {
        title: "Password",
        items: [
          { label: "Valid (8+ chars, has upper/lower/digit/special)", marks: [T, T, T, F, F, T, T] },
          { label: "Too short (< 8 characters)", marks: [F, F, F, T, F, F, F] },
          { label: "Missing a complexity class (e.g. no special character)", marks: [F, F, F, F, T, F, F] },
        ],
      },
      {
        title: "Confirm Password",
        items: [
          { label: "Matches Password", marks: [T, T, T, T, T, F, T] },
          { label: "Mismatched", marks: [F, F, F, F, F, T, F] },
        ],
      },
      {
        title: "Server response",
        items: [{ label: "Email already registered (409)", marks: [F, F, F, F, F, F, T] }],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Advances to Step 2 (Target Role / Seniority / Tech Stack)", marks: [T, F, F, F, F, F, F] },
          { label: "Stays on Step 1 with a field error", marks: [F, T, T, T, T, T, F] },
          { label: "Jumps back to Step 1, email field shows a duplicate-email error", marks: [F, F, F, F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "\"Họ tên là bắt buộc\" (Full name required)", marks: [F, T, F, F, F, F, F] },
          { label: "\"Vui lòng nhập email hợp lệ\" (invalid email)", marks: [F, F, T, F, F, F, F] },
          { label: "\"Password must be at least 8 characters\"", marks: [F, F, F, T, F, F, F] },
          { label: "\"Password must contain 1 uppercase, 1 lowercase, 1 number and 1 special character\"", marks: [F, F, F, F, T, F, F] },
          { label: "\"Passwords do not match\"", marks: [F, F, F, F, F, T, F] },
          { label: "\"This email is already registered.\"", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A", "A", "A", "A", "A"],
  },
  {
    id: "FE_AUTH_004",
    module: AUTH_MODULE,
    method: "VerifyEmail",
    description: "Check the 6-digit OTP email verification flow and resend behavior",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "No email in the URL query param", marks: [T, F, F, F, F, F] },
          { label: "Correct 6-digit OTP entered", marks: [F, T, F, F, F, F] },
          { label: "Wrong or expired OTP entered", marks: [F, F, T, F, F, F] },
          { label: "Resend clicked while the 60s cooldown is still active", marks: [F, F, F, T, F, F] },
          { label: "Resend clicked after the cooldown expired", marks: [F, F, F, F, T, F] },
          { label: "6 digits pasted at once into the OTP boxes", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Shows \"No email found. Please register again.\" + back-to-login link", marks: [T, F, F, F, F, F] },
          { label: "Success panel \"Email verified!\", auto-redirects to /login after 3s", marks: [F, T, F, F, F, F] },
          { label: "OTP boxes clear and refocus", marks: [F, F, T, F, F, F] },
          { label: "Resend button stays disabled, shows \"Resend in {{seconds}}s\"", marks: [F, F, F, T, F, F] },
          { label: "New code sent, toast \"A new verification code has been sent to your email.\", cooldown restarts", marks: [F, F, F, F, T, F] },
          { label: "All 6 boxes auto-fill from the pasted value", marks: [F, F, F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [{ label: "\"Invalid or expired verification code. Please try again.\"", marks: [F, F, T, F, F, F] }],
      },
    ],
    types: ["N", "N", "A", "N", "N", "N"],
  },
  {
    id: "FE_AUTH_005",
    module: AUTH_MODULE,
    method: "ForgotResetPassword",
    description: "Check the forgot-password request and reset-password form validations",
    conditionGroups: [
      {
        title: "Forgot-password form",
        items: [
          { label: "Email field left empty", marks: [T, F, F, F, F, F, F, F] },
          { label: "Email format invalid", marks: [F, T, F, F, F, F, F, F] },
          { label: "Valid email submitted", marks: [F, F, T, F, F, F, F, F] },
        ],
      },
      {
        title: "Reset-password form",
        items: [
          { label: "No token in the URL", marks: [F, F, F, T, F, F, F, F] },
          { label: "Token is expired / invalid / already used", marks: [F, F, F, F, T, F, F, F] },
          { label: "New password is less than 8 characters", marks: [F, F, F, F, F, T, F, F] },
          { label: "Confirm password does not match the new password", marks: [F, F, F, F, F, F, T, F] },
          { label: "Valid token, valid matching new password", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "\"Email is required.\"", marks: [T, F, F, F, F, F, F, F] },
          { label: "\"Please enter a valid email address.\"", marks: [F, T, F, F, F, F, F, F] },
          { label: "Generic success screen \"Check your inbox\" shown regardless of whether the email exists", marks: [F, F, T, F, F, F, F, F] },
          { label: "Token-error panel \"This reset link is invalid or has expired.\" + \"Request a new link\"", marks: [F, F, F, T, T, F, F, F] },
          { label: "\"Password must be at least 8 characters.\"", marks: [F, F, F, F, F, T, F, F] },
          { label: "\"Passwords do not match.\"", marks: [F, F, F, F, F, F, T, F] },
          { label: "Redirects to /login?reset=success; login page then shows a \"Password reset successfully.\" toast", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["A", "A", "N", "A", "A", "A", "A", "N"],
  },
  {
    id: "FE_AUTH_006",
    module: AUTHADMIN_MODULE,
    method: "AccessControl",
    description: "Check AdminRouteGuard behavior across session states and its unguarded-route gap",
    conditionGroups: [
      {
        title: "Session state",
        items: [
          { label: "Not authenticated, navigates to a guarded admin page (e.g. /admin/users)", marks: [T, F, F, F, F, F] },
          { label: "Authenticated with HR role, navigates to a guarded admin page", marks: [F, T, F, F, F, F] },
          { label: "Authenticated with Jobseeker role, navigates to a guarded admin page", marks: [F, F, T, F, F, F] },
          { label: "Authenticated with Admin role, navigates to a guarded admin page", marks: [F, F, F, T, F, F] },
          { label: "useUser() is still loading (role/auth not resolved yet)", marks: [F, F, F, F, T, F] },
          { label: "Non-admin navigates directly to an UNGUARDED admin page (e.g. /admin/dashboard)", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Silently redirected to /login, no toast", marks: [T, F, F, F, F, F] },
          { label: "Toast \"You do not have permission to access this page.\", redirected to /hr/dashboard", marks: [F, T, F, F, F, F] },
          { label: "Toast \"You do not have permission to access this page.\", redirected to /jobseeker", marks: [F, F, T, F, F, F] },
          { label: "Page renders normally, children shown", marks: [F, F, F, T, F, F] },
          { label: "Centered loading spinner shown instead of children or a redirect", marks: [F, F, F, F, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Page renders with no access check at all - AdminRouteGuard is only wired into 4 of the admin pages (GAP)", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "N", "A"],
  },
  {
    id: "FE_AUTH_007",
    module: PROFILE_MODULE,
    method: "UpdateProfile",
    description: "Check profile edit form validations and avatar upload rules",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Full Name field cleared to empty", marks: [T, F, F, F, F, F, F, F] },
          { label: "LinkedIn or GitHub URL is invalid, field blurred", marks: [F, T, F, F, F, F, F, F] },
          { label: "All fields valid", marks: [F, F, T, F, F, F, F, F] },
          { label: "Avatar file is not JPG/PNG/GIF/WebP", marks: [F, F, F, T, F, F, F, F] },
          { label: "Avatar file exceeds 2MB", marks: [F, F, F, F, T, F, F, F] },
          { label: "Avatar file is valid (e.g. JPG, 500KB)", marks: [F, F, F, F, F, T, F, F] },
          { label: "User clicks Cancel after making unsaved edits", marks: [F, F, F, F, F, F, T, F] },
          { label: "User attempts to edit the Email field", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Save is blocked, toast \"Could not save profile. Please try again.\"", marks: [T, F, F, F, F, F, F, F] },
          { label: "Save button disabled, toast \"Enter a valid URL (e.g. https://…)\"", marks: [F, T, F, F, F, F, F, F] },
          { label: "Save succeeds, toast \"Profile saved successfully.\"", marks: [F, F, T, F, F, F, F, F] },
          { label: "Toast \"Please choose a JPG, PNG, GIF, or WebP image.\"", marks: [F, F, F, T, F, F, F, F] },
          { label: "Toast \"Image must be 2MB or smaller.\"", marks: [F, F, F, F, T, F, F, F] },
          { label: "Avatar preview updates immediately, uploaded before Save is clicked", marks: [F, F, F, F, F, T, F, F] },
          { label: "Form reverts to the last-loaded snapshot, unsaved edits discarded", marks: [F, F, F, F, F, F, T, F] },
          { label: "Email field is greyed out/disabled with a read-only hint", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["A", "A", "N", "A", "A", "N", "N", "N"],
  },
  {
    id: "FE_AUTH_008",
    module: ADMIN_MODULE,
    method: "ManageUsers",
    description: "Check the admin Manage Users page - search/filter/pagination (now numbered with ellipsis), activate/deactivate, and subscription actions",
    conditionGroups: [
      {
        title: "Action",
        items: [
          { label: "Admin types a search term matching a user's name/email", marks: [T, F, F, F, F, F, F, F, F, F, F, F] },
          { label: "Admin selects a Role filter", marks: [F, T, F, F, F, F, F, F, F, F, F, F] },
          { label: "Admin selects a Status filter", marks: [F, F, T, F, F, F, F, F, F, F, F, F] },
          { label: "Admin applies multiple filters then clicks \"Clear filters\"", marks: [F, F, F, T, F, F, F, F, F, F, F, F] },
          { label: "Admin clicks Next/Previous at the first/last page", marks: [F, F, F, F, T, F, F, F, F, F, F, F] },
          { label: "Admin clicks a specific numbered page (e.g. page 3 of 10)", marks: [F, F, F, F, F, T, F, F, F, F, F, F] },
          { label: "Total pages exceeds 7 (ellipsis \"…\" separators appear per getPageRange)", marks: [F, F, F, F, F, F, T, F, F, F, F, F] },
          { label: "Admin deactivates a user account and confirms", marks: [F, F, F, F, F, F, F, T, F, F, F, F] },
          { label: "Admin reactivates a suspended account and confirms", marks: [F, F, F, F, F, F, F, F, T, F, F, F] },
          { label: "Admin grants a Premium subscription (e.g. 3 months)", marks: [F, F, F, F, F, F, F, F, F, T, F, F] },
          { label: "Admin revokes a user's Premium subscription and confirms", marks: [F, F, F, F, F, F, F, F, F, F, T, F] },
          { label: "User list fails to load (API error)", marks: [F, F, F, F, F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "List filters to matching rows (debounced 300ms)", marks: [T, F, F, F, F, F, F, F, F, F, F, F] },
          { label: "List filters to the selected role, page resets to 1", marks: [F, T, F, F, F, F, F, F, F, F, F, F] },
          { label: "List filters to the selected status, page resets to 1", marks: [F, F, T, F, F, F, F, F, F, F, F, F] },
          { label: "All filters reset, full list restored, page resets to 1", marks: [F, F, F, T, F, F, F, F, F, F, F, F] },
          { label: "Next/Prev buttons disabled at the first/last page boundary", marks: [F, F, F, F, T, F, F, F, F, F, F, F] },
          { label: "Clicked page number navigates directly to that page, highlighted with a violet filled style (aria-current=\"page\")", marks: [F, F, F, F, F, T, F, F, F, F, F, F] },
          { label: "\"…\" separators render per getPageRange (near-start: 1,2,3,4,5,…,total; near-end: 1,…,total-4..total; middle: 1,…,cur-1,cur,cur+1,…,total)", marks: [F, F, F, F, F, F, T, F, F, F, F, F] },
          { label: "Toast \"Account status updated.\", user shows as Suspended", marks: [F, F, F, F, F, F, F, T, F, F, F, F] },
          { label: "Toast \"Account status updated.\", user shows as Active", marks: [F, F, F, F, F, F, F, F, T, F, F, F] },
          { label: "Toast success, user's plan updated to Premium with the chosen period", marks: [F, F, F, F, F, F, F, F, F, T, F, F] },
          { label: "Toast success, user downgraded to Free", marks: [F, F, F, F, F, F, F, F, F, F, T, F] },
          { label: "Toast \"Failed to load users. Please try again.\" with a Retry action", marks: [F, F, F, F, F, F, F, F, F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Total pages <= 7: all page numbers show, no ellipsis (getPageRange short-circuit)", marks: [F, F, F, F, F, F, F, F, F, F, F, F] },
          { label: "Premium grant/revoke actions are hidden when the target user's role is ADMIN (by design)", marks: [F, F, F, F, F, F, F, F, F, T, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "N", "N", "B", "N", "N", "N", "N", "A"],
  },
];

// ---- Shared Utils (pure functions) - grounded in tests/unit/shared-utils.test.ts ----
// New coverage added to broaden the suite beyond the originally-scoped scenarios;
// no prior Excel scenario ID existed for these pure-function modules.

const SHARED_UTILS_MODULE = "SharedUtilsModule";

const sharedUtilsTestCases = [
  {
    id: "FE_SU_001",
    module: SHARED_UTILS_MODULE,
    method: "GetTimeOfDayGreeting",
    description: "getTimeOfDayGreeting maps an hour-of-day to the correct Morning/Afternoon/Evening/Night label",
    conditionGroups: [
      {
        title: "Hour",
        items: [
          { label: "5 (early morning)", marks: [T, F, F, F, F, F, F, F, F] },
          { label: "11 (late morning)", marks: [F, T, F, F, F, F, F, F, F] },
          { label: "12 (noon)", marks: [F, F, T, F, F, F, F, F, F] },
          { label: "17 (late afternoon)", marks: [F, F, F, T, F, F, F, F, F] },
          { label: "18 (early evening)", marks: [F, F, F, F, T, F, F, F, F] },
          { label: "21 (late evening)", marks: [F, F, F, F, F, T, F, F, F] },
          { label: "22 (late night)", marks: [F, F, F, F, F, F, T, F, F] },
          { label: "4 (pre-dawn)", marks: [F, F, F, F, F, F, F, T, F] },
          { label: "0 (midnight)", marks: [F, F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Morning", marks: [T, T, F, F, F, F, F, F, F] },
          { label: "Afternoon", marks: [F, F, T, T, F, F, F, F, F] },
          { label: "Evening", marks: [F, F, F, F, T, T, F, F, F] },
          { label: "Night", marks: [F, F, F, F, F, F, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B", "N", "N", "N", "B", "B"],
  },
  {
    id: "FE_SU_002",
    module: SHARED_UTILS_MODULE,
    method: "BuildWelcomeMessage",
    description: "buildWelcomeMessage substitutes {{greeting}}/{{name}} placeholders when present, leaves the string untouched when absent",
    conditionGroups: [
      {
        title: "Template",
        items: [
          { label: '"{{greeting}}, {{name}}!"', marks: [T, F] },
          { label: '"Hello there" (no placeholders)', marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: '"Good morning, An!"', marks: [T, F] },
          { label: '"Hello there" (unchanged)', marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_SU_003",
    module: SHARED_UTILS_MODULE,
    method: "FormatRelativeTimeInvalidDate",
    description: "formatRelativeTime returns an empty string for an undefined or unparseable date instead of throwing",
    conditionGroups: [
      {
        title: "Date input",
        items: [
          { label: "undefined", marks: [T, F] },
          { label: '"not-a-date" (unparseable string)', marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: '"" (empty string)', marks: [T, T] }] },
    ],
    types: ["A", "A"],
  },
  {
    id: "FE_SU_004",
    module: SHARED_UTILS_MODULE,
    method: "FormatRelativeTimeAgeBuckets",
    description: "formatRelativeTime buckets an elapsed duration into a localized relative-time label (en/vi)",
    conditionGroups: [
      {
        title: "Elapsed age + language",
        items: [
          { label: "0ms, en", marks: [T, F, F, F, F, F, F, F] },
          { label: "0ms, vi", marks: [F, T, F, F, F, F, F, F] },
          { label: "5 min, en", marks: [F, F, T, F, F, F, F, F] },
          { label: "5 min, vi", marks: [F, F, F, T, F, F, F, F] },
          { label: "3h, en", marks: [F, F, F, F, T, F, F, F] },
          { label: "3h, vi", marks: [F, F, F, F, F, T, F, F] },
          { label: "2d, en", marks: [F, F, F, F, F, F, T, F] },
          { label: "2d, vi", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: '"Just now"', marks: [T, F, F, F, F, F, F, F] },
          { label: '"Vừa xong"', marks: [F, T, F, F, F, F, F, F] },
          { label: '"5 min ago"', marks: [F, F, T, F, F, F, F, F] },
          { label: '"5 phút trước"', marks: [F, F, F, T, F, F, F, F] },
          { label: '"3h ago"', marks: [F, F, F, F, T, F, F, F] },
          { label: '"3 giờ trước"', marks: [F, F, F, F, F, T, F, F] },
          { label: '"2d ago"', marks: [F, F, F, F, F, F, T, F] },
          { label: '"2 ngày trước"', marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["B", "B", "N", "N", "N", "N", "N", "N"],
  },
  {
    id: "FE_SU_005",
    module: SHARED_UTILS_MODULE,
    method: "NormalizePathname",
    description: "normalizePathname strips a trailing slash but keeps the bare root '/' as-is",
    conditionGroups: [
      {
        title: "Pathname",
        items: [
          { label: '"/hr/dashboard/" (trailing slash)', marks: [T, F, F] },
          { label: '"/hr/dashboard" (no trailing slash)', marks: [F, T, F] },
          { label: '"/" (bare root)', marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: '"/hr/dashboard"', marks: [T, T, F] },
          { label: '"/" (unchanged)', marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "B"],
  },
  {
    id: "FE_SU_006",
    module: SHARED_UTILS_MODULE,
    method: "IsAdminNavActive",
    description: "isAdminNavActive treats the bare '/admin' href as equivalent to '/admin/dashboard', with trailing-slash tolerance",
    conditionGroups: [
      {
        title: "href / pathname",
        items: [
          { label: "/admin/dashboard, /admin", marks: [T, F, F, F] },
          { label: "/admin/dashboard, /admin/dashboard", marks: [F, T, F, F] },
          { label: "/admin/dashboard, /admin/users", marks: [F, F, T, F] },
          { label: "/admin/users, /admin/users/ (trailing slash)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "true", marks: [T, T, F, T] },
          { label: "false", marks: [F, F, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_SU_007",
    module: SHARED_UTILS_MODULE,
    method: "IsHrNavActive",
    description: "isHrNavActive matches an HR sidebar link's active state, including nested-route and sibling-route cases",
    conditionGroups: [
      {
        title: "href / pathname",
        items: [
          { label: "/hr/dashboard, /hr", marks: [T, F, F, F, F, F, F, F, F] },
          { label: "/hr/dashboard, /hr/dashboard", marks: [F, T, F, F, F, F, F, F, F] },
          { label: "/hr/settings, /hr/settings", marks: [F, F, T, F, F, F, F, F, F] },
          { label: "/hr/settings, /hr/settings/billing", marks: [F, F, F, T, F, F, F, F, F] },
          { label: "/hr/history, /hr/history/qs-1", marks: [F, F, F, F, T, F, F, F, F] },
          { label: "/hr/history, /hr/history", marks: [F, F, F, F, F, T, F, F, F] },
          { label: "/hr/generate-question, /hr/generate-question/manual", marks: [F, F, F, F, F, F, T, F, F] },
          { label: "/hr/generate-question, /hr/generate-question", marks: [F, F, F, F, F, F, F, T, F] },
          { label: "/hr/generate-question, /hr/history", marks: [F, F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "true", marks: [T, T, T, F, T, T, T, T, F] },
          { label: "false", marks: [F, F, F, T, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B", "N", "N", "N", "N", "B"],
  },
  {
    id: "FE_SU_008",
    module: SHARED_UTILS_MODULE,
    method: "GetInitials",
    description: "getInitials derives 1-2 letter initials from a display name, with a '??' fallback for empty/whitespace input",
    conditionGroups: [
      {
        title: "Name",
        items: [
          { label: '"" (empty)', marks: [T, F, F, F, F] },
          { label: '"   " (whitespace only)', marks: [F, T, F, F, F] },
          { label: '"Madonna" (single word)', marks: [F, F, T, F, F] },
          { label: '"Nguyen Van A" (multi-word)', marks: [F, F, F, T, F] },
          { label: '"  Nguyen   Van A  " (extra whitespace)', marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: '"??"', marks: [T, T, F, F, F] },
          { label: '"MA"', marks: [F, F, T, F, F] },
          { label: '"NA"', marks: [F, F, F, T, T] },
        ],
      },
    ],
    types: ["A", "A", "N", "N", "B"],
  },
  {
    id: "FE_SU_009",
    module: SHARED_UTILS_MODULE,
    method: "ResolveAvatarUrl",
    description: "resolveAvatarUrl returns null for a null/undefined user, then prefers user.avatarUrl over candidateProfile over hrProfile, and treats a whitespace-only avatarUrl as absent",
    conditionGroups: [
      {
        title: "User",
        items: [
          { label: "null", marks: [T, F, F, F, F, F] },
          { label: "undefined", marks: [F, T, F, F, F, F] },
          { label: "avatarUrl=top.png, candidateProfile.avatarUrl=c.png", marks: [F, F, T, F, F, F] },
          { label: "avatarUrl=null, candidateProfile.avatarUrl=c.png", marks: [F, F, F, T, F, F] },
          { label: "avatarUrl=null, candidateProfile=null, hrProfile.avatarUrl=h.png", marks: [F, F, F, F, T, F] },
          { label: 'avatarUrl="  " (whitespace only)', marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "null", marks: [T, T, F, F, F, T] },
          { label: '"top.png"', marks: [F, F, T, F, F, F] },
          { label: '"c.png"', marks: [F, F, F, T, F, F] },
          { label: '"h.png"', marks: [F, F, F, F, T, F] },
        ],
      },
    ],
    types: ["A", "A", "N", "N", "N", "B"],
  },
  {
    id: "FE_SU_010",
    module: SHARED_UTILS_MODULE,
    method: "IsValidUrl",
    description: "isValidUrl treats an empty/whitespace value as valid (optional field), accepts http(s) URLs, and rejects other schemes/malformed input",
    conditionGroups: [
      {
        title: "Value",
        items: [
          { label: '"" (empty)', marks: [T, F, F, F, F, F, F] },
          { label: '"   " (whitespace)', marks: [F, T, F, F, F, F, F] },
          { label: '"https://example.com"', marks: [F, F, T, F, F, F, F] },
          { label: '"http://example.com/path?x=1"', marks: [F, F, F, T, F, F, F] },
          { label: '"ftp://example.com"', marks: [F, F, F, F, T, F, F] },
          { label: '"not a url"', marks: [F, F, F, F, F, T, F] },
          { label: '"javascript:alert(1)"', marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "true", marks: [T, T, T, T, F, F, F] },
          { label: "false", marks: [F, F, F, F, T, T, T] },
        ],
      },
    ],
    types: ["B", "B", "N", "N", "A", "A", "A"],
  },
  {
    id: "FE_SU_011",
    module: SHARED_UTILS_MODULE,
    method: "MapAvatarUploadError",
    description: "mapAvatarUploadError maps an avatar-upload error code to its localized message, falling back to a generic upload-failed message for unknown/blank codes",
    conditionGroups: [
      {
        title: "Error code",
        items: [
          { label: '"invalid_type"', marks: [T, F, F, F] },
          { label: '"too_large"', marks: [F, T, F, F] },
          { label: '"unknown_code"', marks: [F, F, T, F] },
          { label: '"" (blank)', marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: '"Invalid type."', marks: [T, F, F, F] },
          { label: '"Too large."', marks: [F, T, F, F] },
          { label: '"Upload failed." (fallback)', marks: [F, F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "A", "B"],
  },
];

// ---- Permissions & Citations - grounded in tests/unit/permissions-and-citations.test.ts ----
// New coverage: permissions.ts (auth/role state) and citation-display.ts
// (JD-citation formatting), previously only exercised indirectly via mocks.

const PERMISSIONS_CITATIONS_MODULE = "PermissionsAndCitationsModule";

const permissionsCitationsTestCases = [
  {
    id: "FE_PC_001",
    module: PERMISSIONS_CITATIONS_MODULE,
    method: "AuthRoundTripLegacyFlagAndRealToken",
    description: "setAuth/isAuthenticated/clearAuth round-trip via the legacy flag, and isAuthenticated is also true from a real access token alone",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "setAuth() then clearAuth() (legacy flag)", marks: [T, F] },
          { label: "setAuthTokens() only, no legacy flag", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "isAuthenticated() false -> true -> false", marks: [T, F] },
          { label: "isAuthenticated() true from token alone", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_PC_002",
    module: PERMISSIONS_CITATIONS_MODULE,
    method: "UserRoleAndClearAuthCascade",
    description: "setUserRole/getUserRole round-trip, and clearAuth clears role + tokens + cached user profile together",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "setUserRole('HR_MANAGER') then getUserRole()", marks: [T, F] },
          { label: "setAuth+setUserRole+setAuthTokens+setCachedUserProfile then clearAuth()", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "getUserRole() -> 'HR_MANAGER'", marks: [T, F] },
          { label: "getUserRole()/getAccessToken()/getCachedUserProfile() all null after clearAuth", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_PC_003",
    module: PERMISSIONS_CITATIONS_MODULE,
    method: "GetRoleRedirect",
    description: "getRoleRedirect maps a role string (or null) to its post-login landing route",
    conditionGroups: [
      {
        title: "Role",
        items: [
          { label: "ADMIN", marks: [T, F, F, F, F] },
          { label: "SUPER_ADMIN", marks: [F, T, F, F, F] },
          { label: "HR_MANAGER", marks: [F, F, T, F, F] },
          { label: "JOB_SEEKER", marks: [F, F, F, T, F] },
          { label: "null", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "/admin/dashboard", marks: [T, T, F, F, F] },
          { label: "/hr/dashboard", marks: [F, F, T, F, F] },
          { label: "/jobseeker", marks: [F, F, F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "B"],
  },
  {
    id: "FE_PC_004",
    module: PERMISSIONS_CITATIONS_MODULE,
    method: "ExtractRole",
    description: "extractRole reads a direct/nested role field, decodes it from a JWT payload under several possible token field names, and fails safe (null) for malformed/role-less input",
    conditionGroups: [
      {
        title: "Input",
        items: [
          { label: "{ role: 'HR_MANAGER' } (direct field)", marks: [T, F, F, F, F, F, F, F] },
          { label: "{ data: { role: 'ADMIN' } } (nested)", marks: [F, T, F, F, F, F, F, F] },
          { label: "JWT under accessToken/access_token/token, claim 'role'", marks: [F, F, T, F, F, F, F, F] },
          { label: "JWT under accessToken, claim 'Role' (capitalized fallback)", marks: [F, F, F, T, F, F, F, F] },
          { label: "{ accessToken: 'not-a-jwt' } (malformed)", marks: [F, F, F, F, T, F, F, F] },
          { label: "null", marks: [F, F, F, F, F, T, F, F] },
          { label: "'a string' (non-object)", marks: [F, F, F, F, F, F, T, F] },
          { label: "{} (role-less object)", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'HR_MANAGER'", marks: [T, F, F, T, F, F, F, F] },
          { label: "'ADMIN'", marks: [F, T, F, F, F, F, F, F] },
          { label: "'JOB_SEEKER'", marks: [F, F, T, F, F, F, F, F] },
          { label: "null", marks: [F, F, F, F, T, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "A", "A", "A", "A", "A"],
  },
  {
    id: "FE_PC_005",
    module: PERMISSIONS_CITATIONS_MODULE,
    method: "IsJdCitation",
    description: "isJdCitation recognizes the JD source-file marker across common spellings/casings, and treats a missing/blank source as not-JD",
    conditionGroups: [
      {
        title: "sourceFile",
        items: [
          { label: "'job-description'", marks: [T, F, F, F, F, F, F, F] },
          { label: "'jd'", marks: [F, T, F, F, F, F, F, F] },
          { label: "'Job Description'", marks: [F, F, T, F, F, F, F, F] },
          { label: "'job_description'", marks: [F, F, F, T, F, F, F, F] },
          { label: "'handbook.pdf'", marks: [F, F, F, F, T, F, F, F] },
          { label: "null", marks: [F, F, F, F, F, T, F, F] },
          { label: "undefined", marks: [F, F, F, F, F, F, T, F] },
          { label: "'' (empty)", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "true", marks: [T, T, T, T, F, F, F, F] },
          { label: "false", marks: [F, F, F, F, T, T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "N", "B", "B", "B"],
  },
  {
    id: "FE_PC_006",
    module: PERMISSIONS_CITATIONS_MODULE,
    method: "SortAndInjectJdCitation",
    description: "sortCitationsPrimaryFirst puts the JD citation first (preserving relative order otherwise, and handling null/empty input), and citationsForDisplay injects a synthetic empty-excerpt JD row only when one isn't already present",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "sort([handbook, job-description, policy])", marks: [T, F, F, F, F] },
          { label: "sort(null) / sort([])", marks: [F, T, F, F, F] },
          { label: "citationsForDisplay([handbook]) — no JD present", marks: [F, F, T, F, F] },
          { label: "citationsForDisplay([job-description w/ real excerpt]) — JD present", marks: [F, F, F, T, F] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "[job-description, handbook, policy]", marks: [T, F, F, F] },
          { label: "[] (empty array, no throw)", marks: [F, T, F, F] },
          { label: "2 rows: synthetic JD (excerpt=null) prepended + handbook", marks: [F, F, T, F] },
          { label: "1 row: original JD row unchanged (excerpt kept, not duplicated)", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "N", "N"],
  },
  {
    id: "FE_PC_007",
    module: PERMISSIONS_CITATIONS_MODULE,
    method: "FormatCitationExcerptAndDisplayName",
    description: "formatCitationExcerpt trims/truncates-with-ellipsis/nulls-blank text, and citationDisplayName shows the localized JD label for a JD source and the raw filename otherwise",
    conditionGroups: [
      {
        title: "Input",
        items: [
          { label: "'  short text  ' (trim only)", marks: [T, F, F, F, F, F] },
          { label: "null", marks: [F, T, F, F, F, F] },
          { label: "'   ' (whitespace only)", marks: [F, F, T, F, F, F] },
          { label: "200 'x' chars, maxLength=140", marks: [F, F, F, T, F, F] },
          { label: "citationDisplayName('job-description', labels)", marks: [F, F, F, F, T, F] },
          { label: "citationDisplayName('handbook.pdf', labels)", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'short text'", marks: [T, F, F, F, F, F] },
          { label: "null", marks: [F, T, T, F, F, F] },
          { label: "140 'x' chars + ellipsis '…'", marks: [F, F, F, T, F, F] },
          { label: "'Job Description' (localized label)", marks: [F, F, F, F, T, F] },
          { label: "'handbook.pdf' (raw filename)", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "B", "B", "N", "N"],
  },
];

// ---- Gamification & History Utils - grounded in tests/unit/gamification-and-history-utils.test.ts ----
// New coverage: gamification-formatters.ts, login-welcome.ts, local-history.ts
// — previously no test at all for these modules.

const GAMIFICATION_HISTORY_MODULE = "GamificationAndHistoryUtilsModule";

const gamificationHistoryTestCases = [
  {
    id: "FE_GH_001",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "FormatXp",
    description: "formatXp adds thousands separators, including the zero case",
    conditionGroups: [
      { title: "Value", items: [{ label: "1200", marks: [T, F] }, { label: "0", marks: [F, T] }] },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "'1,200'", marks: [T, F] }, { label: "'0'", marks: [F, T] }] },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_GH_002",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "GetLevelLabel",
    description: "getLevelLabel maps a numeric level to its named tier across all 6 tier boundaries",
    conditionGroups: [
      {
        title: "Level",
        items: [
          { label: "1-2", marks: [T, F, F, F, F, F] },
          { label: "3-5", marks: [F, T, F, F, F, F] },
          { label: "6-9", marks: [F, F, T, F, F, F] },
          { label: "10-14", marks: [F, F, F, T, F, F] },
          { label: "15-19", marks: [F, F, F, F, T, F] },
          { label: "20-29", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Newcomer", marks: [T, F, F, F, F, F] },
          { label: "Practitioner", marks: [F, T, F, F, F, F] },
          { label: "Achiever", marks: [F, F, T, F, F, F] },
          { label: "Trailblazer", marks: [F, F, F, T, F, F] },
          { label: "Specialist", marks: [F, F, F, F, T, F] },
          { label: "Mentor", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "N", "N"],
  },
  {
    id: "FE_GH_003",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "LevelColorAndStreakIntensity",
    description: "getLevelColorClass/getLevelBarColor stay in sync at the tier extremes, and streakIntensity buckets a streak count into an intensity level 0-3",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "level 1 (lowest tier)", marks: [T, F, F, F, F, F, F] },
          { label: "level 30 (highest tier)", marks: [F, T, F, F, F, F, F] },
          { label: "streak 0", marks: [F, F, T, F, F, F, F] },
          { label: "streak 1-2", marks: [F, F, F, T, F, F, F] },
          { label: "streak 3-6", marks: [F, F, F, F, T, F, F] },
          { label: "streak 7-29", marks: [F, F, F, F, F, T, F] },
          { label: "streak 30", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "class contains 'gray', bar '#6b7280'", marks: [T, F, F, F, F, F, F] },
          { label: "class contains 'yellow', bar '#eab308'", marks: [F, T, F, F, F, F, F] },
          { label: "intensity 0", marks: [F, F, T, F, F, F, F] },
          { label: "intensity 1", marks: [F, F, F, T, F, F, F] },
          { label: "intensity 2", marks: [F, F, F, F, T, F, F] },
          { label: "intensity 3", marks: [F, F, F, F, F, T, T] },
        ],
      },
    ],
    types: ["N", "B", "N", "N", "N", "N", "B"],
  },
  {
    id: "FE_GH_004",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "XpRewardTypeLabel",
    description: "xpRewardTypeLabel resolves a per-locale label and falls back to the raw type string for an unknown value",
    conditionGroups: [
      {
        title: "Type + locale",
        items: [
          { label: "'StreakMilestone', en", marks: [T, F, F] },
          { label: "'StreakMilestone', vi", marks: [F, T, F] },
          { label: "'SomethingNew' (unknown), en", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Streak milestone'", marks: [T, F, F] },
          { label: "'Mốc luyện tập liên tiếp'", marks: [F, T, F] },
          { label: "'SomethingNew' (raw fallback)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A"],
  },
  {
    id: "FE_GH_005",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "TimeAgo",
    description: "timeAgo formats an elapsed duration into a localized relative-time label (en/vi), across minute/hour/day/month buckets",
    conditionGroups: [
      {
        title: "Elapsed age + locale",
        items: [
          { label: "0ms, en", marks: [T, F, F, F, F, F, F, F, F, F] },
          { label: "0ms, vi", marks: [F, T, F, F, F, F, F, F, F, F] },
          { label: "10 min, en", marks: [F, F, T, F, F, F, F, F, F, F] },
          { label: "10 min, vi", marks: [F, F, F, T, F, F, F, F, F, F] },
          { label: "5h, en", marks: [F, F, F, F, T, F, F, F, F, F] },
          { label: "5h, vi", marks: [F, F, F, F, F, T, F, F, F, F] },
          { label: "10d, en", marks: [F, F, F, F, F, F, T, F, F, F] },
          { label: "10d, vi", marks: [F, F, F, F, F, F, F, T, F, F] },
          { label: "2 months, en", marks: [F, F, F, F, F, F, F, F, T, F] },
          { label: "2 months, vi", marks: [F, F, F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'just now' / 'vừa xong'", marks: [T, T, F, F, F, F, F, F, F, F] },
          { label: "'10m ago' / '10 phút trước'", marks: [F, F, T, T, F, F, F, F, F, F] },
          { label: "'5h ago' / '5 giờ trước'", marks: [F, F, F, F, T, T, F, F, F, F] },
          { label: "'10d ago' / '10 ngày trước'", marks: [F, F, F, F, F, F, T, T, F, F] },
          { label: "'2mo ago' / '2 tháng trước'", marks: [F, F, F, F, F, F, F, F, T, T] },
        ],
      },
    ],
    types: ["B", "B", "N", "N", "N", "N", "N", "N", "B", "B"],
  },
  {
    id: "FE_GH_006",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "GetLoginWelcomeRoleFromRedirect",
    description: "getLoginWelcomeRoleFromRedirect maps a post-login redirect path to the role whose welcome banner should show, or null for non-role paths",
    conditionGroups: [
      {
        title: "Path",
        items: [
          { label: "/jobseeker or /jobseeker/", marks: [T, F, F, F] },
          { label: "/admin/dashboard or /admin/users", marks: [F, T, F, F] },
          { label: "/hr/dashboard or /hr/generate-question", marks: [F, F, T, F] },
          { label: "/login or /", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'jobseeker'", marks: [T, F, F, F] },
          { label: "'admin'", marks: [F, T, F, F] },
          { label: "'hr'", marks: [F, F, T, F] },
          { label: "null", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_GH_007",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "LoginWelcomePendingFlagRoundTrip",
    description: "markLoginWelcomePending/hasLoginWelcomePending/clearLoginWelcomePending round-trip through sessionStorage and are role-specific",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "sessionStorage is empty", marks: [T] }] },
      { title: "Action", items: [{ label: "markLoginWelcomePending('hr') then clearLoginWelcomePending()", marks: [T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "hasLoginWelcomePending('hr') false -> true -> false", marks: [T] },
          { label: "hasLoginWelcomePending('admin') stays false throughout (role-specific)", marks: [T] },
        ],
      },
    ],
    types: ["N"],
  },
  {
    id: "FE_GH_008",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "SaveAndGetLocalSession",
    description: "saveLocalSession assigns a 'local-' id and prepends to the list (most-recent-first), and getLocalSession finds by id or returns null when missing",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "save 2 sessions in sequence", marks: [T, F] },
          { label: "getLocalSession(existing id) / getLocalSession('does-not-exist')", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "id matches /^local-/, list has 2 entries, most recent first", marks: [T, F] },
          { label: "existing id resolves the session; missing id -> null", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_GH_009",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "PatchAndUpdateLocalSession",
    description: "patchLocalSession merges fields for a matching id and no-ops for an unknown id; updateLocalSessionQuestions replaces the question list and bumps updatedAt",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "patchLocalSession(existing id, {backendJobId})", marks: [T, F, F] },
          { label: "patchLocalSession('does-not-exist', {...})", marks: [F, T, F] },
          { label: "updateLocalSessionQuestions(existing id, newQuestions)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "session.backendJobId updated", marks: [T, F, F] },
          { label: "list unchanged (still 1 entry), no throw", marks: [F, T, F] },
          { label: "generatedQuestions replaced, updatedAt >= previous", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "N"],
  },
  {
    id: "FE_GH_010",
    module: GAMIFICATION_HISTORY_MODULE,
    method: "ToGenerationSessionAndMalformedStorage",
    description: "toGenerationSession maps every field 1:1, and a malformed localStorage entry is treated as an empty list instead of throwing",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "toGenerationSession(saved local session)", marks: [T, F] },
          { label: "localStorage has '{not valid json' under the history key", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "id/jobTitle/status/hrOwner all match the source session", marks: [T, F] },
          { label: "getLocalSessions() -> [] (no throw)", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
];

// ---- Candidate & Admin Utils - grounded in tests/unit/candidate-and-admin-utils.test.ts ----
// New coverage: cloudinary.ts (avatar validation), practice-streak.ts,
// skill-labels.ts, company-visual.ts, admin-user-display.ts, pill.tsx pure
// helpers — previously no test at all for these modules.

const CANDIDATE_ADMIN_UTILS_MODULE = "CandidateAndAdminUtilsModule";

const candidateAdminUtilsTestCases = [
  {
    id: "FE_CA_001",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "ValidateAvatarFile",
    description: "validateAvatarFile accepts an allowed image type under the 2MB cap, and throws AvatarUploadError with the right code for a disallowed mime type or an oversized file",
    conditionGroups: [
      {
        title: "File",
        items: [
          { label: "a.png, image/png, 1KB", marks: [T, F, F] },
          { label: "a.pdf, application/pdf, tiny", marks: [F, T, F] },
          { label: "a.png, image/png, just over 2MB", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [{ label: "does not throw", marks: [T, F, F] }],
      },
      {
        title: "Exception",
        items: [
          { label: "AvatarUploadError('invalid_type')", marks: [F, T, F] },
          { label: "AvatarUploadError('too_large')", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "B"],
  },
  {
    id: "FE_CA_002",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "ComputeStreakDays",
    description: "computeStreakDays counts a consecutive-day practice streak ending today or yesterday, breaking on any gap of 2+ days, de-duping same-day timestamps, and ignoring malformed entries",
    conditionGroups: [
      {
        title: "Session dates",
        items: [
          { label: "[] (no sessions)", marks: [T, F, F, F, F, F, F, F] },
          { label: "[today]", marks: [F, T, F, F, F, F, F, F] },
          { label: "[today, yesterday, 2d ago]", marks: [F, F, T, F, F, F, F, F] },
          { label: "[today, 2d ago] (gap)", marks: [F, F, F, T, F, F, F, F] },
          { label: "[yesterday, 2d ago] (no session today)", marks: [F, F, F, F, T, F, F, F] },
          { label: "[3d ago] (nothing today/yesterday)", marks: [F, F, F, F, F, T, F, F] },
          { label: "[undefined, 'not-a-date', today]", marks: [F, F, F, F, F, F, T, F] },
          { label: "[today, today] (duplicate same-day)", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "0", marks: [T, F, F, F, F, T, F, F] },
          { label: "1", marks: [F, T, F, F, F, F, T, T] },
          { label: "3", marks: [F, F, T, F, F, F, F, F] },
          { label: "2", marks: [F, F, F, F, T, F, F, F] },
        ],
      },
    ],
    types: ["B", "N", "N", "A", "N", "B", "A", "B"],
  },
  {
    id: "FE_CA_003",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "TranslateDimensionKeyAndCategory",
    description: "translateDimensionKey/translateQuestionCategory return the Vietnamese label for known keys (case/separator-insensitive) and title-case the raw key as a fallback for unknown ones or the English locale",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "translateDimensionKey('technical_accuracy'/'Technical-Accuracy', vi)", marks: [T, F, F, F] },
          { label: "translateDimensionKey('some_new_dimension', vi) / ('clarity', en)", marks: [F, T, F, F] },
          { label: "translateQuestionCategory('problem-solving', vi)", marks: [F, F, T, F] },
          { label: "translateQuestionCategory('unknown-cat', vi) / ('technical', en)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Độ chính xác kỹ thuật'", marks: [T, F, F, F] },
          { label: "'Some New Dimension' / 'Clarity' (fallback)", marks: [F, T, F, F] },
          { label: "'Giải quyết vấn đề'", marks: [F, F, T, F] },
          { label: "'Unknown Cat' / 'Technical' (fallback)", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "N", "A"],
  },
  {
    id: "FE_CA_004",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "CompanyInitialsAndColor",
    description: "getCompanyInitials handles empty/single/multi-word names with a '?' fallback, and getCompanyColor is deterministic per seed while generally varying across seeds",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getCompanyInitials('' / '   ')", marks: [T, F, F, F] },
          { label: "getCompanyInitials('Acme')", marks: [F, T, F, F] },
          { label: "getCompanyInitials('Acme Corp International')", marks: [F, F, T, F] },
          { label: "getCompanyColor('Acme Corp') called twice, vs getCompanyColor('Zephyr Industries')", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'?'", marks: [T, F, F, F] },
          { label: "'AC'", marks: [F, T, T, F] },
          { label: "same color both calls, matches /^bg-\\w+-500$/, generally differs from the other seed", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["A", "N", "N", "N"],
  },
  {
    id: "FE_CA_005",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "ToBackendRoleFilterAndNormalizeAdminRoleKey",
    description: "toBackendRoleFilter maps a FE role key to the BE query value (undefined for unknown), and normalizeAdminRoleKey normalizes assorted BE role spellings into ADMIN/HR_MANAGER/JOB_SEEKER/UNKNOWN",
    conditionGroups: [
      {
        title: "Role input",
        items: [
          { label: "toBackendRoleFilter: ADMIN / HR_MANAGER / JOB_SEEKER / UNKNOWN", marks: [T, F] },
          { label: "normalizeAdminRoleKey: ADMIN, SysAdmin, HR_MANAGER, Recruiter, JOB_SEEKER, Candidate, JobSeeker, something-else, undefined", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Admin' / 'HR' / 'Candidate' / undefined", marks: [T, F] },
          { label: "ADMIN/HR_MANAGER/JOB_SEEKER grouped correctly, unmatched -> UNKNOWN", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_CA_006",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "GetAdminUserStatusAndIsAdminRole",
    description: "getAdminUserStatus derives Suspended/Pending/Active from isActive+emailVerified (isActive=false always wins), and isAdminRole is case-insensitive and null-safe",
    conditionGroups: [
      {
        title: "User / role",
        items: [
          { label: "isActive=false, emailVerified=true", marks: [T, F, F, F, F, F, F] },
          { label: "isActive=true, emailVerified=false", marks: [F, T, F, F, F, F, F] },
          { label: "isActive=true, emailVerified=true", marks: [F, F, T, F, F, F, F] },
          { label: "isActive=false, emailVerified=false", marks: [F, F, F, T, F, F, F] },
          { label: "isAdminRole('ADMIN' / 'SuperAdmin')", marks: [F, F, F, F, T, F, F] },
          { label: "isAdminRole('HR_MANAGER')", marks: [F, F, F, F, F, T, F] },
          { label: "isAdminRole(null / undefined)", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Suspended'", marks: [T, F, F, T, F, F, F] },
          { label: "'Pending'", marks: [F, T, F, F, F, F, F] },
          { label: "'Active'", marks: [F, F, T, F, F, F, F] },
          { label: "true", marks: [F, F, F, F, T, F, F] },
          { label: "false", marks: [F, F, F, F, F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B", "N", "N", "A"],
  },
  {
    id: "FE_CA_007",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "BadgeClassAndCategoryLabelHelpers",
    description: "getDifficultyBadgeClass/getCategoryBadgeClass/formatCategoryLabel pick the right badge color and title-case a hyphen/underscore/space-separated category, with a gray fallback for unknown categories",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getDifficultyBadgeClass: Easy / Medium / Hard", marks: [T, F, F, F] },
          { label: "getCategoryBadgeClass: Technical / system-design (case-insensitive)", marks: [F, T, F, F] },
          { label: "getCategoryBadgeClass: some-unknown-type", marks: [F, F, T, F] },
          { label: "formatCategoryLabel: problem-solving / system_design / technical", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "emerald / amber / red class", marks: [T, F, F, F] },
          { label: "blue / cyan class", marks: [F, T, F, F] },
          { label: "gray class (fallback)", marks: [F, F, T, F] },
          { label: "'Problem Solving' / 'System Design' / 'Technical'", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A", "N"],
  },
  {
    id: "FE_CA_008",
    module: CANDIDATE_ADMIN_UTILS_MODULE,
    method: "ScoreBadgeClassAndScoreLevel",
    description: "getScoreBadgeClass thresholds at 80/65, and getScoreLevel derives a label+badge color from the same 80/65/50 thresholds",
    conditionGroups: [
      {
        title: "Score",
        items: [
          { label: "85 / 80 (>= 80)", marks: [T, F, F, F, F, F, F, F] },
          { label: "70 / 65 (65-79)", marks: [F, T, F, F, F, F, F, F] },
          { label: "40 (< 65)", marks: [F, F, T, F, F, F, F, F] },
          { label: "getScoreLevel(90) — Excellent tier", marks: [F, F, F, T, F, F, F, F] },
          { label: "getScoreLevel(70) — Good tier", marks: [F, F, F, F, T, F, F, F] },
          { label: "getScoreLevel(55) — Fair tier", marks: [F, F, F, F, F, T, F, F] },
          { label: "getScoreLevel(30) — Needs work tier", marks: [F, F, F, F, F, F, T, F] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "emerald class", marks: [T, F, F, F, F, F, F] },
          { label: "violet class", marks: [F, T, F, F, T, F, F] },
          { label: "amber class", marks: [F, F, T, F, F, T, F] },
          { label: "{label:'Excellent', emerald}", marks: [F, F, F, T, F, F, F] },
          { label: "{label:'Fair', amber}", marks: [F, F, F, F, F, T, F] },
          { label: "{label:'Needs work', red}", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "B", "N", "N", "N", "N", "N"],
  },
];

// ---- Question Template Inference - grounded in tests/unit/question-template-infer.test.ts ----
// New coverage: question-template-infer.ts — pure inference of Studio's
// code-answer template (system design/code completion/bug detection/
// refactoring/test design/performance analysis) from question content,
// explicit type, code snippets, and rubric/rationale metadata.

const QUESTION_TEMPLATE_INFER_MODULE = "QuestionTemplateInferModule";

const questionTemplateInferTestCases = [
  {
    id: "FE_QTI_001",
    module: QUESTION_TEMPLATE_INFER_MODULE,
    method: "TemplateDetectionExplicitAndKeyword",
    description: "inferStudioTemplate prefers an explicit codeTemplateType (normalizing loose casing, falling through to inference if unrecognized), then infers from content keywords across all 6 templates, then falls back to scoringRubric text or question type",
    conditionGroups: [
      {
        title: "Input",
        items: [
          { label: "codeTemplateType='bug_detection' explicit", marks: [T, F, F, F, F, F, F, F, F] },
          { label: "codeTemplateType='  refactoring  ' (loose casing)", marks: [F, T, F, F, F, F, F, F, F] },
          { label: "codeTemplateType='NOT_A_REAL_TEMPLATE' (unrecognized, falls through)", marks: [F, F, T, F, F, F, F, F, F] },
          { label: "content keyword: system design / code completion / bug / refactor / unit test / complexity", marks: [F, F, F, T, F, F, F, F, F] },
          { label: "no template signal, scoringRubric='Look for bug handling'", marks: [F, F, F, F, T, F, F, F, F] },
          { label: "type='SystemDesign', neutral content", marks: [F, F, F, F, F, T, F, F, F] },
          { label: "codeSnippet present, no other signal", marks: [F, F, F, F, F, F, T, F, F] },
          { label: "purely theoretical, no snippet/keywords", marks: [F, F, F, F, F, F, F, T, F] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "templateId = BUG_DETECTION", marks: [T, F, F, F, T, F, F, F] },
          { label: "templateId = REFACTORING", marks: [F, T, F, F, F, F, F, F] },
          { label: "templateId = SYSTEM_DESIGN (falls through to inference)", marks: [F, F, T, F, F, T, F, F] },
          { label: "templateId matches the 6-way keyword table", marks: [F, F, F, T, F, F, F, F] },
          { label: "templateId = CODE_COMPLETION", marks: [F, F, F, F, F, F, T, F] },
          { label: "templateId = null, but imageHint is still truthy", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "B", "A", "N", "N", "N", "N", "B"],
  },
  {
    id: "FE_QTI_002",
    module: QUESTION_TEMPLATE_INFER_MODULE,
    method: "SnippetExtraction",
    description: "inferStudioTemplate extracts a code snippet from codeSnippet directly, an expectedAnswer 'Code snippet:' marker, a fenced code block, or heuristically-detected raw code — while not mistaking plain prose for code, and normalizing literal \\n/\\t escapes",
    conditionGroups: [
      {
        title: "Input",
        items: [
          { label: "codeSnippet='const x = 1;'", marks: [T, F, F, F, F, F] },
          { label: "expectedAnswer with 'Code snippet:' marker", marks: [F, T, F, F, F, F] },
          { label: "content with a fenced ```js block", marks: [F, F, T, F, F, F] },
          { label: "expectedAnswer is raw code, no marker (heuristic detection)", marks: [F, F, F, T, F, F] },
          { label: "expectedAnswer is plain prose, no code", marks: [F, F, F, F, T, F] },
          { label: "codeSnippet has literal \\n/\\t escape sequences", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "snippet = 'const x = 1;'", marks: [T, T, T, F, F, F] },
          { label: "snippet = the heuristically-detected code block", marks: [F, F, F, T, F, F] },
          { label: "snippet = undefined (no false positive)", marks: [F, F, F, F, T, F] },
          { label: "snippet has real newlines (escapes normalized)", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "A", "B"],
  },
  {
    id: "FE_QTI_003",
    module: QUESTION_TEMPLATE_INFER_MODULE,
    method: "MetaParsingLangImageDiagramHints",
    description: "inferStudioTemplate parses snippetLanguage/imageHint/diagramHint from scoringRubric meta and question fields, with lang=auto treated as unset, question.imageHint taking priority, and a per-template default used when no meta is present",
    conditionGroups: [
      {
        title: "Input",
        items: [
          { label: "scoringRubric='lang=TypeScript;template=CODE_COMPLETION'", marks: [T, F, F, F, F, F, F] },
          { label: "scoringRubric='lang=auto'", marks: [F, T, F, F, F, F, F] },
          { label: "question.imageHint='Custom hint' + codeTemplateType=BUG_DETECTION", marks: [F, F, T, F, F, F, F] },
          { label: "no imageHint/meta, content implies bug template", marks: [F, F, F, T, F, F, F] },
          { label: "system design content + scoringRubric diagramHint meta", marks: [F, F, F, F, T, F, F] },
          { label: "system design content, no diagramHint meta", marks: [F, F, F, F, F, T, F] },
          { label: "attachedImageUrl='  https://x/img.png  ' / '   '", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "snippetLanguage = 'typescript' (lowercased)", marks: [T, F, F, F, F, F, F] },
          { label: "snippetLanguage = undefined ('auto' means unset)", marks: [F, T, F, F, F, F, F] },
          { label: "imageHint = 'Custom hint' (wins over template default)", marks: [F, F, T, F, F, F, F] },
          { label: "imageHint contains 'lỗi' (per-template default)", marks: [F, F, F, T, F, F, F] },
          { label: "diagramDescription = meta text", marks: [F, F, F, F, T, F, F] },
          { label: "diagramDescription contains 'sơ đồ kiến trúc' (default)", marks: [F, F, F, F, F, T, F] },
          { label: "attachedImageUrl trimmed / undefined when blank", marks: [F, F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "N", "N", "N", "N", "B"],
  },
  {
    id: "FE_QTI_004",
    module: QUESTION_TEMPLATE_INFER_MODULE,
    method: "InferGeneratedQuestionTemplate",
    description: "inferGeneratedQuestionTemplate maps a History/Review-page GeneratedQuestion (questionType, rationale+scoringRubric meta, difficulty string) onto the same template/snippet/lang inference, and never throws on an unrecognized difficulty string",
    conditionGroups: [
      {
        title: "Input",
        items: [
          { label: "questionType='System Design'", marks: [T, F, F, F, F] },
          { label: "rationale='template=BUG_DETECTION;lang=Python', scoringRubric='snippet=...'", marks: [F, T, F, F, F] },
          { label: "difficulty='very easy'", marks: [F, F, T, F, F] },
          { label: "difficulty='HARD' (case-insensitive)", marks: [F, F, F, T, F] },
          { label: "difficulty='unrecognized'", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "templateId = SYSTEM_DESIGN", marks: [T, F, F, F, F] },
          { label: "templateId=BUG_DETECTION, snippetLanguage='python', snippet from meta", marks: [F, T, F, F, F] },
          { label: "templateId = null", marks: [F, F, T, F, F] },
          { label: "does not throw", marks: [F, F, F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "B", "A", "A"],
  },
];

// ---- Batch 3: Security section + Gamification components - grounded in
// tests/unit/{security-section,xp-history-section,daily-goal-settings,
// gamification-progress-card,achievement-grid}.test.tsx. No prior automated
// coverage existed for any of these components.

const GAMIFICATION_COMPONENTS_MODULE = "GamificationComponentsModule";

const batch3TestCases = [
  {
    id: "FE_SEC_001",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "ChangePasswordClientValidation",
    description: "SecuritySection blocks submit client-side for empty fields, a new password under 8 chars, or a mismatched confirmation, without ever calling changePassword",
    conditionGroups: [
      {
        title: "Form input",
        items: [
          { label: "all fields empty", marks: [T, F, F] },
          { label: 'current="oldpass1", new="short1" (< 8 chars), confirm="short1"', marks: [F, T, F] },
          { label: 'current="oldpass1", new="newpassword1", confirm="differentpassword1" (mismatch)', marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: '"Could not update password. Please try again."', marks: [T, F, F] },
          { label: '"Password must be at least 8 characters."', marks: [F, T, F] },
          { label: '"New passwords do not match."', marks: [F, F, T] },
        ],
      },
      { title: "Exception", items: [{ label: "changePassword() is never called", marks: [T, T, T] }] },
    ],
    types: ["A", "B", "A"],
  },
  {
    id: "FE_SEC_002",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "ChangePasswordSubmitFlow",
    description: "A valid password change calls changePassword and clears the form on success; an API failure shows the generic save-failed error",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "valid current/new/confirm, changePassword resolves", marks: [T, F] },
          { label: "valid current/new/confirm, changePassword rejects (network down)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: '"Password updated successfully.", fields cleared', marks: [T, F] },
          { label: '"Could not update password. Please try again."', marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_XPH_001",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "XpHistoryStandaloneList",
    description: "Standalone XpHistorySection lists entries with label+amount, falls back to a type-based i18n label when the backend omits one, shows an empty state, and fetches exactly page 1/size 10",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "entries with a label, e.g. 'Session completed' +20", marks: [T, F, F, F] },
          { label: "entry with label='', type='StreakMilestone'", marks: [F, T, F, F] },
          { label: "items: []", marks: [F, F, T, F] },
          { label: "render standalone (no embedded prop)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "shows label and '+20'", marks: [T, F, F, F] },
          { label: "shows 'Streak milestone' (i18n fallback)", marks: [F, T, F, F] },
          { label: '"No XP history yet — complete a practice session to earn XP."', marks: [F, F, T, F] },
          { label: "getXpHistory called with (1, 10)", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "B", "N"],
  },
  {
    id: "FE_XPH_002",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "XpHistoryEmbeddedMode",
    description: "Embedded XpHistorySection (used inside a settings tab) hides the outer card title and fetches a larger page (30) than standalone mode",
    conditionGroups: [{ title: "Precondition", items: [{ label: "render with embedded prop", marks: [T] }] }],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "entries render, no 'XP History' title text", marks: [T] },
          { label: "getXpHistory called with (1, 30)", marks: [T] },
        ],
      },
    ],
    types: ["N"],
  },
  {
    id: "FE_DGS_001",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "DailyGoalPresetDisplay",
    description: "DailyGoalSettings highlights the server-saved preset as active on load, and hides the Save button until a different preset is picked",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getMyProgress returns dailyGoalXp=50, no interaction", marks: [T, F] },
          { label: "getMyProgress returns dailyGoalXp=50, still no preset changed", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "the '50 XP' button has the active border class", marks: [T, F] },
          { label: "no 'Save goal' button in the DOM", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_DGS_002",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "DailyGoalSaveFlow",
    description: "Selecting a different daily-goal preset and saving calls updateDailyGoal and optimistically marks the new preset active; a save failure shows an error toast and keeps Save visible",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "pick '80 XP', click Save goal, updateDailyGoal resolves", marks: [T, F] },
          { label: "pick '120 XP', click Save goal, updateDailyGoal rejects (network down)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Daily goal updated' toast; '80 XP' now shows the active class; Save hidden", marks: [T, F] },
          { label: "'Could not update goal' toast; Save goal button still visible", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_GPC_001",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "GamificationProgressCardDisplay",
    description: "GamificationProgressCard shows level/XP/streak, a celebratory message when the daily goal is complete, remaining-XP text otherwise, opens the XP guide panel on demand, and keeps its loading-skeleton state (no crash) on a fetch failure",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getMyProgress resolves with level=4, totalXp=1250, streak=3", marks: [T, F, F, F, F] },
          { label: "dailyGoalCompleted=true, todayXp=50", marks: [F, T, F, F, F] },
          { label: "dailyGoalXp=50, todayXp=20, dailyGoalCompleted=false", marks: [F, F, T, F, F] },
          { label: "click 'How to earn XP?'", marks: [F, F, F, T, F] },
          { label: "getMyProgress rejects (network down)", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Level 4', '1,250 XP', 'Practitioner', '3' all shown", marks: [T, F, F, F, F] },
          { label: "'Daily goal completed! 🎉'", marks: [F, T, F, F, F] },
          { label: "'30 XP left to reach your goal'", marks: [F, F, T, F, F] },
          { label: "'How to earn XP' guide panel opens", marks: [F, F, F, T, F] },
          { label: "card stays aria-busy='true' (skeleton), no crash", marks: [F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "A"],
  },
  {
    id: "FE_AG_001",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "AchievementGridFullVariant",
    description: "The full-variant AchievementGrid lists achievements with an unlocked count, filters by category, shows an empty state with none, and offers a working Try-again retry after a load failure",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "2 achievements, 1 unlocked", marks: [T, F, F, F] },
          { label: "2 achievements, different categories, click 'Streak' filter", marks: [F, T, F, F] },
          { label: "getAchievements resolves []", marks: [F, F, T, F] },
          { label: "getAchievements rejects once, then resolves; click 'Try again'", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "both names shown, '1/2 Unlocked'", marks: [T, F, F, F] },
          { label: "only the Streak-category achievement remains visible", marks: [F, T, F, F] },
          { label: "'No achievements yet — start practising!'", marks: [F, F, T, F] },
          { label: "'Try again' button shown, then re-fetch succeeds and shows the achievement", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "B", "A"],
  },
  {
    id: "FE_AG_002",
    module: GAMIFICATION_COMPONENTS_MODULE,
    method: "AchievementGridCompactVariant",
    description: "The compact-variant AchievementGrid sorts unlocked achievements ahead of locked ones",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "1 locked + 1 unlocked achievement, compact variant", marks: [T] }] },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "the unlocked achievement's tile appears before the locked one's", marks: [T] }] },
    ],
    types: ["N"],
  },
];

// ---- HR RAG Backend API Test (BE) - grounded in the FastAPI service at RAG_IQGS ----
// Kept separate and appended last so the workbook orders FE sheets first, then BE.

const BE_MODULE = "HRRAGBackendAPITest";

const beTestCases = [
  {
    id: "BE_API_001",
    module: BE_MODULE,
    method: "HealthCheckEndpoints",
    description: "Verify GET /health and GET /api/v1/health report status based on Ollama connectivity, and require no auth",
    conditionGroups: [
      {
        title: "Request",
        items: [
          { label: "Ollama service reachable", marks: [T, F, T] },
          { label: "Ollama service unreachable", marks: [F, T, F] },
          { label: "No X-Internal-Api-Key header sent", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200 OK, status healthy, system_chunks/hr_chunks counts returned", marks: [T, F, T] },
          { label: "502, success=false, error.code=LLM_ERROR", marks: [F, T, F] },
          { label: "Request succeeds without any API key (health endpoints are unauthenticated)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "N"],
  },
  {
    id: "BE_API_002",
    module: BE_MODULE,
    method: "InternalApiKeyAuthGate",
    description: "Verify X-Internal-Api-Key enforcement across protected endpoints, including the fail-open config gap",
    conditionGroups: [
      {
        title: "Request",
        items: [
          { label: "X-Internal-Api-Key header matches CONFIG[\"internal_api_key\"]", marks: [T, F, F, F] },
          { label: "X-Internal-Api-Key header is missing entirely", marks: [F, T, F, F] },
          { label: "X-Internal-Api-Key header present but the value is wrong", marks: [F, F, T, F] },
          { label: "INTERNAL_API_KEY env var is empty/unset on the server", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Request proceeds to the endpoint handler", marks: [T, F, F, T] },
          { label: "401, raw body {\"detail\": \"Invalid internal API key\"} (not wrapped in the ApiResponse envelope)", marks: [F, T, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Auth is silently disabled for ALL protected endpoints when the config key is empty (fail-open, not fail-closed)", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A", "B"],
  },
  {
    id: "BE_API_003",
    module: BE_MODULE,
    method: "ChatEndpointValidation",
    description: "Verify POST /api/v1/chat request validation, including the empty-question gap",
    conditionGroups: [
      {
        title: "Request body",
        items: [
          { label: "question is a valid non-empty string", marks: [T, F, F, F] },
          { label: "question is an empty string \"\"", marks: [F, T, F, F] },
          { label: "Body is malformed JSON / wrong field type", marks: [F, F, T, F] },
          { label: "X-Internal-Api-Key missing", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, answer returned in the ApiResponse envelope", marks: [T, F, F, F] },
          { label: "200 with a low-quality/garbage answer - no server-side validation rejects an empty question", marks: [F, T, F, F] },
          { label: "422, FastAPI validation error body {\"detail\":[...]}", marks: [F, F, T, F] },
          { label: "401 Invalid internal API key", marks: [F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [{ label: "Empty question is never rejected server-side (GAP)", marks: [F, T, F, F] }],
      },
    ],
    types: ["N", "A", "N", "A"],
  },
  {
    id: "BE_API_004",
    module: BE_MODULE,
    method: "IngestSystemFilesValidation",
    description: "Verify POST /api/v1/knowledge/system/files upload validation (extension/size/count/filename)",
    conditionGroups: [
      {
        title: "Upload",
        items: [
          { label: ".pdf file, 5MB", marks: [T, F, F, F, F, F] },
          { label: ".exe file (unsupported extension)", marks: [F, T, F, F, F, F] },
          { label: ".pdf file, 30MB (over the 25MB limit)", marks: [F, F, T, F, F, F] },
          { label: "21 files attached in one request (over max_upload_files=20)", marks: [F, F, F, T, F, F] },
          { label: "files field sent but empty", marks: [F, F, F, F, T, F] },
          { label: "filename contains path traversal (e.g. \"../../secrets.txt\")", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, file ingested successfully", marks: [T, F, F, F, F, F] },
          { label: "422, error.code=INGEST_FAILED", marks: [F, T, T, T, F, T] },
          { label: "400, raw HTTPException for an empty files array", marks: [F, F, F, F, T, F] },
          { label: "Filename is sanitized/rejected, not written outside the intended directory", marks: [F, F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A", "A", "A", "B"],
  },
  {
    id: "BE_API_005",
    module: BE_MODULE,
    method: "IngestHrFilesValidation",
    description: "Verify POST /api/v1/knowledge/hr/{owner_id}/files validation, including blank owner_id",
    conditionGroups: [
      {
        title: "Request",
        items: [
          { label: "owner_id is a valid non-empty string, valid file attached", marks: [T, F, F] },
          { label: "owner_id is blank/empty in the path", marks: [F, T, F] },
          { label: "owner_id contains special/unexpected characters", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, file ingested under the HR-specific knowledge base", marks: [T, F, F] },
          { label: "400, raw HTTPException for blank owner_id", marks: [F, T, F] },
          { label: "Behavior for a special-character owner_id is unverified (edge case worth confirming)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "B"],
  },
  {
    id: "BE_API_006",
    module: BE_MODULE,
    method: "JdValidationRules",
    description: "Verify JD ingest validation rules (min/max chars/words, line count, printable ratio, keyword signal groups)",
    conditionGroups: [
      {
        title: "JD content",
        items: [
          { label: "500 characters, 90 words, well-structured", marks: [T, F, F, F, F, F, F, F] },
          { label: "350 characters (below jd_min_chars=400)", marks: [F, T, F, F, F, F, F, F] },
          { label: "35,000 characters (above jd_max_chars=30000)", marks: [F, F, T, F, F, F, F, F] },
          { label: "60 words (below jd_min_words=80)", marks: [F, F, F, T, F, F, F, F] },
          { label: "5,500 words (above jd_max_words=5000)", marks: [F, F, F, F, T, F, F, F] },
          { label: "Only 3 non-empty lines", marks: [F, F, F, F, F, T, F, F] },
          { label: "Text matches fewer than 2 of the 4 keyword signal groups", marks: [F, F, F, F, F, F, T, F] },
          { label: "70%+ of lines are trivial bullet points", marks: [F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Ingestion proceeds normally", marks: [T, F, F, F, F, F, F, F] },
          { label: "422, error.code=JD_INVALID with a per-file validation_errors list", marks: [F, T, T, T, T, T, T, T] },
        ],
      },
    ],
    types: ["N", "A", "A", "A", "A", "A", "A", "A"],
  },
  {
    id: "BE_API_007",
    module: BE_MODULE,
    method: "InterviewPlanStartValidation",
    description: "Verify POST /api/v1/interview-plans/start validation and the vector-store-readiness gate",
    conditionGroups: [
      {
        title: "Request / state",
        items: [
          { label: "Valid owner_id, vector store is_ready=true", marks: [T, F, F, F] },
          { label: "owner_id is blank", marks: [F, T, F, F] },
          { label: "Vector store is_ready=false (ingest-system/ingest-hr not run yet)", marks: [F, F, T, F] },
          { label: "Vector store ready, but no chunks match the query in system_kb/hr_kb", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, plan draft returned", marks: [T, F, F, F] },
          { label: "422/PLAN_ERROR, \"owner_id không hợp lệ.\"", marks: [F, T, F, F] },
          { label: "422, error.code=NOT_READY, \"Chưa có dữ liệu. Chạy ingest-system và ingest-hr trước.\"", marks: [F, F, T, F] },
          { label: "422, error.code=PLAN_ERROR, \"Không tìm thấy tài liệu liên quan trong system_kb hoặc hr_kb.\"", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A", "A"],
  },
  {
    id: "BE_API_008",
    module: BE_MODULE,
    method: "InterviewPlanMessagesClarifyLoop",
    description: "Verify POST /api/v1/interview-plans/messages clarify-turn cap (max_plan_turns=5)",
    conditionGroups: [
      {
        title: "Request",
        items: [
          { label: "1st-4th clarify turn on the same plan session", marks: [T, F, F, F] },
          { label: "5th clarify turn (at the max_plan_turns=5 cap)", marks: [F, T, F, F] },
          { label: "6th clarify turn attempted (exceeds the cap)", marks: [F, F, T, F] },
          { label: "message field is empty", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, plan updated based on the clarify message", marks: [T, T, F, F] },
          { label: "Error: \"Đã vượt quá 5 lượt clarify...\"", marks: [F, F, T, F] },
          { label: "Empty message is passed through with no explicit rejection (unverified, needs confirmation)", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "B", "A", "B"],
  },
  {
    id: "BE_API_009",
    module: BE_MODULE,
    method: "InterviewPlanConfirmValidation",
    description: "Verify POST /api/v1/interview-plans/confirm validation, including the question_count 1-30 bound",
    conditionGroups: [
      {
        title: "Request",
        items: [
          { label: "plan_draft provided, question_count=10", marks: [T, F, F, F, F] },
          { label: "plan_draft missing entirely", marks: [F, T, F, F, F] },
          { label: "question_count=0", marks: [F, F, T, F, F] },
          { label: "question_count=31", marks: [F, F, F, T, F] },
          { label: "question_types contains a value outside {technical, behavioral, situational}", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, plan confirmed", marks: [T, F, F, F, F] },
          { label: "Error, plan_draft required", marks: [F, T, F, F, F] },
          { label: "Error: \"question_count phải từ 1 đến 30.\"", marks: [F, F, T, T, F] },
          { label: "question_types validated against the allowed set, invalid values rejected", marks: [F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A", "A", "A"],
  },
  {
    id: "BE_API_010",
    module: BE_MODULE,
    method: "InterviewQuestionsGenerateValidation",
    description: "Verify POST /api/v1/interview-questions validation, including the missing question_count bound check on this direct path",
    conditionGroups: [
      {
        title: "Request",
        items: [
          { label: "confirmed_plan object provided", marks: [T, F, F, F] },
          { label: "owner_id, role, and level all provided (no confirmed_plan)", marks: [F, T, F, F] },
          { label: "Neither confirmed_plan nor owner_id/role/level given", marks: [F, F, T, F] },
          { label: "question_count=500 sent on this direct (non-plan) generation path", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, questions generated from the confirmed plan", marks: [T, F, F, F] },
          { label: "200, questions generated from owner_id/role/level", marks: [F, T, F, F] },
          { label: "400, \"Cần confirmed_plan hoặc owner_id/role/level.\"", marks: [F, F, T, F] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "question_count is NOT bounds-checked on this path (unlike the plan-confirm path) - KNOWN GAP", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A", "B"],
  },
  {
    id: "BE_API_011",
    module: BE_MODULE,
    method: "ErrorResponseEnvelopeConsistency",
    description: "API-contract finding: two incompatible error response shapes coexist across the API",
    conditionGroups: [
      {
        title: "Error source",
        items: [
          { label: "Business-logic error on a /api/v1/* route (e.g. JD_INVALID, NOT_READY)", marks: [T, F, F] },
          { label: "Raw HTTPException (401 auth failure, blank owner_id 400)", marks: [F, T, F] },
          { label: "FastAPI automatic request validation error (malformed JSON/wrong types)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Response follows the ApiResponse envelope: {success,data,error:{code,message,details},meta}", marks: [T, F, F] },
          { label: "Response is plain {\"detail\": \"...\"} - does NOT follow the ApiResponse envelope", marks: [F, T, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "API consumers must handle 2 different error body shapes depending on the failure type (CONTRACT INCONSISTENCY)", marks: [F, T, T] },
        ],
      },
    ],
    types: ["N", "A", "A"],
  },
  {
    id: "BE_API_012",
    module: BE_MODULE,
    method: "LlmErrorMapping",
    description: "Verify Ollama-down behavior differs by endpoint - proper 502 LLM_ERROR mapping on plan endpoints vs an unhandled raw 500 on chat/question-generation",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Ollama unreachable during a plan-start call (wrapped in try/except)", marks: [T, F, F] },
          { label: "Ollama unreachable during a chat call (NOT wrapped in try/except)", marks: [F, T, F] },
          { label: "Ollama unreachable during interview-questions generation (no try/except around the LLM call)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "502, error.code=LLM_ERROR, ApiResponse envelope", marks: [T, F, F] },
          { label: "Raw unhandled 500 with a generic body, NOT the ApiResponse envelope (INCONSISTENT LLM failure handling)", marks: [F, T, T] },
        ],
      },
    ],
    types: ["N", "A", "A"],
  },
  {
    id: "BE_API_013",
    module: BE_MODULE,
    method: "LegacyEndpointsDeprecation",
    description: "Verify legacy (unprefixed) endpoints are still live but hidden from OpenAPI docs, with deprecation headers",
    conditionGroups: [
      {
        title: "Request",
        items: [
          { label: "GET /status (legacy path, no /api/v1 prefix)", marks: [T, F, F, F] },
          { label: "POST /chat (legacy)", marks: [F, T, F, F] },
          { label: "POST /generate-questions (legacy)", marks: [F, F, T, F] },
          { label: "Open /api/v1/docs and look for these legacy routes", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "200, response includes Deprecation and Sunset: 2026-09-01 headers", marks: [T, T, T, F] },
          { label: "Legacy routes are absent from the OpenAPI docs despite being fully functional", marks: [F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [{ label: "Still requires a valid X-Internal-Api-Key like all v1 routes", marks: [T, T, T, F] }],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "BE_API_014",
    module: BE_MODULE,
    method: "SynchronousBlockingNoTimeout",
    description: "Verify there is no async job/polling pattern - generation calls block synchronously with no configured timeout",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Ollama responds normally within a few seconds", marks: [T, F] },
          { label: "Ollama hangs/responds very slowly during a generation call", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "HTTP response returns promptly once generation completes (fully synchronous, no job ID/polling)", marks: [T, F] },
          { label: "Request hangs indefinitely from the client's perspective - no timeout configured (RISK)", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "BE_API_015",
    module: BE_MODULE,
    method: "NoCorsMiddlewareConfigured",
    description: "Static finding: no CORSMiddleware configured; browser-based cross-origin calls have undefined preflight behavior",
    conditionGroups: [
      {
        title: "Caller",
        items: [
          { label: "Server-to-server call (current architecture - Next.js API routes forward with the internal key)", marks: [T, F] },
          { label: "Direct browser fetch from a different origin (not how the app is wired today)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Request succeeds normally, no CORS involved", marks: [T, F] },
          { label: "OPTIONS preflight / cross-origin headers are undefined (no CORSMiddleware) - would fail in a browser if ever called directly (LATENT RISK)", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "BE_API_016",
    module: BE_MODULE,
    method: "NoRateLimitingConfigured",
    description: "Static finding: no rate limiting exists on any endpoint, including expensive LLM-backed ones",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Many rapid repeated requests to /api/v1/chat from the same caller", marks: [T, F] },
          { label: "Many rapid repeated requests to /api/v1/interview-questions from the same caller", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "All requests are accepted and processed, no 429 or throttling of any kind (LATENT RISK for cost/availability)", marks: [T, T] },
        ],
      },
    ],
    types: ["B", "B"],
  },
  {
    id: "BE_API_017",
    module: BE_MODULE,
    method: "StartupNoFailFastValidation",
    description: "Static finding: missing/misconfigured env vars do not crash startup, only fail at request time",
    conditionGroups: [
      {
        title: "Startup config",
        items: [
          { label: "OLLAMA_BASE_URL is missing or invalid", marks: [T, F, F] },
          { label: "INTERNAL_API_KEY is missing/empty", marks: [F, T, F] },
          { label: "Chroma persist directory path is misconfigured", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "App boots successfully; failure only surfaces later at request time via /health status:error", marks: [T, F, F] },
          { label: "App boots successfully; auth is silently disabled for all endpoints", marks: [F, T, F] },
          { label: "Depends on whether the Chroma client raises at import time - potential hard crash on boot vs silent misbehavior (needs confirmation)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["B", "B", "B"],
  },
  {
    id: "BE_API_018",
    module: BE_MODULE,
    method: "FileExtensionAllowList",
    description: "Verify the ingestion file-extension allow-list (.pdf .docx .txt .md .json .xlsx .xls) is enforced consistently",
    conditionGroups: [
      {
        title: "File extension",
        items: [
          { label: ".pdf", marks: [T, F, F, F, F, F, F, F, F] },
          { label: ".docx", marks: [F, T, F, F, F, F, F, F, F] },
          { label: ".txt", marks: [F, F, T, F, F, F, F, F, F] },
          { label: ".md", marks: [F, F, F, T, F, F, F, F, F] },
          { label: ".json", marks: [F, F, F, F, T, F, F, F, F] },
          { label: ".xlsx", marks: [F, F, F, F, F, T, F, F, F] },
          { label: ".xls", marks: [F, F, F, F, F, F, T, F, F] },
          { label: ".exe", marks: [F, F, F, F, F, F, F, T, F] },
          { label: ".zip", marks: [F, F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "File is accepted and ingested", marks: [T, T, T, T, T, T, T, F, F] },
          { label: "422, error.code=INGEST_FAILED, extension not in the allow-list", marks: [F, F, F, F, F, F, F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "N", "N", "N", "A", "A"],
  },
];

// ---- Batch 4: Admin Settings/AI Config/Content/Companies/Knowledge -
// grounded in tests/unit/{admin-platform-settings,admin-ai-config,
// admin-content-table,admin-companies,admin-knowledge}.test.tsx. No prior
// automated coverage existed for any of these admin pages.

const ADMIN_OPERATIONS_MODULE = "AdminOperationsModule";

const batch4TestCases = [
  {
    id: "FE_APS_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "PlatformSettingsGeneralLoadSave",
    description: "AdminSettingsPage's General tab loads platform settings from getPlatformSettings, retries the fetch after a load failure, and calls updatePlatformSettings with the edited platform name on Save",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getPlatformSettings resolves with platformName/defaultQuestionCount/sessionTimeout", marks: [T, F, F] },
          { label: "getPlatformSettings rejects once, then Retry re-fetches", marks: [F, T, F] },
          { label: "edit Platform Name field, click Save Changes", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "fields populated: name/default count/session timeout shown", marks: [T, F, F] },
          { label: "Retry button shown, then values load after retry", marks: [F, T, F] },
          { label: "updatePlatformSettings called with edited name, 'Settings saved locally.' shown", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "N"],
  },
  {
    id: "FE_APS_002",
    module: ADMIN_OPERATIONS_MODULE,
    method: "PlatformSettingsPermissionsNotificationsToggle",
    description: "The Permissions tab locks Admin's own toggles while Recruiter's stay editable, and the Notifications tab's per-event Email toggle updates its own state",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Permissions tab, 'Manage Users' row", marks: [T, F] },
          { label: "Notifications tab, 'JD Generation' row, click Email toggle", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Admin switch disabled; Recruiter switch toggles false→true on click", marks: [T, F] },
          { label: "Email switch toggles aria-checked false→true", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_APS_003",
    module: ADMIN_OPERATIONS_MODULE,
    method: "PlatformSettingsComingSoonButtons",
    description: "Save Permissions, Save Notifications, and the General tab's Reset Platform Data button are rendered disabled with a Coming soon tooltip, since none has a backend to act on yet, rather than being silently non-functional active buttons",
    conditionGroups: [
      {
        title: "Button",
        items: [
          { label: "Permissions tab: Save Permissions", marks: [T, F, F] },
          { label: "Notifications tab: Save Notifications", marks: [F, T, F] },
          { label: "General tab danger zone: Reset", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [{ label: "button is disabled with title='Coming soon'", marks: [T, T, T] }],
      },
    ],
    types: ["B", "B", "B"],
  },
  {
    id: "FE_AICFG_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "AiConfigLoadAndRetry",
    description: "AdminAiConfigRoutePage loads the saved LLM provider/chat model/temperature from getRagSettings+listRagModels, and a load failure shows Retry which re-fetches and repopulates the form",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getRagSettings/listRagModels resolve with ollama provider, llama3.1:8b, temp=0.3", marks: [T, F] },
          { label: "both calls reject once, then Retry re-fetches successfully", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "base URL/chat model select/'(0.3)' temperature label shown", marks: [T, F] },
          { label: "Retry button shown, then chat model select value repopulated after retry", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_AICFG_002",
    module: ADMIN_OPERATIONS_MODULE,
    method: "AiConfigProviderSwitchAndSave",
    description: "Switching provider to OpenRouter fills its default base URL, saving calls updateRagSettings with the edited temperature and shows a success toast, and a save failure surfaces the API's own error message as a toast instead of a generic one",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "click the OpenRouter provider button", marks: [T, F, F] },
          { label: "edit temperature to 0.7, click Save AI configuration, updateRagSettings resolves", marks: [F, T, F] },
          { label: "click Save AI configuration, updateRagSettings rejects with 'Backend does not support saving AI config yet.'", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "base URL field shows https://openrouter.ai/api/v1", marks: [T, F, F] },
          { label: "updateRagSettings called with temperature=0.7, 'AI configuration saved' shown", marks: [F, T, F] },
          { label: "toast shows the rejected error's own message verbatim", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A"],
  },
  {
    id: "FE_ACT_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "ContentTableRowAndDeadDeleteButton",
    description: "ContentTable renders a session row's job title/recruiter/question count from props, its per-row Delete button is disabled with a Coming soon tooltip (no backend to delete against), and the View link still navigates to the session's history detail page",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "session row with jobTitle/recruiter/recruiterEmail/questionsCount", marks: [T, F, F] },
          { label: "per-row Delete button", marks: [F, T, F] },
          { label: "View link, session id='sess-42'", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "job title/recruiter/email/count text rendered", marks: [T, F, F] },
          { label: "Delete button disabled with title='Coming soon'", marks: [F, T, F] },
          { label: "link href='/hr/history/sess-42'", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "B", "N"],
  },
  {
    id: "FE_ACOMP_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "CompanyManagementListingSearchRetry",
    description: "CompanyManagementPage lists companies from listCompanies, re-fetches with a keyword on Enter in the search box, shows an empty state when there are none, and a load failure shows Retry which re-fetches",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "listCompanies resolves with 1 company", marks: [T, F, F, F] },
          { label: "type 'Acme{Enter}' in the search box", marks: [F, T, F, F] },
          { label: "listCompanies resolves with an empty list", marks: [F, F, T, F] },
          { label: "listCompanies rejects once, then Retry re-fetches", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Acme Corp' shown", marks: [T, F, F, F] },
          { label: "listCompanies last called with keyword='Acme'", marks: [F, T, F, F] },
          { label: "'No companies found.' shown", marks: [F, F, T, F] },
          { label: "Retry (Thử lại) button shown, then results load after retry", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_ACOMP_002",
    module: ADMIN_OPERATIONS_MODULE,
    method: "CompanyManagementCreateEditDelete",
    description: "Creating a company trims the entered name and calls createCompany, editing a company's name calls updateCompany, and deleting a company requires a confirm step before calling deleteCompany",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Add Company, type '  New Co  ' in the name field, click Create Company", marks: [T, F, F] },
          { label: "Edit Company on 'Acme Corp', rename to 'Acme Corp Renamed', Save Changes", marks: [F, T, F] },
          { label: "Delete Company on 'Acme Corp', then confirm the delete", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "createCompany called with name='New Co' (trimmed), success toast shown", marks: [T, F, F] },
          { label: "updateCompany called with id='co-1', name='Acme Corp Renamed', success toast shown", marks: [F, T, F] },
          { label: "confirm text shown first, deleteCompany not called until confirm is clicked, then called with 'co-1'", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_AKB_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "AdminKnowledgeWrapperWiring",
    description: "AdminKnowledgePage wires the shared KnowledgePageContent to the admin-scoped knowledge.service functions (not the HR ones) — it lists documents via getAdminKnowledgeDocs and shows an empty state when there are none",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getAdminKnowledgeDocs resolves with 1 doc ('company-handbook.pdf')", marks: [T, F] },
          { label: "getAdminKnowledgeDocs resolves with an empty list", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Knowledge Documents' heading + 'company-handbook.pdf' shown, getAdminKnowledgeDocs called", marks: [T, F] },
          { label: "'No documents yet.' shown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
];

// ---- Batch 5: Admin Dashboard/Marketplace/Plans + HR Dashboard/History -
// grounded in tests/unit/{admin-dashboard,admin-marketplace,admin-plans,
// hr-dashboard,hr-history}.test.tsx. No prior automated coverage existed for
// any of these pages.

const HR_OPERATIONS_MODULE = "HROperationsModule";

const batch5TestCases = [
  {
    id: "FE_ADASH_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "AdminDashboardKpisAndAlerts",
    description: "AdminDashboardPage renders KPI values and a recent-user registration from fetchAdminDashboardStats, and shows a 'No companies registered' alert when totalCompanies=0 or 'No alerts detected' when data is healthy",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "totalUsers=120, hrManagers=15, jobSeekers=100, totalCompanies=8", marks: [T, F, F, F] },
          { label: "recentUsers=[{fullName:'Nguyen Van A', email:'a@example.com'}]", marks: [F, T, F, F] },
          { label: "totalCompanies=0, companies=[]", marks: [F, F, T, F] },
          { label: "companies + HR managers present, no anomalies", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "120/15/100/8 KPI values shown", marks: [T, F, F, F] },
          { label: "'Nguyen Van A' + 'a@example.com' shown in recent users", marks: [F, T, F, F] },
          { label: "'No companies registered' alert shown", marks: [F, F, T, F] },
          { label: "'No alerts detected' shown", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A", "N"],
  },
  {
    id: "FE_ADASH_002",
    module: ADMIN_OPERATIONS_MODULE,
    method: "AdminDashboardRetryAndRefresh",
    description: "A load failure shows an error banner with Retry which re-fetches and clears the error, and clicking the header's Refresh button re-fetches dashboard data",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "fetchAdminDashboardStats rejects once, then Retry re-fetches", marks: [T, F] },
          { label: "loaded with totalUsers=120, click Refresh, next fetch returns totalUsers=200", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Retry button shown, then data loads and error banner clears", marks: [T, F] },
          { label: "KPI updates from 120 to 200", marks: [F, T] },
        ],
      },
    ],
    types: ["A", "N"],
  },
  {
    id: "FE_AMKT_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "MarketplaceListingSearchAndErrors",
    description: "AdminMarketplacePage lists published sets with title/company/HR owner, debounce-searches by keyword, shows an empty state with no results, and a load failure shows an error toast",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "listMarketplaceQuestionSets resolves with 1 item", marks: [T, F, F, F] },
          { label: "type 'Backend' into the search box", marks: [F, T, F, F] },
          { label: "listMarketplaceQuestionSets resolves with an empty list", marks: [F, F, T, F] },
          { label: "listMarketplaceQuestionSets rejects", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "title + company name shown", marks: [T, F, F, F] },
          { label: "listMarketplaceQuestionSets last called with keyword='Backend'", marks: [F, T, F, F] },
          { label: "'No marketplace question sets found.' shown", marks: [F, F, T, F] },
          { label: "'Failed to load marketplace list.' shown", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_AMKT_002",
    module: ADMIN_OPERATIONS_MODULE,
    method: "MarketplacePinAndDetail",
    description: "Pinning a set calls pinMarketplaceQuestionSet and shows a success toast; clicking View opens the detail panel with data (including practitioners) from getMarketplaceQuestionSetById",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "click Pin on an unpinned set, pinMarketplaceQuestionSet resolves", marks: [T, F] },
          { label: "click View, getMarketplaceQuestionSetById resolves with a practitioner 'Tran Thi B'", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "pinMarketplaceQuestionSet called with 'set-1', 'Question set pinned.' shown", marks: [T, F] },
          { label: "getMarketplaceQuestionSetById called with 'set-1', 'Tran Thi B' shown in the detail panel", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_APLAN_001",
    module: ADMIN_OPERATIONS_MODULE,
    method: "PlansListingAndRefresh",
    description: "AdminPlansRoutePage lists plans fetched via adminListPlans (name and per-limit values), and clicking Refresh re-fetches and repopulates the form",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "adminListPlans resolves with HR Premium, askAiPerMonth=999", marks: [T, F] },
          { label: "loaded, click Refresh, next fetch renames the plan to 'HR Premium Renamed'", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "name field shows 'HR Premium', Ask-AI field shows 999", marks: [T, F] },
          { label: "name field updates to 'HR Premium Renamed'", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_APLAN_002",
    module: ADMIN_OPERATIONS_MODULE,
    method: "PlansEditSaveAndFailure",
    description: "Editing the Ask-AI limit and saving calls adminUpdatePlan with the new value and shows a success message; a save failure shows the generic save-error toast",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "edit Ask-AI limit 999→500, click Save plan, adminUpdatePlan resolves", marks: [T, F] },
          { label: "click Save plan, adminUpdatePlan rejects (network down)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "adminUpdatePlan called with plan id and limits.askAiPerMonth=500, success message shown", marks: [T, F] },
          { label: "'Failed to save the plan.' shown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_APLAN_003",
    module: ADMIN_OPERATIONS_MODULE,
    method: "PlansFreeVisiblePercentClamp",
    description: "The Free visible % field clamps its value to a maximum of 100 on blur, even if the user types a larger number",
    conditionGroups: [
      { title: "Input", items: [{ label: "field starts at 50, user types 150, then blurs (tab away)", marks: [T] }] },
    ],
    confirmGroups: [{ title: "Return", items: [{ label: "field value clamps to 100", marks: [T] }] }],
    types: ["B"],
  },
  {
    id: "FE_HDASH_001",
    module: HR_OPERATIONS_MODULE,
    method: "HrDashboardKpisAndSections",
    description: "HrDashboard renders KPI values and top role from the real aggregate endpoint (getHrDashboard), lists a recent session's job title/question count, lists a top candidate recommendation with name/role/score, and shows an empty state when there are no recommendations",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "aggregate: 108 questions, 12 sessions, 9 completed, 75% success, topRole='Backend Developer'", marks: [T, F, F, F] },
          { label: "recentSessions=[{role:'Backend Developer', questionCount:15}]", marks: [F, T, F, F] },
          { label: "topRecommendations=[{candidateName:'Nguyen Van A', score:88}]", marks: [F, F, T, F] },
          { label: "topRecommendations=[]", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "108/12/9/75%/'Backend Developer' KPI values shown", marks: [T, F, F, F] },
          { label: "'Backend Developer' appears ≥2 times (KPI + row), question count 15 shown", marks: [F, T, F, F] },
          { label: "'Nguyen Van A' + '88%' shown", marks: [F, F, T, F] },
          { label: "'No candidate recommendations yet.' shown", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_HDASH_002",
    module: HR_OPERATIONS_MODULE,
    method: "HrDashboardRetryAndNullFallback",
    description: "A load failure shows the error banner with Retry which re-fetches and clears it; when getHrDashboard's soft-fallback path returns null, the dashboard falls back to recommendations-only data but still reports itself as errored (a real code finding, not a test bug)",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getHrDashboard rejects once, then Retry re-fetches successfully", marks: [T, F] },
          { label: "getHrDashboard resolves null; listRecommendations resolves with 1 fallback item", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Retry button shown, then data loads and error banner clears", marks: [T, F] },
          { label: "'Failed to load dashboard data.' banner shown AND 'Fallback Candidate' still rendered", marks: [F, T] },
        ],
      },
    ],
    types: ["A", "A"],
  },
  {
    id: "FE_HIST_001",
    module: HR_OPERATIONS_MODULE,
    method: "HistoryListingSearchAndFilter",
    description: "QuestionSetHistoryTable lists sets with title/status badge/question count, search filters rows by title, filter='PUBLISHED'/'bookmarked' scope the visible rows, and a load failure shows the error message instead of the table",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "listHistoryQuestionSets resolves with a Draft and a Published set", marks: [T, F, F, F] },
          { label: "type 'react' into the search box", marks: [F, T, F, F] },
          { label: "filter='PUBLISHED', then filter='bookmarked'", marks: [F, F, T, F] },
          { label: "listHistoryQuestionSets rejects with 'Network error loading sets'", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "both titles + 'Saved'/'Published' badges + counts 8/12 shown", marks: [T, F, F, F] },
          { label: "Draft row hidden, matching Published row still shown", marks: [F, T, F, F] },
          { label: "each filter shows only the matching set, hides the other", marks: [F, F, T, F] },
          { label: "'Network error loading sets' shown instead of the table", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_HIST_002",
    module: HR_OPERATIONS_MODULE,
    method: "HistoryPublishUnpublishBookmark",
    description: "Publishing a Draft set calls publishQuestionSet and flips its badge to Published, unpublishing flips it back to Saved/Draft, and toggling the bookmark icon calls toggleHrBookmark",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "click 'Publish to marketplace' on the Draft row (qs-1)", marks: [T, F, F] },
          { label: "click 'Unpublish' on the Published row (qs-2)", marks: [F, T, F] },
          { label: "click 'Save to bookmarks' on the Draft row (qs-1)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "publishQuestionSet called with 'qs-1', both rows now show 'Published'", marks: [T, F, F] },
          { label: "unpublishQuestionSet called with 'qs-2', both rows now show 'Saved'", marks: [F, T, F] },
          { label: "toggleHrBookmark called with 'qs-1'", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_HIST_003",
    module: HR_OPERATIONS_MODULE,
    method: "HistoryDeleteConfirmAndPublishedGuard",
    description: "Deleting a set asks for confirmation before calling deleteHistoryQuestionSet and removes the row on confirm; a PUBLISHED set's Delete button is disabled and never opens the confirm dialog (must unpublish first)",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "click Delete on the Draft row (qs-1), then confirm in the dialog", marks: [T, F] },
          { label: "click the disabled Delete ('Unpublish before deleting') on the Published row (qs-2)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Confirm Delete' shown first, deleteHistoryQuestionSet not called until confirmed, then called with 'qs-1', row removed", marks: [T, F] },
          { label: "button is disabled, click no-ops: no dialog opens, deleteHistoryQuestionSet not called", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_HIST_004",
    module: HR_OPERATIONS_MODULE,
    method: "HistoryExportGatedByPlan",
    description: "The per-row Download Excel export button only renders for a Premium subscription; it is absent entirely for a Free plan",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "subscription = Premium", marks: [T, F] },
          { label: "subscription = Free (ready)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Download Excel' button present", marks: [T, F] },
          { label: "'Download Excel' button absent", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
];

// ---- Batch 6: Candidate Billing/Dashboard/Profile/Settings/Subscription -
// grounded in tests/unit/{candidate-billing,candidate-dashboard,
// candidate-profile,candidate-settings,candidate-subscription-context,
// candidate-upgrade-modal}.test.tsx. No prior automated coverage existed for
// any of these. candidate-subscription-context and candidate-upgrade-modal
// are regression tests for real P0/P1 fixes (shared-browser plan-cache leak;
// silent onDone drop after a paid order).

const CANDIDATE_OPERATIONS_MODULE = "CandidateOperationsModule";

const batch6TestCases = [
  {
    id: "FE_CBILL_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "BillingCurrentPlanDisplay",
    description: "CandidateBillingPage shows a Free subscriber's plan and practice-attempt usage (used/limit), and a Premium subscriber's plan and formatted renewal date",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "planType=FREE, practiceUsed=3, practiceLimit=5", marks: [T, F] },
          { label: "planType=PREMIUM, renewalDate='2026-09-15T00:00:00Z'", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Free Plan' + '3/5' shown", marks: [T, F] },
          { label: "'Premium' + formatted renewal date shown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_CBILL_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "BillingPaymentHistoryAndReceipt",
    description: "No payment history shows the empty state; a past payment shows its invoice row; an invoice WITH a receiptUrl renders a real Download link while one WITHOUT renders a disabled Download button with a Coming soon tooltip instead of a dead link",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getCandidatePaymentHistory resolves []", marks: [T, F, F, F] },
          { label: "1 invoice 'CAND-2026-01-01'", marks: [F, T, F, F] },
          { label: "invoice WITH receiptUrl", marks: [F, F, T, F] },
          { label: "invoice WITHOUT receiptUrl", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'No payment history yet.' shown", marks: [T, F, F, F] },
          { label: "'CAND-2026-01-01' row shown", marks: [F, T, F, F] },
          { label: "real link with href=receiptUrl and download attribute", marks: [F, F, T, F] },
          { label: "no link rendered; disabled button with title='Coming soon'", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_CBILL_003",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "BillingComingSoonButtons",
    description: "A Premium subscriber's Manage Subscription button, and a Free subscriber's Update Billing Info / Change Payment Method buttons, are all disabled with a Coming soon tooltip rather than silently non-functional",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Premium subscriber", marks: [T, F] },
          { label: "Free subscriber", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Manage Subscription' disabled with title='Coming soon'", marks: [T, F] },
          { label: "'Update Billing Info' and 'Change Payment Method' both disabled with title='Coming soon'", marks: [F, T] },
        ],
      },
    ],
    types: ["B", "B"],
  },
  {
    id: "FE_CBILL_004",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "BillingUpgradeAndCancel",
    description: "A Free subscriber clicking Upgrade to Premium opens the upgrade modal; a Premium subscriber's Cancel Plan opens a confirm dialog and only calls cancelSubscription (reverting the card to Free) once confirmed",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Free subscriber, click Upgrade to Premium", marks: [T, F] },
          { label: "Premium subscriber, click Cancel Plan, then confirm Cancel Subscription", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "upgrade modal dialog opens", marks: [T, F] },
          { label: "'Cancel Subscription' heading shown first, cancelSubscription not called until confirmed, then called and plan card reverts to 'Free Plan'", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_CDASH_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateDashboardKpisAndSessions",
    description: "CandidateDashboard renders the total-sessions/average-score KPIs from real practice stats, lists a recent session by question-set title, shows an empty state with no sessions, and a load failure shows Retry which re-fetches",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getPracticeStats: totalSessions=6, averageScore=78", marks: [T, F, F, F] },
          { label: "listCompletedSessions: 1 item, setTitle='Frontend React Deep Dive'", marks: [F, T, F, F] },
          { label: "listCompletedSessions: [], totalSessions=0", marks: [F, F, T, F] },
          { label: "both calls reject once, then Retry re-fetches", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'6' + '78%' KPI values shown", marks: [T, F, F, F] },
          { label: "'Frontend React Deep Dive' shown", marks: [F, T, F, F] },
          { label: "'No practice sessions yet.' shown", marks: [F, F, T, F] },
          { label: "Retry button shown, then session data loads after retry", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_CDASH_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateDashboardRecommendedSets",
    description: "The dashboard renders recommended question sets fetched via listQuestionSets (pageSize=3), and a recommended-sets load failure shows its own independent Retry without affecting the main dashboard data already loaded",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "listQuestionSets resolves with 'SRE Site Reliability Track'", marks: [T, F] },
          { label: "main dashboard data loads fine, listQuestionSets rejects once then Retry re-fetches", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'SRE Site Reliability Track' shown, called with pageSize=3", marks: [T, F] },
          { label: "main session data still shown; recommended-sets Retry re-populates independently", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
  },
  {
    id: "FE_PROF_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateProfileViewAndEditToggle",
    description: "CandidateProfile shows the loaded profile info and practice stats in view mode, and clicking Edit Profile switches to edit mode with the current values pre-filled in inputs",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getCurrentUser: targetRole='Backend Developer'; getPracticeStats: totalSessions=4, averageScore=81", marks: [T, F] },
          { label: "click Edit Profile", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Backend Developer' + '4' + '81%' shown", marks: [T, F] },
          { label: "inputs pre-filled with current name/role, Save Changes button shown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_PROF_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateProfileSaveValidationSkills",
    description: "Saving valid changes trims the form and calls updateCandidateProfile then exits edit mode; an invalid LinkedIn URL blocks saving client-side and never calls the API; adding a skill via Enter updates the skills list and is included on save",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "edit targetRole to '  Staff Backend Engineer  ', Save Changes", marks: [T, F, F] },
          { label: "type 'not-a-url' into the LinkedIn field, Save Changes", marks: [F, T, F] },
          { label: "type 'Kubernetes{Enter}' into the skills input, then Save Changes", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "updateCandidateProfile called with targetRole='Staff Backend Engineer' (trimmed), 'Profile saved successfully.' shown, edit mode exits", marks: [T, F, F] },
          { label: "'Enter a valid URL (e.g. https://…)' shown, updateCandidateProfile never called", marks: [F, T, F] },
          { label: "'Kubernetes' chip shown; saved techStack includes it", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "N"],
  },
  {
    id: "FE_PROF_003",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateProfileCvManagement",
    description: "Uploading a CV from the empty state calls uploadCv and the new file name appears; deleting an existing CV asks for confirmation before calling deleteCv",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "no CV yet, upload 'new-resume.pdf'", marks: [T, F] },
          { label: "existing CV 'handbook-cv.pdf', click Delete, then confirm", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "uploadCv called with the file, 'new-resume.pdf' appears", marks: [T, F] },
          { label: "'Delete your CV?' shown first, deleteCv not called until confirmed, then called and 'CV deleted.' shown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_CSET_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateSettingsTabRouting",
    description: "SettingsPage defaults to the Profile tab, opens whichever tab the ?tab= query param names on load, and clicking a nav item switches tabs",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "no ?tab= param", marks: [T, F, F] },
          { label: "?tab=billing", marks: [F, T, F] },
          { label: "loaded on Profile, click the General nav item", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "[CandidateProfile] placeholder shown", marks: [T, F, F] },
          { label: "[CandidateBillingPage] placeholder shown", marks: [F, T, F] },
          { label: "General tab content ('Language') shown", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_CSET_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateSettingsGeneral",
    description: "On the General tab, toggling CV sync off calls updateCvSyncSettings(false), and switching the language to Tiếng Việt re-labels the tab's own content",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "CV sync currently on, click its toggle", marks: [T, F] },
          { label: "click 'Tiếng Việt'", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "updateCvSyncSettings called with false", marks: [T, F] },
          { label: "'Ngôn ngữ' (re-labeled) shown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_CSET_003",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "CandidateSettingsPrivacyPlanGate",
    description: "On the Privacy tab, a Premium candidate can toggle recruiter-recommendation visibility (calling updatePrivacySettings), while a Free candidate sees a 'Premium only' lock instead of the toggle, and clicking it opens the upgrade prompt",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "planType=PREMIUM, toggle currently on, click it", marks: [T, F] },
          { label: "planType=FREE (default)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "updatePrivacySettings called with false, 'Preference updated' shown", marks: [T, F] },
          { label: "'Premium only' shown, no switch rendered; clicking 'Upgrade to Premium' opens the upgrade heading", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_CSUB_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "SubscriptionContextUserScopedPlanCache",
    description: "P0 regression: CandidateSubscriptionProvider's localStorage plan cache is scoped to the exact user id it was written for — a PREMIUM plan cached for user A is NOT applied when user B logs in on the same (shared/kiosk) browser, but IS applied immediately (before the API resolves) for the same user A, and refreshSubscription always writes the cache scoped to the current user id",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "cache={plan:PREMIUM, user:'user-A'}, current user='user-B', subscription fetch hangs", marks: [T, F, F, F] },
          { label: "cache={plan:PREMIUM, user:'user-A'}, current user='user-A', subscription fetch hangs", marks: [F, T, F, F] },
          { label: "no relevant cache, current user='user-C', getCandidateSubscription resolves PREMIUM", marks: [F, F, T, F] },
          { label: "no cache at all, current user='user-D', getCandidateSubscription resolves FREE", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "shows plan:FREE for user-B, never plan:PREMIUM (cache NOT leaked cross-user)", marks: [T, F, F, F] },
          { label: "shows plan:PREMIUM for user-A immediately (same-user cache applied)", marks: [F, T, F, F] },
          { label: "shows plan:PREMIUM for user-C; cache written with user='user-C'", marks: [F, F, T, F] },
          { label: "shows plan:FREE for user-D once the API responds", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["A", "N", "N", "N"],
  },
  {
    id: "FE_UPM_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "UpgradeModalFinishPaidRetry",
    description: "P1 fix regression: once the background poll detects a paid order, finishPaid retries the post-payment subscription/usage/history refresh on transient failure (up to 3 attempts) and still calls onDone once a retry succeeds; if all 3 attempts fail it gives up quietly — onDone simply never fires, it does not crash — since the success toast/close already happened for the confirmed payment",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "order becomes Paid; getCandidateSubscription rejects twice then resolves PREMIUM", marks: [T, F] },
          { label: "order becomes Paid; getCandidateSubscription rejects on all 3 attempts", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "getCandidateSubscription called 3 times total, onDone called once with the fresh subscription/usage/history", marks: [T, F] },
          { label: "getCandidateSubscription called 3 times total, onDone never called, onClose already called, no crash", marks: [F, T] },
        ],
      },
    ],
    types: ["A", "A"],
  },
];

// ---- Batch 7 (final): Feedback polling, HR Billing/Knowledge/Recommendations
// /Settings, Invitations, Marketplace, Practice Session, Premium-Revoked
// dialog, Subscription realtime — grounded in tests/unit/{
// feedback-result-client,hr-billing,hr-knowledge,hr-recommendations,
// hr-settings-preferences-notifications,invitations,marketplace,
// practice-session,premium-revoked-dialog,subscription-realtime}.test.tsx.
// No prior automated coverage existed for any of these. hr-billing/BILL-7,
// candidate-subscription-context (batch 6), and subscription-realtime are all
// regression tests locking in real P0 fixes made this session.

const SHARED_PLATFORM_MODULE = "SharedPlatformModule";

const batch7TestCases = [
  {
    id: "FE_FRC_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "FeedbackScorePollingUntilArrival",
    description: "FeedbackResultClient shows 'scoring' while overallScore is null and polls every SCORE_POLL_INTERVAL_MS until a score arrives, flipping to 'done'; a score already present on the initial load skips polling entirely",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getPracticeSession: null, null, then 85 across 3 calls", marks: [T, F] },
          { label: "getPracticeSession returns overallScore=72 on the very first call", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "state stays 'scoring' through 2 nulls, then flips to 'done'; called 3 times total", marks: [T, F] },
          { label: "state is 'done' immediately; called exactly once, no further polls even after 2 intervals", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_FRC_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "FeedbackScoreTimeoutAndRetry",
    description: "After SCORE_POLL_MAX_ATTEMPTS straight nulls, scoring times out ('timed-out') instead of polling forever; clicking Retry after a timeout restarts polling from scratch and can still succeed",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "getPracticeSession returns null on every one of SCORE_POLL_MAX_ATTEMPTS polls", marks: [T, F] },
          { label: "timed out, then click 'Retry scoring', next poll returns overallScore=90", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "state flips to 'timed-out'; called 1 (initial) + SCORE_POLL_MAX_ATTEMPTS times", marks: [T, F] },
          { label: "state goes back to 'scoring' then 'done' after the next interval", marks: [F, T] },
        ],
      },
    ],
    types: ["A", "A"],
  },
  {
    id: "FE_BILL_001",
    module: HR_OPERATIONS_MODULE,
    method: "HrBillingCurrentPlan",
    description: "HrBillingSubscription shows 'Free' for a Free subscriber and 'Premium' for a Premium subscriber",
    conditionGroups: [
      { title: "Scenario", items: [
        { label: "subscription = Free (ready)", marks: [T, F] },
        { label: "subscription = Premium", marks: [F, T] },
      ] },
    ],
    confirmGroups: [
      { title: "Return", items: [
        { label: "'Free' shown", marks: [T, F] },
        { label: "'Premium' shown", marks: [F, T] },
      ] },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_BILL_002",
    module: HR_OPERATIONS_MODULE,
    method: "HrBillingPaymentHistoryAndReceipt",
    description: "A Free subscriber with no payment history sees no invoice rows; a Premium subscriber's payment history shows their invoice; an invoice WITH a receiptUrl renders a real Download link while one WITHOUT renders a disabled Download button with a Coming soon tooltip",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Free subscriber, getHrPaymentHistory=[]", marks: [T, F, F, F] },
          { label: "Premium subscriber, 1 invoice 'HR-2026-01-01'", marks: [F, T, F, F] },
          { label: "invoice WITH receiptUrl", marks: [F, F, T, F] },
          { label: "invoice WITHOUT receiptUrl", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "no invoice row rendered", marks: [T, F, F, F] },
          { label: "'HR-2026-01-01' row shown", marks: [F, T, F, F] },
          { label: "real link with href=receiptUrl and download attribute", marks: [F, F, T, F] },
          { label: "no link rendered; disabled button with title='Coming soon'", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "B"],
  },
  {
    id: "FE_BILL_003",
    module: HR_OPERATIONS_MODULE,
    method: "HrBillingCancelToFreeFlow",
    description: "Downgrade to Free opens a confirm dialog without cancelling immediately; Keep Premium closes it without cancelling; confirming calls cancelSubscriptionSandbox once and — per the real backend fix locked in by this regression test — keeps Premium active (periodEnd honored) rather than dropping to Free the instant the call resolves",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Premium subscriber, click 'Downgrade to Free'", marks: [T, F, F] },
          { label: "confirm dialog open, click 'Keep Premium'", marks: [F, T, F] },
          { label: "confirm dialog open, click confirm; cancelSubscriptionSandbox resolves with planCode still PREMIUM, status='Cancelled'", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Downgrade to Free' heading + 'Keep Premium' shown, no cancel call yet", marks: [T, F, F] },
          { label: "dialog closes, subscription NOT cancelled", marks: [F, T, F] },
          { label: "cancelSubscriptionSandbox called once, dialog closes, 'Downgrade to Free' CTA still present (still Premium, not reverted to Free)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A"],
  },
  {
    id: "FE_HKB_001",
    module: HR_OPERATIONS_MODULE,
    method: "KnowledgePageListingAndErrors",
    description: "KnowledgePageContent lists documents fetched via onFetchDocs with file name and status, shows an empty state with none, and a FAILED document shows its own error message",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "onFetchDocs resolves with 1 READY doc 'handbook.pdf'", marks: [T, F, F] },
          { label: "onFetchDocs resolves []", marks: [F, T, F] },
          { label: "onFetchDocs resolves with a FAILED doc, errorMessage='Unreadable PDF content'", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'handbook.pdf' + 'Ready' status shown", marks: [T, F, F] },
          { label: "'No documents yet.' shown", marks: [F, T, F] },
          { label: "'Unreadable PDF content' shown", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_HKB_002",
    module: HR_OPERATIONS_MODULE,
    method: "KnowledgeUploadAndSizeLimit",
    description: "Uploading a valid file calls onUpload and the new document appears in the list; a file over the 20MB limit is rejected client-side with a toast without ever calling onUpload — a finding that the .pdf/.docx/.doc/.txt 'accept' attribute is the only type gate, with no client-side MIME/extension re-check",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "upload 'resume-guide.pdf' (valid, under limit)", marks: [T, F] },
          { label: "upload 'huge.pdf', 21MB (over the 20MB limit)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "onUpload called with the file, 'resume-guide.pdf' appears in the list", marks: [T, F] },
          { label: "'File \"huge.pdf\" exceeds 20 MB.' toast shown, onUpload never called", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_HKB_003",
    module: HR_OPERATIONS_MODULE,
    method: "KnowledgeDeleteConfirm",
    description: "Deleting a document asks for confirmation ('Delete document?') before calling onDelete and removes the row on confirm",
    conditionGroups: [
      { title: "Scenario", items: [{ label: "open the row's '···' menu, click 'Xoá nguồn', then confirm Delete", marks: [T] }] },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "'Delete document?' shown first, onDelete not called until confirmed, then called with 'doc-1', row removed", marks: [T] }] },
    ],
    types: ["N"],
  },
  {
    id: "FE_HREC_001",
    module: HR_OPERATIONS_MODULE,
    method: "RecommendationsListingFilterSearch",
    description: "RecommendationsList lists candidates with name/role/score, switching to the Shortlisted tab re-fetches with that status filter, search filters client-side by question set title, no matches shows the empty state, and a load failure shows Retry which re-fetches",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "listRecommendations resolves with 1 candidate, score=88", marks: [T, F, F, F, F] },
          { label: "click the 'Shortlisted' status tab", marks: [F, T, F, F, F] },
          { label: "type 'react' into the search box", marks: [F, F, T, F, F] },
          { label: "listRecommendations resolves []", marks: [F, F, F, T, F] },
          { label: "listRecommendations rejects once, then Retry re-fetches", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "name + '88' score shown", marks: [T, F, F, F, F] },
          { label: "last called with status='SHORTLISTED'", marks: [F, T, F, F, F] },
          { label: "matching candidate hidden, non-matching one still shown", marks: [F, F, T, F, F] },
          { label: "'No candidates found matching your filters.' shown", marks: [F, F, F, T, F] },
          { label: "Retry button shown, then results load after retry", marks: [F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "A"],
  },
  {
    id: "FE_HREC_002",
    module: HR_OPERATIONS_MODULE,
    method: "RecommendationsShortlistDismissStateGating",
    description: "Shortlisting a NEW candidate calls shortlistRecommendation and shows a success toast; dismissing an already-acted candidate (409) shows a specific 'already invited or dismissed' message instead of the generic one; a DISMISSED candidate can still be shortlisted again (not terminal); an INVITED candidate has no shortlist/dismiss actions at all (terminal)",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "status=NEW, click Shortlist", marks: [T, F, F, F] },
          { label: "status=NEW, dismissRecommendation rejects with 409", marks: [F, T, F, F] },
          { label: "status=DISMISSED, click Shortlist", marks: [F, F, T, F] },
          { label: "status=INVITED", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "shortlistRecommendation called with the id, 'Added to shortlist.' shown", marks: [T, F, F, F] },
          { label: "'This candidate has already been invited or dismissed.' shown", marks: [F, T, F, F] },
          { label: "Shortlist button present and works, shortlistRecommendation called", marks: [F, F, T, F] },
          { label: "no Shortlist/Dismiss buttons rendered", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "A", "A", "B"],
  },
  {
    id: "FE_HRSET_001",
    module: HR_OPERATIONS_MODULE,
    method: "HrSettingsPreferencesNotificationsComingSoon",
    description: "The Preferences and Notifications tabs' Save Changes buttons are both disabled with a Coming soon tooltip (no backend to persist to yet), while individual notification toggles still update their own checked state live",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Preferences tab", marks: [T, F, F] },
          { label: "Notifications tab", marks: [F, T, F] },
          { label: "Notifications tab, click the first toggle", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Save Changes disabled with title='Coming soon'", marks: [T, F, F] },
          { label: "Save Changes disabled with title='Coming soon'", marks: [F, T, F] },
          { label: "toggle's aria-checked flips", marks: [F, F, T] },
        ],
      },
    ],
    types: ["B", "B", "N"],
  },
  {
    id: "FE_INV_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "InvitationsListingAndFilter",
    description: "InvitationsList lists invitations with company name and a live Pending count badge on the tab, the Accepted tab filters the list to accepted-only, no invitations shows the empty state, and a load failure shows Retry which re-fetches",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "listInvitations: 1 PENDING + 1 ACCEPTED", marks: [T, F, F, F] },
          { label: "click the Accepted tab", marks: [F, T, F, F] },
          { label: "listInvitations resolves []", marks: [F, F, T, F] },
          { label: "listInvitations rejects once, then Retry re-fetches", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "both company names shown, Pending tab badge shows '1'", marks: [T, F, F, F] },
          { label: "PENDING company hidden, ACCEPTED one still shown", marks: [F, T, F, F] },
          { label: "empty-state message shown", marks: [F, F, T, F] },
          { label: "Retry button shown, then invitation loads after retry", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "A"],
  },
  {
    id: "FE_INV_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "InvitationsAcceptFlow",
    description: "Accept opens a modal; an invalid phone number blocks confirm with a validation message and never calls acceptInvitation; a valid (or blank) phone calls acceptInvitation and flips status to Accepted; a 409 on accept shows 'You've already responded' instead of the generic accept-failed message",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "type '12345' (invalid, too short) into the phone field, click Accept invitation", marks: [T, F, F] },
          { label: "type '0912345678' (valid), click Accept invitation, acceptInvitation resolves", marks: [F, T, F] },
          { label: "click Accept invitation, acceptInvitation rejects with 409", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Enter a valid phone number (10 digits, starting with 0).' shown, acceptInvitation never called", marks: [T, F, F] },
          { label: "acceptInvitation called with the phone, 'Invitation accepted' shown", marks: [F, T, F] },
          { label: "'You've already responded to this invitation.' shown", marks: [F, F, T] },
        ],
      },
    ],
    types: ["B", "N", "A"],
  },
  {
    id: "FE_INV_003",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "InvitationsDeclineFlow",
    description: "Decline asks for confirmation ('Decline this invitation?') before calling rejectInvitation and flips the status to Rejected",
    conditionGroups: [
      { title: "Scenario", items: [{ label: "click Decline, then confirm in the alert dialog", marks: [T] }] },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "confirm text shown first, rejectInvitation not called until confirmed, then called and 'Invitation declined' shown", marks: [T] }] },
    ],
    types: ["N"],
  },
  {
    id: "FE_MKT_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "MarketplaceBrowsingFilterSearch",
    description: "MarketplacePage lists all backend-returned sets as cards; search filters client-side by title/company/skill and Difficulty filters to that difficulty only — proving the documented 'BE only reliably filters by CompanyId' workaround actually works; no matches shows the empty state; a load failure shows Retry which re-fetches",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "listQuestionSets resolves with 3 sets across 2 companies", marks: [T, F, F, F, F] },
          { label: "type 'react' into search", marks: [F, T, F, F, F] },
          { label: "select Difficulty=Hard", marks: [F, F, T, F, F] },
          { label: "search for text matching no set", marks: [F, F, F, T, F] },
          { label: "the 2nd (main) listQuestionSets call rejects, then Retry re-fetches", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "all 3 titles shown, 'Acme Corp' appears twice", marks: [T, F, F, F, F] },
          { label: "only the React set remains visible; no re-fetch with a keyword param (client-side only)", marks: [F, T, F, F, F] },
          { label: "only the Hard-difficulty set remains visible", marks: [F, F, T, F, F] },
          { label: "'No question sets found. Try a different search.' shown", marks: [F, F, F, T, F] },
          { label: "Retry button shown, then all 3 sets load after retry", marks: [F, F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "A"],
  },
  {
    id: "FE_MKT_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "MarketplaceBookmarkAndNavigation",
    description: "Clicking the bookmark icon on a card calls toggleBookmark and flips its label from 'Save for later' to 'Remove from saved'; each card's Start Practice link points at its own set-detail route",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "click 'Save for later' on the first card", marks: [T, F] },
          { label: "3 cards, default featured sort", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "toggleBookmark called, button now reads 'Remove from saved'", marks: [T, F] },
          { label: "3 links, hrefs = /jobseeker/sets/{s1,s2,s3} in fetch order", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_PRACSESS_001",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "PracticeSessionStarting",
    description: "PracticeSession shows a loading spinner while starting, renders the first unanswered question with its category/difficulty badges once started, a generic start failure shows Retry which re-invokes startPracticeSession, and a 403 (ForbiddenError) shows a no-access message instead of the generic start-failed one",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "startPracticeSession never resolves", marks: [T, F, F, F] },
          { label: "startPracticeSession resolves with a 2-question session", marks: [F, T, F, F] },
          { label: "startPracticeSession rejects with a generic Error, then Retry re-invokes and succeeds", marks: [F, F, T, F] },
          { label: "startPracticeSession rejects with a ForbiddenError (403)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Starting your practice session…' shown", marks: [T, F, F, F] },
          { label: "question text + 'Question 1 of 2' shown", marks: [F, T, F, F] },
          { label: "'Failed to start the practice session.' shown, then Retry succeeds and shows the question", marks: [F, F, T, F] },
          { label: "\"You don't have access to practice this question set.\" shown, not the generic message", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "A", "A"],
  },
  {
    id: "FE_PRACSESS_002",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "PracticeSessionResume",
    description: "Resuming a session with previously-submitted answers lands on the first UNANSWERED question (not the first question overall), shows a Resumed badge, and shows a welcome-back toast",
    conditionGroups: [
      { title: "Scenario", items: [{ label: "q-1 has an answerText already, q-2 does not", marks: [T] }] },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "q-2's text shown (not q-1's), 'Resumed' badge + welcome-back toast shown", marks: [T] }] },
    ],
    types: ["N"],
  },
  {
    id: "FE_PRACSESS_003",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "PracticeSessionFinishAndSubmit",
    description: "The Finish button only appears once every answerable question has content; clicking it opens a review-confirmation dialog rather than submitting immediately; confirming submits every answer, completes the session, and navigates to the result page",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "q1 unanswered, then answered; q2 still unanswered, then answered", marks: [T, F, F] },
          { label: "single-question session, all answered, click Finish & Get Feedback", marks: [F, T, F] },
          { label: "review dialog open, click Submit & grade", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Finish button absent until both answered, then appears", marks: [T, F, F] },
          { label: "'Submit this session?' dialog shown, completePracticeSession not yet called", marks: [F, T, F] },
          { label: "completePracticeSession called with the session id, router pushed to the result page", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_PRACSESS_004",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "PracticeSessionAutoCompletedFallback",
    description: "A real code finding: if completePracticeSession() fails but a follow-up getPracticeSession() shows the session already COMPLETED server-side (BE auto-completed it via its own time limit), the candidate is still routed to the result page instead of shown an error",
    conditionGroups: [
      { title: "Scenario", items: [{ label: "completePracticeSession rejects (400, 'Session already completed'); getPracticeSession reports status=COMPLETED", marks: [T] }] },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "router still pushed to the result page, no 'Failed to finish the session.' error shown", marks: [T] }] },
    ],
    types: ["A"],
  },
  {
    id: "FE_PRACSESS_005",
    module: CANDIDATE_OPERATIONS_MODULE,
    method: "PracticeSessionLockedQuestion",
    description: "A locked (Free-plan) question hides its text and answer box entirely and shows an upgrade prompt instead of the real question content",
    conditionGroups: [
      { title: "Scenario", items: [{ label: "single-question session, question.isLocked=true", marks: [T] }] },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "'Premium question — upgrade to unlock' + lock message shown; the real question text is NOT rendered", marks: [T] }] },
    ],
    types: ["B"],
  },
  {
    id: "FE_PRD_001",
    module: SHARED_PLATFORM_MODULE,
    method: "PremiumRevokedDialogVisibilityAndAudience",
    description: "PremiumRevokedDialog renders nothing when open=false; when open, it shows the revoked title and the HR lost-features list by default; audience='candidate' swaps in the candidate-specific lost-features list instead",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "open=false", marks: [T, F, F] },
          { label: "open=true, no audience prop (default HR)", marks: [F, T, F] },
          { label: "open=true, audience='candidate'", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "'Premium Plan Revoked' NOT rendered", marks: [T, F, F] },
          { label: "title + HR items ('Publish to Marketplace' etc.) shown", marks: [F, T, F] },
          { label: "title + candidate items shown; 'Publish to Marketplace' absent", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_PRD_002",
    module: SHARED_PLATFORM_MODULE,
    method: "PremiumRevokedDialogUpgradeCta",
    description: "No Upgrade CTA is rendered when onUpgrade isn't provided; when it is, clicking 'Upgrade Again' calls onUpgrade then onClose",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "no onUpgrade prop", marks: [T, F] },
          { label: "onUpgrade provided, click 'Upgrade Again →'", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "no 'Upgrade Again' button rendered", marks: [T, F] },
          { label: "onUpgrade called once, then onClose called once", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_PRD_003",
    module: SHARED_PLATFORM_MODULE,
    method: "PremiumRevokedDialogCloseVariants",
    description: "The dialog can be dismissed 4 equivalent ways — the bottom 'Close' button, clicking the backdrop, pressing Escape, or the header X button — each calling onClose exactly once without calling onUpgrade",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "click the bottom 'Close' button (2nd of 2 same-named buttons)", marks: [T, F, F, F] },
          { label: "click the backdrop", marks: [F, T, F, F] },
          { label: "press Escape", marks: [F, F, T, F] },
          { label: "click the header X 'Close' button (1st of 2)", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      { title: "Return", items: [{ label: "onClose called exactly once, onUpgrade not called", marks: [T, T, T, T] }] },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_SUBRT_001",
    module: SHARED_PLATFORM_MODULE,
    method: "SubscriptionHubConnectionNeverThrows",
    description: "P0 fix regression: createSubscriptionPaymentHubConnection() returns null instead of throwing when construction fails (e.g. in jsdom with no configured API base URL), and useSubscriptionRealtime's mount never crashes even though the real SignalR connection fails to construct",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "call createSubscriptionPaymentHubConnection() directly in jsdom (construction fails)", marks: [T, F] },
          { label: "render a component using useSubscriptionRealtime in jsdom", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "does not throw (returns null instead)", marks: [T, F] },
          { label: "render does not throw", marks: [F, T] },
        ],
      },
    ],
    types: ["A", "A"],
  },
  {
    id: "FE_SUBRT_002",
    module: SHARED_PLATFORM_MODULE,
    method: "SubscriptionRealtimeFallbackPoll",
    description: "When SignalR is unavailable, useSubscriptionRealtime's 30s fallback poll calls onSubscriptionChanged repeatedly; enabled=false skips setup entirely so no poll ever fires; unmounting clears the poll; and the poll always calls the LATEST onSubscriptionChanged callback, not a stale closure from the first render",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "mounted, enabled (default), advance 30s twice", marks: [T, F, F, F] },
          { label: "enabled=false, advance 120s", marks: [F, T, F, F] },
          { label: "advance 30s once, then unmount, then advance 60s more", marks: [F, F, T, F] },
          { label: "rerender with a new onChange callback before the first 30s tick", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "onChange called twice (once per 30s interval)", marks: [T, F, F, F] },
          { label: "onChange never called", marks: [F, T, F, F] },
          { label: "onChange called once total, no further calls after unmount", marks: [F, F, T, F] },
          { label: "the OLD callback is never called; the NEW one is called once", marks: [F, F, F, T] },
        ],
      },
    ],
    types: ["N", "B", "N", "A"],
  },
];

testCases.push(
  ...ragTestCases,
  ...ragAuthTestCases,
  ...ragTestCasesMore,
  ...ragAuthTestCasesMore,
  ...uiTestCases,
  ...authTestCases,
  ...sharedUtilsTestCases,
  ...permissionsCitationsTestCases,
  ...gamificationHistoryTestCases,
  ...candidateAdminUtilsTestCases,
  ...questionTemplateInferTestCases,
  ...batch3TestCases,
  ...batch4TestCases,
  ...batch5TestCases,
  ...batch6TestCases,
  ...batch7TestCases,
  ...beTestCases
);

// ---------------------------------------------------------------------------
// Automation coverage summary — added after real Vitest/pytest suites
// were written against this plan (340 FE + 20 BE tests, all passing). Maps
// each of the 114 scenarios above to its real automated-test status, since
// the per-scenario sheets themselves only record the original manual-review
// Passed/Failed marks, not which ones now have a running, verified test.
// ---------------------------------------------------------------------------

const AUTOMATION_STATUS = {
  // FE_MQ, fully automated (tests/unit/question-builder.test.tsx)
  FE_MQ_001: "DONE", FE_MQ_002: "DONE", FE_MQ_003: "DONE", FE_MQ_004: "DONE",
  FE_MQ_005: "DONE", FE_MQ_006: "DONE", FE_MQ_007: "DONE", FE_MQ_008: "DONE",
  FE_MQ_009: "DONE", FE_MQ_010: "DONE", FE_MQ_011: "DONE",

  // FE_RAG
  FE_RAG_001: "DONE", FE_RAG_002: "DONE", FE_RAG_003: "DONE", FE_RAG_004: "DONE",
  FE_RAG_005: "DONE", FE_RAG_006: "DONE", FE_RAG_007: "DONE",
  FE_RAG_008: "SKIPPED, requires waiting out a real 5-minute deadline",
  FE_RAG_009: "SKIPPED, not automated (background-job session-swap flow)",
  FE_RAG_010: "DONE", FE_RAG_011: "DONE", FE_RAG_012: "DONE", FE_RAG_013: "DONE",
  FE_RAG_014: "DONE", FE_RAG_015: "DONE", FE_RAG_016: "DONE",
  FE_RAG_017: "DONE",
  FE_RAG_018: "PARTIAL, only the Retry-Questions branch automated, not Retry-Plan/Edit-Input",
  FE_RAG_019: "DONE", FE_RAG_020: "DONE", FE_RAG_021: "DONE",
  FE_RAG_022: "SKIPPED, not automated (multi-job concurrent background flow)",
  FE_RAG_023: "DONE", FE_RAG_024: "DONE",

  // FE_RAGAUTH
  FE_RAGAUTH_001: "DONE", FE_RAGAUTH_002: "DONE", FE_RAGAUTH_003: "DONE",
  FE_RAGAUTH_004: "DONE", FE_RAGAUTH_005: "DONE", FE_RAGAUTH_006: "DONE",
  FE_RAGAUTH_007: "DONE", FE_RAGAUTH_008: "DONE", FE_RAGAUTH_009: "DONE",
  FE_RAGAUTH_010: "DONE", FE_RAGAUTH_011: "DONE",
  FE_RAGAUTH_012: "SKIPPED, not automated (session expiry mid-poll)",
  FE_RAGAUTH_013: "DONE",
  FE_RAGAUTH_014: "SKIPPED, static code finding, not a UI-observable behavior",
  FE_RAGAUTH_015: "DONE",
  FE_RAGAUTH_016: "DONE, tests/unit/candidate-forbidden.test.tsx (RGA016-1, RGA016-2)",
  FE_RAGAUTH_017: "DONE",
  FE_RAGAUTH_018: "SKIPPED, SSR-only behavior, not reachable from a browser E2E test",
  FE_RAGAUTH_019: "DONE", FE_RAGAUTH_020: "DONE",

  // FE_RAG_025-039
  FE_RAG_025: "DONE", FE_RAG_026: "DONE",
  FE_RAG_027: "PARTIAL, Use/Close/Backdrop/Escape covered; Copy-to-clipboard button not tested",
  FE_RAG_028: "DONE", FE_RAG_029: "DONE", FE_RAG_030: "DONE", FE_RAG_031: "DONE",
  FE_RAG_032: "DONE", FE_RAG_033: "DONE",
  FE_RAG_034: "PARTIAL, attach-from-library covered; upload-new-file comparison not tested",
  FE_RAG_035: "DONE", FE_RAG_036: "DONE", FE_RAG_037: "DONE", FE_RAG_038: "DONE",
  FE_RAG_039: "DONE",

  // FE_UI
  FE_UI_001: "DONE", FE_UI_002: "DONE", FE_UI_003: "DONE", FE_UI_004: "DONE",
  FE_UI_005: "DONE", FE_UI_006: "DONE", FE_UI_007: "DONE", FE_UI_008: "DONE",
  FE_UI_009: "DONE", FE_UI_010: "PARTIAL, only the Approve-Plan button's loading state tested",
  FE_UI_011: "SKIPPED, not automated (form-field validation visual states)",
  FE_UI_012: "DONE",
  FE_UI_013: "PARTIAL, modal open/close/scroll-lock covered; z-index stacking not asserted",
  FE_UI_014: "DONE, tests/unit/admin-manage-users.test.tsx (UI014-1)",
  FE_UI_015: "DONE, tests/unit/info-tooltip.test.tsx (UI015-1)",
  FE_UI_016: "DONE",
  FE_UI_017: "PARTIAL, Escape-key dismissal tested on 2 modals; general Tab navigation not",
  FE_UI_018: "DONE",

  // FE_AUTH, fully automated
  FE_AUTH_001: "DONE", FE_AUTH_002: "DONE", FE_AUTH_003: "DONE", FE_AUTH_004: "DONE",
  FE_AUTH_005: "DONE", FE_AUTH_006: "DONE", FE_AUTH_007: "DONE", FE_AUTH_008: "DONE",

  // BE_API
  BE_API_001: "DONE", BE_API_002: "DONE", BE_API_003: "DONE", BE_API_004: "DONE",
  BE_API_005: "PARTIAL, only the blank-owner-id case automated, not full HR ingest validation",
  BE_API_006: "N/A, JD char/word-count validation lives in the .NET backend, not this RAG_IQGS repo",
  BE_API_007: "DONE",
  BE_API_008: "SKIPPED, requires a live Ollama connection",
  BE_API_009: "SKIPPED, requires a live Ollama connection",
  BE_API_010: "DONE",
  BE_API_011: "DONE",
  BE_API_012: "SKIPPED, requires a live Ollama connection",
  BE_API_013: "DONE",
  BE_API_014: "SKIPPED, by design; would hang the test run (no request timeout configured anywhere)",
  BE_API_015: "DONE", BE_API_016: "DONE", BE_API_017: "DONE",
  BE_API_018: "PARTIAL, rejection path automated; 7 accepted-extension cases skipped (need Ollama)",
};

const KNOWN_DEFECTS = [
  {
    id: "DEF-001",
    scenario: "FE_RAG_027 (SampleJdModalCopyUse)",
    file: "src/features/studio/components/sources-panel.tsx",
    summary:
      "Clicking \"Use this sample\" in the Sample JD modal fills the JD textarea but does NOT save it — a stale-closure bug.",
    detail:
      "onUse() calls onJdChange(content) then immediately void onSaveJd() in the same synchronous handler. onSaveJd is " +
      "studio.saveJobDescription, a useCallback memoized on [..., jdContent, ...] — the reference captured at render " +
      "time still closes over the OLD (empty) jdContent, so its own guard `if (!jdContent.trim()) return;` fires and no " +
      "PUT request ever goes out. No toast, no error — the user must click \"Save & Analyze\" a second time manually.",
    reproTest: "tests/unit/studio-sample-jd.test.tsx — \"RAG027-1 (finding)\"",
  },
  {
    id: "DEF-002",
    scenario: "FE_RAG_028 (ReorderQuestions409Handling)",
    file: "src/features/question/components/review-questions-section.tsx",
    summary:
      "A 409 from the server on question reorder is swallowed silently — no error toast, and the client-side order stays " +
      "out of sync with the server's rejected state.",
    detail:
      "persistReorder()'s no-questionSetId branch calls `void reorderJobQuestions(sessionId, items)` with no .then()/" +
      ".catch() at all — contrast with the questionSetId branch a few lines above, which DOES show an error toast on " +
      "failure. interview.service.ts's reorderJobQuestions() also explicitly treats a 409 as \"not an error\" and " +
      "returns false without even a console.warn. The UI has already applied the new order optimistically before the " +
      "rejected request completes, so the user sees a reordered list that was never actually persisted.",
    reproTest: "Code-review finding — GenerateForm flow was retired (/hr/generate now redirects to Studio); no automated regression test currently covers this reorder path.",
  },
];

const THICK = { style: "medium", color: { argb: "FF000000" } };

// heightForWrappedText() is defined near the top of the file (shared with
// addMarkRow/addGroupHeader/addTestCaseBlock's own row-height fixes).

/** Thin border on every cell in [r1,c1]..[r2,c2], PLUS a medium/thick black
 * border tracing the outer perimeter — the same "boxed section" look the
 * other 114 sheets get from their navy header blocks. */
function frameBlock(ws, r1, c1, r2, c2) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      const border = { ...borderAll };
      if (r === r1) border.top = THICK;
      if (r === r2) border.bottom = THICK;
      if (c === c1) border.left = THICK;
      if (c === c2) border.right = THICK;
      cell.border = border;
    }
  }
}

const usedNames = new Set();
for (const tc of testCases) {
  let name = sheetNameFor(tc);
  let i = 2;
  while (usedNames.has(name)) {
    const suffix = `_${i}`;
    name = sheetNameFor(tc).slice(0, 31 - suffix.length) + suffix;
    i++;
  }
  usedNames.add(name);

  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 0 }] });
  ws.columns = SHEET_COLUMNS;
  const lastRow = addTestCaseBlock(ws, 1, tc) - 1;
  ws.eachRow((row) => {
    if (!row.height) row.height = 18;
  });
  // Thick black outer frame around the whole test-case block, on top of the
  // thin grey grid every cell already has from setCell()'s default border.
  frameBlock(ws, 1, 1, lastRow, LAST_UTCID_COL);
}

module.exports = { testCases, sheetNameFor, AUTOMATION_STATUS, KNOWN_DEFECTS };

// Only write a file when run directly (`node gen-testcases.js out.xlsx`) —
// other scripts `require("./gen-testcases")` just for the `testCases` data
// (e.g. to fill the Functions/Statistics sheets) without triggering a write.
if (require.main === module) {
  const outPath = process.argv[2] || "FE_HR_ManualQuestion_TestCases.xlsx";
  wb.xlsx.writeFile(outPath).then(() => {
    console.log("Written:", outPath);
  });
}
