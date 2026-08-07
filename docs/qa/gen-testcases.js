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

function setCell(ws, row, col, value, opts = {}) {
  const cell = ws.getCell(row, col);
  cell.value = value;
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
const ID_PREFIX_MAP = {
  FE_MQ_: "MQ",
  FE_RAGAUTH_: "RGA",
  FE_RAG_: "RAG",
  FE_UI_: "UI",
  FE_AUTH_: "AUTH",
  BE_API_: "BE",
};
function sheetNameFor(tc) {
  let shortId = tc.id;
  for (const [prefix, code] of Object.entries(ID_PREFIX_MAP)) {
    if (tc.id.startsWith(prefix)) {
      shortId = code + tc.id.slice(prefix.length);
      break;
    }
  }
  const name = `${shortId}_${tc.method}`;
  return name.slice(0, 31).replace(/[\\/?*[\]:]/g, "-");
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
    description: "Studio: verify the full-page blocking quota modal (Free plan cooldown) blocks the entire page, not just Generate",
    conditionGroups: [
      {
        title: "Subscription state",
        items: [
          { label: "Free plan, within 24h cooldown of last generate", marks: [T, F, F] },
          { label: "Free plan, cooldown period has passed", marks: [F, T, F] },
          { label: "Premium plan (generateUnlimited = true)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Full-screen alertdialog blocks the entire page (JD/plan editing also blocked)", marks: [T, F, F] },
          { label: "Title \"Daily generation limit reached\" with cooldown end time shown", marks: [T, F, F] },
          { label: "\"View plans & billing\" / \"Create manually\" are the only escape hatches", marks: [T, F, F] },
          { label: "No modal shown, Studio fully usable", marks: [F, T, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
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
    method: "JdMinCharVsWordCountMismatch",
    description: "GenerateForm: verify the two independent, inconsistent JD length rules - 400-char UI rule vs. hidden 100-word server rule",
    conditionGroups: [
      {
        title: "JD text state",
        items: [
          { label: "399 characters (1 below the UI minimum)", marks: [T, F, F, F] },
          { label: "420 characters but only 60 words", marks: [F, T, F, F] },
          { label: "600 characters, 110 words", marks: [F, F, T, F] },
          { label: "No text typed, JD file attached instead", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Orange border + \"Too short — please enter at least 400 characters (~80 words)\" shown", marks: [T, F, F, F] },
          { label: "\"Create Plan\" button enabled (UI rule passes)", marks: [F, T, T, T] },
          { label: "Server rejects: \"Mô tả công việc cần ít nhất 100 từ (hiện tại: 60 từ).\" (hard-coded Vietnamese, shown even in EN UI)", marks: [F, T, F, F] },
          { label: "Submit succeeds", marks: [F, F, T, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "UI shows the button as ready while a hidden server rule still blocks submission (DISCREPANCY)", marks: [F, T, F, F] },
        ],
      },
    ],
    types: ["N", "A", "N", "N"],
  },
  {
    id: "FE_RAG_015",
    module: RAG_MODULE,
    method: "FileUploadTypeSizeValidation",
    description: "GenerateForm: validate JD file upload (.pdf/.doc/.docx only, 10MB max - stricter than Studio's upload)",
    conditionGroups: [
      {
        title: "File selected",
        items: [
          { label: ".pdf, 2MB", marks: [T, F, F, F, F] },
          { label: ".docx, 5MB", marks: [F, T, F, F, F] },
          { label: ".jpg image (not accepted in this flow)", marks: [F, F, T, F, F] },
          { label: ".pdf, 15MB (over the 10MB limit)", marks: [F, F, F, T, F] },
          { label: "invalid file type via drag-and-drop", marks: [F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "File accepted", marks: [T, T, F, F, F] },
          { label: "Inline/toast \"fe.invalidType\" error shown", marks: [F, F, T, F, T] },
          { label: "Inline/toast \"fe.tooLarge\" error shown", marks: [F, F, F, T, F] },
        ],
      },
    ],
    types: ["N", "N", "A", "A", "A"],
  },
  {
    id: "FE_RAG_016",
    module: RAG_MODULE,
    method: "HardcodedGenerationSettings",
    description: "GenerateForm: verify the submit payload always sends numberOfQuestions:10 and difficulty:\"medium\" regardless of any UI control",
    conditionGroups: [
      {
        title: "Submission method",
        items: [
          { label: "Submit with pasted JD text", marks: [T, F] },
          { label: "Submit with uploaded file", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Request payload includes numberOfQuestions:10 and difficulty:\"medium\" hard-coded", marks: [T, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "These values can only be changed later via Plan edit, not at initial submit (LIMITATION)", marks: [T, T] },
        ],
      },
    ],
    types: ["B", "B"],
  },
  {
    id: "FE_RAG_017",
    module: RAG_MODULE,
    method: "PlanQuestionPollingFlow",
    description: "GenerateForm: verify the multi-step polling flow - plan generation -> plan review -> approve -> question generation",
    conditionGroups: [
      {
        title: "Polling scenario",
        items: [
          { label: "Plan job completes on the first 3s poll", marks: [T, F, F] },
          { label: "Plan job takes several 3s polls to complete", marks: [F, T, F] },
          { label: "A poll request transiently fails (network blip)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "View transitions form -> polling(plan) -> plan_review", marks: [T, T, F] },
          { label: "Polling backs off to 5s retry after a transient error, continues indefinitely (no deadline/cap)", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "B"],
  },
  {
    id: "FE_RAG_018",
    module: RAG_MODULE,
    method: "FailedStateRetryVariants",
    description: "GenerateForm: verify the failed-state screen's conditional retry actions based on server-provided flags",
    conditionGroups: [
      {
        title: "Server flags on failure",
        items: [
          { label: "canEditInput = true", marks: [T, F, F, F] },
          { label: "canRetryPlan = true", marks: [F, T, F, F] },
          { label: "canRetryQuestions = true", marks: [F, F, T, F] },
          { label: "All retry flags false", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "JD textarea + file upload + \"Gửi lại\" resubmit button shown", marks: [T, F, F, F] },
          { label: "\"Retry Plan\" button shown", marks: [F, T, F, F] },
          { label: "\"Retry Questions\" button shown", marks: [F, F, T, F] },
          { label: "Only \"Bắt đầu lại\" (Start over) button shown", marks: [F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "If the retry call itself fails: \"Retry failed.\" or \"Cập nhật input thất bại.\" shown", marks: [T, T, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N", "N"],
  },
  {
    id: "FE_RAG_019",
    module: RAG_MODULE,
    method: "AskAiPerQuestionChat",
    description: "GenerateForm: verify the Ask-AI chat panel per question and applying a suggested alternate question",
    conditionGroups: [
      {
        title: "AI response",
        items: [
          { label: "Reply text only, no .suggestion field", marks: [T, F, F] },
          { label: "Reply + .suggestion, HR clicks Apply", marks: [F, T, F] },
          { label: "Reply + .suggestion, HR does not apply it", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Chat reply is shown in the panel", marks: [T, T, T] },
          { label: "Question content is replaced with the suggestion after clicking Apply", marks: [F, T, F] },
          { label: "Question content remains unchanged", marks: [T, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAG_020",
    module: RAG_MODULE,
    method: "QuotaBannerInlineCopyMismatch",
    description: "GenerateForm: verify the inline/non-blocking quota banner (vs. Studio's blocking modal) and its copy discrepancies",
    conditionGroups: [
      { title: "Precondition", items: [{ label: "Free plan, within cooldown", marks: [T, T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Inline amber banner shown at top of form; rest of form (JD input, upload) remains usable", marks: [T, T] },
          { label: "Title reads \"Monthly limit reached\" (inconsistent with Studio's \"Daily generation limit reached\" - BUG)", marks: [T, F] },
          { label: "Body text does not interpolate {{time}} even though code calls replace() (token missing from source string - BUG)", marks: [F, T] },
          { label: "Submit button disabled, rest of form stays editable", marks: [T, T] },
        ],
      },
    ],
    types: ["A", "A"],
  },
  {
    id: "FE_RAG_021",
    module: RAG_MODULE,
    method: "SessionPersistenceCrossAccountGuard",
    description: "GenerateForm: verify localStorage session persistence across reload and the cross-account wipe guard",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Reload page mid-generation, same HR account", marks: [T, F, F] },
          { label: "Saved job returns 404/error when reconciling with server", marks: [F, T, F] },
          { label: "Different HR account logs in on the same browser afterward", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Session (jobId/view/plan/jdText) restores from localStorage, continues seamlessly", marks: [T, F, F] },
          { label: "localStorage session is cleared, resets silently to a blank form", marks: [F, T, F] },
          { label: "All hr_gen_* keys wiped when logged-in user id differs from stored owner; HR-B never sees HR-A's session", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "N"],
  },
  {
    id: "FE_RAG_022",
    module: RAG_MODULE,
    method: "ConcurrentBackgroundJobs",
    description: "GenerateForm: verify starting a new job while a previous one is still polling in the background",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "HR clicks \"Create another question set\" while job 1 is still polling", marks: [T, F] },
          { label: "Job 1 (backgrounded) completes while HR is actively working on job 2", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Job 1 is pushed into the hr_gen_bg_jobs localStorage list, new blank form shown for job 2", marks: [T, F] },
          { label: "A badge/notification elsewhere in the shell reflects job 1's completion", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
  },
  {
    id: "FE_RAG_023",
    module: RAG_MODULE,
    method: "SaveDraftDuplicateSubmit409",
    description: "GenerateForm: verify double-clicking Save Draft (409 already-saved response) is treated as silent success, not an error",
    conditionGroups: [
      {
        title: "Action",
        items: [
          { label: "Click Save Draft once", marks: [T, F] },
          { label: "Double-click Save Draft rapidly (2nd request gets 409)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Draft saves normally, success toast shown", marks: [T, F] },
          { label: "2nd request's 409 treated as \"already saved\" silently (returns null), no error toast shown", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
  },
  {
    id: "FE_RAG_024",
    module: RAG_MODULE,
    method: "PlanRegenerateLimitServerEnforced",
    description: "GenerateForm: verify the server-enforced max-5 plan-regenerate limit per draft (no FE counter shown)",
    conditionGroups: [
      {
        title: "Regenerate attempt count",
        items: [
          { label: "1st-4th regenerate on the same draft", marks: [T, F] },
          { label: "6th regenerate attempt (limit of 5 exceeded)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Regenerates normally, no warning", marks: [T, F] },
          { label: "Error toast: \"You've used all plan regenerations for this draft (max 5).\" (PLAN_REGENERATE_LIMIT)", marks: [F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "No counter/progress indicator shown anywhere in the FE UI before the limit is hit (GAP)", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "A"],
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
    id: "FE_RAG_025",
    module: RAG_MODULE,
    method: "KbDocPickerOptionalAttach",
    description: "GenerateForm: verify the optional Knowledge Base document picker (KbDocPicker)",
    conditionGroups: [
      {
        title: "Precondition",
        items: [
          { label: "No KB document selected (optional field)", marks: [T, F, F] },
          { label: "1 existing KB document selected", marks: [F, T, F] },
          { label: "Previously-selected document is deleted/unavailable before submit", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Submits without a knowledgeDocumentId", marks: [T, F, F] },
          { label: "Submits with the selected knowledgeDocumentId", marks: [F, T, F] },
          { label: "Submit fails or proceeds without the doc (needs confirmation), no crash", marks: [F, F, T] },
        ],
      },
    ],
    types: ["N", "N", "B"],
  },
  {
    id: "FE_RAG_026",
    module: RAG_MODULE,
    method: "NotesForAiFreeTextField",
    description: "GenerateForm: verify the optional free-text \"Notes for AI\" field",
    conditionGroups: [
      {
        title: "Notes field",
        items: [
          { label: "Left empty (optional)", marks: [T, F, F] },
          { label: "Filled with short guidance text", marks: [F, T, F] },
          { label: "Filled with a very long note (no visible max-length found)", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Submits normally, hrNote omitted/empty", marks: [T, F, F] },
          { label: "Submits normally with hrNote included in payload", marks: [F, T, T] },
        ],
      },
      {
        title: "Exception",
        items: [{ label: "No client-side max-length enforced on this field (unverified boundary)", marks: [F, F, T] }],
      },
    ],
    types: ["N", "N", "B"],
  },
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
    id: "FE_RAG_028",
    module: RAG_MODULE,
    method: "ReorderQuestions409Handling",
    description: "GenerateForm: verify reorderJobQuestions handles a 409 (job state prevents reorder) as a non-error",
    conditionGroups: [
      {
        title: "Precondition",
        items: [
          { label: "Job is in a reorderable state", marks: [T, F] },
          { label: "Job is in a state that prevents reorder (e.g. mid-regeneration)", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Reorder succeeds, new order persists", marks: [T, F] },
          { label: "Reorder call returns 409, treated as a non-error (no error toast), order silently unchanged", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "B"],
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
    id: "FE_RAG_036",
    module: RAG_MODULE,
    method: "GenerateFormNumberOfQuestionsEditViaPlan",
    description: "GenerateForm: verify question count/difficulty can only be changed later via Plan review, not at initial submit",
    conditionGroups: [
      {
        title: "Action in Plan review step",
        items: [
          { label: "HR increases the question count in Plan review", marks: [T, F] },
          { label: "HR changes difficulty in Plan review", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "updateJobPlan persists the new question count before approving", marks: [T, F] },
          { label: "updateJobPlan persists the new difficulty before approving", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
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
    id: "FE_RAG_038",
    module: RAG_MODULE,
    method: "GenerateFormKbDocPickerRAGStatusGate",
    description: "GenerateForm: verify the KB doc picker also gates selection on RAG ingestion status (Completed only)",
    conditionGroups: [
      {
        title: "Document RAG status",
        items: [
          { label: "Still Processing/Queued", marks: [T, F] },
          { label: "Completed", marks: [F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Document is not selectable in the picker", marks: [T, F] },
          { label: "Document is selectable and can be attached to the job", marks: [F, T] },
        ],
      },
    ],
    types: ["N", "N"],
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
    id: "FE_UI_005",
    module: UI_MODULE,
    method: "GenerateFormResponsiveLayout",
    description: "Verify GenerateForm's multi-step wizard (form/plan review/question review) adapts across viewport sizes",
    conditionGroups: [
      {
        title: "Viewport",
        items: [
          { label: "Desktop", marks: [T, F, F] },
          { label: "Tablet", marks: [F, T, F] },
          { label: "Mobile", marks: [F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Step indicator, JD textarea, and file upload area render correctly", marks: [T, T, T] },
          { label: "Question review cards stack to a single column on narrow viewports", marks: [F, F, T] },
          { label: "Ask-AI chat panel remains reachable, not clipped off-screen", marks: [T, T, T] },
        ],
      },
    ],
    types: ["N", "N", "B"],
  },
  {
    id: "FE_UI_006",
    module: UI_MODULE,
    method: "GenerateFormDarkLightTheme",
    description: "Verify GenerateForm renders correctly in both light and dark theme",
    conditionGroups: [
      { title: "Theme", items: [{ label: "Light theme", marks: [T, F] }, { label: "Dark theme", marks: [F, T] }] },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Progress/step indicators and quota banner remain legible in both themes", marks: [T, T] },
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
    description: "Verify the Studio blocking modal and GenerateForm inline banner render correctly across viewport sizes",
    conditionGroups: [
      {
        title: "Scenario",
        items: [
          { label: "Studio full-screen modal on Desktop", marks: [T, F, F, F] },
          { label: "Studio full-screen modal on Mobile", marks: [F, T, F, F] },
          { label: "GenerateForm inline banner on Desktop", marks: [F, F, T, F] },
          { label: "GenerateForm inline banner on Mobile", marks: [F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "Modal is centered, fully covers the page, text readable without zooming", marks: [T, T, F, F] },
          { label: "Modal buttons (\"View plans & billing\" / \"Create manually\") stay tappable, not cut off at the bottom", marks: [F, T, F, F] },
          { label: "Inline banner sits above the form without pushing critical content off-screen", marks: [F, F, T, T] },
        ],
      },
    ],
    types: ["N", "B", "N", "B"],
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
    description: "Verify the JD/document upload dropzone's visual states (Studio and GenerateForm)",
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
          { label: "GenerateForm page", marks: [F, F, T, F] },
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
    description: "Check the admin Manage Users page - search/filter/pagination, activate/deactivate, and subscription actions",
    conditionGroups: [
      {
        title: "Action",
        items: [
          { label: "Admin types a search term matching a user's name/email", marks: [T, F, F, F, F, F, F, F, F, F] },
          { label: "Admin selects a Role filter", marks: [F, T, F, F, F, F, F, F, F, F] },
          { label: "Admin selects a Status filter", marks: [F, F, T, F, F, F, F, F, F, F] },
          { label: "Admin applies multiple filters then clicks \"Clear filters\"", marks: [F, F, F, T, F, F, F, F, F, F] },
          { label: "Admin clicks Next/Previous at the first/last page", marks: [F, F, F, F, T, F, F, F, F, F] },
          { label: "Admin deactivates a user account and confirms", marks: [F, F, F, F, F, T, F, F, F, F] },
          { label: "Admin reactivates a suspended account and confirms", marks: [F, F, F, F, F, F, T, F, F, F] },
          { label: "Admin grants a Premium subscription (e.g. 3 months)", marks: [F, F, F, F, F, F, F, T, F, F] },
          { label: "Admin revokes a user's Premium subscription and confirms", marks: [F, F, F, F, F, F, F, F, T, F] },
          { label: "User list fails to load (API error)", marks: [F, F, F, F, F, F, F, F, F, T] },
        ],
      },
    ],
    confirmGroups: [
      {
        title: "Return",
        items: [
          { label: "List filters to matching rows (debounced 300ms)", marks: [T, F, F, F, F, F, F, F, F, F] },
          { label: "List filters to the selected role, page resets to 1", marks: [F, T, F, F, F, F, F, F, F, F] },
          { label: "List filters to the selected status, page resets to 1", marks: [F, F, T, F, F, F, F, F, F, F] },
          { label: "All filters reset, full list restored, page resets to 1", marks: [F, F, F, T, F, F, F, F, F, F] },
          { label: "Next/Prev buttons disabled at the first/last page boundary", marks: [F, F, F, F, T, F, F, F, F, F] },
          { label: "Toast \"Account status updated.\", user shows as Suspended", marks: [F, F, F, F, F, T, F, F, F, F] },
          { label: "Toast \"Account status updated.\", user shows as Active", marks: [F, F, F, F, F, F, T, F, F, F] },
          { label: "Toast success, user's plan updated to Premium with the chosen period", marks: [F, F, F, F, F, F, F, T, F, F] },
          { label: "Toast success, user downgraded to Free", marks: [F, F, F, F, F, F, F, F, T, F] },
          { label: "Toast \"Failed to load users. Please try again.\" with a Retry action", marks: [F, F, F, F, F, F, F, F, F, T] },
        ],
      },
      {
        title: "Exception",
        items: [
          { label: "Premium grant/revoke actions are hidden when the target user's role is ADMIN (by design)", marks: [F, F, F, F, F, F, F, T, T, F] },
        ],
      },
    ],
    types: ["N", "N", "N", "N", "N", "N", "N", "N", "N", "A"],
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

testCases.push(
  ...ragTestCases,
  ...ragAuthTestCases,
  ...ragTestCasesMore,
  ...ragAuthTestCasesMore,
  ...uiTestCases,
  ...authTestCases,
  ...beTestCases
);

// ---------------------------------------------------------------------------
// Automation coverage summary — added after real Playwright/pytest suites
// were written against this plan (175 FE + 20 BE tests, all passing). Maps
// each of the 114 scenarios above to its real automated-test status, since
// the per-scenario sheets themselves only record the original manual-review
// Passed/Failed marks, not which ones now have a running, verified test.
// ---------------------------------------------------------------------------

const AUTOMATION_STATUS = {
  // FE_MQ — fully automated (tests/e2e/manual-question.spec.ts)
  FE_MQ_001: "DONE", FE_MQ_002: "DONE", FE_MQ_003: "DONE", FE_MQ_004: "DONE",
  FE_MQ_005: "DONE", FE_MQ_006: "DONE", FE_MQ_007: "DONE", FE_MQ_008: "DONE",
  FE_MQ_009: "DONE", FE_MQ_010: "DONE", FE_MQ_011: "DONE",

  // FE_RAG
  FE_RAG_001: "DONE", FE_RAG_002: "DONE", FE_RAG_003: "DONE", FE_RAG_004: "DONE",
  FE_RAG_005: "DONE", FE_RAG_006: "DONE", FE_RAG_007: "DONE",
  FE_RAG_008: "SKIPPED — requires waiting out a real 5-minute deadline",
  FE_RAG_009: "SKIPPED — not automated (background-job session-swap flow)",
  FE_RAG_010: "DONE", FE_RAG_011: "DONE", FE_RAG_012: "DONE", FE_RAG_013: "DONE",
  FE_RAG_014: "DONE", FE_RAG_015: "DONE", FE_RAG_016: "DONE",
  FE_RAG_017: "DONE",
  FE_RAG_018: "PARTIAL — only the Retry-Questions branch automated, not Retry-Plan/Edit-Input",
  FE_RAG_019: "DONE", FE_RAG_020: "DONE", FE_RAG_021: "DONE",
  FE_RAG_022: "SKIPPED — not automated (multi-job concurrent background flow)",
  FE_RAG_023: "DONE", FE_RAG_024: "DONE",

  // FE_RAGAUTH
  FE_RAGAUTH_001: "DONE", FE_RAGAUTH_002: "DONE", FE_RAGAUTH_003: "DONE",
  FE_RAGAUTH_004: "DONE", FE_RAGAUTH_005: "DONE", FE_RAGAUTH_006: "DONE",
  FE_RAGAUTH_007: "DONE", FE_RAGAUTH_008: "DONE", FE_RAGAUTH_009: "DONE",
  FE_RAGAUTH_010: "DONE", FE_RAGAUTH_011: "DONE",
  FE_RAGAUTH_012: "SKIPPED — not automated (session expiry mid-poll)",
  FE_RAGAUTH_013: "DONE",
  FE_RAGAUTH_014: "SKIPPED — static code finding, not a UI-observable behavior",
  FE_RAGAUTH_015: "DONE",
  FE_RAGAUTH_016: "SKIPPED — not automated (candidate-portal 403 messages)",
  FE_RAGAUTH_017: "DONE",
  FE_RAGAUTH_018: "SKIPPED — SSR-only behavior, not reachable from a browser E2E test",
  FE_RAGAUTH_019: "DONE", FE_RAGAUTH_020: "DONE",

  // FE_RAG_025-039
  FE_RAG_025: "DONE", FE_RAG_026: "DONE",
  FE_RAG_027: "PARTIAL — Use/Close/Backdrop/Escape covered; Copy-to-clipboard button not tested",
  FE_RAG_028: "DONE", FE_RAG_029: "DONE", FE_RAG_030: "DONE", FE_RAG_031: "DONE",
  FE_RAG_032: "DONE", FE_RAG_033: "DONE",
  FE_RAG_034: "PARTIAL — attach-from-library covered; upload-new-file comparison not tested",
  FE_RAG_035: "DONE", FE_RAG_036: "DONE", FE_RAG_037: "DONE", FE_RAG_038: "DONE",
  FE_RAG_039: "DONE",

  // FE_UI
  FE_UI_001: "DONE", FE_UI_002: "DONE", FE_UI_003: "DONE", FE_UI_004: "DONE",
  FE_UI_005: "DONE", FE_UI_006: "DONE", FE_UI_007: "DONE", FE_UI_008: "DONE",
  FE_UI_009: "DONE", FE_UI_010: "PARTIAL — only the Approve-Plan button's loading state tested",
  FE_UI_011: "SKIPPED — not automated (form-field validation visual states)",
  FE_UI_012: "DONE",
  FE_UI_013: "PARTIAL — modal open/close/scroll-lock covered; z-index stacking not asserted",
  FE_UI_014: "SKIPPED — not automated (table/grid overflow)",
  FE_UI_015: "SKIPPED — not automated (tooltip hover display)",
  FE_UI_016: "DONE",
  FE_UI_017: "PARTIAL — Escape-key dismissal tested on 2 modals; general Tab navigation not",
  FE_UI_018: "DONE",

  // FE_AUTH — fully automated
  FE_AUTH_001: "DONE", FE_AUTH_002: "DONE", FE_AUTH_003: "DONE", FE_AUTH_004: "DONE",
  FE_AUTH_005: "DONE", FE_AUTH_006: "DONE", FE_AUTH_007: "DONE", FE_AUTH_008: "DONE",

  // BE_API
  BE_API_001: "DONE", BE_API_002: "DONE", BE_API_003: "DONE", BE_API_004: "DONE",
  BE_API_005: "PARTIAL — only the blank-owner-id case automated, not full HR ingest validation",
  BE_API_006: "N/A — JD char/word-count validation lives in the .NET backend, not this RAG_IQGS repo",
  BE_API_007: "DONE",
  BE_API_008: "SKIPPED — requires a live Ollama connection",
  BE_API_009: "SKIPPED — requires a live Ollama connection",
  BE_API_010: "DONE",
  BE_API_011: "DONE",
  BE_API_012: "SKIPPED — requires a live Ollama connection",
  BE_API_013: "DONE",
  BE_API_014: "SKIPPED — by design; would hang the test run (no request timeout configured anywhere)",
  BE_API_015: "DONE", BE_API_016: "DONE", BE_API_017: "DONE",
  BE_API_018: "PARTIAL — rejection path automated; 7 accepted-extension cases skipped (need Ollama)",
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
    reproTest: "tests/e2e/studio-sample-jd.spec.ts — \"RAG027-1 (finding)\"",
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
    reproTest: "tests/e2e/generate-form-flow.spec.ts — \"RAG-REORDER-1 (finding)\"",
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

function addSummarySheet(wb, allTestCases, automationStatus, defects) {
  const ws = wb.addWorksheet("00_Automation Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Scenario ID", key: "id", width: 18 },
    { header: "Method", key: "method", width: 48 },
    { header: "Automation status", key: "status", width: 95 },
  ];
  ws.getRow(1).font = whiteBold;
  ws.getRow(1).fill = navyFill;
  ws.getRow(1).height = 22;
  ws.getRow(1).eachCell((cell) => { cell.alignment = { vertical: "middle" }; });

  let done = 0, partial = 0, skipped = 0, na = 0;
  for (const tc of allTestCases) {
    const status = automationStatus[tc.id] ?? "SKIPPED — not automated";
    if (status.startsWith("DONE")) done++;
    else if (status.startsWith("PARTIAL")) partial++;
    else if (status.startsWith("N/A")) na++;
    else skipped++;

    const row = ws.addRow({ id: tc.id, method: tc.method, status });
    row.height = heightForWrappedText(status, 95);
    row.eachCell((cell) => { cell.alignment = { vertical: "middle", wrapText: true }; });
    if (status.startsWith("DONE")) {
      row.getCell(3).font = { color: { argb: "FF1B7A3D" } };
    } else if (status.startsWith("PARTIAL")) {
      row.getCell(3).font = { color: { argb: "FF9C6500" } };
    } else if (status.startsWith("N/A")) {
      row.getCell(3).font = { color: { argb: "FF808080" }, italic: true };
    } else {
      row.getCell(3).font = { color: { argb: "FFB00020" } };
    }
  }
  // Thick outer frame around the whole scenario-status table (header + all rows).
  frameBlock(ws, 1, 1, ws.rowCount, 3);

  // Boxed cell like the rest of the workbook — thin grey border on every
  // side, middle-aligned, wrapping text so merged/long cells stay readable.
  function boxRow(row, opts = {}) {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = borderAll;
      cell.alignment = { vertical: "middle", wrapText: true, ...(opts.align || {}) };
    });
    return row;
  }
  function boxEmptyRow(rowNumber) {
    for (let c = 1; c <= 3; c++) {
      const cell = ws.getCell(rowNumber, c);
      cell.border = borderAll;
    }
  }

  ws.addRow([]);
  const totalsStart = ws.rowCount + 1;
  const totalsRow = ws.addRow(["Totals", `${allTestCases.length} scenarios`, `${done} done · ${partial} partial · ${skipped} skipped · ${na} n/a`]);
  totalsRow.height = 20;
  boxRow(totalsRow);
  totalsRow.font = { bold: true };
  const notesRow = ws.addRow(["Real automated test suites:", "", "175 Playwright (FE, tests/e2e/) + 20 pytest (BE, RAG_IQGS/tests/test_e2e_api.py) — all passing, verified stable across repeated runs."]);
  notesRow.height = heightForWrappedText(notesRow.getCell(3).value, 95);
  boxRow(notesRow);
  notesRow.font = { italic: true };
  // Thick outer frame around the totals block.
  frameBlock(ws, totalsStart, 1, ws.rowCount, 3);

  ws.addRow([]);
  ws.addRow([]);
  const defectHeader = ws.addRow(["Defects found while automating", "", ""]);
  ws.mergeCells(defectHeader.number, 1, defectHeader.number, 3);
  defectHeader.height = 24;
  boxRow(defectHeader, { align: { horizontal: "left" } });
  defectHeader.font = { ...whiteBold, size: 13 };
  defectHeader.fill = navyFill;
  frameBlock(ws, defectHeader.number, 1, defectHeader.number, 3);

  for (const d of defects) {
    ws.addRow([]);
    const blockStart = ws.rowCount + 1;

    const idRow = ws.addRow([d.id, d.scenario, ""]);
    ws.mergeCells(idRow.number, 2, idRow.number, 3);
    idRow.height = 20;
    boxRow(idRow);
    idRow.font = { bold: true };
    idRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0E0" } };

    const summaryRow = ws.addRow(["Summary", d.summary, ""]);
    ws.mergeCells(summaryRow.number, 2, summaryRow.number, 3);
    summaryRow.height = heightForWrappedText(d.summary, 48 + 95);
    boxRow(summaryRow);
    summaryRow.getCell(2).font = { bold: true };

    const fileRow = ws.addRow(["File", d.file, ""]);
    ws.mergeCells(fileRow.number, 2, fileRow.number, 3);
    fileRow.height = 20;
    boxRow(fileRow);

    const detailRow = ws.addRow(["Detail", d.detail, ""]);
    ws.mergeCells(detailRow.number, 2, detailRow.number, 3);
    detailRow.height = heightForWrappedText(d.detail, 48 + 95);
    boxRow(detailRow);

    const reproRow = ws.addRow(["Repro test", d.reproTest, ""]);
    ws.mergeCells(reproRow.number, 2, reproRow.number, 3);
    reproRow.height = 20;
    boxRow(reproRow);
    reproRow.getCell(2).font = { italic: true };

    // Thick outer frame around this single defect's block.
    frameBlock(ws, blockStart, 1, ws.rowCount, 3);
  }
}

addSummarySheet(wb, testCases, AUTOMATION_STATUS, KNOWN_DEFECTS);

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
