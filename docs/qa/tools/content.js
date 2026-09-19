// Shared content for Report 7 chapter V and Report 5 section II.
// Figures verified 15/09/2026: Vitest JSON run (470/470), dotnet test TRX run (unit 232/232 in 38 classes),
// integration run of 13/09/2026 (GamificationServiceDbTests 6/6 against a disposable PostgreSQL 16
// container; StudioSmokeTests + HrP1FunnelInviteNoteTests not run), Report5_Test_Report.xlsx
// (327 functional test cases = 309 Passed + 18 Pending), SU26SE102-GSU26SE52_QA_TestCases.xlsx
// (57 function sheets, 393 UTCIDs = 203 N / 68 A / 122 B), QA_Bug_Summary_Report.md, git history.
const KHOA = "Hoàng Đăng Khoa";
const TU = "Phan Thanh Tú";
const NAM = "Nguyễn Minh Nam";
const HIEN = "Nguyễn Trung Hiền";

// Frontend results by area: [area, test files, test cases] - sums: 62 files, 470 cases.
// The first nine rows are the functional modules of Report5_Test_Report.xlsx (UI component tests);
// the last row is the logic-only test files documented in the Unit Test workbook.
const FE_GROUPS = [
  ["Authentication & Access Control", 8, 51],
  ["HR Interview Plan Studio", 7, 42],
  ["Question Set Management", 3, 24],
  ["HR Operations", 5, 32],
  ["Candidate Experience", 8, 51],
  ["Subscription & Payment", 5, 34],
  ["Gamification", 4, 20],
  ["Administration", 8, 47],
  ["Shared UI & Layout", 5, 8],
  ["Frontend logic (unit tests)", 9, 161],
];

// Target-of-test features. FT-01..FT-10 match the module numbers of the test case IDs in
// Report5_Test_Report.xlsx (F1-01 ... F10-18).
const FEATURES = [
  ["FT-01", "Authentication & Access Control", "Login, HR and Job Seeker registration, e-mail OTP verification, forgot/reset and change password, token refresh and error interceptors, role-based page access", "Yes", "Functional: 51 test cases; unit: 4 frontend functions (30 test cases)"],
  ["FT-02", "HR Interview Plan Studio", "Job description input and samples, knowledge sources, plan creation and approval, question generation, editing and regeneration, save/publish/share, Free-plan quota", "Yes", "Functional: 42 test cases; unit: 4 frontend functions (35 test cases)"],
  ["FT-03", "Question Set Management", "Manual question builder, question set history (search, filters, publish, bookmark, export, delete), edit lock on published sets", "Yes", "Functional: 24 test cases"],
  ["FT-04", "HR Operations", "HR dashboard, candidate recommendations, HR knowledge documents, HR profile, preference and notification settings", "Yes", "Functional: 32 test cases"],
  ["FT-05", "Candidate Experience", "Candidate dashboard, marketplace, practice session and score result, interview invitations, profile, settings", "Partial - anti-cheat monitors are stubbed", "Functional: 51 test cases; unit: 2 frontend functions (17 test cases)"],
  ["FT-06", "Subscription & Payment", "HR and candidate billing, upgrade and payment confirmation, user-scoped plan cache, realtime plan updates, premium revocation", "Partial - payment gateway and SignalR server are mocked", "Functional: 34 test cases; unit: 2 frontend functions (10 test cases)"],
  ["FT-07", "Gamification", "Progress card, daily goal, XP history, achievements", "Yes", "Functional: 20 test cases; unit: 2 frontend functions (24 test cases)"],
  ["FT-08", "Administration", "Admin dashboard, users, companies, marketplace moderation, subscription plans, AI configuration, knowledge base, platform settings", "Yes", "Functional: 47 test cases; unit: 1 frontend function (13 test cases)"],
  ["FT-09", "Shared UI & Layout", "Toasts, dark mode, navigation drawer, brand logo, horizontal overflow, tooltips, shared formatting utilities", "Partial - layout is checked through CSS classes, not measured pixels", "Functional: 8 test cases; unit: 4 frontend functions (32 test cases)"],
  ["FT-10", "RAG Service API", "Health and internal API-key gate, knowledge ingestion validation and real embedding ingestion, chat and question generation request validation, interview plan flow with a live LLM, API contract and platform behaviour", "Yes", "Functional: 39 test cases (pytest, RAG_IQGS repository)"],
  ["FT-11", "Backend business rules", "Gamification engine, Studio plan and question helpers, JD validation and IT-domain gate, HR recommendations and JD fit, knowledge document types, profile validation, subscription gates", "Yes", "Unit: 38 backend functions (232 test cases, xUnit)"],
  ["FT-12", "Backend integration", "Gamification persistence on a real PostgreSQL database; Studio smoke flow and HR funnel endpoints through the hosted API", "Partial - 6 of 12 tests executed", "Integration: 3 xUnit test classes, 12 tests"],
  ["FT-13", "End-to-end flows in a browser", "Complete business flows on the running product", "No - covered by manual system testing only", "-"],
  ["FT-14", "AI output quality and anti-cheat detection accuracy", "Relevance of generated plans, questions and feedback; face, head-pose and phone detection", "No", "-"],
  ["FT-15", "AI Coach workflow, candidate roadmaps and knowledge-folder import", "Seven-phase AI Coach journey (CV upload, context, analysis, insight cards, report, roadmap preview and roadmap list), the candidate roadmap page, and the admin roadmap-node import with folder-based knowledge browsing", "No - merged on 19/09/2026, after this test cycle; covered by manual system testing only", "-"],
];

