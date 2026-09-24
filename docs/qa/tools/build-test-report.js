// Builds docs/qa/Report5_Test_Report.xlsx in the capstone "Test Case Report" template
// (styling taken from docs/qa/Report5mau/Report5_Test Case_Report(mau).xlsx).
// Usage: node build-test-report.js <vitest-results.json> <out.xlsx> [--check]
const ExcelJS = require("exceljs");
const path = require("path");

const ROOT = require("path").resolve(__dirname, "../../..") + "/";
const SAMPLE = ROOT + "docs/qa/Report5mau/Report5_Test Case_Report(mau).xlsx";
const [resultsFile, outFile] = process.argv.slice(2);
const CHECK_ONLY = process.argv.includes("--check");
const PYTEST_ARG = process.argv.find((a) => a.startsWith("--pytest="));
const PYTEST_FILE = PYTEST_ARG ? PYTEST_ARG.slice("--pytest=".length) : null;

const TESTER = "Hoàng Đăng Khoa";
// Frontend (Vitest) Round-1 date. The RAG Service API cases keep the date of
// their own pytest run, which is not re-executed when only the frontend changes.
const RUN_DATE = "21/09/2026";
const RAG_RUN_DATE = "15/09/2026";
const VERSION = "v7.3";
const PROJECT_NAME = "IQGS: AI-Powered Interview Question Generation System Using RAG and LLM";
const PROJECT_CODE = "SU26SE102";
const CREATOR = "NamNM";
const LAST_ROW = 2000;

// Test files that are pure logic/hook tests: they stay in the Unit Test workbook only.
const UNIT_ONLY_FILES = [
  "auth-interceptor.test.ts", "candidate-and-admin-utils.test.ts", "error-interceptor.test.ts",
  "gamification-and-history-utils.test.ts", "permissions-and-citations.test.ts",
  "question-template-infer.test.ts", "shared-utils.test.ts",
  "subscription-realtime.test.tsx", "candidate-subscription-context.test.tsx",
];

const modules = [...require("./tc-data-1"), ...require("./tc-data-2"), ...require("./tc-data-3"), ...require("./tc-data-4")];

// ---------- 1. Match every functional test case to exactly one passed Vitest result ----------
const results = require(path.resolve(resultsFile));
const all = [];
for (const tr of results.testResults) {
  const file = tr.name.replace(/\\/g, "/").split("/").pop();
  for (const a of tr.assertionResults) all.push({ file, title: a.title, status: a.status, used: 0 });
}
// pytest JUnit XML (RAG_IQGS): testcase name + file, outcome passed / failed / skipped.
const pyTests = [];
if (PYTEST_FILE) {
  const dec = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const xmlText = require("fs").readFileSync(PYTEST_FILE, "utf8");
  for (const tc of xmlText.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const attrs = Object.fromEntries([...tc[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], dec(a[2])]));
    const inner = tc[3] || "";
    const status = /<(failure|error)\b/.test(inner) ? "failed" : /<skipped\b/.test(inner) ? "skipped" : "passed";
    pyTests.push({ file: "tests/" + attrs.classname.split(".").pop() + ".py", title: attrs.name, status, used: 0 });
  }
}
const errors = [];
let passedCount = 0;
for (const m of modules) {
  for (const f of m.functions) {
    for (const c of f.cases) {
      if (m.pending) { c.status = "Pending"; continue; }
      if (m.source === "pytest") {
        const hits = pyTests.filter((t) => t.file === c.file && t.title === c.key);
        if (hits.length !== 1) { errors.push(`pytest ${c.file} ${c.key}: ${hits.length} matches`); continue; }
        hits[0].used++;
        c.status = hits[0].status === "passed" ? "Passed" : hits[0].status === "failed" ? "Failed" : "Pending";
        if (c.status === "Passed") passedCount++;
        continue;
      }
      const hits = all.filter((t) => t.file === c.file && (t.title === c.key || t.title.startsWith(c.key + ":")));
      if (hits.length !== 1) { errors.push(`${c.file} ${c.key}: ${hits.length} matches`); continue; }
      hits[0].used++;
      if (hits[0].status !== "passed") errors.push(`${c.file} ${c.key}: status ${hits[0].status}`);
      c.status = hits[0].status === "passed" ? "Passed" : "Failed";
      c.title = hits[0].title;
      if (c.status === "Passed") passedCount++;
    }
  }
}
const uncovered = all.filter((t) => !UNIT_ONLY_FILES.includes(t.file) && t.used === 0);
for (const t of uncovered) errors.push(`not covered: ${t.file} :: ${t.title}`);
for (const t of all.filter((x) => x.used > 1)) errors.push(`covered twice: ${t.file} :: ${t.title}`);
for (const t of pyTests.filter((x) => x.used !== 1)) errors.push(`pytest used ${t.used}x: ${t.file} :: ${t.title}`);
if (modules.some((m) => m.source === "pytest") && !pyTests.length) errors.push("pytest module present but no --pytest results given");
const unitOnly = all.filter((t) => UNIT_ONLY_FILES.includes(t.file)).length;
const total = modules.reduce((s, m) => s + m.functions.reduce((s2, f) => s2 + f.cases.length, 0), 0);
console.log(`vitest tests=${all.length} (passed ${all.filter((t) => t.status === "passed").length}); functional TCs=${total}; matched passed=${passedCount}; unit-only tests=${unitOnly}`);
if (errors.length) { console.error("MATCH ERRORS:\n  " + errors.join("\n  ")); process.exit(1); }
if (CHECK_ONLY) process.exit(0);

