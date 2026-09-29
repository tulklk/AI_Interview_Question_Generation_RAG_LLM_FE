/**
 * SCRUM-491: catalog gợi ý + format hybrid cho ô "Thêm công nghệ" trên Phân tích CV.
 * Free-text vẫn được nếu đúng format; soft-warn khi không khớp catalog.
 */

export const COACH_SKILL_MIN_LEN = 2;
export const COACH_SKILL_MAX_LEN = 40;

/** Charset: chữ/số + khoảng trắng + . # + / - */
const SKILL_CHAR_RE = /^[A-Za-z0-9 .#+/\-]+$/;

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
  | "no_letter";

export function normalizeSkillKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "")
    .replace(/\.+/g, ".");
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
 * Validate format free-text (hybrid).
 * @returns null nếu hợp lệ, hoặc mã lỗi.
 */
export function validateCoachSkillFormat(raw: string): CoachSkillFormatError | null {
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  if (trimmed.length < COACH_SKILL_MIN_LEN) return "too_short";
  if (trimmed.length > COACH_SKILL_MAX_LEN) return "too_long";
  if (!SKILL_CHAR_RE.test(trimmed)) return "invalid_chars";
  if (!/[A-Za-z]/.test(trimmed)) return "no_letter";
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
