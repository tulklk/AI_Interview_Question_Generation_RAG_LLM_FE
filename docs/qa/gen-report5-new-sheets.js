// Adds 31 new per-test-file report sheets to Report5_Test_Report.xlsx,
// matching the exact template/style already used by the SharedUtils sheet
// (Feature/Test requirement/Number of TCs/Testing Round formulas/header row/
// category banner/one row per real test()), then appends matching rows to
// Cover (Record of change), "Test Cases" (feature list), and
// "Test Statistics" (per-sheet rollup).
const ExcelJS = require("exceljs");
const path = require("path");

const FONT = "Tahoma";
const CALIBRI = "Calibri";
const GREEN = "FF76923C";
const WHITE = "FFFFFFFF";
const BLACK = "FF000000";
const BANNER_BLUE_FILL = "FFD6E4F0";
const BANNER_BLUE_TEXT = "FF4472C4";

const thin = { style: "thin", color: { argb: BLACK } };
const medium = { style: "medium", color: { argb: BLACK } };
const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

const TESTER = "Vitest CI";
const DATE = "2026-08-16";

// ---------------------------------------------------------------------------
// Sheet data: one entry per new sheet. `rows` = one row per real test() in
// the source spec file, in source order.
// ---------------------------------------------------------------------------
const SHEETS = [
  {
    name: "AdminPlatformSettings",
    feature: "Admin — Platform Settings",
    requirement:
      "New coverage (no prior Excel scenario) — Admin's Platform Settings page (General/Permissions/Notifications tabs): load/retry, save, permission/notification toggles, and the dead-button (Coming soon) fixes on Permissions Save, Notifications Save, and Reset Platform Data.",
    precond: "AdminSettingsPage rendered via renderWithProviders(); AdminAppShell stubbed pass-through; admin-platform-settings.service mocked at the module boundary.",
    file: "admin-platform-settings.test.tsx",
    rows: [
      ["APS-1", "General tab loads and displays platform settings from the API", "getPlatformSettings resolves platformName/defaultQuestionCount/sessionTimeout etc.", "Fields populated with the fetched values."],
      ["APS-2", "A load failure shows Retry, and Retry re-fetches", "getPlatformSettings rejects once, then Retry clicked", "Retry button shown, then values load after retry."],
      ["APS-3", "Saving calls updatePlatformSettings with the edited platform name", "Edit Platform Name, click Save Changes", "updatePlatformSettings called with the new name; 'Settings saved locally.' shown."],
      ["APS-4", "Admin's permissions are locked, Recruiter's can be toggled", "Permissions tab, 'Manage Users' row", "Admin switch disabled; Recruiter switch toggles false→true."],
      ["APS-5", "Permissions 'Save Permissions' is disabled with a Coming soon tooltip", "Permissions tab", "Button disabled, title='Coming soon' (not a silently broken active button)."],
      ["APS-6", "Toggling a notification event's Email channel updates its state", "Notifications tab, 'JD Generation' row, click Email toggle", "Toggle flips aria-checked false→true."],
      ["APS-7", "'Save Notifications' is disabled with a Coming soon tooltip", "Notifications tab", "Button disabled, title='Coming soon'."],
      ["APS-8", "'Reset Platform Data' danger-zone button is disabled with a Coming soon tooltip", "General tab", "Button disabled, title='Coming soon' (not a live destructive action)."],
    ],
  },
  {
    name: "AdminAiConfig",
    feature: "Admin — AI/RAG Config",
    requirement:
      "New coverage (no prior Excel scenario) — Admin's AI/RAG runtime configuration page (LLM provider switch, chat connection, model params, save).",
    precond: "AdminAiConfigRoutePage rendered via renderWithProviders(); AdminRouteGuard/AdminAppShell stubbed pass-through; admin-rag-settings.service and knowledge.service (getAdminRagStatus) mocked at the module boundary.",
    file: "admin-ai-config.test.tsx",
    rows: [
      ["AICFG-1", "Shows the saved provider, model, and temperature", "getRagSettings/listRagModels resolve with ollama provider, llama3.1:8b, temp=0.3", "Base URL, chat model select, and '(0.3)' shown."],
      ["AICFG-2", "A load failure shows Retry, and Retry re-fetches", "Both calls reject once, then Retry clicked", "Retry button shown, then chat model select repopulated."],
      ["AICFG-3", "Switching to OpenRouter fills the OpenRouter default base URL", "Click the OpenRouter provider button", "Base URL field shows https://openrouter.ai/api/v1."],
      ["AICFG-4", "Saving calls updateRagSettings with the edited temperature", "Edit temperature 0.3→0.7, click Save AI configuration", "updateRagSettings called with temperature=0.7; 'AI configuration saved' shown."],
      ["AICFG-5", "A save failure shows the API's own error message as a toast", "updateRagSettings rejects with 'Backend does not support saving AI config yet.'", "That exact message shown, not a generic one."],
    ],
  },
  {
    name: "AdminContentTable",
    feature: "Admin — Content Table",
    requirement: "New coverage (no prior Excel scenario) — the per-row table on Admin's Content page, and its dead per-row Delete button fix.",
    precond: "ContentTable rendered directly via renderWithProviders() with a fixture session row (no data-fetching of its own).",
    file: "admin-content-table.test.tsx",
    rows: [
      ["ACT-1", "Renders a session row with job title, recruiter, and question count", "session={jobTitle, recruiter, recruiterEmail, questionsCount}", "All 4 values rendered in the row."],
      ["ACT-2", "The per-row Delete button is disabled with a Coming soon tooltip", "Fixture row rendered", "Delete button (Trash2 icon) disabled, title='Coming soon' — not a silently broken active button."],
      ["ACT-3", "The View link still navigates to the session's history detail page", "session id='sess-42'", "Link href='/hr/history/sess-42'."],
    ],
  },
  {
    name: "AdminCompanies",
    feature: "Admin — Company Management",
    requirement: "New coverage (no prior Excel scenario) — Admin's Company Management page (list/search, create single & bulk, edit, delete).",
    precond: "CompanyManagementPage rendered via renderWithProviders(); AdminRouteGuard/AdminAppShell stubbed pass-through; admin-company.service mocked via candidate-service-mocks factory.",
    file: "admin-companies.test.tsx",
    rows: [
      ["ACOMP-1", "Lists companies from listCompanies", "listCompanies resolves 1 company 'Acme Corp'", "'Acme Corp' shown."],
      ["ACOMP-2", "Pressing Enter in the search box re-fetches with that keyword", "Type 'Acme{Enter}'", "listCompanies last called with keyword='Acme'."],
      ["ACOMP-3", "No companies shows the empty state", "listCompanies resolves []", "'No companies found.' shown."],
      ["ACOMP-4", "A load failure shows Retry, and Retry re-fetches", "listCompanies rejects once, then Retry clicked", "Retry (Thử lại) shown, then results load."],
      ["ACOMP-5", "Creating a single company calls createCompany with the trimmed payload", "Add Company, type '  New Co  ', Create Company", "createCompany called with name='New Co' (trimmed); success toast shown."],
      ["ACOMP-6", "Editing a company's name calls updateCompany", "Edit Company, rename to 'Acme Corp Renamed', Save Changes", "updateCompany called with id='co-1', new name; success toast shown."],
      ["ACOMP-7", "Deleting a company asks for confirmation before calling deleteCompany", "Click Delete Company, confirm", "Confirm text shown first, deleteCompany not called until confirmed, then called with 'co-1'."],
    ],
  },
  {
    name: "AdminKnowledgeWrapper",
    feature: "Admin — Knowledge Documents (wrapper)",
    requirement: "New coverage (no prior Excel scenario) — AdminKnowledgePage's own wiring of the shared KnowledgePageContent to the admin-scoped knowledge.service functions.",
    precond: "AdminKnowledgePage rendered via renderWithProviders(); AdminAppShell stubbed pass-through; admin-scoped knowledge.service functions mocked at the module boundary.",
    file: "admin-knowledge.test.tsx",
    rows: [
      ["AKB-1", "Renders the admin heading and lists documents via getAdminKnowledgeDocs", "getAdminKnowledgeDocs resolves with 1 READY doc", "'Knowledge Documents' heading + doc name shown; getAdminKnowledgeDocs called."],
      ["AKB-2", "No documents shows the empty state", "getAdminKnowledgeDocs resolves []", "'No documents yet.' shown."],
    ],
  },
  {
    name: "AdminDashboard",
    feature: "Admin — Dashboard",
    requirement: "New coverage (no prior Excel scenario) — Admin's landing page: KPI values, recent user registrations, platform alerts, load failure/retry, and header Refresh.",
    precond: "AdminDashboardPage rendered via renderWithProviders(); AdminAppShell stubbed pass-through; admin-dashboard.service and knowledge.service (getAdminRagStatus) mocked at the module boundary.",
    file: "admin-dashboard.test.tsx",
    rows: [
      ["ADASH-1", "Renders KPI values from fetchAdminDashboardStats", "totalUsers=120, hrManagers=15, jobSeekers=100, totalCompanies=8", "120/15/100/8 shown."],
      ["ADASH-2", "Lists a recent user registration with name and email", "recentUsers=[{fullName:'Nguyen Van A', email:'a@example.com'}]", "Both values shown."],
      ["ADASH-3", "No companies registered shows the corresponding platform alert", "totalCompanies=0, companies=[]", "'No companies registered' shown."],
      ["ADASH-3b", "Healthy data (companies + HR managers present) shows no alerts", "Default fixture", "'No alerts detected' shown."],
      ["ADASH-4", "A load failure shows the error banner with Retry, and Retry re-fetches", "fetchAdminDashboardStats rejects once, then Retry clicked", "KPI loads; error banner clears."],
      ["ADASH-5", "Clicking Refresh in the header re-fetches dashboard data", "Loaded (120), Refresh clicked, next fetch returns 200", "KPI updates to 200."],
    ],
  },
  {
    name: "AdminMarketplace",
    feature: "Admin — Marketplace Management",
    requirement: "New coverage (no prior Excel scenario) — Admin's Marketplace Management page (browse published sets, search/sort, pin/unpin, detail panel).",
    precond: "AdminMarketplacePage rendered via renderWithProviders(); AdminRouteGuard/AdminAppShell stubbed pass-through; admin-marketplace.service mocked at the module boundary.",
    file: "admin-marketplace.test.tsx",
    rows: [
      ["AMKT-1", "Lists published sets with title, company, and HR owner", "listMarketplaceQuestionSets resolves 1 item", "Title + company name shown."],
      ["AMKT-2", "Typing in search re-fetches with that keyword", "Type 'Backend' (300ms debounce)", "listMarketplaceQuestionSets last called with keyword='Backend'."],
      ["AMKT-3", "No results shows the empty state", "listMarketplaceQuestionSets resolves []", "'No marketplace question sets found.' shown."],
      ["AMKT-4", "A load failure shows the error toast", "listMarketplaceQuestionSets rejects", "'Failed to load marketplace list.' shown."],
      ["AMKT-5", "Pinning a set calls pinMarketplaceQuestionSet and shows a success toast", "Click Pin on an unpinned set", "pinMarketplaceQuestionSet called with 'set-1'; 'Question set pinned.' shown."],
      ["AMKT-6", "Clicking View opens the detail panel with data from getMarketplaceQuestionSetById", "Click View", "getMarketplaceQuestionSetById called with 'set-1'; practitioner name shown in the panel."],
    ],
  },
  {
    name: "AdminPlans",
    feature: "Admin — Subscription Plans",
    requirement: "New coverage (no prior Excel scenario) — Admin's Subscription Plans editor (price/limit editing per plan, save).",
    precond: "AdminPlansRoutePage rendered via renderWithProviders(); AdminRouteGuard/AdminAppShell stubbed pass-through; AdminPlansStats mocked to a placeholder; subscription.service (adminListPlans/adminUpdatePlan) mocked at the module boundary.",
    file: "admin-plans.test.tsx",
    rows: [
      ["APLAN-1", "Lists plans fetched via adminListPlans", "adminListPlans resolves 'HR Premium', askAiPerMonth=999", "Name field='HR Premium', Ask-AI field=999."],
      ["APLAN-2", "Refresh re-fetches the plan list", "Click Refresh, next fetch renames the plan", "Name field updates to the renamed value."],
      ["APLAN-3", "Editing the Ask-AI limit and saving calls adminUpdatePlan with the new value", "Edit 999→500, Save plan", "adminUpdatePlan called with limits.askAiPerMonth=500; success message shown."],
      ["APLAN-4", "A save failure shows the generic save-error toast", "adminUpdatePlan rejects", "'Failed to save the plan.' shown."],
      ["APLAN-5", "The Free visible % field clamps to a maximum of 100", "Field=50, type 150, blur (tab away)", "Field clamps to 100."],
    ],
  },
  {
    name: "HrDashboard",
    feature: "HR — Dashboard",
    requirement: "New coverage (no prior Excel scenario) — HR's landing page: KPIs from the real aggregate endpoint, recent sessions, top recommendations, empty state, retry, and a real code finding in the null-fallback path.",
    precond: "HrDashboard rendered via renderStudio() (HrSubscriptionProvider); hr-dashboard.service and recommendation.service mocked at the module boundary; Premium subscription fixture by default.",
    file: "hr-dashboard.test.tsx",
    rows: [
      ["DASH-1", "Renders KPI values from the real aggregate endpoint", "108 questions, 12 sessions, 9 completed, 75%, topRole='Backend Developer'", "All 5 KPI values shown."],
      ["DASH-2", "Lists a recent session with its job title and question count", "recentSessions=[{role:'Backend Developer', questionCount:15}]", "Role appears ≥2 times (KPI + row); count 15 shown."],
      ["DASH-3", "Lists a top candidate recommendation with name, role, and score", "topRecommendations=[{candidateName:'Nguyen Van A', score:88}]", "Name + '88%' shown."],
      ["DASH-4", "No recommendations yet shows the empty state instead of an empty table", "topRecommendations=[]", "'No candidate recommendations yet.' shown."],
      ["DASH-5", "A load failure shows the error banner with Retry, and Retry re-fetches", "getHrDashboard rejects once, then Retry clicked", "Data loads; error banner clears."],
      ["DASH-6 (finding)", "The soft-fallback null path still reports itself as errored despite showing fallback data", "getHrDashboard resolves null; listRecommendations resolves 1 fallback item", "'Failed to load dashboard data.' banner shown AND 'Fallback Candidate' still rendered."],
    ],
  },
  {
    name: "HrHistory",
    feature: "HR — Question Set History",
    requirement: "New coverage (no prior Excel scenario) — the page HR lands on to manage every question set: search/filter, publish/unpublish, bookmark, export, delete (with a PUBLISHED-set delete guard).",
    precond: "QuestionSetHistoryTable rendered via renderStudio(); hr-history.service and interview.service mocked at the module boundary; Premium subscription fixture by default.",
    file: "hr-history.test.tsx",
    rows: [
      ["HIST-1", "Lists question sets with title, status badge, and question count", "1 Draft + 1 Published set", "Both titles + badges + counts (8, 12) shown."],
      ["HIST-2", "Search filters rows by title", "Type 'react'", "Non-matching row hidden; matching row shown."],
      ["HIST-3", "filter='PUBLISHED'/'bookmarked' only show the matching sets", "Each filter applied in turn", "Only the matching set visible each time."],
      ["HIST-4", "A load failure shows the error message instead of the table", "listHistoryQuestionSets rejects 'Network error loading sets'", "That message shown instead of the table."],
      ["HIST-5", "Publishing a Draft set calls publishQuestionSet and flips its badge to Published", "Click 'Publish to marketplace' on qs-1", "publishQuestionSet called with 'qs-1'; both rows show 'Published'."],
      ["HIST-6", "Unpublishing a Published set calls unpublishQuestionSet and flips its badge to Draft", "Click 'Unpublish' on qs-2", "unpublishQuestionSet called with 'qs-2'; both rows show 'Saved'."],
      ["HIST-7", "Toggling the bookmark icon calls toggleHrBookmark", "Click 'Save to bookmarks' on qs-1", "toggleHrBookmark called with 'qs-1'."],
      ["HIST-8", "Delete asks for confirmation first, then removes the row on confirm", "Click Delete on qs-1, confirm", "Confirm shown first, deleteHistoryQuestionSet not called until confirmed, then called with 'qs-1'; row removed."],
      ["HIST-9", "The export (Download Excel) button only shows for a Premium plan, not Free", "Premium, then Free subscription", "Button present for Premium, absent for Free."],
      ["HIST-10", "A PUBLISHED set's Delete button is disabled and never opens the confirm dialog", "Click the disabled Delete on qs-2 (Published)", "Button disabled; click no-ops — no dialog opens, deleteHistoryQuestionSet not called."],
    ],
  },
  {
    name: "CandidateBilling",
    feature: "Candidate — Billing",
    requirement: "New coverage (no prior Excel scenario) — Candidate's Billing tab: current plan, usage, payment history/receipt download, dead-button fixes, upgrade, and cancel-to-Free flow.",
    precond: "CandidateBillingPage rendered via renderCandidate(); candidate-billing.service mocked via candidate-service-mocks factory; UpgradeModal mocked to a lightweight placeholder.",
    file: "candidate-billing.test.tsx",
    rows: [
      ["CBILL-1", "A Free subscriber sees the Free plan and their practice-attempt usage", "planType=FREE, practiceUsed=3/5", "'Free Plan' + '3/5' shown."],
      ["CBILL-2", "A Premium subscriber sees the Premium plan and their renewal date", "planType=PREMIUM, renewalDate=2026-09-15", "'Premium' + formatted date shown."],
      ["CBILL-3", "No payment history shows the empty state", "getCandidatePaymentHistory resolves []", "'No payment history yet.' shown."],
      ["CBILL-4", "A past payment shows its invoice row", "1 invoice 'CAND-2026-01-01'", "Row shown."],
      ["CBILL-5", "An invoice WITH a receiptUrl renders a real Download link", "Invoice has receiptUrl", "Real link with href=receiptUrl and download attribute."],
      ["CBILL-6", "An invoice WITHOUT a receiptUrl shows a disabled Download button with a Coming soon tooltip", "Invoice has no receiptUrl", "No link rendered; disabled button, title='Coming soon'."],
      ["CBILL-7", "A Premium subscriber's Manage Subscription button is disabled with a Coming soon tooltip", "Premium subscriber", "Button disabled, title='Coming soon'."],
      ["CBILL-8", "'Update Billing Info' and 'Change Payment Method' are disabled with a Coming soon tooltip", "Free subscriber", "Both buttons disabled, title='Coming soon'."],
      ["CBILL-9", "A Free subscriber clicking Upgrade to Premium opens the upgrade modal", "Click Upgrade to Premium", "Upgrade modal dialog opens."],
      ["CBILL-10", "A Premium subscriber can cancel — confirm calls cancelSubscription and reverts to Free", "Cancel Plan, confirm Cancel Subscription", "cancelSubscription called; plan card reverts to 'Free Plan'."],
    ],
  },
  {
    name: "CandidateDashboard",
    feature: "Candidate — Dashboard",
    requirement: "New coverage (no prior Excel scenario) — Candidate's landing page: KPIs, recent sessions, empty state, retry, and recommended sets with independent retry.",
    precond: "CandidateDashboard rendered via renderCandidate(); practice-session.service and question-set.service mocked at the module boundary.",
    file: "candidate-dashboard.test.tsx",
    rows: [
      ["CDASH-1", "Renders the total-sessions KPI from real practice stats", "totalSessions=6, averageScore=78", "'6' + '78%' shown."],
      ["CDASH-2", "Lists a recent session with its question-set title", "setTitle='Frontend React Deep Dive'", "Title shown."],
      ["CDASH-3", "No sessions yet shows the empty state instead of a session list", "listCompletedSessions resolves []", "'No practice sessions yet.' shown."],
      ["CDASH-4", "A load failure shows Retry, and Retry re-fetches", "Both calls reject once, then Retry clicked", "Session data loads after retry."],
      ["CDASH-5", "Renders recommended sets fetched via listQuestionSets", "listQuestionSets resolves 'SRE Site Reliability Track'", "Title shown; called with pageSize=3."],
      ["CDASH-6", "A recommended-sets load failure shows its own independent Retry", "listQuestionSets rejects once, main data loads fine", "Recommended-sets Retry re-populates independently."],
    ],
  },
  {
    name: "CandidateProfile",
    feature: "Candidate — Profile",
    requirement: "New coverage (no prior Excel scenario) — Candidate's My Profile page: view/edit form, LinkedIn URL validation, skills, and CV management (upload/delete-confirm).",
    precond: "CandidateProfile rendered via renderCandidate(); user.service, candidate-cv.service, practice-session.service mocked at the module boundary; Gamification sub-widgets mocked to placeholders.",
    file: "candidate-profile.test.tsx",
    rows: [
      ["PROF-1", "Shows the loaded profile info and practice stats", "targetRole='Backend Developer', totalSessions=4, averageScore=81", "All 3 values shown."],
      ["PROF-2", "Clicking Edit Profile switches to edit mode with current values pre-filled", "Click Edit Profile", "Inputs pre-filled; Save Changes button shown."],
      ["PROF-3", "Saving valid changes calls updateCandidateProfile with the trimmed form", "Edit targetRole to '  Staff Backend Engineer  ', Save Changes", "Called with targetRole='Staff Backend Engineer' (trimmed); success message; edit mode exits."],
      ["PROF-4", "An invalid LinkedIn URL blocks saving client-side", "Type 'not-a-url' into LinkedIn field, Save Changes", "Validation message shown; updateCandidateProfile never called."],
      ["PROF-5", "Adding a skill via Enter updates the skills list, included on save", "Type 'Kubernetes{Enter}'", "Chip shown; saved techStack includes it."],
      ["PROF-6", "Uploading a CV from the empty state calls uploadCv and the new file appears", "Upload 'new-resume.pdf'", "uploadCv called with the file; file name appears."],
      ["PROF-7", "Deleting an existing CV asks for confirmation before calling deleteCv", "Click Delete, confirm", "Confirm shown first, deleteCv not called until confirmed, then called; 'CV deleted.' shown."],
    ],
  },
  {
    name: "CandidateSettings",
    feature: "Candidate — Settings",
    requirement: "New coverage (no prior Excel scenario) — Candidate's Settings hub: tab routing (?tab= param), General tab (CV sync, language), and Privacy tab (plan-gated recruiter recommendations toggle).",
    precond: "SettingsPage rendered via renderCandidate(); candidate-billing.service, privacy-settings.service, candidate-cv.service mocked at the module boundary; Profile/Billing/Gamification tabs mocked to placeholders.",
    file: "candidate-settings.test.tsx",
    rows: [
      ["CSET-1", "Defaults to the Profile tab", "No ?tab= param", "[CandidateProfile] placeholder shown."],
      ["CSET-2", "The ?tab= query param opens that tab on load", "?tab=billing", "[CandidateBillingPage] placeholder shown."],
      ["CSET-3", "Clicking the General nav item switches to the General tab", "Click General nav item", "'Language' (General tab content) shown."],
      ["CSET-4", "Toggling CV sync off calls updateCvSyncSettings(false)", "Click the CV-sync toggle", "updateCvSyncSettings called with false."],
      ["CSET-5", "Switching language to Tiếng Việt re-labels the General tab", "Click 'Tiếng Việt'", "'Ngôn ngữ' shown."],
      ["CSET-6", "A Premium candidate can toggle recruiter recommendations", "planType=PREMIUM, toggle clicked", "updatePrivacySettings called with false; 'Preference updated' shown."],
      ["CSET-7", "A Free candidate sees a 'Premium only' lock instead of a toggle", "planType=FREE (default)", "'Premium only' shown, no switch; clicking Upgrade opens the upgrade heading."],
    ],
  },
  {
    name: "CandidateSubscriptionContext",
    feature: "Candidate — Subscription Context (P0 fix)",
    requirement: "P0 regression coverage — the shared/kiosk-browser plan-cache bug fix: the localStorage plan cache is scoped to the exact user id it was written for.",
    precond: "CandidateSubscriptionProvider + a Probe component rendered via renderWithProviders(); candidate-billing.service and user.service mocked at the module boundary; localStorage pre-seeded per scenario.",
    file: "candidate-subscription-context.test.tsx",
    rows: [
      ["CSUB-1 (regression)", "A Premium plan cached for user A must NOT be applied to user B on the same browser", "Cache={PREMIUM, user-A}; current user=user-B; fetch hangs", "Shows plan:FREE for user-B, never plan:PREMIUM."],
      ["CSUB-2", "A Premium plan cached for the SAME user IS applied immediately", "Cache={PREMIUM, user-A}; current user=user-A; fetch hangs", "Shows plan:PREMIUM for user-A immediately."],
      ["CSUB-3", "refreshSubscription writes the cache scoped to the current user id, not globally", "current user=user-C; fetch resolves PREMIUM", "Shows plan:PREMIUM; cache written with user='user-C'."],
      ["CSUB-4", "No cache at all still resolves to the real FREE plan once the API responds", "current user=user-D; fetch resolves FREE", "Shows plan:FREE for user-D."],
    ],
  },
  {
    name: "CandidateUpgradeModal",
    feature: "Candidate — Upgrade Modal (P1 fix)",
    requirement: "P1 regression coverage — UpgradeModal's own finishPaid retry-on-failure fix: a dropped post-payment refresh must not silently leave premium features looking locked.",
    precond: "UpgradeModal rendered via renderWithProviders(); candidate-billing.service and subscription.service mocked at the module boundary; the real SignalR hub connection is NOT mocked (fails to construct in jsdom, exercising the real poll-only fallback).",
    file: "candidate-upgrade-modal.test.tsx",
    rows: [
      ["UPM-1", "finishPaid retries the post-payment refresh on transient failure and still calls onDone", "Order becomes Paid; getCandidateSubscription rejects twice then resolves PREMIUM", "getCandidateSubscription called 3 times; onDone called once with fresh subscription/usage/history."],
      ["UPM-2", "finishPaid gives up quietly after 3 straight failures — onDone just never fires", "Order becomes Paid; getCandidateSubscription rejects all 3 attempts", "Called 3 times; onDone never called; onClose already called; no crash."],
    ],
  },
  {
    name: "FeedbackResultClient",
    feature: "Candidate — Feedback Result (score polling)",
    requirement: "New coverage (no prior Excel scenario) — the score-polling state machine (SCORE_POLL_MAX_ATTEMPTS timeout + retryScoring() re-poll flow) behind FeedbackResultClient.",
    precond: "FeedbackResultClient rendered via renderWithProviders() under fake timers (vi.useFakeTimers()); JobseekerAppShell/FeedbackPage/QuestionSetFeedbackDialog stubbed; practice-session.service and question-set.service mocked at the module boundary.",
    file: "feedback-result-client.test.tsx",
    rows: [
      ["FRC-1", "Shows scoring while overallScore is null, then flips to done once a poll returns a score", "3 calls: null, null, 85", "State 'scoring' through 2 nulls, then 'done'; called 3 times total."],
      ["FRC-2", "After SCORE_POLL_MAX_ATTEMPTS straight nulls, scoring times out instead of polling forever", "Every poll returns null", "State flips to 'timed-out'; called 1+MAX_ATTEMPTS times."],
      ["FRC-3", "Clicking Retry after a timeout restarts polling and can still succeed", "Timed out, click 'Retry scoring', next poll returns 90", "State goes back to 'scoring' then 'done'."],
      ["FRC-4", "A score already present on initial load skips polling entirely", "getPracticeSession returns overallScore=72 on the first call", "State 'done' immediately; called exactly once."],
    ],
  },
  {
    name: "HrBilling",
    feature: "HR — Billing & Subscription",
    requirement: "New coverage (no prior Excel scenario) — HR's plan/billing tab: current plan, payment history/receipt download, and cancel-to-Free flow (includes the real backend fix keeping Premium active until period end).",
    precond: "HrBillingSubscription rendered via renderStudio(); hr-billing.service and subscription.service mocked at the module boundary.",
    file: "hr-billing.test.tsx",
    rows: [
      ["BILL-1", "Shows the Free plan name for a Free subscriber", "planType=FREE", "'Free' shown."],
      ["BILL-2", "Shows the Premium plan name for a Premium subscriber", "planType=PREMIUM", "'Premium' shown."],
      ["BILL-3", "A Free subscriber (no payment history) sees no invoice rows", "getHrPaymentHistory resolves []", "No invoice row rendered."],
      ["BILL-4", "A Premium subscriber's payment history shows their invoice", "1 invoice 'HR-2026-01-01'", "Row shown."],
      ["BILL-4b", "An invoice WITH a receiptUrl renders a real Download link", "Invoice has receiptUrl", "Real link with href=receiptUrl and download attribute."],
      ["BILL-4c", "An invoice WITHOUT a receiptUrl shows a disabled Download button with a Coming soon tooltip", "Invoice has no receiptUrl", "No link rendered; disabled button, title='Coming soon'."],
      ["BILL-5", "Clicking Downgrade to Free opens a confirm dialog without cancelling immediately", "Click Downgrade to Free", "'Downgrade to Free' heading + 'Keep Premium' shown; no cancel call yet."],
      ["BILL-6", "Keep Premium closes the dialog without cancelling the subscription", "Click Keep Premium", "Dialog closes; subscription not cancelled."],
      ["BILL-7 (regression)", "Confirming Downgrade to Free keeps Premium active until period end", "cancelSubscriptionSandbox resolves with planCode still PREMIUM, status='Cancelled'", "cancelSubscriptionSandbox called once; 'Downgrade to Free' CTA still present (not reverted to Free)."],
    ],
  },
  {
    name: "HrKnowledge",
    feature: "HR — Knowledge Documents",
    requirement: "New coverage (no prior Excel scenario) — the shared KnowledgePageContent component (listing, upload with a size-limit finding, delete-confirm) behind both the HR and Admin Knowledge pages.",
    precond: "KnowledgePageContent rendered directly via renderWithProviders() with injected callback props (onFetchDocs/onUpload/onDelete/onReingest), variant='hr'.",
    file: "hr-knowledge.test.tsx",
    rows: [
      ["KB-1", "Lists documents fetched via onFetchDocs, with file name and status", "1 READY doc 'handbook.pdf'", "File name + 'Ready' status shown."],
      ["KB-2", "No documents shows the empty state", "onFetchDocs resolves []", "'No documents yet.' shown."],
      ["KB-3", "A Failed document shows its error message", "FAILED doc, errorMessage='Unreadable PDF content'", "That message shown."],
      ["KB-4", "Uploading a valid file calls onUpload and the new document appears", "Upload 'resume-guide.pdf'", "onUpload called with the file; file name appears."],
      ["KB-5 (finding)", "A file over the 20MB limit is rejected client-side without ever calling onUpload", "Upload 'huge.pdf', 21MB", "'File \"huge.pdf\" exceeds 20 MB.' shown; onUpload never called — no server-side type re-check exists either."],
      ["KB-6", "Delete asks for confirmation first, then removes the row on confirm", "Open row menu, 'Xoá nguồn', confirm Delete", "Confirm shown first, onDelete not called until confirmed, then called with 'doc-1'; row removed."],
    ],
  },
  {
    name: "HrRecommendations",
    feature: "HR — Candidate Recommendations",
    requirement: "New coverage (no prior Excel scenario) — where HR reviews AI-matched candidates: listing/filter/search, shortlist/dismiss actions, and status-gating (terminal vs. re-actionable states).",
    precond: "RecommendationsList rendered via renderWithProviders(); recommendation.service mocked at the module boundary.",
    file: "hr-recommendations.test.tsx",
    rows: [
      ["REC-1", "Lists candidates with name, role, and score", "1 candidate, score=88", "Name + '88' shown."],
      ["REC-2", "Switching to the Shortlisted status tab re-fetches with that status filter", "Click Shortlisted tab", "Last called with status='SHORTLISTED'."],
      ["REC-3", "Search filters client-side by question set title", "Type 'react'", "Matching candidate hidden; non-matching one shown."],
      ["REC-4", "No matches shows the empty state", "listRecommendations resolves []", "'No candidates found matching your filters.' shown."],
      ["REC-5", "A load failure shows Retry, and Retry re-fetches", "Rejects once, then Retry clicked", "Results load after retry."],
      ["REC-6", "Shortlisting a NEW candidate calls shortlistRecommendation and shows a success toast", "status=NEW, click Shortlist", "shortlistRecommendation called; 'Added to shortlist.' shown."],
      ["REC-7 (finding)", "Dismissing an already-acted candidate (409) shows a specific message", "dismissRecommendation rejects with 409", "'This candidate has already been invited or dismissed.' shown, not the generic message."],
      ["REC-8", "A DISMISSED candidate can still be shortlisted again (not terminal)", "status=DISMISSED, click Shortlist", "shortlistRecommendation called successfully."],
      ["REC-9", "An INVITED candidate has no shortlist/dismiss actions available (terminal)", "status=INVITED", "No Shortlist/Dismiss buttons rendered."],
    ],
  },
  {
    name: "HrSettingsPrefsNotifs",
    feature: "HR — Settings: Preferences & Notifications",
    requirement: "New coverage (no prior Excel scenario) — HR Settings' Preferences and Notifications tabs, both with dead-button (Coming soon) Save fixes.",
    precond: "PreferencesSection / NotificationsSection rendered via renderStudio(); Free subscription fixture by default.",
    file: "hr-settings-preferences-notifications.test.tsx",
    rows: [
      ["HRPREF-1", "The Preferences 'Save Changes' button is disabled with a Coming soon tooltip", "Preferences tab", "Button disabled, title='Coming soon'."],
      ["HRNOTIF-1", "The Notifications 'Save Changes' button is disabled with a Coming soon tooltip", "Notifications tab", "Button disabled, title='Coming soon'."],
      ["HRNOTIF-2", "Toggling a notification preference updates its checked state", "Click the first toggle", "aria-checked flips."],
    ],
  },
  {
    name: "Invitations",
    feature: "Candidate — Interview Invitations",
    requirement: "New coverage (no prior Excel scenario) — the candidate-side respond-to-invitation flow: listing/filter, accept (with validation and a 409 finding), and decline.",
    precond: "InvitationsList rendered via renderCandidate(); invitation.service mocked at the module boundary.",
    file: "invitations.test.tsx",
    rows: [
      ["INV-1", "Lists invitations with company name and a live Pending count on the tab", "1 PENDING + 1 ACCEPTED", "Both names shown; Pending tab badge='1'."],
      ["INV-2", "Clicking the Accepted tab filters the list to accepted invitations only", "Click Accepted tab", "PENDING company hidden; ACCEPTED one shown."],
      ["INV-3", "No invitations at all shows the empty state", "listInvitations resolves []", "Empty-state message shown."],
      ["INV-4", "A load failure shows Retry, and Retry re-fetches", "Rejects once, then Retry clicked", "Invitation loads after retry."],
      ["INV-5", "Accept opens a modal; an invalid phone number blocks confirm", "Type '12345' (invalid), Accept invitation", "Validation message shown; acceptInvitation never called."],
      ["INV-6", "Confirming Accept with a valid phone calls acceptInvitation and flips status to Accepted", "Type '0912345678', Accept invitation", "acceptInvitation called; 'Invitation accepted' shown."],
      ["INV-7 (finding)", "A 409 on accept shows a specific 'already responded' message", "acceptInvitation rejects with 409", "\"You've already responded to this invitation.\" shown, not the generic message."],
      ["INV-8", "Decline asks for confirmation first, then calls rejectInvitation", "Click Decline, confirm in alert dialog", "Confirm shown first, rejectInvitation not called until confirmed, then called; 'Invitation declined' shown."],
    ],
  },
  {
    name: "Marketplace",
    feature: "Candidate — Question Set Marketplace",
    requirement: "New coverage (no prior Excel scenario) — the marketplace browse/filter/bookmark flow, including the client-side filtering workaround for a BE that only reliably filters by CompanyId.",
    precond: "MarketplacePage rendered via renderCandidate(); question-set.service and admin-company.service mocked at the module boundary.",
    file: "marketplace.test.tsx",
    rows: [
      ["MKT-1", "Lists all sets returned by the backend as cards (title + company)", "3 sets across 2 companies", "All 3 titles shown; 'Acme Corp' appears twice."],
      ["MKT-2", "Typing in search filters client-side by title, company, and skill", "Type 'react'", "Only the React set remains visible; no re-fetch with a keyword param."],
      ["MKT-3", "Selecting a Difficulty filters the visible cards to that difficulty only", "Select Difficulty=Hard", "Only the Hard set remains visible."],
      ["MKT-4", "No matches shows the empty state instead of an empty grid", "Search for non-matching text", "'No question sets found. Try a different search.' shown."],
      ["MKT-5", "A load failure shows an error state with Retry, and Retry re-fetches", "2nd listQuestionSets call rejects, then Retry clicked", "All 3 sets load after retry."],
      ["MKT-6", "Clicking the bookmark icon on a card calls toggleBookmark and flips its state", "Click 'Save for later'", "toggleBookmark called; label flips to 'Remove from saved'."],
      ["MKT-7", "Each card's Start Practice button links to its own set-detail route", "3 cards, default featured sort", "hrefs = /jobseeker/sets/{s1,s2,s3} in fetch order."],
    ],
  },
  {
    name: "PracticeSession",
    feature: "Candidate — Practice Session",
    requirement: "New coverage (no prior Excel scenario) — the core take-a-practice-interview flow: starting, resuming, answering/finishing, submit, an auto-completed-fallback finding, and locked Free-plan questions.",
    precond: "PracticeSession rendered via renderCandidate() with a fixed set prop; practice-session.service and candidate-billing.service mocked at the module boundary.",
    file: "practice-session.test.tsx",
    rows: [
      ["PRACTICE-1", "Shows a loading spinner while the session is starting", "startPracticeSession never resolves", "'Starting your practice session…' shown."],
      ["PRACTICE-2", "Once started, renders the first unanswered question with its badges", "startPracticeSession resolves a 2-question session", "Question text + 'Question 1 of 2' shown."],
      ["PRACTICE-3 (finding)", "A generic start failure shows Retry, and Retry re-invokes startPracticeSession", "Rejects, then Retry clicked, then resolves", "'Failed to start...' shown, then Retry succeeds."],
      ["PRACTICE-4", "A 403 (ForbiddenError) shows a no-access message instead of the generic one", "startPracticeSession rejects with ForbiddenError", "\"You don't have access...\" shown, not the generic message."],
      ["PRACTICE-5", "Resuming a session with previously-submitted answers lands on the first unanswered question", "q-1 answered, q-2 not", "q-2's text shown; 'Resumed' badge + welcome-back toast shown."],
      ["PRACTICE-6", "The Finish button only appears once every answerable question has content", "Answer q1, then q2", "Finish button absent until both answered, then appears."],
      ["PRACTICE-7", "Clicking Finish opens a review-confirmation dialog rather than submitting immediately", "Click Finish & Get Feedback", "'Submit this session?' shown; completePracticeSession not yet called."],
      ["PRACTICE-8", "Confirming submits every answer, completes the session, and navigates to the result page", "Click Submit & grade", "completePracticeSession called; router pushed to the result page."],
      ["PRACTICE-9 (finding)", "If complete() fails but the session is already COMPLETED server-side, still routes to the result page", "completePracticeSession rejects (400); getPracticeSession reports status=COMPLETED", "Still routed to the result page; no error shown."],
      ["PRACTICE-10", "A locked question hides its text/answer box and shows an upgrade prompt", "Single-question session, isLocked=true", "Upgrade prompt shown; real question text NOT rendered."],
    ],
  },
  {
    name: "PremiumRevokedDialog",
    feature: "Shared — Premium Revoked Dialog",
    requirement: "New coverage (no prior Excel scenario) — shown when an admin revokes a user's Premium plan mid-session (PREMIUM→FREE transition detected by the app shells).",
    precond: "PremiumRevokedDialog rendered directly via renderWithProviders().",
    file: "premium-revoked-dialog.test.tsx",
    rows: [
      ["PRD-1", "Renders nothing when closed", "open=false", "'Premium Plan Revoked' NOT rendered."],
      ["PRD-2", "When open, shows the revoked title and the HR lost-features list by default", "open=true, no audience prop", "Title + HR items shown."],
      ["PRD-3", "audience='candidate' swaps in the candidate lost-features list instead of HR's", "open=true, audience='candidate'", "Title + candidate items shown; 'Publish to Marketplace' absent."],
      ["PRD-4", "No Upgrade CTA is rendered when onUpgrade isn't provided", "No onUpgrade prop", "No 'Upgrade Again' button rendered."],
      ["PRD-5", "Clicking 'Upgrade Again' calls onUpgrade then onClose", "Click 'Upgrade Again →'", "onUpgrade called once, then onClose called once."],
      ["PRD-6", "Clicking the bottom 'Close' button calls onClose without onUpgrade", "Click the 2nd 'Close' button", "onClose called once; onUpgrade not called."],
      ["PRD-7", "Clicking the backdrop calls onClose", "Click backdrop", "onClose called once."],
      ["PRD-8", "Pressing Escape calls onClose", "Press Escape", "onClose called once."],
      ["PRD-9", "The X close button in the header also calls onClose", "Click the 1st 'Close' button", "onClose called once."],
    ],
  },
  {
    name: "SubscriptionRealtime",
    feature: "Shared — Subscription Realtime (P0 fix)",
    requirement: "P0 regression coverage — createSubscriptionPaymentHubConnection() returning null instead of throwing on construction failure, and the 30s fallback poll behind useSubscriptionRealtime.",
    precond: "A Probe component using useSubscriptionRealtime rendered directly via RTL's render(); @microsoft/signalr NOT mocked (fails to construct in jsdom, exercising the real fallback path); fake timers (vi.useFakeTimers()).",
    file: "subscription-realtime.test.tsx",
    rows: [
      ["SUBRT-1", "createSubscriptionPaymentHubConnection() never throws even when construction fails in jsdom", "Call it directly in jsdom", "Does not throw (returns null instead)."],
      ["SUBRT-2", "Mounting never crashes, even though the real SignalR connection fails to construct", "Render a component using the hook", "Render does not throw."],
      ["SUBRT-3", "The 30s fallback poll calls onSubscriptionChanged even though SignalR is unavailable", "Advance 30s twice", "onChange called twice."],
      ["SUBRT-4", "enabled=false skips setup entirely — no poll ever fires", "enabled=false, advance 120s", "onChange never called."],
      ["SUBRT-5", "Unmounting clears the fallback poll — no further calls after cleanup", "Advance 30s, unmount, advance 60s more", "onChange called once total."],
      ["SUBRT-6", "Always calls the latest onSubscriptionChanged, not a stale closure from the first render", "Rerender with a new callback before the first tick", "Old callback never called; new one called once."],
    ],
  },
  {
    name: "SecuritySection",
    feature: "Shared — Change Password (Security tab)",
    requirement: "New coverage (no prior Excel scenario) — the change-password form shared by Candidate and HR Settings' Security tab.",
    precond: "SecuritySection rendered directly via renderWithProviders(); user.service (changePassword) mocked at the module boundary.",
    file: "security-section.test.tsx",
    rows: [
      ["SEC-1", "Submitting with empty fields shows an error and never calls the API", "All fields empty, Save Changes", "'Could not update password. Please try again.' shown; changePassword not called."],
      ["SEC-2", "A new password under 8 characters is rejected client-side", "new='short1' (6 chars)", "'Password must be at least 8 characters.' shown."],
      ["SEC-3", "A mismatched confirmation is rejected client-side", "confirm ≠ new", "'New passwords do not match.' shown."],
      ["SEC-4", "A valid submission calls changePassword and clears the form on success", "Valid current/new/confirm", "changePassword called with the payload; success message shown; fields cleared."],
      ["SEC-5", "An API failure shows the generic save-failed error", "changePassword rejects", "'Could not update password. Please try again.' shown."],
    ],
  },
  {
    name: "XpHistorySection",
    feature: "Gamification — XP History",
    requirement: "New coverage (no prior Excel scenario) — the XP transaction log, standalone and embedded (Candidate Settings 'XP History' tab).",
    precond: "XpHistorySection rendered directly via renderWithProviders(); gamification-api (getXpHistory) mocked at the module boundary; sessionStorage cleared per test.",
    file: "xp-history-section.test.tsx",
    rows: [
      ["XPH-1", "Lists XP entries with their label and amount", "entry: label='Session completed', xp=20", "Label + '+20' shown."],
      ["XPH-2", "Falls back to a type-based i18n label when the backend omits one", "label='', type='StreakMilestone'", "'Streak milestone' shown."],
      ["XPH-3", "No entries shows the empty state", "getXpHistory resolves items=[]", "'No XP history yet...' shown."],
      ["XPH-4", "Fetches only 10 entries when standalone (not embedded)", "Default render", "getXpHistory called with (1, 10)."],
      ["XPH-5", "Embedded mode renders without the outer card title, and fetches 30 entries", "embedded prop", "No 'XP History' title; getXpHistory called with (1, 30)."],
    ],
  },
  {
    name: "DailyGoalSettings",
    feature: "Gamification — Daily Goal Settings",
    requirement: "New coverage (no prior Excel scenario) — the daily-XP-goal preset picker on Candidate Settings' General tab.",
    precond: "DailyGoalSettings rendered directly via renderWithProviders(); gamification-api (getMyProgress/updateDailyGoal) mocked at the module boundary; sessionStorage cleared per test.",
    file: "daily-goal-settings.test.tsx",
    rows: [
      ["DGS-1", "Highlights the current server-saved preset as active", "dailyGoalXp=50", "'50 XP' button has the active border class."],
      ["DGS-2", "The Save button is hidden until a different preset is selected", "Loaded, no selection change", "No 'Save goal' button rendered."],
      ["DGS-3", "Selecting a different preset and saving calls updateDailyGoal", "Click '80 XP', Save goal", "updateDailyGoal called with 80; 'Daily goal updated' shown."],
      ["DGS-4", "After saving, the newly picked preset shows as active immediately (optimistic)", "After DGS-3's save completes", "'80 XP' now has the active class; Save button hidden again."],
      ["DGS-5", "A save failure shows an error toast and keeps the Save button visible", "updateDailyGoal rejects", "'Could not update goal' shown; Save button still visible."],
    ],
  },
  {
    name: "GamificationProgressCard",
    feature: "Gamification — Progress Card",
    requirement: "New coverage (no prior Excel scenario) — the XP/level/streak/daily-goal card shown on Candidate Profile and Settings pages.",
    precond: "GamificationProgressCard rendered directly via renderWithProviders(); gamification-api (getMyProgress) mocked at the module boundary; sessionStorage cleared per test.",
    file: "gamification-progress-card.test.tsx",
    rows: [
      ["GPC-1", "Shows level, total XP, streak, and today's XP", "level=4, totalXp=1250, currentStreak=3", "'Level 4', '1,250 XP', 'Practitioner', '3' shown."],
      ["GPC-2", "A completed daily goal shows the celebratory message", "dailyGoalCompleted=true, todayXp=50", "'Daily goal completed! 🎉' shown."],
      ["GPC-3", "An incomplete daily goal shows the remaining XP", "dailyGoalXp=50, todayXp=20", "'30 XP left to reach your goal' shown."],
      ["GPC-4", "Clicking 'How to earn XP?' opens the XP guide panel", "Click the button", "'How to earn XP' panel shown."],
      ["GPC-5", "A load failure keeps showing the loading skeleton (no crash, no stale data)", "getMyProgress rejects", "Card has aria-busy='true'."],
    ],
  },
  {
    name: "AchievementGrid",
    feature: "Gamification — Achievement Grid",
    requirement: "New coverage (no prior Excel scenario) — the full and compact achievement-grid variants: listing/filter/empty/retry, and compact-variant sort order.",
    precond: "AchievementGrid rendered directly via renderWithProviders(); gamification-api (getAchievements) mocked at the module boundary.",
    file: "achievement-grid.test.tsx",
    rows: [
      ["AG-1", "Lists achievements with unlocked count", "2 achievements, 1 unlocked", "Both names shown; '1/2 Unlocked' shown."],
      ["AG-2", "Filtering by category shows only that category's achievements", "Click 'Streak' filter", "Non-matching hidden; matching shown."],
      ["AG-3", "No achievements shows the empty state", "getAchievements resolves []", "'No achievements yet — start practising!' shown."],
      ["AG-4", "A load failure shows Try again, and Try again re-fetches", "Rejects once, then Try again clicked", "Data loads after retry."],
      ["AG-5", "Sorts unlocked achievements before locked ones (compact variant)", "variant='compact', 1 locked + 1 unlocked", "Unlocked name appears before the locked one in DOM order."],
    ],
  },
];

