// Generates QA_Bug_Summary_Report.xlsx, styled to match the project's existing
// Report5_Test_Report.xlsx (Tahoma font, green FF76923C header fill, thin
// black borders) rather than inventing a new look.
//
// Scope: bugs found AND fixed while doing test-case documentation work:
// both bugs in the documentation/tooling itself (QA_TestCases.xlsx and its
// generator scripts) and real product bugs surfaced by reading each
// tests/unit/*.test.ts(x) file to document it. Sequence diagram work is out
// of scope.
const ExcelJS = require("exceljs");
const path = require("path");

const FONT = "Tahoma";
const GREEN = "FF76923C";
const WHITE = "FFFFFFFF";
const BLACK = "FF000000";
const thin = { style: "thin", color: { argb: BLACK } };
const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

const SEVERITY_FILL = {
  Cao: "FFF2DCDB", // light red
  "Trung bình": "FFFDE9D9", // light orange
  Thấp: "FFEBF1DE", // light green
};

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "khoa3107";
  wb.created = new Date();

  // ---------------- Cover ----------------
  const cover = wb.addWorksheet("Cover");
  cover.columns = [{ width: 20 }, { width: 60 }, { width: 20 }, { width: 30 }];

  cover.getCell(2, 1).value = "QA BUG SUMMARY REPORT: TEST CASE DOCUMENTATION";
  cover.getCell(2, 1).font = { bold: true, size: 14, name: FONT };

  const meta = [
    ["Project Name", "IQGS – AI-Powered Interview Question Generation System Using RAG and LLM"],
    ["Project Code", "SU26SE102"],
    ["Document Code", "SU26SE102_QA Bug Summary_v3.0"],
    ["Scope", "Bugs found and fixed while doing test-case documentation work: both documentation/tooling bugs (QA_TestCases.xlsx and its generator scripts) and real product bugs surfaced while reading each test file to document it. Sequence diagrams are out of scope."],
    ["Creator", "khoa3107"],
    ["Issue Date", new Date().toISOString().slice(0, 10)],
    ["Version", "v3.0"],
  ];
  meta.forEach(([k, v], i) => {
    const r = 4 + i;
    cover.getCell(r, 1).value = k;
    cover.getCell(r, 1).font = { bold: true, size: 10, name: FONT };
    cover.getCell(r, 2).value = v;
    cover.getCell(r, 2).font = { size: 10, name: FONT };
    cover.getCell(r, 2).alignment = { wrapText: true, vertical: "top" };
  });

  const introRow = 4 + meta.length + 2;
  cover.getCell(introRow, 1).value = "Summary";
  cover.getCell(introRow, 1).font = { bold: true, size: 11, name: FONT, color: { argb: WHITE } };
  cover.getCell(introRow, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  ["B", "C", "D"].forEach((col) => {
    const c = cover.getCell(`${col}${introRow}`);
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  });
  const introText =
    "19 bugs were found and fixed while expanding/reviewing the QA test-case documentation deliverables: 5 in the " +
    "documentation/tooling itself (sheet \"Test-Case Doc Bugs\") and 14 in the real product (sheet \"Product Bugs " +
    "Found\"), surfaced while reading each test file to document it. The most serious tooling bug (#1) was a live " +
    "data-integrity bug on the master workbook itself (a 210-sheet duplication caused by a sheet-naming mismatch " +
    "between the generator and the merge script), caught only through post-hoc auditing, not by the generator's " +
    "own reported success. The product bugs include 3 P0/P1-severity fixes with regression tests (a Premium-plan " +
    "cache leak across users on a shared browser, a SignalR connection failure that crashed the whole page, and a " +
    "silently-dropped post-payment refresh) and 10 dead-button fixes (buttons that did nothing on click, now " +
    "disabled with a Coming soon tooltip).";
  cover.mergeCells(introRow + 1, 1, introRow + 6, 4);
  const introCell = cover.getCell(introRow + 1, 1);
  introCell.value = introText;
  introCell.font = { size: 10, name: FONT };
  introCell.alignment = { wrapText: true, vertical: "top" };

  // ---------------- helper to build a findings sheet ----------------
  function buildSheet(name, headers, colWidths, rows) {
    const ws = wb.addWorksheet(name);
    ws.columns = colWidths.map((w) => ({ width: w }));
    ws.getRow(1).values = headers;
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 10, name: FONT, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      cell.border = borderAll;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    ws.getRow(1).height = 30;

    rows.forEach((row, i) => {
      const r = ws.getRow(i + 2);
      r.values = row;
      r.eachCell((cell) => {
        cell.font = { size: 10, name: FONT };
        cell.border = borderAll;
        cell.alignment = { vertical: "top", wrapText: true };
      });
      const sevIdx = headers.indexOf("Severity");
      if (sevIdx !== -1) {
        const sevCell = r.getCell(sevIdx + 1);
        const fill = SEVERITY_FILL[sevCell.value];
        if (fill) sevCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      }
      r.height = 60;
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];
    return ws;
  }

  // ---------------- Test-Case Doc Bugs ----------------
  buildSheet(
    "Test-Case Doc Bugs",
    ["No", "Bug", "Location", "Root Cause", "Fix", "Severity", "Status"],
    [5, 45, 30, 45, 45, 12, 12],
    [
      [
        1,
        "210 duplicate sheets in SU26SE102-GSU26SE52_QA_TestCases.xlsx (should be ~113) after one generator run.",
        "docs/qa/gen-testcases.js (sheetNameFor)",
        "sheetNameFor() used an ID_PREFIX_MAP to name sheets, diverging from the bare-method-name convention ~97 existing sheets already used. merge-into-live.js matches sheet names exactly to remove-then-replace old sheets, so the mismatched names went unrecognized and new sheets were appended on top instead of replacing the old ones.",
        "Restored from backup, removed ID_PREFIX_MAP entirely, reverted to the original bare tc.method naming (31-char truncated, sanitized). Regenerated and verified 113 sheets, 0 duplicate names.",
        "Cao",
        "Đã sửa",
      ],
      [
        2,
        "17 duplicate rows (BE_API_002–018) left over in the Functions/Statistics sheets.",
        "docs/qa/fill-functions-statistics.js",
        "The script only overwrote rows within the current data range; it never cleared rows left over past that range from a prior run against a differently-sized testCases array.",
        "Added defensive cleanup: after filling both sheets, scan past the current data end and clear any leftover non-empty rows until an already-empty row is hit. Verified 0 duplicate ids after every subsequent pipeline run.",
        "Trung bình",
        "Đã sửa",
      ],
      [
        3,
        'Stale pytest count in the test documentation ("20 pytest, 1 file only") vs the real 39 cases across 2 files.',
        "SU26SE102-GSU26SE52_QA_TestCases.xlsx (notes/summary row)",
        "The figure was written when RAG_IQGS only had test_e2e_api.py; it was never updated after test_ollama_integration.py (9 functions, some parametrized) was added.",
        "Ran pytest --collect-only -q tests/ to get the real count (39 cases / 2 files: test_e2e_api.py=24, test_ollama_integration.py=9), corrected the note in gen-testcases.js to match Report5_TestDocumentation.docx (which already had it right).",
        "Thấp",
        "Đã sửa",
      ],
      [
        4,
        "3 AUTOMATION_STATUS entries (FE_UI_014, FE_UI_015, FE_RAGAUTH_016) marked SKIPPED despite already having real automated tests.",
        "docs/qa/gen-testcases.js (AUTOMATION_STATUS)",
        "The status was recorded before the corresponding test files existed and was never re-checked after they were written.",
        "Updated all 3 entries to \"DONE, <test file>.test.tsx (<real test id>)\", matching the Automation Summary sheet.",
        "Thấp",
        "Đã sửa",
      ],
      [
        5,
        'A genuinely failing test: candidate-settings.test.tsx "CSET-6: a Premium candidate can toggle recruiter recommendations" throws "Unable to find role=switch" when actually run.',
        "tests/unit/candidate-settings.test.tsx",
        "CandidateSubscriptionProvider only fetches subscription data once useUser() resolves an authenticated user with an id; the test mocked getCandidateSubscription to return Premium but never authenticated its fake user, so the fetch never fired and isPremium stayed permanently false regardless of the mock. The other 6 tests in the same file happened not to depend on Premium state, so the file's own pass count masked this until the suite was actually run.",
        "Added localStorage.setItem(\"interviewai_auth\", \"true\") and a getCurrentUser mock resolving a user with an id in beforeEach. Re-ran the full suite: 535/535 passing.",
        "Cao",
        "Đã sửa",
      ],
    ]
  );

  // ---------------- Product Bugs Found ----------------
  buildSheet(
    "Product Bugs Found",
    ["No", "Bug", "Location", "Root Cause", "Fix", "Severity", "Status"],
    [5, 50, 40, 45, 45, 12, 12],
    [
      [
        1,
        'Admin Settings: the "Save Permissions" button did nothing on click, no save, no error.',
        "src/features/admin/components/settings/* (Permissions tab)",
        "No backend API exists yet to save permissions, but the button rendered fully clickable, so clicking it was a silent no-op.",
        'Disabled the button with title="Coming soon". Test: admin-platform-settings.test.tsx (APS-5).',
        "Trung bình",
        "Đã sửa",
      ],
      [
        2,
        'Admin Settings: the "Save Notifications" button did nothing on click, same issue as #1, in the Notifications tab.',
        "src/features/admin/components/settings/* (Notifications tab)",
        "No backend API exists yet to save notification preferences; button stayed active but inert.",
        'Disabled the button with title="Coming soon". Test: admin-platform-settings.test.tsx (APS-7).',
        "Trung bình",
        "Đã sửa",
      ],
      [
        3,
        'Admin Settings: the "Reset Platform Data" danger-zone button did nothing on click, more concerning than #1/#2 since it is a destructive action, an inert active button could make an admin believe a reset succeeded when it did not.',
        "src/features/admin/components/settings/* (General, danger zone)",
        "No backend reset API exists yet; button stayed active.",
        'Disabled the button with title="Coming soon" instead of leaving a destructive action in an ambiguous state. Test: admin-platform-settings.test.tsx (APS-8).',
        "Cao",
        "Đã sửa",
      ],
      [
        4,
        "Admin Content page: the per-row Delete button did nothing on click.",
        "src/features/admin/components/content/content-table.tsx",
        "No delete endpoint exists for content sessions yet; the Trash2 icon button stayed active.",
        'Disabled the button with title="Coming soon". Test: admin-content-table.test.tsx (ACT-2).',
        "Trung bình",
        "Đã sửa",
      ],
      [
        5,
        '"Manage Subscription" (Premium candidates) did nothing on click.',
        "src/features/candidate/components/billing/candidate-billing-page.tsx",
        "No detailed subscription-management flow exists on the backend yet; button stayed active.",
        'Disabled the button with title="Coming soon". Test: candidate-billing.test.tsx (CBILL-7).',
        "Trung bình",
        "Đã sửa",
      ],
      [
        6,
        '"Update Billing Info" and "Change Payment Method" (Free candidates) did nothing on click.',
        "src/features/candidate/components/billing/candidate-billing-page.tsx",
        "No payment-info-update gateway exists yet; both buttons stayed active.",
        'Disabled both buttons with title="Coming soon". Test: candidate-billing.test.tsx (CBILL-8).',
        "Trung bình",
        "Đã sửa",
      ],
      [
        7,
        "Candidate Billing: the invoice Download button was a dead link whenever an invoice had no receiptUrl.",
        "src/features/candidate/components/billing/candidate-billing-page.tsx",
        "The component rendered a Download control regardless of whether receiptUrl actually existed.",
        "With receiptUrl: renders a real <a> with href + download. Without: renders a disabled button with title=\"Coming soon\" instead of a dead link. Test: candidate-billing.test.tsx (CBILL-5, CBILL-6).",
        "Trung bình",
        "Đã sửa",
      ],
      [
        8,
        "HR Billing: the same dead-link Download issue as #7, on the HR billing screen.",
        "src/features/settings/components/hr-billing-subscription.tsx",
        "Same as #7, a separate HR-side component.",
        "Same fix: a real <a> when receiptUrl exists, a disabled button with a tooltip when it does not. Test: hr-billing.test.tsx (BILL-4b, BILL-4c).",
        "Trung bình",
        "Đã sửa",
      ],
      [
        9,
        'HR Settings, Preferences tab: the "Save Changes" button did nothing on click.',
        "src/features/settings/components/preferences-section.tsx",
        "No backend API exists yet to save preferences; button stayed active.",
        'Disabled the button with title="Coming soon". Test: hr-settings-preferences-notifications.test.tsx (HRPREF-1).',
        "Trung bình",
        "Đã sửa",
      ],
      [
        10,
        'HR Settings, Notifications tab: the "Save Changes" button did nothing on click.',
        "src/features/settings/components/notifications-section.tsx",
        "No backend API exists yet to save notification settings; button stayed active.",
        'Disabled the button with title="Coming soon". Test: hr-settings-preferences-notifications.test.tsx (HRNOTIF-1).',
        "Trung bình",
        "Đã sửa",
      ],
      [
        11,
        "P0: Premium plan cache leaked across different users on the same (shared/kiosk) browser. A privacy issue, user B could briefly see user A's Premium UI right after logging in, or get a false \"Premium revoked\" dialog despite never having Premium.",
        "src/features/candidate/context/candidate-subscription-context.tsx",
        "The localStorage plan cache was not scoped to any user id, just one PREMIUM/FREE value shared by every user on that browser, so the next user briefly inherited the previous user's cached plan before the API call corrected it.",
        "Added a hiregena-candidate-plan-user key storing the id the cache belongs to; the cache is only trusted when it matches the currently logged-in user id (readCachedPlan), otherwise it defaults to FREE until the API responds. Regression tests: candidate-subscription-context.test.tsx (CSUB-1 through CSUB-4).",
        "Cao",
        "Đã sửa",
      ],
      [
        12,
        "P0: a failed SignalR connection (subscription-payment-hub) crashed the entire component tree, e.g. for candidates, whose backend hub is HR-only.",
        "src/features/subscription/services/subscription-payment-hub.ts",
        "createSubscriptionPaymentHubConnection() threw synchronously when connection construction failed (bad/unconfigured URL), and the caller had no try/catch around it, so the error propagated up through React and crashed the whole page.",
        "Changed the function to return null instead of throwing on a construction failure; callers check for null and fall back to a 30-second poll. Regression tests: subscription-realtime.test.tsx (SUBRT-1, SUBRT-2).",
        "Cao",
        "Đã sửa",
      ],
      [
        13,
        "P1: UpgradeModal silently dropped the post-payment subscription refresh on a transient network failure, so a user who had already paid still saw the UI as not-yet-upgraded.",
        "src/features/candidate/components/billing/upgrade-modal.tsx",
        "finishPaid() fetched the fresh subscription/usage/history exactly once after payment confirmation; if that single call hit a network error, there was no retry, and the update was lost.",
        "Added up to 3 retries to finishPaid(); if all 3 fail it gives up quietly (the payment-confirmed toast already fired) instead of crashing. Regression tests: candidate-upgrade-modal.test.tsx (UPM-1, UPM-2).",
        "Cao",
        "Đã sửa",
      ],
      [
        14,
        'HR Billing: clicking "Downgrade to Free" dropped the plan to Free immediately instead of keeping Premium until the paid period ended, so an HR user who had already paid for the month lost Premium benefits the instant they clicked cancel.',
        "Backend (cancel-subscription API), FE at src/features/settings/components/hr-billing-subscription.tsx",
        "The cancel API used to resolve with planCode=FREE immediately, and the FE applied that value to state as-is, dropping Premium right away.",
        "Backend now keeps planCode=PREMIUM (only status changes to a pending-cancellation state) until the paid period actually ends; no FE change was needed since cancelPremium() already applies whatever planCode the response carries. Regression test locking in this contract: hr-billing.test.tsx (BILL-7).",
        "Cao",
        "Đã sửa",
      ],
    ]
  );

  const outPath = path.join(__dirname, "QA_Bug_Summary_Report.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
