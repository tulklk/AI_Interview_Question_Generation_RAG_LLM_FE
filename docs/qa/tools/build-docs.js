// Builds Report 7 chapter V and Report 5 section II from content.js.
// Writes to c:/tmp/qa/build/ only; the originals are replaced in a separate
// step after the output has been checked in Word.
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const C = require("./content.js");

const Q = require("path").resolve(__dirname, "..") + "/";
// Build from the 13/09/2026 backups (chapter V still empty, no 13/09 change row),
// so the build can be re-run after the originals have been replaced.
const SRC = "c:/tmp/qa-backup-0913/";
// R7_SRC: build chapter V into another copy of Report 7 (e.g. the team's working "[Làm]" file).
// ONLY=R7 skips Report 5.
const R7 = process.env.R7_SRC || SRC + "Report7_Final Project Report (fixed borders+heading).docx";
const R5 = SRC + "Report5_TestDocumentation.docx";
const OUT = process.env.OUT_DIR || "c:/tmp/qa/build8/";
const ONLY = process.env.ONLY || "";
const APPROVE = fs.readFileSync(path.join(__dirname, "approve.txt"), "utf-8").trim();

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dec = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const textOf = (p) => dec([...p.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("")).trim();
const PARA_RE = /<w:p[ >][\s\S]*?<\/w:p>/g;

const S = Object.fromEntries(
  Object.entries(C.sections).map(([k, blocks]) => [
    k,
    blocks.map((b) => (b.bullets ? { ...b, bullets: b.bullets.map((x) => (x === "{{APPROVE_PLAN}}" ? APPROVE : x)) } : b)),
  ])
);

// ---------------------------------------------------------------- profiles
const TNR = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>';
const borders = (color) =>
  `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="${color}"/>`)
    .join("")}</w:tblBorders>`;
const HEAD_SHD = '<w:shd w:val="clear" w:color="auto" w:fill="FFE8E1"/>';

const P7 = {
  width: 8910,
  run: (t, { b } = {}) =>
    `<w:r><w:rPr>${TNR}${b ? "<w:b/><w:bCs/>" : ""}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`,
  para: (runs, { bullet } = {}) =>
    `<w:p><w:pPr>${bullet ? '<w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs>' : ""}<w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/>${bullet ? '<w:ind w:left="720" w:hanging="360"/>' : ""}<w:jc w:val="both"/></w:pPr>${runs}</w:p>`,
  cellRun: (t, { b } = {}) =>
    `<w:r><w:rPr>${TNR}${b ? "<w:b/><w:bCs/>" : ""}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`,
  cellPara: (runs, { center } = {}) =>
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/>${center ? '<w:jc w:val="center"/>' : ""}</w:pPr>${runs}</w:p>`,
  tblPr: () =>
    `<w:tblPr><w:tblW w:w="8910" w:type="dxa"/>${borders("000000")}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0"/></w:tblPr>`,
  boldHead: true,
};

const P5 = {
  width: 8804,
  run: (t, { b } = {}) =>
    `<w:r><w:rPr>${TNR}${b ? "<w:b/><w:bCs/>" : ""}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`,
  para: (runs, { bullet } = {}) =>
    `<w:p><w:pPr>${bullet ? '<w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/>' : ""}<w:jc w:val="both"/><w:rPr>${TNR}</w:rPr></w:pPr>${runs}</w:p>`,
  cellRun: (t, { b } = {}) =>
    `<w:r><w:rPr>${TNR}${b ? "<w:b/><w:bCs/>" : ""}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`,
  cellPara: (runs, { head, center } = {}) =>
    `<w:p><w:pPr><w:pStyle w:val="${head ? "HeadingLv1" : "Bang0"}"/>${center ? '<w:jc w:val="center"/>' : ""}<w:rPr>${TNR}</w:rPr></w:pPr>${runs}</w:p>`,
  tblPr: () =>
    `<w:tblPr><w:tblW w:w="8804" w:type="dxa"/><w:tblInd w:w="80" w:type="dxa"/>${borders("auto")}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0"/></w:tblPr>`,
  boldHead: false,
};

