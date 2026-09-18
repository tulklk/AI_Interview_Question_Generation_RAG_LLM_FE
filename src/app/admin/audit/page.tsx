import { redirect } from "next/navigation";

/** Trang dummy "Nhật ký kiểm tra" đã gỡ — chuyển về dashboard. */
export default function AdminAuditPage() {
  redirect("/admin/dashboard");
}
