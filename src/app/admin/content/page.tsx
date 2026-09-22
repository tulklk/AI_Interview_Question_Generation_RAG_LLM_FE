import { redirect } from "next/navigation";

/** Trang dummy "Nội dung đã tạo" đã gỡ — chuyển về dashboard. */
export default function GeneratedContentPage() {
  redirect("/admin/dashboard");
}