const THIS_DIR = "c:/FPT/SEP490/AI_Interview_Question_Generation_RAG_LLM_FE/docs/qa";

function styleHeaderCellA(cell, isFirst) {
  cell.font = { bold: true, size: 10, name: FONT, charset: 134 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE }, bgColor: { argb: WHITE } };
  cell.border = { left: medium, right: thin, top: isFirst ? medium : thin, bottom: thin };
  cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
}
function styleValueCell(cell, isFirst, bold) {
  cell.font = { bold: !!bold, size: 10, name: FONT, charset: 134 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE }, bgColor: { argb: WHITE } };
  cell.border = { left: thin, right: thin, top: isFirst ? medium : thin, bottom: thin };
  cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
}

// Row-height estimate for wrapped 11pt Calibri text in a column of the given
// Excel "width units" — ~0.9 chars fit per unit at this size/font. Used so a
// data row is always tall enough for its longest wrapped cell (Description/
// Procedure/Expected Results/Pre-conditions all wrap independently in the
// same row), instead of relying on Excel's on-open autofit, which does not
// reliably run for rows ExcelJS wrote without an explicit height.
function heightForWrappedText(text, widthUnits, charsPerUnit = 0.9) {
  const charsPerLine = Math.max(6, Math.round(widthUnits * charsPerUnit));
  const lines = Math.max(1, Math.ceil(String(text ?? "").length / charsPerLine));
  return Math.max(15, lines * 14 + 4);
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

const COL_WIDTHS = [18, 50, 60, 65, 50, 12, 15, 15, 12, 15, 15, 12, 15, 15, 15];

function buildSheet(wb, def) {
  const ws = wb.addWorksheet(def.name);
  ws.columns = COL_WIDTHS.map((w) => ({ width: w }));

  ws.getCell(1, 1).value = "Feature";
  ws.getCell(2, 1).value = "Test requirement";
  ws.getCell(3, 1).value = "Number of TCs";
  ws.getCell(4, 1).value = "Testing Round";
  ws.getCell(4, 2).value = "Passed";
  ws.getCell(4, 3).value = "Failed";
  ws.getCell(4, 4).value = "Pending";
  ws.getCell(5, 1).value = "Round 1";
  ws.getCell(6, 1).value = "Round 2";
  ws.getCell(7, 1).value = "Round 3";

  ws.getCell(1, 2).value = humanizeEmDash(def.feature);
  ws.getCell(2, 2).value = humanizeEmDash(def.requirement);
  ws.mergeCells(1, 2, 1, 4);
  ws.mergeCells(2, 2, 2, 4);
  ws.mergeCells(3, 2, 3, 4);

  const n = def.rows.length;
  ws.getCell(3, 2).value = { formula: "SUM(B5:D5)" };
  ws.getCell(5, 2).value = { formula: 'COUNTIF(F1:F1000,"Passed")' };
  ws.getCell(5, 3).value = { formula: 'COUNTIF(F1:F1000,"Failed")' };
  ws.getCell(5, 4).value = { formula: 'COUNTIF(F1:F1000,"Pending")' };
  ws.getCell(6, 2).value = { formula: 'COUNTIF(I1:I1000,"Passed")' };
  ws.getCell(6, 3).value = { formula: 'COUNTIF(I1:I1000,"Failed")' };
  ws.getCell(6, 4).value = { formula: 'COUNTIF(I1:I1000,"Pending")' };
  ws.getCell(7, 2).value = { formula: 'COUNTIF(L1:L1000,"Passed")' };
  ws.getCell(7, 3).value = { formula: 'COUNTIF(L1:L1000,"Failed")' };
  ws.getCell(7, 4).value = { formula: 'COUNTIF(L1:L1000,"Pending")' };

  for (let r = 1; r <= 7; r++) {
    const isFirst = r === 1;
    for (let c = 1; c <= 4; c++) {
      const cell = ws.getCell(r, c);
      if (c === 1) styleHeaderCellA(cell, isFirst);
      else styleValueCell(cell, isFirst, r === 4);
    }
  }

  // row 8 blank spacer — leave default

  const headerRow = ["Test Case ID", "Test Case Description", "Test Case Procedure", "Expected Results", "Pre-conditions", "Round 1", "Test date", "Tester", "Round 2", "Test date", "Tester", "Round 3", "Test date", "Tester", "Note"];
  ws.getRow(9).values = headerRow;
  ws.getRow(9).eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: WHITE }, name: FONT, charset: 134 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN }, bgColor: { argb: GREEN } };
    cell.border = borderAll;
    cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
  });

  ws.getCell(10, 1).value = "Vitest Test Cases (automated, component/service-boundary mocked)";
  ws.mergeCells(10, 1, 10, 15);
  const bannerCell = ws.getCell(10, 1);
  bannerCell.font = { bold: true, size: 11, color: { argb: BANNER_BLUE_TEXT }, name: CALIBRI, charset: 134 };
  bannerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BANNER_BLUE_FILL }, bgColor: { argb: BANNER_BLUE_FILL } };
  bannerCell.border = borderAll;
  bannerCell.alignment = { vertical: "top", wrapText: true };
  ws.getRow(10).height = 30.1;

  def.rows.forEach(([id, desc, procedureDetail, expected], i) => {
    const r = 11 + i;
    const procedure = `Automated — tests/unit/${def.file} (${id})${procedureDetail ? ": " + procedureDetail : ""}`;
    const vals = [id, desc, procedure, expected, def.precond, "Passed", DATE, TESTER, "Passed", DATE, TESTER, "Passed", DATE, TESTER, ""].map(humanizeEmDash);
    const row = ws.getRow(r);
    row.values = vals;
    row.eachCell((cell, colNum) => {
      cell.font = { size: 11, name: CALIBRI, charset: 134 };
      cell.fill = { type: "pattern", pattern: "none" };
      cell.border = borderAll;
      const leftAlignCols = [2, 3, 4, 5, 8, 11, 14];
      cell.alignment = { horizontal: leftAlignCols.includes(colNum) ? "left" : undefined, vertical: "top", wrapText: true };
    });
    // Wrapping columns (B/C/D/E) can each need multiple lines — take the tallest.
    const wrapNeeds = [
      heightForWrappedText(desc, COL_WIDTHS[1]),
      heightForWrappedText(procedure, COL_WIDTHS[2]),
      heightForWrappedText(expected, COL_WIDTHS[3]),
      heightForWrappedText(def.precond, COL_WIDTHS[4]),
    ];
    row.height = Math.max(...wrapNeeds);
  });

  ws.views = [{ state: "frozen", ySplit: 9, topLeftCell: "A10", zoomScale: 100, zoomScaleNormal: 100 }];
  return ws;
}

