// Builds docs/qa/SU26SE102-GSU26SE52_QA_TestCases.xlsx in the capstone "Unit Test" template
// (styling from docs/qa/Report5mau/Report5_Unit Test(mau).xlsx), from executed tests only.
// Usage: node build-unit-workbook.js <vitest.json> <be-trx.json> <out.xlsx> [--check]
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const FE_ROOT = require("path").resolve(__dirname, "../../..") + "/";
const BE_ROOT = "C:/FPT/SEP490/BE_repo_check/";
const SAMPLE = FE_ROOT + "docs/qa/Report5mau/Report5_Unit Test(mau).xlsx";
const CURRENT = "C:/tmp/qa-backup-0915/SU26SE102-GSU26SE52_QA_TestCases.xlsx";
const [feFile, beFile, outFile] = process.argv.slice(2);
const CHECK_ONLY = process.argv.includes("--check");

const RUN_DATE = "15/09/2026";
const EXECUTOR = "Hoàng Đăng Khoa";
const CREATOR = "NamNM";
const VERSION = "0.3.0";
const PROJECT_NAME = "IQGS: AI-Powered Interview Question Generation System Using RAG and LLM (A Dual-Sided Platform for HR and Job Seekers)";
const PROJECT_CODE = "SU26SE102";
const NORM_PER_KLOC = 100;
const MAX_UTCID = 15; // template columns F..T
const UNIT_ONLY_FILES = [
  "auth-interceptor.test.ts", "candidate-and-admin-utils.test.ts", "error-interceptor.test.ts",
  "gamification-and-history-utils.test.ts", "permissions-and-citations.test.ts",
  "question-template-infer.test.ts", "shared-utils.test.ts",
  "subscription-realtime.test.tsx", "candidate-subscription-context.test.tsx",
];

const sheetsData = [...require("./unit-data-fe"), ...require("./unit-data-be")];

// ---------- 1. match every UTCID to exactly one executed test ----------
const fe = require(path.resolve(feFile));
const feTests = [];
for (const tr of fe.testResults) {
  const file = tr.name.replace(/\\/g, "/").split("/").pop();
  if (!UNIT_ONLY_FILES.includes(file)) continue;
  for (const a of tr.assertionResults) feTests.push({ file, title: a.title, status: a.status, used: 0 });
}
const beTests = require(path.resolve(beFile)).map((t) => ({
  key: t.name.replace(/^ApplicationLayer\.UnitTests\.\w+\./, ""), status: t.outcome === "Passed" ? "passed" : t.outcome, used: 0,
}));
const errors = [];
for (const s of sheetsData) {
  if (s.cases.length > MAX_UTCID) errors.push(`${s.sheet}: ${s.cases.length} UTCIDs > ${MAX_UTCID}`);
  if (s.sheet.length > 31) errors.push(`${s.sheet}: sheet name too long`);
  s.results = s.cases.map(([key, , , , , fileOverride]) => {
    let hits;
    if (s.side === "FE") {
      const file = fileOverride || s.file;
      hits = feTests.filter((t) => t.file === file && (t.title === key || t.title.startsWith(key + ":")));
    } else {
      hits = beTests.filter((t) => t.key === key);
    }
    if (hits.length !== 1) { errors.push(`${s.sheet} :: ${key} -> ${hits.length} matches`); return "F"; }
    hits[0].used++;
    return hits[0].status === "passed" ? "P" : "F";
  });
}
for (const t of feTests.filter((x) => x.used !== 1)) errors.push(`FE used ${t.used}x: ${t.file} :: ${t.title}`);
for (const t of beTests.filter((x) => x.used !== 1)) errors.push(`BE used ${t.used}x: ${t.key}`);
const nCases = sheetsData.reduce((a, s) => a + s.cases.length, 0);
console.log(`sheets=${sheetsData.length} UTCIDs=${nCases} (FE tests ${feTests.length}, BE tests ${beTests.length}); failed results=${sheetsData.reduce((a, s) => a + s.results.filter((r) => r !== "P").length, 0)}`);
if (errors.length) { console.error("ERRORS:\n  " + errors.join("\n  ")); process.exit(1); }

