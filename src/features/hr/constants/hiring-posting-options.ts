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

export const HIRING_DOMAINS = [
  "IT Services",
  "Software Product",
  "Fintech",
  "E-commerce",
  "Banking",
  "Healthcare",
  "Education",
  "Telecommunications",
  "Logistics",
  "Gaming",
  "Manufacturing",
  "Consulting",
] as const;

export function withCurrentOption(options: readonly string[], current: string): string[] {
  const value = current.trim();
  if (!value || options.includes(value)) return [...options];
  return [value, ...options];
}