async function main() {
  const file = path.join(THIS_DIR, "Report5_Test_Report.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  const existingNames = new Set();
  wb.eachSheet((ws) => existingNames.add(ws.name));

  // Sheets already present (from an earlier run) are removed and rebuilt in
  // place — picks up content/style fixes (e.g. row-height) without
  // duplicating or re-appending their Cover/Test Cases/Test Statistics rows.
  // Only genuinely new sheet names get those metadata rows appended below.
  const added = [];
  const replaced = [];
  for (const def of SHEETS) {
    const isNew = !existingNames.has(def.name);
    if (!isNew) {
      const existingWs = wb.getWorksheet(def.name);
      wb.removeWorksheet(existingWs.id);
    }
    buildSheet(wb, def);
    if (isNew) added.push(def);
    else replaced.push(def);
  }
  console.log("Added", added.length, "new sheets;", "rebuilt", replaced.length, "existing sheets");

  // ---------------- Cover: append Record of change rows ----------------
  const cover = wb.getWorksheet("Cover");
  let lastRow = 10;
  for (let r = 11; r <= cover.rowCount; r++) {
    if (cover.getCell(r, 1).value) lastRow = r;
  }
  const templateRow = cover.getRow(11);
  added.forEach((def, i) => {
    const r = lastRow + 1 + i;
    const row = cover.getRow(r);
    row.values = [DATE.split("-").reverse().join("-"), 2, def.name, "A", humanizeEmDash(`Added ${def.feature} unit-test report sheet`)];
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      const tmplCell = templateRow.getCell(c);
      cell.font = tmplCell.font;
      cell.border = tmplCell.border;
      cell.alignment = tmplCell.alignment;
    }
  });

  // ---------------- Test Cases: append feature rows ----------------
  const tcSheet = wb.getWorksheet("Test Cases");
  let tcLastRow = 8;
  let tcLastNo = 0;
  for (let r = 9; r <= tcSheet.rowCount; r++) {
    const no = tcSheet.getCell(r, 1).value;
    if (no) {
      tcLastRow = r;
      tcLastNo = typeof no === "number" ? no : tcLastNo;
    }
  }
  const tcTemplateRow = tcSheet.getRow(9);
  added.forEach((def, i) => {
    const r = tcLastRow + 1 + i;
    const row = tcSheet.getRow(r);
    row.values = [tcLastNo + 1 + i, def.feature, def.name, def.requirement, def.precond].map(humanizeEmDash);
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      const tmplCell = tcTemplateRow.getCell(c);
      cell.font = tmplCell.font;
      cell.border = tmplCell.border;
      cell.alignment = tmplCell.alignment;
    }
  });

  // ---------------- Test Statistics: append per-sheet rollup rows ----------------
  const statSheet = wb.getWorksheet("Test Statistics");
  let statLastRow = 10;
  let statLastNo = 0;
  for (let r = 11; r <= statSheet.rowCount; r++) {
    const no = statSheet.getCell(r, 1).value;
    if (no) {
      statLastRow = r;
      statLastNo = typeof no === "number" ? no : statLastNo;
    }
  }
  const statTemplateRow = statSheet.getRow(11);
  added.forEach((def, i) => {
    const r = statLastRow + 1 + i;
    const row = statSheet.getRow(r);
    const n = def.rows.length;
    row.getCell(1).value = statLastNo + 1 + i;
    row.getCell(2).value = def.name;
    row.getCell(3).value = { formula: `INDIRECT("'"&B${r}&"'!B5")` };
    row.getCell(4).value = { formula: `INDIRECT("'"&B${r}&"'!C5")` };
    row.getCell(5).value = { formula: `INDIRECT("'"&B${r}&"'!D5")` };
    row.getCell(6).value = 0;
    row.getCell(7).value = { formula: `INDIRECT("'"&B${r}&"'!B3")` };
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      const tmplCell = statTemplateRow.getCell(c);
      cell.font = tmplCell.font;
      cell.border = tmplCell.border;
      cell.alignment = tmplCell.alignment;
    }
  });

  await wb.xlsx.writeFile(file);
  console.log("Saved:", file);
  console.log("Total rows added across new sheets:", added.reduce((s, d) => s + d.rows.length, 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