// ---------------------------------------------------------------- renderer
function table(head, rows, widths, P, { centerFrom } = {}) {
  const W = widths.map((f) => Math.round(f * P.width));
  W[W.length - 1] += P.width - W.reduce((a, b) => a + b, 0);
  const cell = (t, i, isHead, boldRow) =>
    `<w:tc><w:tcPr><w:tcW w:w="${W[i]}" w:type="dxa"/>${isHead ? HEAD_SHD : ""}</w:tcPr>${P.cellPara(
      P.cellRun(t, { b: (isHead && P.boldHead) || boldRow }),
      { head: isHead, center: isHead || (centerFrom !== undefined && i >= centerFrom) }
    )}</w:tc>`;
  const tr = (cells, isHead) => {
    const boldRow = !isHead && cells[0] === "Total";
    return `<w:tr>${isHead ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cells.map((t, i) => cell(t, i, isHead, boldRow)).join("")}</w:tr>`;
  };
  return `<w:tbl>${P.tblPr()}<w:tblGrid>${W.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${tr(head, true)}${rows
    .map((r) => tr(r, false))
    .join("")}</w:tbl>${P.para("")}`;
}

function render(blocks, P) {
  const stats = { paragraphs: 0, tables: 0 };
  let x = "";
  const para = (runs, opt) => {
    stats.paragraphs++;
    return P.para(runs, opt);
  };
  for (const b of blocks) {
    if (b.heading) x += P.heading(b.heading);
    else if (b.label) x += para(P.run(b.label, { b: true }));
    else if (b.p !== undefined) x += para((b.lead ? P.run(b.lead + " ", { b: true }) : "") + P.run(b.p));
    else if (b.bullets) for (const it of b.bullets) x += para(P.run("\u2022") + "<w:r><w:tab/></w:r>" + P.run(it), { bullet: true });
    else if (b.table) {
      x += table(b.table.head, b.table.rows, b.table.widths, P);
      stats.tables++;
    } else if (b.types)
      for (const [name, obj, tech, crit] of b.types) {
        x += para(P.run(name, { b: true }));
        x += para(P.run("Objective: ", { b: true }) + P.run(obj));
        x += para(P.run("Technique: ", { b: true }) + P.run(tech));
        x += para(P.run("Completion criteria: ", { b: true }) + P.run(crit));
      }
    else if (b.matrix) {
      x += table(["Type of Tests", "Unit", "Integration", "System", "Acceptance"], b.matrix.map(([n, cols]) => [n, ...cols]), [0.48, 0.13, 0.13, 0.13, 0.13], P, { centerFrom: 1 });
      stats.tables++;
    } else throw new Error("Unknown block: " + JSON.stringify(b).slice(0, 80));
  }
  return { xml: x, stats };
}

