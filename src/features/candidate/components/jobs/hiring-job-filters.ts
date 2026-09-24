import type { Difficulty, QuestionSet } from "@/features/candidate/types/jobseeker";
import { listQuestionSets } from "@/features/candidate/services/question-set.service";

export type WorkplaceType = "AtOffice" | "Hybrid" | "Remote";

export interface HiringJobFilters {
  urgentOnly: boolean;
  workplaceTypes: WorkplaceType[];
  salaryMin?: number;
  salaryMax?: number;
  numericSalaryOnly: boolean;
  expertises: string[];
  skills: string[];
  domains: string[];
  locations: string[];
  companies: string[];
  difficulties: Difficulty[];
  maxDurationMinutes?: number;
}

export interface HiringFacets {
  workplaces: WorkplaceType[];
  expertises: string[];
  skills: string[];
  domains: string[];
  locations: string[];
  companies: string[];
  difficulties: Difficulty[];
  salaryBoundMin: number;
  salaryBoundMax: number;
  durationMax: number;
}

export const EMPTY_HIRING_FILTERS: HiringJobFilters = {
  urgentOnly: false,
  workplaceTypes: [],
  salaryMin: undefined,
  salaryMax: undefined,
  numericSalaryOnly: false,
  expertises: [],
  skills: [],
  domains: [],
  locations: [],
  companies: [],
  difficulties: [],
  maxDurationMinutes: undefined,
};

export const CATALOG_PAGE_SIZE = 50;
export const CATALOG_CAP = 200;
export const LIST_PAGE_SIZE = 10;

const WORKPLACE_ORDER: WorkplaceType[] = ["AtOffice", "Hybrid", "Remote"];
const DIFFICULTY_ORDER: Difficulty[] = ["Easy", "Medium", "Hard"];

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function jobDurationMinutes(job: QuestionSet): number | undefined {
  return job.timeLimitMinutes ?? job.estimatedTimeMinutes ?? undefined;
}

function hasNumericSalary(job: QuestionSet): boolean {
  return job.salaryMin != null || job.salaryMax != null;
}

/** Inclusive range overlap; treats single-bound jobs as a point/half-open range. */
export function salaryRangesOverlap(
  jobMin: number | null | undefined,
  jobMax: number | null | undefined,
  filterMin?: number,
  filterMax?: number
): boolean {
  if (filterMin == null && filterMax == null) return true;
  const jLo = jobMin ?? jobMax ?? null;
  const jHi = jobMax ?? jobMin ?? null;
  if (jLo == null || jHi == null) return false;
  const fLo = filterMin ?? Number.NEGATIVE_INFINITY;
  const fHi = filterMax ?? Number.POSITIVE_INFINITY;
  return jLo <= fHi && jHi >= fLo;
}

export function countActiveFilters(f: HiringJobFilters): number {
  let n = 0;
  if (f.urgentOnly) n += 1;
  n += f.workplaceTypes.length;
  if (f.salaryMin != null || f.salaryMax != null) n += 1;
  if (f.numericSalaryOnly) n += 1;
  n += f.expertises.length;
  n += f.skills.length;
  n += f.domains.length;
  n += f.locations.length;
  n += f.companies.length;
  n += f.difficulties.length;
  if (f.maxDurationMinutes != null) n += 1;
  return n;
}

export function hasActiveFilters(f: HiringJobFilters): boolean {
  return countActiveFilters(f) > 0;
}

export function buildFacets(jobs: QuestionSet[]): HiringFacets {
  const workplaces = new Set<WorkplaceType>();
  const difficulties = new Set<Difficulty>();
  const expertises: string[] = [];
  const skills: string[] = [];
  const domains: string[] = [];
  const locations: string[] = [];
  const companies: string[] = [];
  let salaryBoundMin = Number.POSITIVE_INFINITY;
  let salaryBoundMax = 0;
  let durationMax = 0;

  for (const job of jobs) {
    if (job.workplaceType) workplaces.add(job.workplaceType);
    difficulties.add(job.difficulty);
    if (job.jobExpertise?.trim()) expertises.push(job.jobExpertise.trim());
    if (job.jobDomain?.trim()) domains.push(job.jobDomain.trim());
    if (job.jobLocation?.trim()) locations.push(job.jobLocation.trim());
    if (job.company?.trim()) companies.push(job.company.trim());
    for (const s of job.skills) {
      if (s.trim()) skills.push(s.trim());
    }
    if (job.salaryMin != null) {
      salaryBoundMin = Math.min(salaryBoundMin, job.salaryMin);
      salaryBoundMax = Math.max(salaryBoundMax, job.salaryMin);
    }
    if (job.salaryMax != null) {
      salaryBoundMin = Math.min(salaryBoundMin, job.salaryMax);
      salaryBoundMax = Math.max(salaryBoundMax, job.salaryMax);
    }
    const dur = jobDurationMinutes(job);
    if (dur != null && dur > durationMax) durationMax = dur;
  }

  if (!Number.isFinite(salaryBoundMin) || salaryBoundMax <= 0) {
    salaryBoundMin = 0;
    salaryBoundMax = 50_000_000;
  }

  return {
    workplaces: WORKPLACE_ORDER.filter((w) => workplaces.has(w)),
    expertises: uniqSorted(expertises),
    skills: uniqSorted(skills),
    domains: uniqSorted(domains),
    locations: uniqSorted(locations),
    companies: uniqSorted(companies),
    difficulties: DIFFICULTY_ORDER.filter((d) => difficulties.has(d)),
    salaryBoundMin,
    salaryBoundMax,
    durationMax,
  };
}