// ---------- 2. lines of code of the functions under test ----------
function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "bin", "obj", ".git", ".next"].includes(e.name) || /UnitTests|IntegrationTests/.test(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const feSrc = walk(FE_ROOT + "src", [".ts", ".tsx"]).map((p) => ({ p, lines: fs.readFileSync(p, "utf8").split(/\r?\n/) }));
const beSrc = [...walk(BE_ROOT + "ApplicationLayer", [".cs"]), ...walk(BE_ROOT + "DomainLayer", [".cs"])].map((p) => ({ p, lines: fs.readFileSync(p, "utf8").split(/\r?\n/) }));

function blockEnd(lines, start) {
  let depth = 0, seen = false;
  for (let i = start; i < lines.length; i++) {
    const code = lines[i].replace(/\/\/.*$/, "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
    for (const ch of code) { if (ch === "{") { depth++; seen = true; } else if (ch === "}") depth--; }
    if (seen && depth <= 0) return i;
    if (!seen && /;\s*$/.test(code)) return i;
  }
  return lines.length - 1;
}
const isCode = (l) => { const t = l.trim(); return t && !/^(\/\/|\/\*|\*|\*\/)/.test(t); };
const countLoc = (lines, a, b) => lines.slice(a, b + 1).filter(isCode).length;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function locFor(sheet) {
  let total = 0;
  const where = new Set();
  for (const sym of sheet.src) {
    if (sheet.side === "FE") {
      const re = new RegExp(`(function\\s+${esc(sym)}\\b|(const|let)\\s+${esc(sym)}\\s*[=:])`);
      const allowed = sheet.className.split("/").map((x) => x.trim());
      let found = false;
      for (const f of feSrc.filter((x) => allowed.includes(path.basename(x.p)))) {
        const i = f.lines.findIndex((l) => re.test(l) && !/^\s*(\/\/|\*)/.test(l));
        if (i >= 0) { total += countLoc(f.lines, i, blockEnd(f.lines, i)); where.add(path.basename(f.p)); found = true; break; }
      }
      if (!found) throw new Error(`FE symbol not found: ${sym} (${sheet.sheet})`);
    } else {
      const [cls, method] = sym.split(".");
      const classRe = new RegExp(`\\b(class|record|struct)\\s+${esc(cls)}\\b`);
      const f = beSrc.find((x) => x.lines.some((l) => classRe.test(l)));
      if (!f) throw new Error(`BE class not found: ${cls} (${sheet.sheet})`);
      where.add(path.basename(f.p));
      const ci = f.lines.findIndex((l) => classRe.test(l));
      const cEnd = blockEnd(f.lines, ci);
      if (!method) { total += countLoc(f.lines, ci, cEnd); continue; }
      const mRe = new RegExp(`\\b(public|private|internal|protected|static)\\b.*\\b${esc(method)}\\s*(<[^>]*>)?\\s*\\(`);
      let hit = 0;
      for (let i = ci + 1; i <= cEnd; i++) {
        if (mRe.test(f.lines[i]) && !/^\s*(\/\/|\*)/.test(f.lines[i])) { const e = blockEnd(f.lines, i); total += countLoc(f.lines, i, e); i = e; hit++; }
      }
      if (!hit) throw new Error(`BE method not found: ${sym} (${sheet.sheet})`);
    }
  }
  sheet.loc = total;
  sheet.srcFiles = [...where].join(", ");
}
sheetsData.forEach(locFor);
for (const s of sheetsData) {
  const lack = Math.round((s.loc * NORM_PER_KLOC) / 1000 - s.cases.length);
  console.log(`  ${s.code.padEnd(11)} ${s.sheet.padEnd(30)} UTCID=${String(s.cases.length).padStart(2)} LOC=${String(s.loc).padStart(4)} lack=${lack}  [${s.srcFiles}]`);
}
if (CHECK_ONLY) process.exit(0);

// ---------- 3. workbook ----------
const clone = (o) => JSON.parse(JSON.stringify(o || {}));
const COLS = "ABCDEFGHIJKLMNOPQRSTUV";
const col = (i) => COLS[i - 1];
const lines = (text, width) => String(text || "").split("\n").reduce((a, p) => a + Math.max(1, Math.ceil(p.length / Math.max(8, width))), 0);

function serialToDate(v) {
  if (typeof v === "number") { const d = new Date(Math.round((v - 25569) * 86400000)); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; }
  if (v instanceof Date) return `${String(v.getUTCDate()).padStart(2, "0")}/${String(v.getUTCMonth() + 1).padStart(2, "0")}/${v.getUTCFullYear()}`;
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || "");
}
const txt = (v) => (v == null ? "" : typeof v === "object" ? (v.richText ? v.richText.map((t) => t.text).join("") : v.text || v.result || "") : String(v));

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SAMPLE);
  const cur = new ExcelJS.Workbook();
  await cur.xlsx.readFile(CURRENT);

  // --- snapshot template function-sheet styles ---
  const tf = wb.getWorksheet("Auth-Login");
  const snap = {};
  for (const r of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 31, 32, 39, 40, 41, 42]) {
    snap[r] = { h: tf.getRow(r).height, c: [] };
    for (let c = 1; c <= 22; c++) snap[r].c[c] = clone(tf.getCell(r, c).style);
  }
  const widths = tf.columns.slice(0, 22).map((c) => c.width);
  const fnSheet = wb.getWorksheet("Functions");
  const fnRowStyle = [];
  for (let c = 1; c <= 8; c++) fnRowStyle[c] = clone(fnSheet.getCell(11, c).style);
  const st = wb.getWorksheet("Statistics");
  const stRow = [], stSub = [], stCov = {};
  for (let c = 1; c <= 9; c++) { stRow[c] = clone(st.getCell(12, c).style); stSub[c] = clone(st.getCell(40, c).style); }
  for (const r of [42, 43, 44, 45, 46]) { stCov[r] = []; for (let c = 1; c <= 6; c++) stCov[r][c] = clone(st.getCell(r, c).style); }
  const keep = ["Guideline", "Cover", "Functions", "Statistics"];
  for (const w of wb.worksheets.filter((w) => !keep.includes(w.name))) wb.removeWorksheet(w.id);

  // --- Cover ---
  const cover = wb.getWorksheet("Cover");
  cover.getCell("B2").value = "UNIT TEST DOCUMENT";
  cover.getCell("B4").value = PROJECT_NAME;
  cover.getCell("F4").value = CREATOR;
  cover.getCell("B5").value = PROJECT_CODE;
  cover.getCell("F5").value = RUN_DATE;
  cover.getCell("B6").value = { formula: `B5&"_"&"Unit Test Report"&"_"&"v${VERSION}"`, result: `${PROJECT_CODE}_Unit Test Report_v${VERSION}` };
  cover.getCell("F6").value = VERSION;
  const oldCover = cur.getWorksheet("Cover");
  const history = [];
  for (let r = 11; r <= 40; r++) {
    const b = txt(oldCover.getCell(r, 2).value);
    if (!b) continue;
    history.push([serialToDate(oldCover.getCell(r, 1).value), b, txt(oldCover.getCell(r, 3).value), txt(oldCover.getCell(r, 4).value), txt(oldCover.getCell(r, 5).value), txt(oldCover.getCell(r, 6).value)]);
  }
  const feCount = sheetsData.filter((s) => s.side === "FE");
  const beCount = sheetsData.filter((s) => s.side === "BE");
  const feUt = feCount.reduce((a, s) => a + s.cases.length, 0);
  const beUt = beCount.reduce((a, s) => a + s.cases.length, 0);
  history.push([RUN_DATE, VERSION, "Unit test workbook", "A, M, D",
    `Rebuilt from executed tests only: ${feCount.length} frontend functions (${feUt} test cases, Vitest run ${RUN_DATE}) and ${beCount.length} backend application-layer functions (${beUt} test cases, xUnit run ${RUN_DATE}); every UTCID is a real test with its result and executed date. Restored the template header rows (Function Code/Name, Created By, Executed By, Lines of code, Lack of test cases, COUNTIF counters). The previous scenario sheets were replaced: UI scenarios are now functional test cases in Report5_Test_Report.xlsx, scenarios without a current automated test were removed, and the 18 RAG Service API scenarios moved to Report5_Test_Report.xlsx (Pending).`,
    "Report5_Test_Report.xlsx; tests/unit; ApplicationLayer.UnitTests"]);
  const coverStyle = []; for (let c = 1; c <= 6; c++) coverStyle[c] = clone(cover.getCell(11, c).style);
  for (let r = 11; r <= 30; r++) for (let c = 1; c <= 6; c++) cover.getCell(r, c).value = null;
  history.forEach((h, i) => {
    const r = 11 + i;
    h.forEach((v, j) => { const cell = cover.getCell(r, j + 1); cell.style = clone(coverStyle[j + 1]); cell.value = v; cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: "top" }; });
    cover.getRow(r).height = Math.max(26, Math.max(lines(h[4], 40), lines(h[5], 50), lines(h[2], 16)) * 12 + 4);
  });

  // --- Functions ---
  fnSheet.getCell("E4").value = { formula: "Cover!B4" };
  fnSheet.getCell("E5").value = { formula: "Cover!B5" };
  fnSheet.getCell("E6").value = NORM_PER_KLOC;
  fnSheet.getCell("E7").value =
    "1. Server: not required - all tests run locally (Windows 11 developer machine).\n" +
    "2. Frontend unit tests: Node.js 24, Vitest 4.1 with jsdom 29 - command: npx vitest run (logic-only test files).\n" +
    "3. Backend unit tests: .NET SDK 10.0.303, test project ApplicationLayer.UnitTests (net8.0, xUnit 2.9.2) - command: dotnet test ApplicationLayer.UnitTests.\n" +
    "4. Database: not required - repositories and usage metering are replaced by in-memory fakes.\n" +
    "5. Web browser: not required.";
  fnSheet.getRow(7).height = 80;
  for (let r = 11; r <= 80; r++) for (let c = 1; c <= 8; c++) { const cell = fnSheet.getCell(r, c); cell.value = null; cell.style = {}; }
  sheetsData.forEach((s, i) => {
    const r = 11 + i;
    s.fnRow = r;
    const vals = [i + 1, s.req, s.className, s.functionName, s.code, { text: s.sheet, hyperlink: `#'${s.sheet}'!A1` }, s.desc, s.pre.join("; ")];
    vals.forEach((v, j) => { const cell = fnSheet.getCell(r, j + 1); cell.style = clone(fnRowStyle[j + 1]); cell.value = v; cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: "top" }; });
    fnSheet.getRow(r).height = Math.max(14, Math.max(lines(s.desc, 70), lines(s.pre.join("; "), 85), lines(s.functionName, 42), lines(s.className, 18)) * 12 + 3);
  });

  // --- Function sheets ---
  const PASS_OFF = 0;
  for (const s of sheetsData) {
    const ws = wb.addWorksheet(s.sheet, { views: [{ state: "frozen", xSplit: 0, ySplit: 9, topLeftCell: "A10", activeCell: "F10", zoomScale: 100 }] });
    widths.forEach((w, i) => { if (w) ws.getColumn(i + 1).width = w; });
    const put = (r, tplRow) => { for (let c = 1; c <= 22; c++) ws.getCell(r, c).style = clone(snap[tplRow].c[c]); if (snap[tplRow].h) ws.getRow(r).height = snap[tplRow].h; };
    for (const r of [1, 2, 3, 4, 5, 6, 7, 8, 9]) put(r, r);
    const n = s.cases.length;
    const lastCol = col(5 + n);

    // Build condition / confirmation rows (identical labels share one row).
    const groups = { cond: [], conf: [] };
    const addItem = (list, title, label, idx) => {
      let g = list.find((x) => x.title === title);
      if (!g) { g = { title, items: [] }; list.push(g); }
      let it = g.items.find((x) => x.label === label);
      if (!it) { it = { label, marks: new Set() }; g.items.push(it); }
      if (idx === "all") for (let k = 0; k < n; k++) it.marks.add(k); else it.marks.add(idx);
    };
    for (const p of s.pre) addItem(groups.cond, "Precondition", p, "all");
    s.cases.forEach(([, cond, conf, , grp], k) => {
      addItem(groups.cond, "Input", cond, k);
      addItem(groups.conf, grp === "E" ? "Exception" : "Return", conf, k);
    });
    groups.conf.sort((a, b) => (a.title === "Return" ? -1 : 1) - (b.title === "Return" ? -1 : 1));

    let r = 10;
    const writeBlock = (label, list, tplHead, tplItem) => {
      let first = true;
      for (const g of list) {
        put(r, tplHead);
        if (first) { ws.getCell(r, 1).value = label; first = false; }
        ws.getCell(r, 2).value = g.title;
        ws.getRow(r).height = 13.5;
        r++;
        for (const it of g.items) {
          put(r, tplItem);
          ws.mergeCells(r, 2, r, 4);
          const cell = ws.getCell(r, 2);
          cell.value = it.label;
          cell.font = { ...(snap[tplItem].c[4].font || {}), bold: false };
          cell.alignment = { horizontal: "left", vertical: "top", wrapText: true, indent: 1 };
          for (let k = 0; k < n; k++) if (it.marks.has(k)) ws.getCell(r, 6 + k).value = "O";
          ws.getRow(r).height = Math.max(13.5, lines(it.label, 100) * 11 + 3);
          r++;
        }
      }
    };
    writeBlock("Condition", groups.cond, 10, 11);
    writeBlock("Confirm", groups.conf, 31, 32);
    const rType = r, rPF = r + 1, rDate = r + 2, rDef = r + 3;
    [[rType, 39, "Type(N : Normal, A : Abnormal, B : Boundary)"], [rPF, 40, "Passed/Failed"], [rDate, 41, "Executed Date"], [rDef, 42, "Defect ID"]].forEach(([row, tpl, label], i) => {
      put(row, tpl);
      if (i === 0) ws.getCell(row, 1).value = "Result";
      ws.mergeCells(row, 2, row, 4);
      ws.getCell(row, 2).value = label;
    });
    s.cases.forEach(([, , , type], k) => {
      ws.getCell(rType, 6 + k).value = type;
      ws.getCell(rPF, 6 + k).value = s.results[k];
      ws.getCell(rDate, 6 + k).value = RUN_DATE;
    });
    ws.getRow(rDate).height = 105;
    ws.getRow(rDef).height = 20;

    // Header rows 2-7 and UTCID row 9.
    const merges = ["A2:B2", "C2:E2", "F2:K2", "L2:T2", "A3:B3", "C3:E3", "F3:K3", "L3:T3", "A4:B4", "C4:E4", "F4:K4", "L4:T4", "A5:B5", "C5:T5", "A6:B6", "C6:E6", "F6:K6", "L6:N6", "O6:T6", "A7:B7", "C7:E7", "F7:K7", "O7:T7"];
    merges.forEach((m) => ws.mergeCells(m));
    ws.getCell("A2").value = "Function Code";
    ws.getCell("C2").value = { formula: `Functions!E${s.fnRow}`, result: s.code };
    ws.getCell("F2").value = "Function Name";
    ws.getCell("L2").value = { formula: `Functions!D${s.fnRow}`, result: s.functionName };
    ws.getCell("A3").value = "Created By";
    ws.getCell("C3").value = s.createdBy;
    ws.getCell("F3").value = "Executed By";
    ws.getCell("L3").value = EXECUTOR;
    ws.getCell("A4").value = "Lines  of code";
    ws.getCell("C4").value = s.loc;
    ws.getCell("F4").value = "Lack of test cases";
    ws.getCell("L4").value = { formula: `IF(Functions!E6<>"N/A",SUM(C4*Functions!E6/1000,-O7),"N/A")` };
    ws.getCell("A5").value = "Test requirement";
    ws.getCell("C5").value = s.desc;
    ws.getCell("C5").alignment = { horizontal: "left", vertical: "top", wrapText: true };
    ws.getRow(5).height = Math.max(13.5, lines(s.desc, 150) * 11 + 3);
    ws.getCell("A6").value = "Passed";
    ws.getCell("C6").value = "Failed";
    ws.getCell("F6").value = "Untested";
    ws.getCell("L6").value = "N/A/B";
    ws.getCell("O6").value = "Total Test Cases";
    ws.getCell("A7").value = { formula: `COUNTIF(F${rPF}:T${rPF},"P")` };
    ws.getCell("C7").value = { formula: `COUNTIF(F${rPF}:T${rPF},"F")` };
    ws.getCell("F7").value = { formula: "SUM(O7,-A7,-C7)" };
    ws.getCell("L7").value = { formula: `COUNTIF(F${rType}:T${rType},"N")` };
    ws.getCell("M7").value = { formula: `COUNTIF(F${rType}:T${rType},"A")` };
    ws.getCell("N7").value = { formula: `COUNTIF(F${rType}:T${rType},"B")` };
    ws.getCell("O7").value = { formula: "COUNTA(F9:T9)" };
    for (let k = 0; k < n; k++) ws.getCell(9, 6 + k).value = `UTCID${String(k + 1).padStart(2, "0")}`;
    ws.dataValidations.add(`F${rType}:${lastCol}${rType}`, { type: "list", allowBlank: true, formulae: ['"N,A,B"'] });
    ws.dataValidations.add(`F${rPF}:${lastCol}${rPF}`, { type: "list", allowBlank: true, formulae: ['"P,F"'] });
    s.rows = { rType, rPF };
  }

  // --- Statistics ---
  st.getCell("B4").value = { formula: "Cover!B4" };
  st.getCell("F4").value = CREATOR;
  st.getCell("F5").value = "";
  st.getCell("B6").value = { formula: `B5&"_"&"Unit Test Report"&"_"&"v${VERSION}"`, result: `${PROJECT_CODE}_Unit Test Report_v${VERSION}` };
  st.getCell("F6").value = RUN_DATE;
  st.getCell("B7").value =
    `This release covers 2 modules: Frontend logic (${feCount.length} functions, ${feUt} test cases, Vitest) and Backend application layer (${beCount.length} functions, ${beUt} test cases, xUnit). ` +
    `All test cases were executed on ${RUN_DATE} by ${EXECUTOR}. UI component behaviour is reported as functional test cases in Report5_Test_Report.xlsx.`;
  st.getCell("B7").alignment = { wrapText: true, vertical: "top" };
  st.getRow(7).height = 40;
  for (let r = 12; r <= 90; r++) for (let c = 1; c <= 9; c++) { const cell = st.getCell(r, c); cell.value = null; cell.style = {}; }
  const q = (n) => `'${n.replace(/'/g, "''")}'`;
  sheetsData.forEach((s, i) => {
    const r = 12 + i;
    const vals = [i + 1, s.code, `${q(s.sheet)}!A7`, `${q(s.sheet)}!C7`, `${q(s.sheet)}!F7`, `${q(s.sheet)}!L7`, `${q(s.sheet)}!M7`, `${q(s.sheet)}!N7`, `${q(s.sheet)}!O7`];
    vals.forEach((v, j) => { const cell = st.getCell(r, j + 1); cell.style = clone(stRow[j + 1]); cell.value = j >= 2 ? { formula: v } : v; });
  });
  const last = 11 + sheetsData.length, sub = last + 1;
  for (let c = 1; c <= 9; c++) st.getCell(sub, c).style = clone(stSub[c]);
  st.getCell(sub, 2).value = "Sub total";
  ["C", "D", "E", "F", "G", "H", "I"].forEach((L, j) => { st.getCell(sub, 3 + j).value = { formula: `SUM(${L}12:${L}${last})` }; });
  const cov = [["Test coverage", `(C${sub}+D${sub})*100/(I${sub})`], ["Test successful coverage", `C${sub}*100/(I${sub})`], ["Normal case", `F${sub}*100/I${sub}`], ["Abnormal case", `G${sub}*100/I${sub}`], ["Boundary case", `H${sub}*100/I${sub}`]];
  cov.forEach(([label, f], i) => {
    const r = sub + 2 + i;
    for (let c = 1; c <= 6; c++) st.getCell(r, c).style = clone(stCov[42 + i][c]);
    st.getCell(r, 2).value = label;
    st.getCell(r, 4).value = { formula: f };
    st.getCell(r, 4).numFmt = "0.00";
    st.getCell(r, 5).value = "%";
  });

  // Normalize font family site-wide. The capstone sample template mixes Tahoma (most cells)
  // with Calibri and MS PGothic (a few cover/header cells) - same family everywhere reads as
  // one consistent document instead of a patchwork of the template's own inconsistencies.
  wb.worksheets.forEach((ws) => ws.eachRow((row) => row.eachCell((cell) => {
    if (cell.font && cell.font.name && cell.font.name !== "Tahoma") {
      cell.font = { ...cell.font, name: "Tahoma" };
    }
  })));

  wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true };
  await wb.xlsx.writeFile(outFile);
  console.log(`written ${outFile}: ${sheetsData.length} function sheets, ${nCases} UTCIDs`);
})();