// ---------- 2. Build workbook ----------
const clone = (o) => JSON.parse(JSON.stringify(o));
const letters = "ABCDEFGHIJKLMNOP";
function estHeight(texts, widths, base = 15) {
  let lines = 1;
  texts.forEach((t, i) => {
    if (!t) return;
    const perLine = Math.max(8, Math.floor(widths[i] * 1.15));
    const n = String(t).split("\n").reduce((s, p) => s + Math.max(1, Math.ceil(p.length / perLine)), 0);
    lines = Math.max(lines, n);
  });
  return Math.max(base + 3, lines * base + 4);
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SAMPLE);
  const tplMod = wb.getWorksheet("Space & Listing Management");

  // Snapshot template module-sheet styles before removing the sample module sheets.
  const tpl = { widths: tplMod.columns.slice(0, 16).map((c) => c.width), rows: {}, heights: {} };
  for (const r of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    tpl.heights[r] = tplMod.getRow(r).height;
    tpl.rows[r] = [];
    for (let c = 1; c <= 15; c++) tpl.rows[r][c] = { style: clone(tplMod.getCell(r, c).style), value: tplMod.getCell(r, c).value };
  }
  const sampleModuleSheets = wb.worksheets.slice(3).map((w) => w.id);
  for (const id of sampleModuleSheets) wb.removeWorksheet(id);

  // ---- Cover ----
  const cover = wb.getWorksheet("Cover");
  cover.getCell("B4").value = PROJECT_NAME;
  cover.getCell("F4").value = CREATOR;
  cover.getCell("B5").value = PROJECT_CODE;
  cover.getCell("F5").value = RUN_DATE;
  cover.getCell("B6").value = { formula: `B5&"_"&"Test Report"&"_"&"${VERSION}"`, result: `${PROJECT_CODE}_Test Report_${VERSION}` };
  cover.getCell("F6").value = VERSION;
  const history = [
    ["10/08/2026", "v1.0", "Test report", "A", "Created the automated test report: one sheet per Vitest test file for Authentication, Studio, Question Builder, UI and shared utilities.", ""],
    ["16/08/2026", "v2.0", "Test report", "A", "Added sheets for the Admin, HR, Candidate, Subscription and Gamification test files.", ""],
    ["17/08/2026", "v3.0", "Sync", "M", "Synced test counts with the live suite (ForgotResetPassword 8->10, StudioFlow 14->15, StudioSourcesPanel 8->9, HistoryPublishedSet 2->3); total 535.", ""],
    ["10/09/2026", "v4.0", "Sync", "M, D", "Removed stale test cases for code paths the app no longer reaches (StudioCtaStates, StudioSampleJd, StudioFlow).", ""],
    ["12/09/2026", "v5.0", "Sync", "M", "Updated the ErrorInterceptor sheet after the 10/09/2026 merge (RGA011-1 no longer a finding).", "error.interceptor.ts"],
    ["13/09/2026", "v6.0", "Sync", "M, D", "Synced with the reduced Vitest suite: 529 -> 470 test cases in 62 files.", "tests/unit"],
    ["15/09/2026", "v7.0", "Test report format", "M",
      "Rebuilt in the Test Case Report template: 10 business-module sheets with 327 functional test cases (numbered steps, expected results, pre-conditions, tester and rounds). Round 1 results come from the 15/09/2026 run (470/470 automated tests passed). The 18 RAG Service API cases were moved here from the Unit Test workbook as Pending. Logic-only tests stay in the Unit Test workbook.",
      "Report5_TestDocumentation.docx; SU26SE102-GSU26SE52_QA_TestCases.xlsx"],
  ];
  const rag = modules.find((m) => m.source === "pytest");
  if (rag) {
    const ragCases = rag.functions.flatMap((f) => f.cases);
    const ragPassed = ragCases.filter((c) => c.status === "Passed").length;
    history.push([RAG_RUN_DATE, "v7.1", "RAG Service API", "M",
      `Replaced the 18 Pending RAG Service API scenarios with the ${ragCases.length} pytest API test cases of the RAG_IQGS repository (commit 145f796), executed on ${RAG_RUN_DATE} against a live local Ollama (gemma3:4b, nomic-embed-text) with an isolated ChromaDB: ${ragPassed} Passed, ${ragCases.length - ragPassed} not passed. Total functional test cases: ${total}.`,
      "RAG_IQGS/tests/test_e2e_api.py; RAG_IQGS/tests/test_ollama_integration.py"]);
  }
  history.push(["19/09/2026", "v7.2", "Sync", "M",
    "Re-executed the frontend suite after the AI Coach workflow, candidate roadmap and knowledge-folder import changes: 470/470 Vitest test cases passed in 62 files (unchanged totals). Six test files needed updating for the new code (next/navigation now supplies useSearchParams to the practice and feedback screens; the admin knowledge service gained folder and document-type functions; the HR upload callback gained adminNote/folder arguments). Corrected AKB-1, AKB-2 (the Admin knowledge page now opens on a folder browser) and APLAN-3 (plan-limit save message reworded). Round 1 dates for the RAG Service API module stay on " + RAG_RUN_DATE + " because that service was not changed and its pytest run was not repeated.",
    "tests/unit/admin-knowledge.test.tsx; admin-plans.test.tsx; candidate-forbidden.test.tsx; feedback-result-client.test.tsx; hr-knowledge.test.tsx; practice-session.test.tsx"]);
  history.push([RUN_DATE, VERSION, "Sync", "M",
    "Re-executed the frontend suite after the AI Configuration page was rebuilt as read-only and the Jobs board, public JD and hiring assessment mode feature was merged: 466/466 Vitest test cases passed in 62 files (-4 from the AI Configuration module, which lost its editable save form; see F8 in the Administration sheet). Ten test files needed updating: admin-ai-config.test.tsx was rewritten from 5 to 1 test case for the new read-only page; a shared HR subscription test fixture (studio-test-utils.tsx) was missing a canExport field that let a Free-plan test silently pass with Premium-level export access; candidate-dashboard.test.tsx and admin-marketplace.test.tsx were missing fields required by their updated types (caught by a separate tsc --noEmit pass, not by Vitest); register-jobseeker.test.tsx asserted hardcoded Vietnamese validation text now sourced from the i18n dictionary in English by default; and admin-companies.test.tsx, admin-platform-settings.test.tsx, hr-knowledge.test.tsx, premium-revoked-dialog.test.tsx and question-builder.test.tsx asserted other stale or superseded UI text. Total functional test cases: " + total + " (Administration module 47->43). Round 1 dates for the RAG Service API module stay on " + RAG_RUN_DATE + " because that service was not changed and its pytest run was not repeated.",
    "tests/unit/admin-ai-config.test.tsx; admin-companies.test.tsx; admin-marketplace.test.tsx; admin-platform-settings.test.tsx; candidate-dashboard.test.tsx; hr-knowledge.test.tsx; premium-revoked-dialog.test.tsx; question-builder.test.tsx; register-jobseeker.test.tsx; studio-test-utils.tsx"]);
  const coverRowStyle = [1, 2, 3, 4, 5, 6].map((c) => clone(cover.getCell(11, c).style));
  for (let r = 11; r <= 40; r++) for (let c = 1; c <= 6; c++) cover.getCell(r, c).value = null;
  history.forEach((h, i) => {
    const r = 11 + i;
    h.forEach((v, j) => { const cell = cover.getCell(r, j + 1); cell.value = v; cell.style = clone(coverRowStyle[j]); cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: "top" }; });
    cover.getRow(r).height = estHeight(h, [28, 10, 14, 34, 38, 48], 13);
  });

  // ---- Module sheets ----
  const W = tpl.widths;
  const functionIndex = [];
  modules.forEach((m, mi) => {
    const ws = wb.addWorksheet(m.sheet, { views: [{ state: "frozen", xSplit: 0, ySplit: 10, topLeftCell: "A11", activeCell: "A11", zoomScale: 100 }] });
    W.forEach((w, i) => { if (w) ws.getColumn(i + 1).width = w; });
    for (const r of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (let c = 1; c <= 15; c++) {
        const t = tpl.rows[r][c];
        const cell = ws.getCell(r, c);
        cell.style = clone(t.style);
        if (r === 5 || r === 10 || (c === 1 && r >= 2 && r <= 8)) {
          const v = t.value;
          cell.value = v && typeof v === "object" && v.richText ? v.richText.map((x) => x.text).join("") : v;
        }
      }
      if (tpl.heights[r]) ws.getRow(r).height = tpl.heights[r];
    }
    ws.mergeCells("B2:E2"); ws.mergeCells("B3:E3"); ws.mergeCells("B4:E4");
    ws.getCell("B2").value = m.feature;
    ws.getCell("B3").value = m.requirement;
    ws.getRow(3).height = estHeight([m.requirement], [W[1] + W[2] + W[3] + W[4]], 13);
    ws.getCell("B4").value = { formula: `COUNTA(F11:F${LAST_ROW})` };
    [["6", "F"], ["7", "I"], ["8", "L"]].forEach(([r, col]) => {
      ["B", "C", "D", "E"].forEach((c) => { ws.getCell(c + r).value = { formula: `COUNTIF($${col}$11:$${col}$${LAST_ROW},${c}$5)` }; });
    });

    let r = 11;
    let n = 0;
    m.functions.forEach((f, fi) => {
      const label = `Function ${letters[fi]} - ${f.name}`;
      functionIndex.push({ label, sheet: m.sheet, desc: f.desc, pre: f.pre });
      for (let c = 1; c <= 15; c++) ws.getCell(r, c).style = clone(tpl.rows[11][c].style);
      ws.getCell(r, 1).value = label;
      ws.mergeCells(r, 1, r, 15);
      ws.getRow(r).height = 20;
      r++;
      f.cases.forEach((c) => {
        n++;
        const id = `F${mi + 1}-${String(n).padStart(2, "0")}`;
        const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
        const pre = [f.pre, c.pre].filter(Boolean).join("\n");
        const note = m.pending
          ? m.note.replace("%s", c.key)
          : m.source === "pytest"
            ? `Automated (pytest): RAG_IQGS/${c.file} > ${c.key}`
            : `Automated: tests/unit/${c.file} > ${c.key}`;
        const passed = c.status === "Passed" || c.status === "Failed";
        const caseDate = m.source === "pytest" ? RAG_RUN_DATE : RUN_DATE;
        const vals = [id, c.desc, steps, c.exp, pre, c.status, passed ? caseDate : "", passed ? TESTER : "", "N/A", "", "", "N/A", "", "", note];
        vals.forEach((v, i) => {
          const cell = ws.getCell(r, i + 1);
          cell.style = clone(tpl.rows[12][i + 1].style);
          cell.value = v;
          cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: "top" };
        });
        ws.getRow(r).height = estHeight([c.desc, steps, c.exp, pre, "", "", "", "", "", "", "", "", "", "", note], W.slice(0, 15), 15);
        c.id = id;
        r++;
      });
    });
    for (const col of ["F", "I", "L"]) {
      ws.dataValidations.add(`${col}11:${col}${r - 1}`, { type: "list", allowBlank: true, formulae: ['"Passed,Failed,Pending,N/A"'], showErrorMessage: true });
    }
    m.lastRow = r - 1;
    m.count = n;
  });

  // ---- Test Cases (index) ----
  const tc = wb.getWorksheet("Test Cases");
  tc.getCell("D3").value = PROJECT_NAME;
  tc.getCell("D4").value = PROJECT_CODE;
  tc.getCell("D5").value =
    "1. Frontend: Next.js 16 / React 19 web application (branch khoa-docs-local), Node.js 24.\n" +
    "2. Execution: automated component tests with Vitest 4.1 + React Testing Library 16.3 + user-event on jsdom 29; each page/component is rendered in isolation.\n" +
    "3. Backend responses (success, 4xx/5xx errors, empty data) are simulated by mocking the frontend service modules, so each pre-condition that names an API response is reproduced deterministically.\n" +
    "4. Command: npx vitest run (15/09/2026: 62 files, 470 tests, all passed).\n" +
    "5. RAG Service API: pytest 9.1 with FastAPI TestClient on the RAG_IQGS app (Python 3.14), live local Ollama (gemma3:4b, nomic-embed-text), temporary ChromaDB and data folder - command: python -m pytest tests (15/09/2026).";
  tc.getRow(5).height = 110;
  const idxStyle = [2, 3, 4, 5, 6].map((c) => clone(tc.getCell(9, c).style));
  for (let rr = 9; rr <= 60; rr++) for (let c = 2; c <= 6; c++) { tc.getCell(rr, c).value = null; }
  functionIndex.forEach((fn, i) => {
    const rr = 9 + i;
    const vals = [i + 1, fn.label, { text: fn.sheet, hyperlink: `#'${fn.sheet}'!A1` }, fn.desc, fn.pre];
    vals.forEach((v, j) => {
      const cell = tc.getCell(rr, j + 2);
      cell.style = clone(idxStyle[j]);
      cell.value = v;
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: "top" };
    });
    tc.getRow(rr).height = estHeight(["", fn.label, fn.sheet, fn.desc, fn.pre], [11.88, 26.5, 25.88, 48.25, 30.63], 13);
  });
  for (let rr = 9 + functionIndex.length; rr <= 60; rr++) for (let c = 2; c <= 6; c++) tc.getCell(rr, c).style = {};

  // ---- Test Statistics ----
  const st = wb.getWorksheet("Test Statistics");
  st.getCell("C3").value = PROJECT_NAME;
  st.getCell("G3").value = CREATOR;
  st.getCell("C4").value = PROJECT_CODE;
  st.getCell("G4").value = "";
  st.getCell("C5").value = { formula: `C4&"_"&"Test Report"&"_"&"${VERSION}"`, result: `${PROJECT_CODE}_Test Report_${VERSION}` };
  st.getCell("G5").value = RUN_DATE;
  st.getCell("C6").value =
    `Release includes ${modules.length} modules: ` + modules.map((m) => m.sheet).join(", ") +
    `. Round 1 executed by ${TESTER} on ${RUN_DATE} for the frontend modules (Vitest) and on ${RAG_RUN_DATE} for the RAG Service API module (pytest against a live local Ollama); Rounds 2 and 3 were not run (N/A).`;
  st.getCell("C6").alignment = { wrapText: true, vertical: "top" };
  st.getRow(6).height = 45;
  if (modules.length !== 10) throw new Error("Statistics template has exactly 10 module rows; got " + modules.length);
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  modules.forEach((m, i) => {
    const rr = 11 + i;
    st.getCell(rr, 2).value = i + 1;
    st.getCell(rr, 3).value = m.sheet;
    st.getCell(rr, 4).value = { formula: `${q(m.sheet)}!B6` };
    st.getCell(rr, 5).value = { formula: `${q(m.sheet)}!C6` };
    st.getCell(rr, 6).value = { formula: `${q(m.sheet)}!D6` };
    st.getCell(rr, 7).value = { formula: `${q(m.sheet)}!E6` };
    st.getCell(rr, 8).value = { formula: `${q(m.sheet)}!B4` };
  });
  for (const [col, L] of [[4, "D"], [5, "E"], [6, "F"], [7, "G"], [8, "H"]]) st.getCell(21, col).value = { formula: `SUM(${L}11:${L}20)` };
  st.getCell("E23").value = { formula: "(D21+E21)*100/(H21-G21)" };
  st.getCell("E24").value = { formula: "D21*100/(H21-G21)" };
  st.getCell("E23").numFmt = "0.00";
  st.getCell("E24").numFmt = "0.00";

  // Normalize font family site-wide. The capstone sample template mixes Tahoma (headers,
  // labels, chrome) with Calibri (data rows, cloned from the template's own row 12) - same
  // family everywhere reads as one consistent document instead of two different templates.
  wb.worksheets.forEach((ws) => ws.eachRow((row) => row.eachCell((cell) => {
    if (cell.font && cell.font.name && cell.font.name !== "Tahoma") {
      cell.font = { ...cell.font, name: "Tahoma" };
    }
  })));

  wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true };
  wb.creator = CREATOR;
  await wb.xlsx.writeFile(outFile);
  const summary = modules.map((m) => `${m.sheet}: ${m.count}`).join("; ");
  console.log("written", outFile, "|", summary);
})();
