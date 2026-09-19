// Backend application-layer unit tests (xUnit). One entry = one function sheet.
// Case key = TRX test name without "ApplicationLayer.UnitTests.<Folder>." prefix.
// cases: [key, condition, confirmation, type(N/A/B), group("R" return | "E" exception)]
const HIEN = "Nguyễn Trung Hiền";
const NAM = "Nguyễn Minh Nam";
const base = (o) => ({ side: "BE", ...o });
const q = (s) => (s === null ? "null" : `"${s}"`);

module.exports = [
  // ---------------- Candidate ----------------
  base({
    code: "BE-CAN-01", req: "REQ-BE-CAN Candidate AI Coach & Skills", sheet: "BE-CvCoachPromptBuilder", createdBy: NAM,
    className: "CvCoachPromptBuilder", functionName: "BuildSyntheticJd / DiagnosticHrNote / BuildCvContext", src: ["CvCoachPromptBuilder"],
    file: "Candidate/CvCoachPromptBuilderTests.cs",
    desc: "Build the synthetic JD, the diagnostic HR note and the CV context sent to the RAG service for the candidate AI Coach.",
    pre: ["Static helper, no dependencies"],
    cases: [
      ["CvCoachPromptBuilderTests.SyntheticJd_ContainsOnlyProvidedSkills", "BuildSyntheticJd(\"Backend\", \"Junior\", \"Built APIs\", [C#, System Design])", "JD lists only C# and System Design and says \"Do not invent job requirements outside this skill list\"", "N"],
      ["CvCoachPromptBuilderTests.DiagnosticHrNote_RequiresTenQuestionsAndRamp", "DiagnosticHrNote([C#])", "Note asks for 10 questions starting easy and mentions C#", "N"],
      ["CvCoachPromptBuilderTests.BuildCvContext_IncludesSummaryAndSkills", "BuildCvContext(\"Built APIs\", [C#])", "Context contains the summary and C#", "N"],
    ],
  }),
  base({
    code: "BE-CAN-02", req: "REQ-BE-CAN Candidate AI Coach & Skills", sheet: "BE-SkillPlanResolveStatus", createdBy: NAM,
    className: "CandidateSkillPlanService", functionName: "ResolveStatus", src: ["CandidateSkillPlanService.ResolveStatus"],
    file: "Candidate/CvCoachPromptBuilderTests.cs",
    desc: "Resolve the status of a skill-plan item from its latest score and the target score.",
    pre: ["Target score 70"],
    cases: [
      ["CandidateSkillPlanScoringTests.ResolveStatus_DoneWhenAtOrAboveTarget", "Score null / 69.9 / 70", "Pending / InProgress / Done", "B"],
    ],
  }),
  base({
    code: "BE-CAN-03", req: "REQ-BE-CAN Candidate AI Coach & Skills", sheet: "BE-SkillMatchHelper", createdBy: HIEN,
    className: "SkillMatchHelper", functionName: "Compute / UnionCvSkills", src: ["SkillMatchHelper"],
    file: "Candidate/SkillMatchHelperTests.cs",
    desc: "Compare a question set's skills with the candidate's skills and merge CV skills from the tech stack and the CV evaluation JSON.",
    pre: ["Static helper, case-insensitive skill comparison"],
    cases: [
      ["SkillMatchHelperTests.MatchPercent_IsIntersectionOverSetSkills", "Set skills [C#, SQL, React]; candidate [c#, python]", "Percent 33; 1 matched; 2 missing", "N"],
      ["SkillMatchHelperTests.EmptySetSkills_ReturnsNullPercent", "Set skills empty; candidate [C#]", "Percent null", "B"],
      ["SkillMatchHelperTests.UnionCvSkills_MergesTechStackAndEvaluationJson", "Tech stack [C#, SQL] + evaluation JSON skills [System Design, C#]", "Union contains C#, SQL and System Design", "N"],
    ],
  }),

  // ---------------- Gamification ----------------
  base({
    code: "BE-GAM-01", req: "REQ-BE-GAM Gamification Engine", sheet: "BE-AchievementRules", createdBy: HIEN,
    className: "AchievementRules (8 rule classes)", functionName: "IsUnlocked / Code",
    src: ["FirstStepAchievementRule", "OnFireAchievementRule", "ExcellentAnswerAchievementRule", "DedicatedAchievementRule", "TechnicalMindAchievementRule", "SystemThinkerAchievementRule", "ConsistencyAchievementRule", "InterviewVeteranAchievementRule"],
    file: "Gamification/AchievementRuleTests.cs",
    desc: "Decide when each of the 8 achievements is unlocked from the user's practice counters.",
    pre: ["AchievementEvaluationContext with the counter under test; all other counters 0"],
    cases: [
      ["AchievementRuleTests.FirstStep_UnlocksOnFirstSession", "FirstStep: completed sessions 0 / 1", "Code FirstStep; locked at 0, unlocked at 1", "B"],
      ["AchievementRuleTests.OnFire_UnlocksAt7DayStreak", "OnFire: current streak 6 / 7", "Locked at 6, unlocked at 7", "B"],
      ["AchievementRuleTests.ExcellentAnswer_UnlocksAtScore90", "ExcellentAnswer: last score 89 / 90 / null", "Locked at 89 and null, unlocked at 90", "B"],
      ["AchievementRuleTests.Dedicated_UnlocksAt100Questions", "Dedicated: questions completed 99 / 100", "Locked at 99, unlocked at 100", "B"],
      ["AchievementRuleTests.TechnicalMind_UnlocksAt50TechnicalQuestions", "TechnicalMind: technical questions 49 / 50", "Locked at 49, unlocked at 50", "B"],
      ["AchievementRuleTests.SystemThinker_UnlocksAt30SystemDesignQuestions", "SystemThinker: system design questions 29 / 30", "Locked at 29, unlocked at 30", "B"],
      ["AchievementRuleTests.Consistency_UnlocksAt10DailyGoalDays", "Consistency: daily goal days 9 / 10", "Locked at 9, unlocked at 10", "B"],
      ["AchievementRuleTests.InterviewVeteran_UnlocksAt100Sessions", "InterviewVeteran: completed sessions 99 / 100", "Locked at 99, unlocked at 100", "B"],
      ["AchievementRuleTests.AllRuleCodes_AreUniqueAndMatchConstants", "All 8 rule instances", "Rule codes are unique", "N"],
    ],
  }),
  base({
    code: "BE-GAM-02", req: "REQ-BE-GAM Gamification Engine", sheet: "BE-LevelCalculator-Level", createdBy: HIEN,
    className: "LevelCalculator", functionName: "CalculateLevel", src: ["LevelCalculator.CalculateLevel"],
    file: "Gamification/LevelCalculatorTests.cs",
    desc: "Calculate the user's level from total XP using the level thresholds.",
    pre: ["LevelCalculator with default GamificationOptions"],
    cases: [
      ["LevelCalculatorTests.CalculateLevel_ZeroXp_IsLevel1", "Total XP 0", "Level 1", "B"],
      ...[[0, 1], [99, 1], [100, 2], [249, 2], [250, 3], [449, 3], [450, 4], [699, 4], [700, 5], [999, 5], [1000, 6], [1349, 6], [1350, 7]].map(([xp, lvl]) =>
        [`LevelCalculatorTests.CalculateLevel_MatchesSpecThresholds(totalXp: ${xp}, expectedLevel: ${lvl})`, `Total XP ${xp}`, `Level ${lvl}`, "B"]),
      ["LevelCalculatorTests.CalculateLevel_VeryLargeXp_DoesNotThrowAndStaysConsistent", "Total XP 50,000,000", "No exception; total XP of that level <= 50,000,000 < total XP of the next level", "B"],
    ],
  }),
  base({
    code: "BE-GAM-03", req: "REQ-BE-GAM Gamification Engine", sheet: "BE-LevelCalculator-Xp", createdBy: HIEN,
    className: "LevelCalculator", functionName: "GetXpRequiredForNextLevel / GetTotalXpForLevel / GetCurrentLevelXp / GetProgressPercentage",
    src: ["LevelCalculator.GetXpRequiredForNextLevel", "LevelCalculator.GetTotalXpForLevel", "LevelCalculator.GetCurrentLevelXp", "LevelCalculator.GetProgressPercentage"],
    file: "Gamification/LevelCalculatorTests.cs",
    desc: "Calculate XP needed for the next level, total XP of a level, XP inside the current level and progress percentage.",
    pre: ["LevelCalculator with default GamificationOptions"],
    cases: [
      ...[[1, 100], [2, 150], [3, 200], [4, 250], [5, 300], [6, 350]].map(([lvl, d]) =>
        [`LevelCalculatorTests.GetXpRequiredForNextLevel_MatchesFormula(level: ${lvl}, expectedDelta: ${d})`, `XP required after level ${lvl}`, `Required XP = ${d}`, "N"]),
      ...[[1, 0], [2, 100], [3, 250], [4, 450], [5, 700], [6, 1000], [7, 1350]].map(([lvl, t]) =>
        [`LevelCalculatorTests.GetTotalXpForLevel_MatchesSpecTotals(level: ${lvl}, expectedTotal: ${t})`, `Total XP for level ${lvl}`, `Total XP = ${t}`, lvl === 1 ? "B" : "N"]),
      ["LevelCalculatorTests.GetCurrentLevelXp_And_ProgressPercentage_AreConsistent", "Total XP 175 (level 2 starts at 100, next level needs 150)", "Current level XP 75; progress 50%", "N"],
      ["LevelCalculatorTests.GetProgressPercentage_NeverExceeds100", "Total XP 0", "Progress between 0% and 100%", "B"],
    ],
  }),
  base({
    code: "BE-GAM-04", req: "REQ-BE-GAM Gamification Engine", sheet: "BE-StreakCalculator", createdBy: HIEN,
    className: "StreakCalculator", functionName: "Compute", src: ["StreakCalculator.Compute"],
    file: "Gamification/StreakCalculatorTests.cs",
    desc: "Update the current and longest practice streak when the user is active on a local date.",
    pre: ["Today = 09/08/2026 (local date already resolved)"],
    cases: [
      ["StreakCalculatorTests.FirstEverActivity_StartsStreakAt1", "No previous active date; current 0, longest 0", "Current 1, longest 1, new active day", "N"],
      ["StreakCalculatorTests.SameDayMultipleQuestions_DoesNotChangeStreak", "Previous active date = today; current 4, longest 6", "Current 4, longest 6, not a new active day", "N"],
      ["StreakCalculatorTests.ConsecutiveDay_IncrementsStreak", "Previous active date = yesterday; current 4, longest 4", "Current 5, longest 5, new active day", "N"],
      ["StreakCalculatorTests.MissedDay_ResetsStreakTo1ButKeepsLongest", "Previous active date = 3 days ago; current 10, longest 15", "Current 1, longest 15, new active day", "A"],
      ["StreakCalculatorTests.NewStreakExceedingPreviousLongest_UpdatesLongest", "Previous active date = yesterday; current 6, longest 6", "Current 7, longest 7", "B"],
      ["StreakCalculatorTests.TimezoneBoundary_ActivityJustAfterMidnightLocal_CountsAsNewDay", "Previous active date = yesterday (activity just after local midnight); current 1, longest 1", "Current 2, new active day", "B"],
    ],
  }),
  base({
    code: "BE-GAM-05", req: "REQ-BE-GAM Gamification Engine", sheet: "BE-UserLocalDateProvider", createdBy: HIEN,
    className: "UserLocalDateProvider", functionName: "GetLocalDateAsync", src: ["UserLocalDateProvider.GetLocalDateAsync"],
    file: "Gamification/UserLocalDateProviderTests.cs",
    desc: "Convert a UTC instant to the candidate's local date using the profile time zone, falling back to the UTC date.",
    pre: ["UTC instant 09/08/2026 17:30 (= 10/08/2026 00:30 in UTC+7)", "Candidate profile repository is an in-memory fake"],
    cases: [
      ["UserLocalDateProviderTests.NoCandidateProfile_FallsBackToUtcDate", "No candidate profile", "09/08/2026 (UTC date)", "A"],
      ["UserLocalDateProviderTests.TimeZoneIdNotSet_FallsBackToUtcDate", "Profile TimeZoneId = null", "09/08/2026 (UTC date)", "A"],
      ["UserLocalDateProviderTests.ValidTimeZoneId_ConvertsAcrossDateBoundary", "TimeZoneId = Asia/Ho_Chi_Minh", "10/08/2026 (local date)", "N"],
      ["UserLocalDateProviderTests.InvalidTimeZoneId_FallsBackToUtcDate_DoesNotThrow", "TimeZoneId = Not/A_Real_Zone", "09/08/2026 (UTC date), no exception", "A"],
    ],
  }),
  base({
    code: "BE-GAM-06", req: "REQ-BE-GAM Gamification Engine", sheet: "BE-XpRewardPolicy-Score", createdBy: HIEN,
    className: "XpRewardPolicy", functionName: "GetScoreBonus", src: ["XpRewardPolicy.GetScoreBonus"],
    file: "Gamification/XpRewardPolicyTests.cs",
    desc: "Give bonus XP for an answer score by score tier; reject scores outside 0-100.",
    pre: ["XpRewardPolicy with default GamificationOptions"],
    cases: [
      ...[[0, 0], [59, 0], [60, 2], [74, 2], [75, 4], [89, 4], [90, 6], [100, 6]].map(([s, x]) =>
        [`XpRewardPolicyTests.GetScoreBonus_MatchesSpecTiers(score: ${s}, expectedXp: ${x})`, `Score ${s}`, `Bonus ${x} XP`, "B"]),
      ["XpRewardPolicyTests.GetScoreBonus_OutOfRange_Throws(score: -0.01)", "Score -0.01", "ArgumentOutOfRangeException", "A", "E"],
      ["XpRewardPolicyTests.GetScoreBonus_OutOfRange_Throws(score: 100.01000000000001)", "Score 100.01", "ArgumentOutOfRangeException", "A", "E"],
    ],
  }),
  base({
    code: "BE-GAM-07", req: "REQ-BE-GAM Gamification Engine", sheet: "BE-XpRewardPolicy-Bonus", createdBy: HIEN,
    className: "XpRewardPolicy", functionName: "IsImprovementEligible / TryGetStreakMilestoneXp / fixed XP amounts",
    src: ["XpRewardPolicy.IsImprovementEligible", "XpRewardPolicy.TryGetStreakMilestoneXp"],
    file: "Gamification/XpRewardPolicyTests.cs",
    desc: "Decide the improvement bonus (+10 points), streak milestone XP and the fixed XP amounts.",
    pre: ["XpRewardPolicy with default GamificationOptions"],
    cases: [
      ["XpRewardPolicyTests.IsImprovementEligible_MatchesTenPointThreshold(previous: 61, current: 70, expected: False)", "Previous score 61, current 70 (+9)", "Not eligible", "B"],
      ["XpRewardPolicyTests.IsImprovementEligible_MatchesTenPointThreshold(previous: 61, current: 71, expected: True)", "Previous score 61, current 71 (+10)", "Eligible", "B"],
      ["XpRewardPolicyTests.IsImprovementEligible_MatchesTenPointThreshold(previous: 61, current: 72, expected: True)", "Previous score 61, current 72 (+11)", "Eligible", "N"],
      ...[[3, 20], [7, 50], [14, 100], [30, 200]].map(([d, x]) =>
        [`XpRewardPolicyTests.TryGetStreakMilestoneXp_MatchesSpecMilestones(streakDays: ${d}, expectedFound: True, expectedXp: ${x})`, `Streak ${d} days`, `Milestone found: ${x} XP`, "N"]),
      ...[[1, "N"], [5, "N"], [31, "B"]].map(([d, t]) =>
        [`XpRewardPolicyTests.TryGetStreakMilestoneXp_MatchesSpecMilestones(streakDays: ${d}, expectedFound: False, expectedXp: 0)`, `Streak ${d} days`, "No milestone", t]),
      ["XpRewardPolicyTests.FixedXpAmounts_MatchSpecDefaults", "Default options", "Question 10 XP, question set 20 XP, improvement bonus 5 XP", "N"],
    ],
  }),

  // ---------------- Helpers (question set) ----------------
  base({
    code: "BE-QS-01", req: "REQ-BE-QS Question Set Publishing & Rubric", sheet: "BE-PublishQuestionSelection", createdBy: HIEN,
    className: "PublishQuestionSelectionHelper", functionName: "ApplySelection / MapInterviewSelectionToSetQuestionIds", src: ["PublishQuestionSelectionHelper"],
    file: "Helpers/PublishQuestionSelectionHelperTests.cs",
    desc: "Apply the HR's publish selection (soft-deactivate unselected questions) and map interview questions to set question ids.",
    pre: ["Static helper; question state held in a dictionary"],
    cases: [
      ["PublishQuestionSelectionHelperTests.ApplySelection_SoftDeactivatesUnselected", "3 active questions a, b, c; selected [a, c]", "Returns 2 active; b deactivated", "N"],
      ["PublishQuestionSelectionHelperTests.ApplySelection_EmptySelected_ReturnsCurrentActiveCount", "a active, b inactive; selected []", "Returns 1; no state change", "B"],
      ["PublishQuestionSelectionHelperTests.ApplySelection_UnknownId_Throws", "Selected id is not in the set", "ArgumentException", "A", "E"],
      ["PublishQuestionSelectionHelperTests.MapInterviewSelection_PrefersContentThenOrder", "Interview questions matched to set questions by content, then order", "Mapped ids [sq1, sq3]", "N"],
    ],
  }),
  base({
    code: "BE-QS-02", req: "REQ-BE-QS Question Set Publishing & Rubric", sheet: "BE-RubricNormalizer", createdBy: NAM,
    className: "RubricNormalizer", functionName: "NormalizeFromLegacyStrings / NormalizeFromJson / IsPublishReady / FlattenForEvaluate",
    src: ["RubricNormalizer.NormalizeFromLegacyStrings", "RubricNormalizer.NormalizeFromJson", "RubricNormalizer.IsPublishReady", "RubricNormalizer.FlattenForEvaluate"],
    file: "Helpers/RubricNormalizerTests.cs",
    desc: "Normalize scoring rubrics (legacy strings or rubric v1 JSON) to weighted criteria with anchors, check publish readiness and flatten for AI evaluation.",
    pre: ["Static helper, no dependencies"],
    cases: [
      ["RubricNormalizerTests.NormalizeFromLegacyStrings_DistributesWeightsTo100", "Legacy criteria [A, B, C]", "3 criteria, weights total 100, each with at least 2 anchors", "N"],
      ["RubricNormalizerTests.IsPublishReady_RequiresWeight100AndAnchors", "Normalized rubric [Accuracy, Depth]", "Publish ready = true", "N"],
      ["RubricNormalizerTests.FlattenForEvaluate_IncludesAnchors", "Normalized rubric [DI lifecycle]", "1 flattened line containing \"Mốc:\" anchors", "N"],
      ["RubricNormalizerTests.NormalizeFromJson_ParsesRubricV1Document", "Rubric v1 JSON with 2 criteria (60/40) and anchors", "2 criteria, total 100, publish ready", "N"],
    ],
  }),
  base({
    code: "BE-QS-03", req: "REQ-BE-QS Question Set Publishing & Rubric", sheet: "BE-CitationSourceScope", createdBy: NAM,
    className: "StudioRagPlanMapper / StudioRagQuestionMapper", functionName: "ExtractCitationSourcesWithScope / BuildPlanSourceDetails / ExtractCitations",
    src: ["StudioRagPlanMapper.ExtractCitationSourcesWithScope", "StudioRagPlanMapper.BuildPlanSourceDetails", "StudioRagQuestionMapper.ExtractCitations"],
    file: "Helpers/SourceOriginMapperTests.cs",
    desc: "Label plan sources and citations with their scope (JD, HR or SYSTEM knowledge base).",
    pre: ["Static mappers, citation JSON built in the test"],
    cases: [
      ["SourceOriginMapperTests.ExtractCitationSourcesWithScope_ReadsKnowledgeBase", "Citations job-description (hr), policy.pdf (system), hr-guide.pdf (hr)", "Scopes JD, SYSTEM, HR", "N"],
      ["SourceOriginMapperTests.BuildPlanSourceDetails_MapsMetaAndFiles", "sourcesUsed [job-description, knowledge-documents:2, rag-retrieve, policy.pdf] + a system citation", "Scopes JD, HR, none, SYSTEM", "N"],
      ["SourceOriginMapperTests.ExtractCitations_ParsesKnowledgeBaseFromTagsJsonShape", "Raw dictionary citation internal.pdf with knowledgeBase system", "1 citation: knowledge base system, source internal.pdf", "N"],
    ],
  }),

  // ---------------- HR ----------------
  base({
    code: "BE-HR-01", req: "REQ-BE-HR HR Recommendations & JD Fit", sheet: "BE-JdFitReviewMapper", createdBy: NAM,
    className: "JdFitReviewMapper", functionName: "NormalizeVerdict / StripNumeric / Map",
    src: ["JdFitReviewMapper.NormalizeVerdict", "JdFitReviewMapper.StripNumeric", "JdFitReviewMapper.Map"],
    file: "Hr/JdFitReviewMapperTests.cs",
    desc: "Map the RAG JD-fit review of a question set: normalize the verdict label, remove numeric scores from text and drop unknown flags/actions.",
    pre: ["Static mapper, no dependencies"],
    cases: [
      ...[["excellent", "excellent", "N"], ["Tuyệt vời", "excellent", "N"], ["tốt", "good", "N"], ["Tương đối", "fair", "N"], ["Chưa phù hợp", "unfit", "N"], ["nope", null, "A"]].map(([r, e, t]) =>
        [`JdFitReviewMapperTests.NormalizeVerdict_MapsLabels(raw: ${q(r)}, expected: ${q(e)})`, `Verdict label "${r}"`, e ? `Verdict "${e}"` : "Verdict null", t]),
      ["JdFitReviewMapperTests.StripNumeric_RemovesScoresAndPercents", "Text \"Bộ tốt 85/100 và cover 72%.\"", "Text without 85, 72 or %", "N"],
      ["JdFitReviewMapperTests.Map_DropsUnknownFlagsAndTypes", "RAG result with flags onJd + unknown and actions add + explode", "Verdict good; only flag onJd and action add kept; JD source kept", "A"],
    ],
  }),
  base({
    code: "BE-HR-02", req: "REQ-BE-HR HR Recommendations & JD Fit", sheet: "BE-JdFitContentHash", createdBy: NAM,
    className: "JdFitContentHash", functionName: "Compute", src: ["JdFitContentHash.Compute"],
    file: "Hr/JdFitReviewMapperTests.cs",
    desc: "Hash the JD and question texts so a cached JD-fit review is refreshed when either changes.",
    pre: ["One active question \"What is REST?\""],
    cases: [
      ["JdFitContentHashTests.Compute_ChangesWhenJdOrQuestionTextChanges", "Hash with JD A, with JD B, and with the question text changed", "64-character hash; different when the JD or the question text changes", "N"],
    ],
  }),
  base({
    code: "BE-HR-03", req: "REQ-BE-HR HR Recommendations & JD Fit", sheet: "BE-PracticeFeedbackMapper", createdBy: HIEN,
    className: "PracticeSessionFeedbackMapper", functionName: "Map", src: ["PracticeSessionFeedbackMapper.Map"],
    file: "Hr/PracticeSessionFeedbackMapperTests.cs",
    desc: "Build the practice feedback view: full access for HR, a teaser for Free candidates with unscored questions locked.",
    pre: ["Completed session with 2 questions and 2 answers; question 1 has AI score 81"],
    cases: [
      ["PracticeSessionFeedbackMapperTests.HrView_DoesNotLock_AndExposesPersistedScore", "lockTeaser = false (HR view)", "Access Full; no item locked; score 81 and answer text shown", "N"],
      ["PracticeSessionFeedbackMapperTests.CandidateTeaser_LocksUnscoredQuestions", "lockTeaser = true (Free candidate)", "Access FreeTeaser; scored item shown as teaser with 81; other item locked without score; no AI insight", "N"],
    ],
  }),
  base({
    code: "BE-HR-04", req: "REQ-BE-HR HR Recommendations & JD Fit", sheet: "BE-SkillFitCalculator", createdBy: HIEN,
    className: "SkillFitCalculator", functionName: "Compute", src: ["SkillFitCalculator.Compute"],
    file: "Hr/SkillFitCalculatorTests.cs",
    desc: "Calculate the JD/CV skill fit (Jaccard) with matched, missing and extra skills.",
    pre: ["Static calculator, case-insensitive skills"],
    cases: [
      ["SkillFitCalculatorTests.Jaccard_AllOverlap_Is100", "JD [C#, SQL]; CV [c#, sql]", "Fit 100%; 2 matched; nothing missing or extra", "N"],
      ["SkillFitCalculatorTests.Jaccard_HalfOverlap_Is50", "JD [react, node]; CV [react, python]", "Fit 33.3%; 1 matched; node missing; python extra", "N"],
    ],
  }),
  base({
    code: "BE-HR-05", req: "REQ-BE-HR HR Recommendations & JD Fit", sheet: "BE-RecommendationP1Rules", createdBy: HIEN,
    className: "RecommendationP1Rules", functionName: "EnsureCanRestore / EnsureSameQuestionSet / NormalizeCompareIds / NextViewedAt / EnsureInviteSchedule",
    src: ["RecommendationP1Rules"], file: "Hr/SkillFitCalculatorTests.cs",
    desc: "Business rules for candidate recommendations: restore, compare, mark viewed and invite scheduling.",
    pre: ["Static rules, no dependencies"],
    cases: [
      ["RecommendationP1RulesTests.Restore_Invited_ThrowsConflict", "EnsureCanRestore(Invited)", "ConflictException", "A", "E"],
      ["RecommendationP1RulesTests.Restore_Dismissed_Ok", "EnsureCanRestore(Dismissed)", "No exception", "N"],
      ["RecommendationP1RulesTests.Compare_DifferentSets_ThrowsBadRequest", "EnsureSameQuestionSet with 2 different set ids", "BadRequestException", "A", "E"],
      ["RecommendationP1RulesTests.Compare_WrongCount_ThrowsBadRequest", "NormalizeCompareIds with 1 id / with 4 ids", "BadRequestException", "B", "E"],
      ["RecommendationP1RulesTests.View_Idempotent_KeepsExistingTimestamp", "NextViewedAt(existing 01/01/2026 / null, now)", "Existing timestamp kept; a timestamp is set when none exists", "N"],
      ["RecommendationP1RulesTests.Invite_OnlineWithoutLink_Throws", "EnsureInviteSchedule ONLINE without a meeting link", "BadRequestException", "A", "E"],
    ],
  }),
  base({
    code: "BE-HR-06", req: "REQ-BE-HR HR Recommendations & JD Fit", sheet: "BE-RecommendationIntakeScore", createdBy: HIEN,
    className: "RecommendationService", functionName: "ResolveIntakeMinScore", src: ["RecommendationService.ResolveIntakeMinScore"],
    file: "Hr/SkillFitCalculatorTests.cs",
    desc: "Resolve the minimum practice score for candidate recommendation intake, falling back to 70 outside the allowed range.",
    pre: ["Static method, default minimum 70"],
    cases: [
      ...[[70, 70, "N"], [80, 80, "N"], [50, 50, "B"], [95, 95, "B"], [40, 70, "A"], [100, 70, "A"]].map(([i, e, t]) =>
        [`RecommendationIntakeScoreTests.ResolveIntakeMinScore_ClampsOrPasses(input: ${i}, expected: ${e})`, `Minimum score input ${i}`, `Resolved minimum ${e}`, t]),
    ],
  }),

  // ---------------- Knowledge / Profile ----------------
  base({
    code: "BE-KB-01", req: "REQ-BE-KB Knowledge Documents", sheet: "BE-KnowledgeDocumentType", createdBy: HIEN,
    className: "KnowledgeDocumentType", functionName: "NormalizeForStorage / FromSection",
    src: ["KnowledgeDocumentType.NormalizeForStorage", "KnowledgeDocumentType.FromSection"], file: "Knowledge/KnowledgeDocumentTypeTests.cs",
    desc: "Validate and normalize the knowledge document type on upload (required for HR, defaulted for Admin) and map a section name to a type.",
    pre: ["Static constants class"],
    cases: [
      ...[["Policy", "Policy", "N"], ["policy", "Policy", "B"], ["InternalStack", "InternalStack", "N"], ["Rubric", "Rubric", "N"], ["RolePack", "RolePack", "N"]].map(([i, e, t]) =>
        [`KnowledgeDocumentTypeTests.NormalizeForStorage_Hr_AcceptsKnownTypes(input: "${i}", expected: "${e}")`, `HR upload with type "${i}"`, `Stored as ${e}`, t]),
      ["KnowledgeDocumentTypeTests.NormalizeForStorage_Hr_RejectsMissing", "HR upload with type null", "BadRequestException", "A", "E"],
      ["KnowledgeDocumentTypeTests.NormalizeForStorage_Hr_RejectsUnclassified", "HR upload with type \"Unclassified\"", "BadRequestException", "A", "E"],
      ["KnowledgeDocumentTypeTests.NormalizeForStorage_Admin_DefaultsUnclassified", "Admin upload with type null", "Stored as Unclassified", "N"],
      ...[[null, "Unclassified", "B"], ["", "Unclassified", "B"], ["Policy", "Policy", "N"], ["unknown-x", "Unclassified", "A"]].map(([s, e, t]) =>
        [`KnowledgeDocumentTypeTests.FromSection_MapsExpected(section: ${q(s)}, expected: "${e}")`, `Section ${q(s)}`, `Type ${e}`, t]),
    ],
  }),
  base({
    code: "BE-PRF-01", req: "REQ-BE-PRF Candidate Profile", sheet: "BE-ProfileDtoValidator", createdBy: HIEN,
    className: "UpdateCandidateProfileDtoValidator", functionName: "Validate (TimeZoneId rule)", src: ["UpdateCandidateProfileDtoValidator"],
    file: "Profile/UpdateCandidateProfileDtoValidatorTests.cs",
    desc: "Validate the candidate profile update: TimeZoneId is optional but must be a real IANA time zone when given.",
    pre: ["DTO with FullName \"Nguyễn Văn A\""],
    cases: [
      ["UpdateCandidateProfileDtoValidatorTests.NullTimeZoneId_IsValid", "TimeZoneId null", "Valid", "B"],
      ["UpdateCandidateProfileDtoValidatorTests.EmptyTimeZoneId_IsValid", "TimeZoneId \"\"", "Valid", "B"],
      ...["Asia/Ho_Chi_Minh", "UTC", "America/New_York"].map((z) =>
        [`UpdateCandidateProfileDtoValidatorTests.ValidIanaTimeZoneId_IsValid(timeZoneId: "${z}")`, `TimeZoneId "${z}"`, "Valid", "N"]),
      ...["Not/A_Real_Zone", "Asia/Not_A_City", "random-garbage"].map((z) =>
        [`UpdateCandidateProfileDtoValidatorTests.InvalidTimeZoneId_IsInvalid(timeZoneId: "${z}")`, `TimeZoneId "${z}"`, "Invalid; error on TimeZoneId", "A"]),
    ],
  }),

  // ---------------- Studio ----------------
  base({
    code: "BE-STU-01", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-JobDescriptionValidator", createdBy: NAM,
    className: "JobDescriptionValidator", functionName: "Validate / ValidateItDomain / ScoreItDomain",
    src: ["JobDescriptionValidator.Validate", "JobDescriptionValidator.ValidateItDomain", "JobDescriptionValidator.ScoreItDomain"],
    file: "Studio/JobDescriptionValidatorItDomainTests.cs",
    desc: "Validate the structure of a job description and reject JDs that are not for an IT position.",
    pre: ["JD texts padded to at least 100 words"],
    cases: [
      ["JobDescriptionValidatorItDomainTests.Validate_ItJd_Succeeds", "Full Stack Developer JD (ASP.NET Core, React, PostgreSQL)", "Prepared text returned; IT score > 0 and >= non-IT score", "N"],
      ["JobDescriptionValidatorItDomainTests.Validate_MarketingJd_ThrowsItDomain", "Digital Marketing Executive JD", "StructuredHttpException 422 with an IT-domain error", "A", "E"],
      ["JobDescriptionValidatorItDomainTests.ValidateItDomain_NoTech_ReturnsError", "Office administration text with no technology", "Validation error returned", "A"],
    ],
  }),
  base({
    code: "BE-STU-02", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-PlanMergeService", createdBy: NAM,
    className: "PlanMergeService", functionName: "Merge", src: ["PlanMergeService.Merge"],
    file: "Studio/PlanMergeServiceTests.cs",
    desc: "Merge a refine patch from the RAG service into the baseline interview plan, keeping fields the patch does not touch.",
    pre: ["Baseline Backend Developer plan: 10 questions, coverage C# / SQL / REST, summary about .NET and SQL"],
    cases: [
      ["PlanMergeServiceTests.Merge_GitOnlyPatch_ReplacesCoverage_KeepsOtherFields", "Patch replaceCoverage + replaceSkills = Git only", "10 questions; coverage only Git (no SQL); .NET summary kept; difficulty Medium", "N"],
      ["PlanMergeServiceTests.Merge_UpdateSummaryOnly_PreservesCoverage", "Patch with updateSummary only", "New summary saved; C# coverage kept", "N"],
    ],
  }),
  base({
    code: "BE-STU-03", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-FocusAreaWeightHelper", createdBy: NAM,
    className: "StudioFocusAreaWeightHelper", functionName: "NormalizeToPercent / IsValidSum", src: ["StudioFocusAreaWeightHelper"],
    file: "Studio/StudioFocusAreaWeightHelperTests.cs",
    desc: "Convert focus-area weights (legacy 0-1 fractions or percents) to percent and check they sum to 100.",
    pre: ["Static helper"],
    cases: [
      ...[["0.4", "40", "N"], ["0.5", "50", "N"], ["40", "40", "N"], ["100", "100", "B"], ["0", "0", "B"]].map(([i, e, t]) =>
        [`StudioFocusAreaWeightHelperTests.NormalizeToPercent_ConvertsLegacyAndPercent(input: ${i}, expected: ${e})`, `Weight ${i}`, `${e}%`, t]),
      ["StudioFocusAreaWeightHelperTests.IsValidSum_AcceptsNormalizedHundred", "Weights [40, 35, 25]", "Valid sum", "N"],
    ],
  }),
  base({
    code: "BE-STU-04", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-FocusWeightOutline", createdBy: HIEN,
    className: "StudioProportionalAllocator / StudioOutlineFocusRedistributor", functionName: "LargestRemainder / ApplyFocusWeightsToOutline",
    src: ["StudioProportionalAllocator.LargestRemainder", "StudioOutlineFocusRedistributor.ApplyFocusWeightsToOutline"],
    file: "Studio/StudioFocusWeightOutlineTests.cs",
    desc: "Turn focus-area percentages into question slots of the plan outline (largest remainder method).",
    pre: ["Static helpers; outline JSON built in the test"],
    cases: [
      ["StudioFocusWeightOutlineTests.LargestRemainder_FiftyPercent_GetsHalfSlots", "Weights [50, 17, 17, 16], 15 slots", "15 slots in total; first skill gets 7-8", "N"],
      ["StudioFocusWeightOutlineTests.LargestRemainder_AllowsZero_WhenSkillsExceedTotal", "12 equal weights, 10 slots", "10 slots over 12 skills; some skills get 0", "B"],
      ["StudioFocusWeightOutlineTests.Apply_FocusFiftyPercent_OutlineSlotsMatch", "Plan settings: focus C# 50%, SQL 17%, React 17%, Git 16%; 15 questions", "Outline has 15 items, 7-8 of them for C#", "N"],
      ["StudioFocusWeightOutlineTests.Redistributor_EqualSplitFiveSkills_TenSlots", "5 skills at 20% each; 10-item outline", "10 items, 2 per skill", "N"],
    ],
  }),
  base({
    code: "BE-STU-05", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-HrSkillsHelper", createdBy: NAM,
    className: "StudioHrSkillsHelper", functionName: "Normalize", src: ["StudioHrSkillsHelper.Normalize"],
    file: "Studio/StudioHrSkillsNormalizeTests.cs",
    desc: "Clean the skills the HR confirms for a JD: trim, remove duplicates and blanks, cap length and count.",
    pre: ["Static helper; MaxSkills = 20"],
    cases: [
      ["StudioHrSkillsNormalizeTests.Normalize_TrimsDedupesAndCapsLength", "[\"  ASP.NET Core \", \"asp.net core\", PostgreSQL, \"\", \"   \", 100-character skill]", "3 skills: ASP.NET Core, PostgreSQL, and one cut to MaxSkillLength", "N"],
      ["StudioHrSkillsNormalizeTests.Normalize_NullOrEmpty_ReturnsEmpty", "null / empty list", "Empty array", "B"],
      ["StudioHrSkillsNormalizeTests.Normalize_MaxTwenty", "30 skills", "20 skills returned (MaxSkills)", "B"],
    ],
  }),
  base({
    code: "BE-STU-06", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-JdClassifyGate", createdBy: NAM,
    className: "StudioJdClassifyGate", functionName: "TryReject / FromRagFailure / NormalizeDocumentType",
    src: ["StudioJdClassifyGate.TryReject", "StudioJdClassifyGate.FromRagFailure", "StudioJdClassifyGate.NormalizeDocumentType"],
    file: "Studio/StudioJdClassifyGateTests.cs",
    desc: "Reject a JD before saving when the RAG classifier says it is not a job posting or not an IT role, and map RAG failures to HTTP errors.",
    pre: ["Static gate; classification result given as parameters"],
    cases: [
      ["StudioJdClassifyGateTests.TryReject_JobDescriptionItRole_Passes", "documentType job_description, IT role", "No error", "N"],
      ...["resume", "article", "documentation", "other", "tutorial"].map((d) =>
        [`StudioJdClassifyGateTests.TryReject_NonJobDocument_ReturnsNotJobPosting(documentType: "${d}")`, `documentType "${d}", IT role, reason "Đây là tutorial."`, "422 ErrorNotJobPosting with the reason in the message", "A"]),
      ["StudioJdClassifyGateTests.TryReject_JobButNotIt_ReturnsNotItRole", "job_description, not an IT role (Digital Marketing)", "422 ErrorNotItRole with the reason in the message", "A"],
      ["StudioJdClassifyGateTests.TryReject_MissingType_UsesDefaultNotJobMessage", "documentType null", "ErrorNotJobPosting with the default message", "B"],
      ["StudioJdClassifyGateTests.FromRagFailure_ClassifyStage_Maps422", "RAG failure at the classify stage: 422, documentType article", "Error 422 ErrorNotJobPosting", "A", "E"],
      ["StudioJdClassifyGateTests.FromRagFailure_Infra_Maps502", "RAG failure JD_ANALYZE: 502 LLM timeout", "Error 502 ErrorClassifyFailed", "A", "E"],
      ...[["JD", "job_description"], ["job-posting", "job_description"], ["CV", "resume"]].map(([r, e]) =>
        [`StudioJdClassifyGateTests.NormalizeDocumentType_Aliases(raw: "${r}", expected: "${e}")`, `Document type alias "${r}"`, `"${e}"`, "N"]),
    ],
  }),
  base({
    code: "BE-STU-07", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-JdSeniority", createdBy: NAM,
    className: "StudioJdSeniority", functionName: "NormalizeDisplay / ToRagExperienceLevel", src: ["StudioJdSeniority"],
    file: "Studio/StudioJdMetadataConfirmTests.cs",
    desc: "Normalize the seniority the HR confirms for a JD and convert it to the RAG experience level.",
    pre: ["Static helper"],
    cases: [
      ...[["junior", "Junior"], ["Senior", "Senior"], ["mid-level", "Mid"], ["intern", "Intern"], ["Lead", "Lead"]].map(([i, e]) =>
        [`StudioJdSeniorityTests.NormalizeDisplay_AcceptsKnownAliases(input: "${i}", expected: "${e}")`, `Seniority "${i}"`, `"${e}"`, "N"]),
      ...[[null, "B"], ["", "B"], ["expert", "A"], ["Không xác định", "A"]].map(([i, t]) =>
        [`StudioJdSeniorityTests.NormalizeDisplay_RejectsInvalid(input: ${q(i)})`, `Seniority ${q(i)}`, "null (rejected)", t]),
      ["StudioJdSeniorityTests.ToRagExperienceLevel_ReturnsLowercase", "ToRagExperienceLevel(\"Junior\" / \"mid-level\" / null)", "\"junior\" / \"mid\" / null", "N"],
    ],
  }),
  base({
    code: "BE-STU-08", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-RagPlanHrNoteBuilder", createdBy: NAM,
    className: "StudioRagPlanHrNoteBuilder", functionName: "BuildInitial", src: ["StudioRagPlanHrNoteBuilder.BuildInitial"],
    file: "Studio/StudioJdMetadataConfirmTests.cs",
    desc: "Build the HR note sent with the first plan request, including the position, role and seniority confirmed by the HR.",
    pre: ["Static builder"],
    cases: [
      ["StudioRagPlanHrNoteBuilderTests.BuildInitial_IncludesConfirmedPositionRoleAndSeniority", "Position and role Backend Developer, seniority Junior, 15 questions, 60 minutes", "Note contains the position, role, required level Junior, experience_level = junior and STUDIO_UI_PLAN=1", "N"],
    ],
  }),
  base({
    code: "BE-STU-09", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-PlanFocusJdCompleter", createdBy: HIEN,
    className: "StudioPlanFocusJdCompleter", functionName: "MatchJdSkill / EnsureAllJdSkills",
    src: ["StudioPlanFocusJdCompleter.MatchJdSkill", "StudioPlanFocusJdCompleter.EnsureAllJdSkills"],
    file: "Studio/StudioPlanFocusJdCompleterTests.cs",
    desc: "Make sure the plan's focus areas contain every JD skill, matching RAG focus names to the JD catalog and rebalancing weights and coverage.",
    pre: ["Static helper; mapped plan built in the test"],
    cases: [
      ["StudioPlanFocusJdCompleterTests.MatchJdSkill_ExactHeadAndContains", "Catalog [C#, ASP.NET Core, PostgreSQL, React]; names \"C#\", \"C# — OOP\", \"ASP.NET Core – Middleware\", \"Query tuning with PostgreSQL\", \"Kubernetes\"", "C#, C#, ASP.NET Core, PostgreSQL, null", "N"],
      ["StudioPlanFocusJdCompleterTests.EnsureAllJdSkills_FillsMissingAndSumsWeightsTo100", "12 JD skills; RAG focus covers 5 of them plus an unrelated topic; 15 questions", "12 focus areas in JD order, weights total 100, sources kept, missing skills use job-description, coverage 12 items with 15 questions", "N"],
      ["StudioPlanFocusJdCompleterTests.EnsureAllJdSkills_EmptyCatalog_NoChange", "Empty JD skill catalog", "Focus areas unchanged (1 item \"Only\")", "B"],
    ],
  }),
  base({
    code: "BE-STU-10", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-PlanSettingsPatcher", createdBy: NAM,
    className: "StudioPlanSettingsPatcher", functionName: "Apply / AssignOutlineAnswerMethods",
    src: ["StudioPlanSettingsPatcher.Apply", "StudioPlanSettingsPatcher.AssignOutlineAnswerMethods"],
    file: "Studio/StudioPlanSettingsPatcherAnswerMethodTests.cs",
    desc: "Apply the HR's Studio settings (question count, distribution, focus, content mode, outline) to the interview plan JSON.",
    pre: ["Source plan \"Backend interview\" (Mid) with an empty outline unless stated"],
    cases: [
      ["StudioPlanOutlineCitationsTests.Apply_OutlineItems_PersistsCitations", "HR outline of 2 items; item 1 has a job-description citation", "Outline saved with the citation (chunk 2, excerpt, origin HR, why-asked); item 2 has none", "N"],
      ["StudioPlanOutlineCitationsTests.ExtractOutlineItems_ReadsSnakeAndCamelCitations", "Outline JSON with snake_case citation fields", "1 item; citation chunk 1 and excerpt read", "N"],
      ["StudioPlanSettingsPatcherAnswerMethodTests.Apply_Mixed_AssignsHalfCodeSlots", "Content mode Mixed; 10 questions (7 technical, 3 behavioral)", "5 Code and 5 Text slots", "N"],
      ["StudioPlanSettingsPatcherAnswerMethodTests.Apply_TheoryOnly_AllText", "Content mode TheoryOnly; 8 technical questions", "8 Text, 0 Code", "N"],
      ["StudioPlanSettingsPatcherAnswerMethodTests.Apply_CodeOnly_AllCode", "Content mode CodeOnly; 8 questions (technical + coding)", "8 Code, 0 Text", "N"],
      ["StudioPlanSettingsPatcherAnswerMethodTests.AssignOutlineAnswerMethods_Mixed_PrefersCodingTypes", "Mixed mode; outline types technical, coding, behavioral, problemsolving", "Text, Code, Text, Code", "N"],
      ["StudioPlanSettingsPatcherAnswerMethodTests.Apply_WithHrOutlineItems_KeepsHrAnswerMethod", "CodeOnly mode with 5 HR outline items (1 Code, 4 Text)", "HR answer methods kept: 1 Code, 4 Text", "B"],
      ["StudioPlanSettingsPatcherZeroCountTests.Apply_DoesNotThrow_WhenDistributionHasZeroCountCategory", "15 questions; distribution has situational = 0", "No exception; 15 questions; plan JSON written", "B"],
      ["StudioPlanSettingsPatcherZeroCountTests.Apply_RewritesCoverageToHrFocusOnly", "Baseline coverage C# and SQL; HR focus Git 100%", "Coverage and focus areas contain only Git", "N"],
    ],
  }),
  base({
    code: "BE-STU-11", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-PlanSettingsSnapshot", createdBy: NAM,
    className: "StudioPlanSettingsSnapshotHelper", functionName: "BuildFrom / EmbedInSourcePlanJson / TryExtract / IsStale",
    src: ["StudioPlanSettingsSnapshotHelper.BuildFrom", "StudioPlanSettingsSnapshotHelper.EmbedInSourcePlanJson", "StudioPlanSettingsSnapshotHelper.TryExtract", "StudioPlanSettingsSnapshotHelper.IsStale"],
    file: "Studio/StudioPlanSettingsSnapshotHelperTests.cs",
    desc: "Snapshot the Studio settings used for a plan (with a fingerprint) and detect when the settings have changed since.",
    pre: ["StudioSettings built in the test"],
    cases: [
      ["StudioPlanSettingsSnapshotHelperTests.BuildFrom_NormalizesFocusWeightsAndProducesFingerprint", "Settings with focus weights 0.6 (legacy) and 40", "Weights 60 and 40; 64-character fingerprint", "N"],
      ["StudioPlanSettingsSnapshotHelperTests.EmbedAndExtract_RoundTripPreservesFingerprint", "Snapshot embedded into the plan JSON, then extracted", "Same fingerprint", "N"],
      ["StudioPlanSettingsSnapshotHelperTests.IsStale_TrueWhenSettingsChange", "Number of questions changed from 10 to 12 after the snapshot", "Stale = true", "N"],
      ["StudioPlanSettingsSnapshotHelperTests.IsStale_FalseWhenUnchanged", "Settings unchanged", "Stale = false", "N"],
    ],
  }),
  base({
    code: "BE-STU-12", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-QuestionRegenHelper", createdBy: NAM,
    className: "StudioQuestionRegenHelper", functionName: "ResolveSlot / BuildSingleSlotApprovedPlan / ApplyRagResultToQuestion / NormalizeInstruction / BuildAvoidQuestionsNote / BuildRegenHrNote",
    src: ["StudioQuestionRegenHelper.ResolveSlot", "StudioQuestionRegenHelper.BuildSingleSlotApprovedPlan", "StudioQuestionRegenHelper.ApplyRagResultToQuestion", "StudioQuestionRegenHelper.NormalizeInstruction", "StudioQuestionRegenHelper.BuildAvoidQuestionsNote", "StudioQuestionRegenHelper.BuildRegenHrNote"],
    file: "Studio/StudioQuestionRegenHelperTests.cs",
    desc: "Regenerate a single Studio question: find its outline slot, build a one-slot plan, apply the RAG result and build the HR note.",
    pre: ["Static helper; question and plan JSON built in the test"],
    cases: [
      ["StudioQuestionRegenHelperTests.ResolveSlot_UsesOutlineOrder", "Question at order 2; outline item 2 = SOLID, Code, with a citation", "Slot order 2, skill SOLID, goal \"Đánh giá SOLID\", Code, 1 citation", "N"],
      ["StudioQuestionRegenHelperTests.BuildSingleSlotApprovedPlan_TotalOne", "Plan with 30 questions + one OOP slot", "Approved plan with totalQuestions 1 and one outline item OOP", "N"],
      ["StudioQuestionRegenHelperTests.ApplyRagResult_LocksRationaleToGoal", "RAG result with a different rationale; question has an attached image", "Content and sample answer updated; rationale = slot goal; image path and template kept", "N"],
      ["StudioQuestionRegenHelperTests.NormalizeInstruction_TrimsAndFlattens", "Instruction \"  \" / \"  Làm khó hơn \\n \"", "null / \"Làm khó hơn\"", "B"],
      ["StudioQuestionRegenHelperTests.BuildAvoidQuestionsNote_TruncatesAndJoins", "[\"Câu ngắn\", blank, 200 characters, \"Câu ba\"]; max 3 items, 120 characters each", "\"AVOID_QUESTIONS=\" note joined by |#|; blank skipped; long text cut with …", "B"],
      ["StudioQuestionRegenHelperTests.BuildAvoidQuestionsNote_NullWhenEmpty", "Empty list / only blank strings", "null", "B"],
      ["StudioQuestionRegenHelperTests.BuildRegenHrNote_AppendsAvoid", "Mixed mode, BUG_DETECTION, instruction \"Làm khó hơn\", avoid note", "Note contains STUDIO_REGEN=1, HR_REGEN_NOTE and AVOID_QUESTIONS", "N"],
    ],
  }),
  base({
    code: "BE-STU-13", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-QuestionTaxonomyMapper", createdBy: NAM,
    className: "StudioQuestionTaxonomyMapper", functionName: "NormalizeCategory / LegacyTypeToCanonical / FromLegacyQuestionTypes / RescaleQuestionCounts / ToLegacyQuestionTypes",
    src: ["StudioQuestionTaxonomyMapper.NormalizeCategory", "StudioQuestionTaxonomyMapper.LegacyTypeToCanonical", "StudioQuestionTaxonomyMapper.FromLegacyQuestionTypes", "StudioQuestionTaxonomyMapper.RescaleQuestionCounts", "StudioQuestionTaxonomyMapper.ToLegacyQuestionTypes"],
    file: "Studio/StudioQuestionTaxonomyMapperTests.cs",
    desc: "Map legacy question types to the canonical categories and styles, and rescale distribution counts to the question total.",
    pre: ["Static mapper"],
    cases: [
      ...[["system_design", "technical", "N"], ["problem_solving", "technical", "N"], ["behavioral", "behavioral", "N"], ["Hard", "technical", "A"]].map(([i, e, t]) =>
        [`StudioQuestionTaxonomyMapperTests.NormalizeCategory_MapsLegacyTypes(input: "${i}", expected: "${e}")`, `NormalizeCategory("${i}")`, `Category "${e}"`, t]),
      ["StudioQuestionTaxonomyMapperTests.LegacyTypeToCanonical_SystemDesign_IsTechnicalWithStyle", "LegacyTypeToCanonical(\"system_design\")", "Category technical, style system_design", "N"],
      ["StudioQuestionTaxonomyMapperTests.FromLegacyQuestionTypes_DedupesSystemDesignAsTechnical", "Legacy types technical, system_design, problem_solving, behavioral; 10 questions", "2 categories (technical, behavioral); styles system_design and problem_solving; 10 questions, 100%", "N"],
      ["StudioQuestionTaxonomyMapperTests.RescaleQuestionCounts_FitsTotalWhenRagCountsOverflow", "RAG counts 10 + 1 + 1 for a 10-question set", "Counts total 10 and percentages total 100", "B"],
      ["StudioQuestionTaxonomyMapperTests.ToLegacyQuestionTypes_ReturnsOnlyCanonicalCategories", "Distribution technical / behavioral / situational", "3 legacy types, all canonical", "N"],
    ],
  }),
  base({
    code: "BE-STU-14", req: "REQ-BE-STU Interview Plan Studio", sheet: "BE-RagQuestionMapper", createdBy: HIEN,
    className: "StudioRagQuestionMapper", functionName: "ParseMeta / ExtractCitations / ExtractCitationsFromTagsJson / MapToStudioQuestionDto",
    src: ["StudioRagQuestionMapper.ParseMeta", "StudioRagQuestionMapper.ExtractCitationsFromTagsJson", "StudioRagQuestionMapper.MapToStudioQuestionDto"],
    file: "Studio/StudioRagQuestionMapperTests.cs",
    desc: "Read citation origin/provenance and question meta (rationale, skill, focus area) from a question's TagsJson.",
    pre: ["Static mapper; TagsJson built in the test"],
    cases: [
      ["StudioRagQuestionMapperTests.ExtractCitations_ParsesOriginUsedForReason", "TagsJson with HR and SYSTEM citations and source provenance", "2 citations: HR (why-asked) and SYSTEM (knowledge base system); provenance present; no missing-admin warning", "N"],
      ["StudioRagQuestionMapperTests.ExtractCitations_InfersOriginFromKnowledgeBaseWhenLegacy", "Legacy citation with knowledgeBase system and no origin", "Origin inferred as SYSTEM", "B"],
      ["StudioRagQuestionMapperTests.MapToStudioQuestionDto_ExposesRationaleFromTagsJson", "TagsJson rationale \"Đánh giá SOLID\", skill SOLID, focusArea SRP", "DTO rationale, skill SOLID and focus area SRP", "N"],
      ["StudioRagQuestionMapperTests.MapToStudioQuestionDto_SkillNullWhenMissing", "TagsJson with rationale only", "Skill and focus area null", "A"],
    ],
  }),

  // ---------------- Subscription ----------------
  base({
    code: "BE-SUB-01", req: "REQ-BE-SUB Subscription Gates", sheet: "BE-HrGenerateWindow", createdBy: HIEN,
    className: "HrGenerateWindow", functionName: "ResolveMax / IsCooldownActive / NextMark", src: ["HrGenerateWindow"],
    file: "Subscription/HrGenerateWindowTests.cs",
    desc: "Track the HR question-set generation window: maximum per window, 24-hour cooldown and window reset after the cooldown.",
    pre: ["Now = 18/08/2026 04:00 UTC; cooldown 24 hours"],
    cases: [
      ...[[0, 1, "A"], [1, 1, "B"], [3, 3, "N"]].map(([c, e, t]) =>
        [`HrGenerateWindowTests.ResolveMax_UsesFieldOrFallback1(configured: ${c}, expected: ${e})`, `GeneratePerWindow = ${c}`, `Maximum ${e} per window`, t]),
      ["HrGenerateWindowTests.IsCooldownActive_NullLast_False", "No previous successful generation", "Cooldown not active", "N"],
      ["HrGenerateWindowTests.IsCooldownActive_Within24h_True", "Last success 1 hour ago", "Cooldown active", "N"],
      ["HrGenerateWindowTests.IsCooldownActive_After24h_False", "Last success 25 hours ago", "Cooldown not active", "B"],
      ["HrGenerateWindowTests.NextMark_FirstOfOne_SetsLastToLockFe", "Used 0, no last success, maximum 1", "Used 1; last success = now", "N"],
      ["HrGenerateWindowTests.NextMark_AfterCooldown_ResetsWindow", "Used 1, last success 25 hours ago, maximum 1", "Window reset: used 1; last success = now", "B"],
    ],
  }),
  base({
    code: "BE-SUB-02", req: "REQ-BE-SUB Subscription Gates", sheet: "BE-GateHrGenerateRegen", createdBy: HIEN,
    className: "SubscriptionGateService", functionName: "CheckGenerateSetAsync / CheckQuestionRegenAsync",
    src: ["SubscriptionGateService.CheckGenerateSetAsync", "SubscriptionGateService.CheckQuestionRegenAsync"],
    file: "Subscription/HrGenerateWindowTests.cs",
    desc: "Block HR question-set generation and question regeneration according to the plan limits, cooldown and usage.",
    pre: ["Usage metering is an in-memory fake returning the stated usage"],
    cases: [
      ["CheckGenerateSetWindowTests.CheckGenerate_Free_NoLast_DoesNotThrow", "HR Free; no previous generation; window unused", "Allowed (no exception)", "N"],
      ["CheckGenerateSetWindowTests.CheckGenerate_Free_LastWithin24h_ThrowsCooldown", "HR Free; last generation 1 hour ago", "SubscriptionGateException CooldownActive; message mentions \"1 lần\" and \"đánh giá JD\"", "A", "E"],
      ["CheckGenerateSetWindowTests.CheckGenerate_Free_LastOlderThan24h_DoesNotThrow", "HR Free; last generation 25 hours ago", "Allowed (no exception)", "B"],
      ["CheckGenerateSetWindowTests.CheckGenerate_PremiumUnlimited_DoesNotThrow", "HR Premium; generated just now", "Allowed (no exception)", "N"],
      ["CheckGenerateSetWindowTests.CheckGenerate_Free_WindowFullWithoutLast_ThrowsCooldown", "HR Free; window used 1 of 1; no last generation time", "SubscriptionGateException CooldownActive", "A", "E"],
      ["CheckGenerateSetWindowTests.CheckGenerate_Free_WindowFullAfterCooldown_DoesNotThrow", "HR Free; window used 1 of 1; last generation 25 hours ago", "Allowed (no exception)", "B"],
      ["CheckGenerateSetWindowTests.CheckQuestionRegen_Free_AtLimit_Throws", "HR Free; question regeneration used 2 of 2", "SubscriptionGateException QuestionRegenLimit", "B", "E"],
      ["CheckGenerateSetWindowTests.CheckQuestionRegen_Free_UnderLimit_DoesNotThrow", "HR Free; question regeneration used 1 of 2", "Allowed (no exception)", "B"],
      ["CheckGenerateSetWindowTests.CheckQuestionRegen_Premium_DoesNotThrow", "HR Premium; question regeneration used 99", "Allowed (no exception)", "N"],
      ["CheckGenerateSetWindowTests.CheckGenerate_Premium_WindowFull_DoesNotThrow", "HR Premium; window used 99", "Allowed (no exception)", "N"],
    ],
  }),
  base({
    code: "BE-SUB-03", req: "REQ-BE-SUB Subscription Gates", sheet: "BE-GateCandidateCoach", createdBy: HIEN,
    className: "SubscriptionGateService", functionName: "CheckCoachGenerationAsync / CheckGeneratePersonalSetAsync",
    src: ["SubscriptionGateService.CheckCoachGenerationAsync", "SubscriptionGateService.CheckGeneratePersonalSetAsync"],
    file: "Subscription/SubscriptionGateServiceTests.cs",
    desc: "Allow the candidate AI Coach and personal question sets only on the Premium plan, trusting the plan code over a stale limits snapshot.",
    pre: ["Usage metering is an in-memory fake; limits snapshot = Candidate Free"],
    cases: [
      ["SubscriptionGateServiceTests.CheckCoach_PremiumPlan_StaleFreeSnapshot_DoesNotThrow", "AI Coach; Candidate Premium plan with a stale Free snapshot", "Allowed (no exception)", "B"],
      ["SubscriptionGateServiceTests.CheckCoach_FreePlan_BothFlagsFalse_ThrowsFeatureRequiresPremium", "AI Coach; Candidate Free plan", "SubscriptionGateException FeatureRequiresPremium mentioning AI Coach", "A", "E"],
      ["SubscriptionGateServiceTests.CheckCoach_ExpiredPremiumAsFree_ThrowsFeatureRequiresPremium", "AI Coach; expired Premium already downgraded to Free", "SubscriptionGateException FeatureRequiresPremium", "A", "E"],
      ["SubscriptionGateServiceTests.CheckPersonalSet_PremiumPlan_StaleFreeSnapshot_DoesNotThrowPremiumError", "Personal set; Candidate Premium with a stale Free snapshot; used 0", "Allowed (no exception)", "B"],
    ],
  }),
];
