import { listUsers } from "@/features/admin/services/admin-users.service";
import { listCompanies } from "@/features/admin/services/admin-company.service";
import { listQuestionSets } from "@/features/candidate/services/question-set.service";
import type { AdminUserListItem } from "@/features/admin/types/admin-user";
import type { Company } from "@/features/admin/services/admin-company.service";

export interface AdminDashboardStats {
  totalUsers: number;
  hrManagers: number;
  jobSeekers: number;
  recentUsers: AdminUserListItem[];
  companies: Company[];
  totalCompanies: number;
  // Question-set stats
  totalQuestionSets: number;
  easySets: number;
  mediumSets: number;
  hardSets: number;
  totalQuestions: number;
  totalAttempts: number;
  // Question type distribution (technical, behavioral, situational, …)
  questionTypeCounts: Record<string, number>;
}

const DUMMY_QUESTION_STATS = {
  totalQuestionSets: 48,
  easySets: 14,
  mediumSets: 22,
  hardSets: 12,
  totalQuestions: 312,
  totalAttempts: 187,
  questionTypeCounts: {
    technical:   142,
    behavioral:   78,
    situational:  55,
    cultural:     24,
    leadership:   13,
  },
};

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [allUsersPage, hrPage, candidatePage, companiesPage, setsPage] = await Promise.all([
    listUsers({ page: 1, pageSize: 10 }),
    listUsers({ page: 1, pageSize: 1, role: "HR_MANAGER" }),
    listUsers({ page: 1, pageSize: 1, role: "JOB_SEEKER" }),
    listCompanies({ pageSize: 10 }),
    listQuestionSets({ pageSize: 200 }).catch(() => ({ items: [], totalCount: 0 })),
  ]);

  const sets = setsPage.items;
  const easySets   = sets.filter((s) => s.difficulty === "Easy").length;
  const mediumSets = sets.filter((s) => s.difficulty === "Medium").length;
  const hardSets   = sets.filter((s) => s.difficulty === "Hard").length;
  const totalQuestions = sets.reduce((sum, s) => sum + (s.totalQuestions ?? 0), 0);
  const totalAttempts  = sets.reduce((sum, s) => sum + (s.attempts ?? 0), 0);

  // Aggregate question types across all questions in all sets
  const questionTypeCounts: Record<string, number> = {};
  sets.forEach((set) => {
    set.questions.forEach((q) => {
      const type = (q.category || "technical").toLowerCase().trim();
      questionTypeCounts[type] = (questionTypeCounts[type] ?? 0) + 1;
    });
  });
  const hasTypeData = Object.values(questionTypeCounts).some((v) => v > 0);

  // Fall back to demo data when the real API returns no question sets yet
  const hasRealData = setsPage.totalCount > 0;
  const questionStats = hasRealData
    ? {
        totalQuestionSets: setsPage.totalCount,
        easySets, mediumSets, hardSets,
        totalQuestions, totalAttempts,
        questionTypeCounts: hasTypeData ? questionTypeCounts : DUMMY_QUESTION_STATS.questionTypeCounts,
      }
    : DUMMY_QUESTION_STATS;

  return {
    totalUsers: allUsersPage.totalCount,
    hrManagers: hrPage.totalCount,
    jobSeekers: candidatePage.totalCount,
    recentUsers: allUsersPage.items,
    companies: companiesPage.items,
    totalCompanies: companiesPage.totalCount,
    ...questionStats,
  };
}