function matchesKeyword(job: QuestionSet, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    job.title,
    job.company,
    job.jobExpertise ?? "",
    job.jobDomain ?? "",
    job.jobLocation ?? "",
    job.publicJobDescriptionPreview ?? "",
    ...job.skills,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function applyHiringFilters(
  jobs: QuestionSet[],
  filters: HiringJobFilters,
  keyword: string
): QuestionSet[] {
  return jobs.filter((job) => {
    if (!matchesKeyword(job, keyword)) return false;

    if (filters.urgentOnly && !(job.isPinned || job.isTrending)) return false;

    if (filters.workplaceTypes.length > 0) {
      if (!job.workplaceType || !filters.workplaceTypes.includes(job.workplaceType)) return false;
    }

    const salaryActive = filters.salaryMin != null || filters.salaryMax != null;
    if (salaryActive || filters.numericSalaryOnly) {
      const numeric = hasNumericSalary(job);
      if (!numeric) {
        if (filters.numericSalaryOnly) return false;
        // Negotiable / no numbers: keep unless numeric-only
      } else if (salaryActive) {
        if (!salaryRangesOverlap(job.salaryMin, job.salaryMax, filters.salaryMin, filters.salaryMax)) {
          return false;
        }
      }
    }

    if (filters.expertises.length > 0) {
      const exp = job.jobExpertise?.trim() ?? "";
      if (!exp || !filters.expertises.includes(exp)) return false;
    }

    if (filters.skills.length > 0) {
      const set = new Set(job.skills.map((s) => s.trim().toLowerCase()));
      const any = filters.skills.some((s) => set.has(s.trim().toLowerCase()));
      if (!any) return false;
    }

    if (filters.domains.length > 0) {
      const d = job.jobDomain?.trim() ?? "";
      if (!d || !filters.domains.includes(d)) return false;
    }

    if (filters.locations.length > 0) {
      const loc = job.jobLocation?.trim() ?? "";
      if (!loc || !filters.locations.includes(loc)) return false;
    }

    if (filters.companies.length > 0) {
      if (!filters.companies.includes(job.company.trim())) return false;
    }

    if (filters.difficulties.length > 0) {
      if (!filters.difficulties.includes(job.difficulty)) return false;
    }

    if (filters.maxDurationMinutes != null) {
      const dur = jobDurationMinutes(job);
      if (dur == null || dur > filters.maxDurationMinutes) return false;
    }

    return true;
  });
}

export async function loadHiringCatalog(): Promise<QuestionSet[]> {
  const collected: QuestionSet[] = [];
  let page = 1;
  while (collected.length < CATALOG_CAP) {
    const res = await listQuestionSets({
      page,
      pageSize: CATALOG_PAGE_SIZE,
      sortBy: "newest",
      isHiringAssessment: true,
    });
    collected.push(...res.items);
    if (res.items.length === 0 || collected.length >= res.totalCount) break;
    if (res.items.length < CATALOG_PAGE_SIZE) break;
    page += 1;
  }
  return collected.slice(0, CATALOG_CAP);
}

function csv(values: string[]): string | null {
  return values.length > 0 ? values.join(",") : null;
}

function splitCsv(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNum(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Serialize filters + search into URLSearchParams, preserving `id`. */
export function filtersToSearchParams(
  filters: HiringJobFilters,
  keyword: string,
  page: number,
  selectedId: string | null
): URLSearchParams {
  const sp = new URLSearchParams();
  if (selectedId) sp.set("id", selectedId);
  if (keyword.trim()) sp.set("q", keyword.trim());
  if (page > 1) sp.set("page", String(page));
  if (filters.urgentOnly) sp.set("urgent", "1");
  const work = csv(filters.workplaceTypes);
  if (work) sp.set("work", work);
  if (filters.salaryMin != null) sp.set("salMin", String(filters.salaryMin));
  if (filters.salaryMax != null) sp.set("salMax", String(filters.salaryMax));
  if (filters.numericSalaryOnly) sp.set("numSal", "1");
  const exp = csv(filters.expertises);
  if (exp) sp.set("exp", exp);
  const skills = csv(filters.skills);
  if (skills) sp.set("skills", skills);
  const domain = csv(filters.domains);
  if (domain) sp.set("domain", domain);
  const loc = csv(filters.locations);
  if (loc) sp.set("loc", loc);
  const company = csv(filters.companies);
  if (company) sp.set("company", company);
  const diff = csv(filters.difficulties);
  if (diff) sp.set("diff", diff);
  if (filters.maxDurationMinutes != null) sp.set("maxDur", String(filters.maxDurationMinutes));
  return sp;
}

export function parseFiltersFromSearchParams(sp: URLSearchParams): {
  filters: HiringJobFilters;
  keyword: string;
  page: number;
} {
  const workplaces = splitCsv(sp.get("work")).filter((w): w is WorkplaceType =>
    w === "AtOffice" || w === "Hybrid" || w === "Remote"
  );
  const difficulties = splitCsv(sp.get("diff")).filter((d): d is Difficulty =>
    d === "Easy" || d === "Medium" || d === "Hard"
  );
  const pageRaw = parseNum(sp.get("page"));
  return {
    keyword: sp.get("q")?.trim() ?? "",
    page: pageRaw && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
    filters: {
      urgentOnly: sp.get("urgent") === "1",
      workplaceTypes: workplaces,
      salaryMin: parseNum(sp.get("salMin")),
      salaryMax: parseNum(sp.get("salMax")),
      numericSalaryOnly: sp.get("numSal") === "1",
      expertises: splitCsv(sp.get("exp")),
      skills: splitCsv(sp.get("skills")),
      domains: splitCsv(sp.get("domain")),
      locations: splitCsv(sp.get("loc")),
      companies: splitCsv(sp.get("company")),
      difficulties,
      maxDurationMinutes: parseNum(sp.get("maxDur")),
    },
  };
}

export type FilterChip =
  | { key: "urgent"; label: string }
  | { key: "workplace"; value: WorkplaceType; label: string }
  | { key: "salary"; label: string }
  | { key: "numericSalary"; label: string }
  | { key: "expertise"; value: string; label: string }
  | { key: "skill"; value: string; label: string }
  | { key: "domain"; value: string; label: string }
  | { key: "location"; value: string; label: string }
  | { key: "company"; value: string; label: string }
  | { key: "difficulty"; value: Difficulty; label: string }
  | { key: "duration"; label: string };

export function removeChip(filters: HiringJobFilters, chip: FilterChip): HiringJobFilters {
  switch (chip.key) {
    case "urgent":
      return { ...filters, urgentOnly: false };
    case "workplace":
      return {
        ...filters,
        workplaceTypes: filters.workplaceTypes.filter((w) => w !== chip.value),
      };
    case "salary":
      return { ...filters, salaryMin: undefined, salaryMax: undefined };
    case "numericSalary":
      return { ...filters, numericSalaryOnly: false };
    case "expertise":
      return { ...filters, expertises: filters.expertises.filter((v) => v !== chip.value) };
    case "skill":
      return { ...filters, skills: filters.skills.filter((v) => v !== chip.value) };
    case "domain":
      return { ...filters, domains: filters.domains.filter((v) => v !== chip.value) };
    case "location":
      return { ...filters, locations: filters.locations.filter((v) => v !== chip.value) };
    case "company":
      return { ...filters, companies: filters.companies.filter((v) => v !== chip.value) };
    case "difficulty":
      return { ...filters, difficulties: filters.difficulties.filter((v) => v !== chip.value) };
    case "duration":
      return { ...filters, maxDurationMinutes: undefined };
  }
}

export type HiringFilterLabels = {
  urgent: string;
  workplace: string;
  salary: string;
  expertise: string;
  skills: string;
  domain: string;
  location: string;
  company: string;
  difficulty: string;
  duration: string;
  advanced: string;
  searchExpertise: string;
  searchSkills: string;
  searchDomain: string;
  searchLocation: string;
  searchCompany: string;
  salaryFrom: string;
  salaryTo: string;
  salaryApply: string;
  salaryReset: string;
  numericSalaryOnly: string;
  clearAll: string;
  filtering: string;
  workplaceAtOffice: string;
  workplaceHybrid: string;
  workplaceRemote: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  durationMax: string;
  durationAny: string;
  noOptions: string;
  viewResults: string;
  salaryNegotiable: string;
};

export function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
