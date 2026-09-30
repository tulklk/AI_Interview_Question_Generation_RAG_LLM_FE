/**
 * SCRUM-491 + SCRUM-492: catalog gợi ý + format hybrid + chặn non-IT từng skill.
 * Free-text IT vẫn được nếu đúng format; soft-warn khi không khớp catalog.
 */

export const COACH_SKILL_MIN_LEN = 2;
export const COACH_SKILL_MAX_LEN = 40;

/** Charset: chữ/số + khoảng trắng + . # + / - ( ) — SCRUM-493 */
const SKILL_CHAR_RE = /^[A-Za-z0-9 .#+/\-()]+$/;

/**
 * SCRUM-492: deny-list non-IT (mirror JobDescriptionValidator.NonItKeywords + soft phổ biến).
 * Exact: tránh false-positive (vd. "sales" ≠ "Salesforce").
 */
const NON_IT_EXACT: readonly string[] = [
  "marketing",
  "marketting",
  "sales",
  "seo",
  "finance",
  "accounting",
  "accountant",
  "bookkeeper",
  "auditor",
  "lawyer",
  "teacher",
  "nurse",
  "cashier",
  "receptionist",
  "communication",
  "leadership",
  "teamwork",
  "collaboration",
  "excel",
  "hr",
  "recruiting",
  "recruitment",
];

/** Cụm dài — khớp contain trên key đã normalize. */
const NON_IT_PHRASES: readonly string[] = [
  "digitalmarketing",
  "contentmarketing",
  "socialmedia",
  "seospecialist",
  "salesexecutive",
  "salesmanager",
  "accountexecutive",
  "businessdevelopment",
  "ketoan",
  "kiemtoan",
  "luatsu",
  "legalcounsel",
  "phapche",
  "giaovien",
  "giangvien",
  "nhanvienyte",
  "bacsi",
  "dieuduong",
  "nhahang",
  "restaurant",
  "phache",
  "bartender",
  "khachsan",
  "hotelreceptionist",
  "batdongsan",
  "realestate",
  "moigioi",
  "nhanvienbanhang",
  "khovan",
  "warehousepicker",
  "fashiondesigner",
  "thietkethoitang",
  "makeupartist",
];

/**
 * Danh sách công nghệ phổ biến — casing chuẩn để autocomplete.
 * Không phải whitelist cứng: free-text hợp lệ vẫn thêm được.
 */
export const COACH_SKILL_CATALOG: readonly string[] = [
  ".NET",
  "ASP.NET",
  "ASP.NET Core",
  "C#",
  "Entity Framework",
  "EF Core",
  "LINQ",
  "SignalR",
  "Blazor",
  "xUnit",
  "NUnit",
  "JWT",
  "OAuth",
  "Identity",
  "Java",
  "Spring",
  "Spring Boot",
  "Kotlin",
  "Python",
  "Django",
  "FastAPI",
  "Flask",
  "JavaScript",
  "TypeScript",
  "React",
  "ReactJS",
  "Next.js",
  "Vue",
  "Angular",
  "Node.js",
  "Express",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Go",
  "Rust",
  "Swift",
  "PHP",
  "Laravel",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "SQL Server",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "GitLab CI",
  "Git",
  "GitHub",
  "GitLab",
  "AWS",
  "Azure",
  "GCP",
  "Terraform",
  "Linux",
  "Nginx",
  "REST API",
  "GraphQL",
  "gRPC",
  "Microservices",
  "Clean Architecture",
  "DDD",
  "CQRS",
  "Kafka",
  "RabbitMQ",
  "Firebase",
  "Unity",
  "Scrum",
  "Agile",
  "TDD",
  "Unit Testing",
  "System Design",
  "OOP",
  "Design Patterns",
] as const;

export type CoachSkillFormatError =
  | "empty"
  | "too_short"
  | "too_long"
  | "invalid_chars"
  | "no_letter"
  | "non_it";

export function normalizeSkillKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "")
    .replace(/\.+/g, ".");
}

/** SCRUM-492: true nếu skill thuộc lĩnh vực ngoài IT (marketing, sales…). */
export function isNonItCoachSkill(raw: string): boolean {
  const key = normalizeSkillKey(raw);
  if (!key) return false;
  // "marketing" / typo "marketting" luôn chặn (kể cả cụm)
  if (key.includes("marketing") || key.includes("marketting")) return true;
  for (const needle of NON_IT_EXACT) {
    if (key === normalizeSkillKey(needle)) return true;
  }
  for (const phrase of NON_IT_PHRASES) {
    if (key.includes(phrase)) return true;
  }
  return false;
}

/**
 * SCRUM-493: chuẩn hóa skill (CV / free-text) trước khi add hoặc hiển thị.
 * null = bỏ (rỗng / non-IT / không còn chữ).
 */
export function sanitizeCoachSkill(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  s = s
    .replace(/[\u2013\u2014\u2212\u00AD]/g, "-")
    .replace(/\s+/g, " ")
    .split("")
    .filter((c) => /[A-Za-z0-9 .#+/\-()]/.test(c))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length > COACH_SKILL_MAX_LEN) s = s.slice(0, COACH_SKILL_MAX_LEN).trimEnd();
  if (s.length < COACH_SKILL_MIN_LEN) return null;
  if (!/[A-Za-z]/.test(s)) return null;
  if (isNonItCoachSkill(s)) return null;
  if (!SKILL_CHAR_RE.test(s)) return null;
  return s;
}

/** Exact / fuzzy catalog match → trả casing chuẩn nếu có. */
export function resolveCatalogSkill(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const key = normalizeSkillKey(trimmed);
  for (const item of COACH_SKILL_CATALOG) {
    if (normalizeSkillKey(item) === key) return item;
  }
  return null;
}

export function isInSkillCatalog(raw: string): boolean {
  return resolveCatalogSkill(raw) != null;
}

/**
 * Validate format free-text (hybrid) + chặn non-IT (SCRUM-492/493).
 * Sanitize trước — skill CV có en-dash / () vẫn pass nếu sau chuẩn hóa hợp lệ.
 */
export function validateCoachSkillFormat(raw: string): CoachSkillFormatError | null {
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  if (isNonItCoachSkill(trimmed)) return "non_it";
  const sanitized = sanitizeCoachSkill(trimmed);
  if (!sanitized) {
    if (trimmed.length < COACH_SKILL_MIN_LEN) return "too_short";
    if (trimmed.length > COACH_SKILL_MAX_LEN) return "too_long";
    if (!/[A-Za-z]/.test(trimmed)) return "no_letter";
    return "invalid_chars";
  }
  return null;
}

/** Gợi ý autocomplete — prefix / substring, bỏ skill đã có, tối đa `limit`. */
export function suggestCoachSkills(
  draft: string,
  already: string[],
  limit = 8
): string[] {
  const q = draft.trim().toLowerCase();
  if (q.length < 1) return [];
  const have = new Set(already.map((s) => normalizeSkillKey(s)));
  const starts: string[] = [];
  const contains: string[] = [];
  for (const item of COACH_SKILL_CATALOG) {
    if (have.has(normalizeSkillKey(item))) continue;
    const lower = item.toLowerCase();
    if (lower.startsWith(q)) starts.push(item);
    else if (lower.includes(q)) contains.push(item);
  }
  return [...starts, ...contains].slice(0, limit);
}