// ---------------------------------------------------------------- Report 7
async function buildR7() {
  const zip = await JSZip.loadAsync(fs.readFileSync(R7));
  const entry = Object.keys(zip.files).find((n) => n.endsWith("document.xml") && !n.includes("rels"));
  let xml = await zip.files[entry].async("string");

  const vPos = xml.lastIndexOf(">V. Software Testing Documentation<");
  const viPos = xml.indexOf(">VI. Release Package", vPos);
  if (vPos < 0 || viPos < 0) throw new Error("Report7: chapter V/VI heading not found");
  const regionStart = xml.lastIndexOf("<w:p ", vPos);
  const regionEnd = xml.lastIndexOf("<w:p ", viPos);

  const found = [];
  PARA_RE.lastIndex = regionStart;
  let m;
  while ((m = PARA_RE.exec(xml)) && m.index < regionEnd) {
    const p = m[0];
    const style = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
    const t = textOf(p);
    if (t && !/^Heading[1-3]$/.test(style)) throw new Error("Report7: chapter V already has body text: " + t.slice(0, 60));
    if (S[t]) found.push({ key: t, end: m.index + p.length });
  }
  const missing = Object.keys(S).filter((k) => !found.some((f) => f.key === k));
  if (missing.length) throw new Error("Report7: headings not found: " + missing.join(", "));

  const summary = [];
  for (const f of found.sort((a, b) => b.end - a.end)) {
    const { xml: add, stats } = render(S[f.key], P7);
    xml = xml.slice(0, f.end) + add + xml.slice(f.end);
    summary.unshift(`${f.key}: ${stats.paragraphs} paragraphs, ${stats.tables} tables`);
  }

  // An old "Table 8: Test case feature list" (64 test files, previous Report5 layout) had been
  // pasted inside the table of contents. Its up-to-date replacement is the function list in
  // chapter V section 4, so remove the stale caption and table from the TOC.
  const ackPos = xml.indexOf('<w:pStyle w:val="Heading1"/>'); // first real heading, after the TOC
  PARA_RE.lastIndex = xml.indexOf("<w:body>");
  let cap = null;
  while ((m = PARA_RE.exec(xml)) && m.index < ackPos) {
    if (textOf(m[0]).startsWith("Table 8: Test case feature list")) { cap = { start: m.index, end: m.index + m[0].length }; break; }
  }
  if (cap) {
    const tStart = xml.indexOf("<w:tbl>", cap.end);
    if (tStart < 0 || /<w:p[ >]/.test(xml.slice(cap.end, tStart))) throw new Error("Report7: stale Table 8 is not directly after its caption");
    const tEnd = xml.indexOf("</w:tbl>", tStart) + "</w:tbl>".length;
    if (xml.slice(tStart + 7, tEnd).includes("<w:tbl>")) throw new Error("Report7: stale Table 8 contains a nested table");
    const rows = (xml.slice(tStart, tEnd).match(/<w:tr[ >]/g) || []).length;
    xml = xml.slice(0, cap.start) + xml.slice(tEnd);
    summary.push(`Removed stale Table 8 (${rows} rows) from the table of contents`);
  }
  zip.file(entry, xml);
  fs.mkdirSync(OUT, { recursive: true });
  const out = OUT + path.basename(R7);
  fs.writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } }));
  return { out, summary };
}