// Functional test case list, generated from the same data as Report5_Test_Report.xlsx.
const TC_MODULES = [...require("./tc-data-1"), ...require("./tc-data-2"), ...require("./tc-data-3"), ...require("./tc-data-4")];
const LETTERS = "ABCDEFGHIJKLMNOP";
let tcNo = 0;
const FUNCTION_ROWS = [];
TC_MODULES.forEach((m, mi) => {
  m.functions.forEach((f, fi) => {
    tcNo++;
    const files = [...new Set(f.cases.map((c) => c.file).filter(Boolean))];
    FUNCTION_ROWS.push([
      String(tcNo),
      `FT-${String(mi + 1).padStart(2, "0")}`,
      `${m.sheet}: Function ${LETTERS[fi]} - ${f.name}`,
      String(f.cases.length),
      files.length ? files.join(", ") : "Not automated (Pending)",
    ]);
  });
});
const TC_TOTAL = TC_MODULES.reduce((s, m) => s + m.functions.reduce((a, f) => a + f.cases.length, 0), 0);
FUNCTION_ROWS.push(["Total", "", `${tcNo} functions`, String(TC_TOTAL), ""]);

const sections = {
  "1. Scope of Testing": [
    { p: "This testing cycle covers the three code bases of the IQGS system that the team develops and can execute locally: the web frontend (Next.js 16, React 19), the main backend API (.NET 8, Clean Architecture) and the RAG service API (Python, FastAPI, repository RAG_IQGS). The frontend suite (470 test cases) was last executed on 19/09/2026, after the AI Coach and knowledge-folder changes were merged into the main branch; the backend unit tests (commit 27a84a8) and the RAG service API tests (39 test cases, commit 145f796, run against a live local Ollama) were executed on 15/09/2026 and the backend integration tests on 13/09/2026, after the anti-cheat feature was merged into the main branch on 10/09/2026." },
  ],
  "1.1 In-Scope Items": [
    { p: "The table below lists the features of the system under test, whether each one is in scope for this cycle, and the test cases that cover it. Functional test cases are in Report5_Test_Report.xlsx, where the test case ID starts with the feature number (for example F1-01 for FT-01); unit test cases are in SU26SE102-GSU26SE52_QA_TestCases.xlsx." },
    { table: { widths: [0.1, 0.18, 0.34, 0.16, 0.22], head: ["Feature Code", "Feature", "What is verified", "In Scope", "Test cases"], rows: FEATURES } },
  ],
  "1.2. Out-of-Scope Items": [
    { bullets: [
      "Automated browser end-to-end tests. Playwright was trialled in early August 2026 and is no longer part of the repository, so complete business flows are verified manually (see System Testing in 2.1).",
      "Detection accuracy of the anti-cheat monitors (face, head pose, phone). They need a real camera and the MediaPipe/TensorFlow models, which cannot run in the jsdom test environment; only the practice-session flow around them is tested, with the monitors stubbed.",
      "The live payment gateway and the SignalR server. Payment confirmation and realtime updates are tested against mocked services.",
      "Quality of AI-generated content (relevance of generated plans, questions and feedback).",
      "Load and latency of the RAG service with production-sized knowledge bases; its API tests run against a local Ollama with small test documents.",
      "Load, stress and high-availability testing, pixel-level visual regression, and formal usability studies.",
    ] },
  ],
  "1.3. Test Levels": [
    { table: { widths: [0.19, 0.18, 0.2, 0.23, 0.2], head: ["Level", "In charge", "Timing", "Focus", "Acceptance criteria"], rows: [
      ["Unit (backend)", `${HIEN}, ${NAM}`, "When a business rule, helper or mapper is added or changed", "Application-layer logic isolated from the database", "All tests pass"],
      ["Unit and component (frontend)", KHOA, "Before a feature or fix is merged", "Pure functions; pages and components rendered in jsdom with service modules mocked", "All tests pass, none skipped, stable across repeated runs"],
      ["Integration (backend)", `${HIEN}, ${NAM}`, "Before release checkpoints", "Services and endpoints working together with a real PostgreSQL database", "All tests pass"],
      ["System (manual)", "All team members", "Before each delivery milestone", "Complete business flows on the running product with real data", "No open P0/P1 defect"],
    ] } },
    { p: "User acceptance testing was not run as a separate formal level in this cycle." },
  ],
  "1.4. Assumptions & Constraints": [
    { bullets: [
      "Frontend tests run in jsdom, which has no layout engine. Responsive layout, dark mode and stacking behaviour are therefore asserted through the classes and mechanisms applied, not through measured pixels.",
      "Service modules are mocked at the module boundary. The tests assume that the typed service functions match the real backend contract; a mismatch outside that boundary, such as a wrong API path in the environment configuration, is not detected by these tests.",
      "The six gamification integration tests need a PostgreSQL database with the pgvector extension and silently return early when none is reachable, so a green result alone does not prove that they ran. In this cycle they were run against a disposable PostgreSQL 16 container, and the tables and rows they wrote were checked afterwards.",
      "The six Studio and HR smoke tests host the whole API with its default configuration. That configuration requires SePay settings that are kept outside the repository and points at the team's shared Azure database, where the Studio flow would seed data, create projects and call the RAG service. They were not executed in this cycle to avoid writing test data into the shared database.",
      "There is no continuous-integration pipeline; developers run the suites locally before committing.",
    ] },
  ],
  "2. Test Strategy": [
    { p: "Automated testing is the main source of evidence: backend business rules are unit-tested with xUnit, backend persistence is integration-tested against a real PostgreSQL database, and frontend logic and pages are tested with Vitest and React Testing Library. Complete flows are checked manually on the running product, and every defect found this way is logged together with the commit that fixed it." },
  ],
  "2.1 Testing Types": [
    { types: [
      ["Unit Testing (backend)", "Verify Application-layer business rules in isolation.", "xUnit tests on helpers, mappers, validators, gamification rules and the subscription gate, without a database.", "All test cases pass; each new or changed rule has a corresponding test case."],
      ["Unit Testing (frontend)", "Verify pure functions and service-level logic.", "Vitest tests that call formatting, permission, citation and template-inference functions, the axios authentication/error interceptors, the subscription realtime hook and the plan-cache provider directly (9 test files, 161 test cases, documented per function in the Unit Test workbook).", "All test cases pass."],
      ["UI Component Testing (frontend)", "Verify that pages and components render the right states and react correctly to user actions.", "Vitest with React Testing Library and user-event renders pages and components in jsdom (53 test files, 309 test cases, documented as functional test cases in the Test Report); service modules are replaced with vi.mock so each test controls the loading, success and error responses.", "Default, error and successful-interaction states are covered for every tested page; all test cases pass."],
      ["Integration Testing (backend)", "Verify services and endpoints working together with a real database.", "The gamification tests build the gamification services directly against PostgreSQL (connection string from ConnectionStrings__DefaultConnection) and check the rows they write; the Studio and HR smoke tests host the full API with WebApplicationFactory and call its endpoints over HTTP.", "All tests pass. In this cycle 6 of 12 were executed and passed; the 6 smoke tests were not executed (see 1.4)."],
      ["API Testing (RAG service)", "Verify the HTTP API of the RAG service that the backend calls.", "pytest with FastAPI TestClient on the RAG_IQGS application: 25 tests check authentication, request validation, error formats and platform behaviour without an LLM; 14 tests ingest real documents and run the interview plan flow against a live local Ollama (gemma3:4b, nomic-embed-text) with an isolated ChromaDB.", "All test cases pass; behaviour that differs from the API contract is recorded as a finding."],
      ["Security Testing (automated, application level)", "Verify authentication and authorisation behaviour in the client.", "Tests cover 401 refresh-and-retry, forced logout, 403 handling, role-based page access and per-user isolation of the cached subscription plan.", "Behaviour matches the specification, or the gap is reported as a finding. No penetration testing was performed."],
      ["Regression Testing", "Ensure that merged changes do not break behaviour that previously passed.", "The full frontend suite and the backend unit suite are re-run after significant merges. After the 10/09/2026 anti-cheat merge, 17 frontend test cases failed and were updated to the new UI on 12/09/2026 until all 529 passed. On 13/09/2026 the suite was reduced to 470 test cases - tests for code the app no longer uses were removed and parameterized tables were cut to one row per branch - and re-run with every test passing. On 15/09/2026 both the frontend suite (470/470) and the backend unit tests (232/232) were run again to produce the test reports. After the AI Coach, candidate roadmap and knowledge-folder import merge, the frontend suite was re-run on 19/09/2026: 20 test cases in 6 files failed because the code under test had changed (the practice and feedback screens now read a query parameter through next/navigation, the admin knowledge service gained folder and document-type functions, the HR upload callback gained two arguments, the admin knowledge page now opens on a folder browser, and the plan-limit save message was reworded). The six test files were updated to the new behaviour and the suite passed 470/470.", "No previously passing test case is left failing."],
      ["System Testing (manual)", "Verify complete business flows on the running product.", "Team members use the product end to end and cross-check the UI against real database data; each defect is recorded with its location, root cause and fixing commit.", "No open P0/P1 defect before a delivery milestone."],
    ] },
  ],
  "2.2 Test Levels": [
    { matrix: [
      ["Unit Testing (backend, xUnit)", ["X", "", "", ""]],
      ["Unit Testing (frontend, Vitest)", ["X", "", "", ""]],
      ["UI Component Testing (frontend, Vitest + React Testing Library)", ["X", "", "", ""]],
      ["Security Testing (automated authentication and access checks)", ["X", "", "", ""]],
      ["Integration Testing (backend, xUnit with PostgreSQL and WebApplicationFactory)", ["", "X", "", ""]],
      ["API Testing (RAG service, pytest with FastAPI TestClient and a live Ollama)", ["", "X", "", ""]],
      ["Regression Testing (re-run of the unit and integration suites)", ["X", "X", "", ""]],
      ["System Testing (manual end-to-end use of the product)", ["", "", "X", ""]],
    ] },
  ],
  "2.3 Supporting Tools": [
    { table: { widths: [0.34, 0.33, 0.15, 0.18], head: ["Purpose", "Tool", "Vendor", "Version"], rows: [
      ["Frontend test runner", "Vitest", "Open-source", "4.1.10"],
      ["Rendering and querying components", "React Testing Library, user-event, jest-dom", "Open-source", "16.3.2 / 14.6.3 / 7.0.1"],
      ["Browser-like DOM environment", "jsdom", "Open-source", "29.1.1"],
      ["HTTP-layer mocking for interceptor tests", "axios-mock-adapter", "Open-source", "2.1.0"],
      ["Code coverage (available, no threshold enforced)", "@vitest/coverage-v8", "Open-source", "4.1.10"],
      ["Backend test framework", "xUnit, Microsoft.NET.Test.Sdk", "Open-source", "2.9.2 / 17.12.0"],
      ["Hosting the API in integration tests", "Microsoft.AspNetCore.Mvc.Testing", "Microsoft", "8.0.8"],
      ["RAG service API tests", "pytest, FastAPI TestClient (httpx)", "Open-source", "9.1.1 / FastAPI 0.138.0"],
      ["Local LLM and embeddings for RAG API tests", "Ollama with gemma3:4b and nomic-embed-text", "Open-source", "-"],
      ["Disposable database for integration tests", "Docker with the pgvector/pgvector:pg16 image", "Open-source", "Docker 29.7.2 / PostgreSQL 16"],
      ["Test case and test report documentation", "Excel workbooks (TestCases, Test Report)", "In-house", "-"],
      ["Defect log", "QA Bug Summary Report", "In-house", "-"],
    ] } },
  ],
  "3.1 Human Resources": [
    { table: { widths: [0.22, 0.24, 0.54], head: ["Worker/Doer", "Role", "Specific Responsibilities/Comments"], rows: [
      [KHOA, "Test lead, frontend test automation", "Wrote and maintains the Vitest suite (16 of the 17 commits under tests/), rebuilt the unit test workbook and the functional test report, and ran the 12-15/09/2026 and 19/09/2026 regression cycles."],
      [HIEN, "Backend test automation", "Main author of the backend xUnit unit tests and integration tests (13 commits); designed manual test cases for the RAG/Studio and backend API modules."],
      [NAM, "Backend test automation, manual test design", "Co-author of the backend unit and integration tests (6 commits); designed and reviewed manual test cases for the Auth, Admin and UI modules."],
      [TU, "Fix verification", "Verified fixes and reproduced edge cases during development; implemented the practice anti-cheat feature."],
    ] } },
  ],
  "3.2 Test Environment": [
    { table: { widths: [0.3, 0.7], head: ["Item", "Configuration"], rows: [
      ["Test machine", "Local Windows 11 Pro workstation"],
      ["Frontend runtime", "Node.js 24.13.0; code under test is Next.js 16.2 / React 19.2"],
      ["Frontend test environment", "Vitest 4.1 in jsdom 29 - no browser and no running application; service modules are mocked"],
      ["Backend runtime", ".NET 8 (runtime 8.0.26), built with .NET SDK 10.0.303"],
      ["RAG service test environment", "Python 3.14 virtual environment of RAG_IQGS (commit 145f796); local Ollama with gemma3:4b and nomic-embed-text; temporary ChromaDB and data folder created for the run"],
      ["Backend integration database","Disposable PostgreSQL 16 container (pgvector/pgvector:pg16) on Docker 29.7.2, created for the test run and removed afterwards"],
      ["Manual system testing", "Running web application connected to the team backend with real data"],
      ["Continuous integration", "None - the suites are run locally before committing"],
    ] } },
  ],
  "3.3 Test Milestones": [
    { table: { widths: [0.6, 0.2, 0.2], head: ["Milestone Task", "Start Date", "End Date"], rows: [
      ["Draft the test plan and the first manual test-case workbook (348 test cases, 97 scenarios)", "02/06/2026", "05/08/2026"],
      ["Write backend unit and integration tests alongside the services", "24/07/2026", "08/09/2026"],
      ["Automate frontend scenarios with Vitest and React Testing Library (340 test cases, 33 files)", "05/08/2026", "10/08/2026"],
      ["Extend frontend coverage to 529 test cases in 63 files; extend the workbook to 208 scenarios and 737 test cases", "11/08/2026", "17/08/2026"],
      ["Remove stale test cases and synchronise the QA documents with the code", "10/09/2026", "10/09/2026"],
      ["Regression cycle after the anti-cheat merge (frontend 529/529, backend unit 232/232, backend integration 6/6 executed)", "12/09/2026", "13/09/2026"],
      ["Reduce the frontend suite from 529 to 470 test cases (tests for unused code removed, parameterized tables cut to one row per branch) and synchronise the QA documents", "13/09/2026", "13/09/2026"],
      ["Re-run the frontend and backend unit suites and rebuild the test report and the unit test workbook (393 unit test cases) in the capstone templates", "15/09/2026", "15/09/2026"],
      ["Run the RAG service API tests (39 pytest test cases) against a live local Ollama and record them in the test report", "15/09/2026", "15/09/2026"],
      ["Regression cycle after the AI Coach, candidate roadmap and knowledge-folder import merge: update 6 frontend test files to the changed code and re-run the suite (470/470)", "19/09/2026", "19/09/2026"],
    ] } },
  ],
  "4. Test Cases": [
    { p: "Test cases are documented in the following artifacts:" },
    { bullets: [
      "Functional test cases and test report: Report5_Test_Report.xlsx - 348 test cases in 10 feature modules (309 UI test cases run with Vitest and 39 RAG Service API test cases run with pytest), all Passed - the 309 frontend test cases on 19/09/2026 and the 39 RAG Service API test cases on 15/09/2026 - each with its procedure, expected result, pre-conditions, round results, test date and tester, summarised in the Test Cases and Test Statistics sheets.",
      "Unit test cases: SU26SE102-GSU26SE52_QA_TestCases.xlsx - 57 function sheets with 393 test cases (203 Normal, 68 Abnormal, 122 Boundary): 19 frontend logic functions (161 test cases) and 38 backend application-layer functions (232 test cases), each with lines of code, conditions, confirmations, result and executed date, summarised in the Functions and Statistics sheets.",
      "Defect log: QA_Bug_Summary_Report (Markdown, Excel and Word versions) - 28 defects with location, root cause, fixing commit and regression test.",
      "Automated test sources: tests/unit/ in the frontend repository (62 files: 53 UI component, 9 logic); ApplicationLayer.UnitTests (38 test classes in 32 files) and WebAPI.IntegrationTests (3 test classes) in the backend repository; tests/test_e2e_api.py and tests/test_ollama_integration.py (39 tests) in the RAG_IQGS repository.",
    ] },
    { p: "The functional test cases in Report5_Test_Report.xlsx are grouped by feature and function as follows (the feature codes are those of the scope table in 1.1):" },
    { table: { widths: [0.07, 0.11, 0.37, 0.1, 0.35], head: ["No", "Feature Code", "Function", "Test cases", "Automated test files (tests/unit)"], rows: FUNCTION_ROWS } },
    { p: "Test design effort was prioritised by business risk, from highest to lowest:" },
    { bullets: [
      "Subscription and payment - plan caching across users, payment confirmation and realtime plan updates.",
      "Authentication - token refresh, forced logout and role-based access.",
      "HR Interview Studio - plan approval, question generation and the Free-plan quota.",
      "Question set publishing - editing restrictions after a set is published.",
      "Candidate practice session - start, answering, finishing and the anti-cheat gate.",
    ] },
  ],
  "5.1 Test Statistics": [
    { table: { widths: [0.34, 0.12, 0.11, 0.1, 0.11, 0.22], head: ["Suite", "Test cases", "Passed", "Failed", "Not run", "Executed"], rows: [
      ["Frontend unit and component tests (Vitest)", "470", "470", "0", "0", "19/09/2026"],
      ["Backend unit tests (xUnit)", "232", "232", "0", "0", "15/09/2026"],
      ["RAG service API tests (pytest, live local Ollama)", "39", "39", "0", "0", "15/09/2026"],
      ["Backend integration - gamification persistence (PostgreSQL)", "6", "6", "0", "0", "13/09/2026"],
      ["Backend integration - Studio and HR smoke flows (WebApplicationFactory)", "6", "0", "0", "6", "Not run (needs SePay settings; default configuration targets the shared database)"],
      ["Total", "753", "747", "0", "6", ""],
    ] } },
    { p: "Frontend results by functional area:" },
    { table: { widths: [0.46, 0.18, 0.18, 0.18], head: ["Functional area", "Test files", "Passed", "Failed"], rows: [
      ...FE_GROUPS.map(([a, files, cases]) => [a, String(files), String(cases), "0"]),
      ["Total", "62", "470", "0"],
    ] } },
  ],
  "5.2 Test Analysis": [
    { lead: "Defects.", p: "Twenty-eight real product defects were found and fixed during development and are recorded in the defect log:" },
    { bullets: [
      "2 P0 defects: the cached Premium plan leaked between different users on the same browser, and a failed SignalR payment-hub connection crashed the whole page.",
      "1 P1 defect: the subscription refresh after a successful payment was silently lost on a transient network error.",
      "10 dead buttons whose backend API did not exist yet; they are now disabled with a \"Coming soon\" tooltip.",
      "2 cases of mock data presented as real data (profile statistics and badges, dashboard skill radar).",
      "13 other functional defects, for example edits to a published question set being written to a stale copy, marketplace search matching titles only, and backend rejection reasons being swallowed.",
    ] },
    { lead: "Regression protection.", p: "16 of the 28 defects are locked by an automated regression test, 10 were verified manually when they were fixed but have no automated test yet, 1 (a deployment-specific routing issue) cannot be reproduced in unit tests, and 1 (the Delete button on the Admin Content page) no longer applies because that page was removed." },
    { lead: "Open findings.", p: "The following behaviours are documented by tests or were found while running them, and have not been changed yet:" },
    { bullets: [
      "RGA008-1: HR pages render for a Jobseeker-role session without a client-side redirect.",
      "RGA017-1: authentication tokens are read from browser storage rather than from an httpOnly cookie.",
      "PRACTICE-3: when a practice session fails to start, the candidate only sees a generic error with a Retry button.",
      "RAG027-4: pressing Escape does not close the Sample JD modal.",
      "Admin AI Configuration cannot be saved because the backend has no /api/admin/rag/settings endpoint; the page falls back to default values.",
      "RAG service API: FastAPI request-validation errors (422) and the blank owner_id check return a raw {\"detail\"} body instead of the ApiResponse envelope; no CORS middleware, rate limiting, startup dependency check or LLM request timeout is configured. These behaviours are recorded by the RAG API tests.",
      "Backend test infrastructure: the gamification integration tests return early instead of failing when no database is reachable, so they report Passed without running; the Studio and HR smoke tests have no isolated test configuration; and the Testcontainers.PostgreSql package is referenced by the integration test project but not used.",
    ] },
    { lead: "Defects from the earlier cycle.", p: "The three defects reported in the 16/08/2026 cycle were re-checked against the current code:" },
    { bullets: [
      "\"Use this sample\" filled the JD but did not save it: fixed - the handler now triggers the save. Its regression test (RAG027-1) was retired on 10/09/2026 because the old flow is no longer reachable, so this fix is not re-verified automatically.",
      "A rejected question reorder was silently accepted: fixed - a failed reorder now shows an error toast, and the retired V1 Generate page redirects to the Studio.",
      "{{APPROVE_PLAN}}",
    ] },
    { lead: "Limitations of the test approach.", p: "No automated end-to-end tests exist; jsdom cannot measure layout; mocked services cannot catch contract or configuration mismatches (the refresh-token path defect was caused by a wrong environment value that no unit test can see); no coverage threshold is enforced; six backend integration tests (Studio and HR smoke flows) were not executed in this cycle; and the anti-cheat monitors are stubbed." },
  ],
  "5.3 Conclusion": [
    { p: "All automated tests that were executed in this cycle pass: 470 of 470 frontend test cases, 232 of 232 backend unit test cases, 39 of 39 RAG service API test cases and 6 of 6 executed backend integration tests. The defect log contains no open P0 or P1 defect. The main remaining risks are the absence of automated end-to-end tests, the six Studio and HR smoke tests that were not executed, the 10 fixed defects without a regression test, and the open findings listed in 5.2." },
    { p: "Recommendations for the next cycle, in order of impact:" },
    { bullets: [
      "Give the Studio and HR smoke tests an isolated test configuration (a local database and test SePay values) so that they can run without touching the shared Azure database, and make the gamification tests fail instead of returning early when no database is reachable.",
      "Decide on a client-side role gate for HR routes (RGA008-1).",
      "Either implement /api/admin/rag/settings in the backend or hide the save action on the AI Configuration page.",
      "Add a small automated end-to-end smoke flow: log in, generate a question set, publish it, and complete a practice session.",
    ] },
  ],
};

module.exports = { names: { KHOA, TU, NAM, HIEN }, FE_GROUPS, FEATURES, sections };
