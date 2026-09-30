import { redirect } from "next/navigation";

/** Trang dummy "System Analytics" (sample data, chưa nối API) đã gỡ — chuyển về dashboard. */
export default function SystemAnalyticsPage() {
  redirect("/admin/dashboard");
}