// ---------------------------------------------------------------- Report 5
async function buildR5() {
  const zip = await JSZip.loadAsync(fs.readFileSync(R5));
  let xml = await zip.file("word/document.xml").async("string");
  const sect = xml.lastIndexOf("<w:sectPr");

  const heads = [];
  PARA_RE.lastIndex = xml.indexOf("<w:body>");
  let m;
  while ((m = PARA_RE.exec(xml)) && m.index < sect) {
    const style = (m[0].match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
    if (/^Heading[1-3]$/.test(style)) heads.push({ text: textOf(m[0]), start: m.index, end: m.index + m[0].length });
  }
  const iII = heads.findIndex((h) => h.text === "II. Testing Documentation");
  if (iII < 0) throw new Error("Report5: section II heading not found");
  const secHeads = heads.slice(iII + 1);

  const L = (t) => ({ label: t });
  // Sub-headings 1.1-1.4 reuse the formatting of the existing "2.1 Testing Types" heading
  // (Heading3), so they are numbered like the rest of section II and appear in the TOC.
  const h21 = secHeads.find((h) => h.text === "2.1 Testing Types");
  if (!h21) throw new Error("Report5: 2.1 heading not found");
  const headTpl = xml.slice(h21.start, h21.end);
  P5.heading = (t) => {
    let n = 0;
    return headTpl
      .replace(/<w:bookmark(Start|End)\b[^>]*\/>/g, "")
      .replace(/ w14:(paraId|textId)="[^"]*"/g, "")
      .replace(/(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g, (mm, a, b, c) => a + (n++ === 0 ? esc(t) : "") + c);
  };
  const H = (t) => ({ heading: t });
  const MAP = {
    "1. Scope of Testing": [...S["1. Scope of Testing"], H("1.1 In-Scope Items"), ...S["1.1 In-Scope Items"], H("1.2 Out-of-Scope Items"), ...S["1.2. Out-of-Scope Items"], H("1.3 Test Levels and Responsibilities"), ...S["1.3. Test Levels"], H("1.4 Assumptions and Constraints"), ...S["1.4. Assumptions & Constraints"]],
    "2. Test Strategy": S["2. Test Strategy"],
    "2.1 Testing Types": S["2.1 Testing Types"],
    "2.2 Test Levels": S["2.2 Test Levels"],
    "2.3 Supporting Tools": S["2.3 Supporting Tools"],
    "3. Test Plan": [],
    "3.1 Human Resources": S["3.1 Human Resources"],
    "3.2 Test Environment": S["3.2 Test Environment"],
    "3.3 Test Milestones": S["3.3 Test Milestones"],
    "4. Test Cases": S["4. Test Cases"],
    // Report 5 has no numbered 5.x sub-headings, so point at the label instead.
    "5. Test Reports": [L("Test statistics"), ...S["5.1 Test Statistics"], L("Test analysis"), ...S["5.2 Test Analysis"], L("Conclusion"),
      ...S["5.3 Conclusion"].map((b) => (b.p ? { ...b, p: b.p.replace("listed in 5.2", "listed under Test analysis above") } : b))],
  };
  for (const k of Object.keys(MAP)) {
    const n = secHeads.filter((h) => h.text === k).length;
    if (n !== 1) throw new Error(`Report5: heading "${k}" found ${n} times`);
  }

  const summary = [];
  for (let i = secHeads.length - 1; i >= 0; i--) {
    const h = secHeads[i];
    if (!(h.text in MAP)) continue;
    const regionEnd = i + 1 < secHeads.length ? secHeads[i + 1].start : sect;
    const removed = xml.slice(h.end, regionEnd);
    const keep = (removed.match(/<w:bookmark(Start|End)\b[^>]*\/>/g) || []).join("");
    const { xml: add, stats } = render(MAP[h.text], P5);
    xml = xml.slice(0, h.end) + keep + add + xml.slice(regionEnd);
    summary.unshift(`${h.text}: ${stats.paragraphs} paragraphs, ${stats.tables} tables`);
  }

  // Record of changes: add a 13/09/2026 row after the 12/09/2026 row. Look at
  // the untouched source XML - the rewritten section II itself contains
  // "12/09/2026" and "13/09/2026" table cells, which would fool both checks.
  const original = await (await JSZip.loadAsync(fs.readFileSync(R5))).file("word/document.xml").async("string");
  if (!original.includes(">13/09/2026<")) {
    const rows = original.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
    const src = rows.find((r) => r.includes(">12/09/2026<") && r.includes(">SU26SE102-GSU26SE52<"));
    if (!src) throw new Error("Report5: 12/09/2026 change row not found");
    if (xml.split(src).length - 1 !== 1) throw new Error("Report5: 12/09/2026 change row is not unique");
    const texts = [
      "13/09/2026",
      "M",
      "SU26SE102-GSU26SE52",
      "Rewrote section II against the current code and the structure of a sample final report: consistent test levels (unit, UI component, integration, system); backend .NET unit and integration tests added (232 unit test cases and 6 PostgreSQL integration tests re-run on 13/09/2026, all passing; 6 Studio and HR smoke tests not run because they need SePay settings and their default configuration targets the shared Azure database); frontend suite reduced from 529 to 470 test cases (tests for code the app no longer uses removed, parameterized tables cut to one row per branch); corrected artifact names; refreshed milestones, statistics and team roles; defect analysis based on the QA Bug Summary Report; re-checked the three defects of the earlier cycle.",
    ];
    const texts15 = [
      "15/09/2026",
      "M",
      "SU26SE102-GSU26SE52",
      "Aligned section II and the test artifacts with the capstone templates: scope split into sub-headings 1.1-1.4 with a feature table (Feature Code, In Scope); Report5_Test_Report.xlsx rebuilt as 348 functional test cases in 10 feature modules, all Passed (309 Vitest UI test cases and 39 RAG Service API pytest test cases run against a live local Ollama); SU26SE102-GSU26SE52_QA_TestCases.xlsx rebuilt as 57 function sheets with 393 unit test cases (161 frontend, 232 backend), all backed by the 15/09/2026 test runs (frontend 470/470, backend unit 232/232, RAG API 39/39); statistics, milestones and artifact descriptions updated.",
    ];
    const texts19 = [
      "19/09/2026",
      "M",
      "SU26SE102-GSU26SE52",
      "Re-verified the test artifacts against the AI Coach, candidate roadmap and knowledge-folder import merge. The frontend suite was re-run: 20 test cases in 6 files failed because the code under test had changed, the 6 test files were updated to the new behaviour and the suite passed 470/470 (62 files, totals unchanged). Report5_Test_Report.xlsx rebuilt as v7.2 - the frontend Round 1 dates move to 19/09/2026 while the 39 RAG Service API cases keep their 15/09/2026 pytest run - and the AKB-1, AKB-2 and APLAN-3 descriptions corrected. Added feature FT-15 to the scope table: the AI Coach workflow, candidate roadmaps and knowledge-folder import are out of scope for this test cycle and are covered by manual system testing only. SU26SE102-GSU26SE52_QA_TestCases.xlsx is unchanged because none of the functions it documents were modified.",
    ];
    const texts21 = [
      "21/09/2026",
      "M",
      "SU26SE102-GSU26SE52",
      "Re-verified the test artifacts after the AI Configuration page was rebuilt as read-only and the Jobs board, public JD and hiring assessment mode feature was merged. The frontend suite was re-run: 10 test files needed updating - one test file's import broke because the page it tested had lost the service it used to call (rewritten from 5 to 1 test case), a shared HR subscription fixture was missing a field that let a Free-plan test silently pass with Premium-level export access, two mock factories were missing fields required by their updated types (caught by a separate tsc --noEmit pass, not by Vitest itself), and the rest asserted stale Vietnamese or superseded UI text - and the suite passed 466/466 (62 files, -4 from the AI Configuration module). Report5_Test_Report.xlsx rebuilt as 344 functional test cases in 10 feature modules, all Passed (305 Vitest UI test cases and the unchanged 39 RAG Service API pytest test cases); the Administration module dropped from 47 to 43 cases. Added feature FT-16 to the scope table: the Jobs board, public JD and hiring assessment mode feature is out of scope for this test cycle and is covered by manual system testing only. SU26SE102-GSU26SE52_QA_TestCases.xlsx is unchanged because none of the functions it documents were modified.",
    ];
    const cloneRow = (vals) => {
      let i = 0;
      const out = src
        .replace(/ w14:(paraId|textId)="[^"]*"/g, "")
        .replace(/(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g, (mm, a, b, c) => a + esc(vals[i++] ?? "") + c);
      if (i !== 4) throw new Error("Report5: change row has " + i + " text runs, expected 4");
      return out;
    };
    xml = xml.replace(src, src + cloneRow(texts) + cloneRow(texts15) + cloneRow(texts19) + cloneRow(texts21));
    summary.push("Record of changes: added 13/09/2026, 15/09/2026, 19/09/2026 and 21/09/2026 rows");
  }

  zip.file("word/document.xml", xml);
  fs.mkdirSync(OUT, { recursive: true });
  const out = OUT + path.basename(R5);
  fs.writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } }));
  return { out, summary };
}

(async () => {
  const jobs = [["Report 7", buildR7], ["Report 5", buildR5]].filter(([name]) => !ONLY || name.replace(/\D/g, "") === ONLY.replace(/\D/g, ""));
  for (const [name, fn] of jobs) {
    const { out, summary } = await fn();
    console.log(`\n== ${name} -> ${out}`);
    summary.forEach((s) => console.log("  " + s));
  }
})().catch((e) => {
  console.error("BUILD FAILED:", e.message);
  process.exit(1);
});
