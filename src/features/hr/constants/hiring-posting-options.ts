/**
 * SCRUM-512: danh mục cố định cho tin tuyển.
 * Lưu đúng chuỗi hiển thị (không thêm bảng). Giá trị cũ ngoài list vẫn hiện để không mất dữ liệu đã lưu.
 */

export const HIRING_LOCATIONS = [
  "Hà Nội",
  "TP.HCM",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Huế",
  "Nha Trang",
  "Biên Hòa",
  "Toàn quốc",
] as const;

export const HIRING_EXPERTISE = [
  "Backend Developer",
  "Frontend Developer",
  "Fullstack Developer",
  "Mobile Developer",
  "DevOps Engineer",
  "Data Engineer",
  "Data Analyst",
  "QA / Tester",
  "Business Analyst",
  "UI/UX Designer",
  "Product Manager",
  "AI / ML Engineer",
  "Security Engineer",
  "Tech Lead",
] as const;

/** Chỉ lĩnh vực IT — không gồm ngành ngoài CNTT (ngân hàng, y tế, sản xuất…). */
export const HIRING_DOMAINS = [
  "IT Services",
  "Software Product",
  "SaaS",
  "IT Outsourcing",
  "Cloud Computing",
  "Cybersecurity",
  "Data / AI",
  "Web & Mobile",
  "Enterprise Software",
] as const;

export function withCurrentOption(options: readonly string[], current: string): string[] {
  const value = current.trim();
  if (!value || options.includes(value)) return [...options];
  return [value, ...options];
}
