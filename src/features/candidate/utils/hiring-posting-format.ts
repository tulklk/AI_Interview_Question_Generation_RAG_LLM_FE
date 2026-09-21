/** SCRUM-468: format lương / workplace cho job board candidate. */

export function formatSalaryLabel(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
  salaryNegotiable: boolean | undefined,
  negotiableLabel: string
): string {
  if (salaryNegotiable !== false && salaryMin == null && salaryMax == null) {
    return negotiableLabel;
  }
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  if (salaryMin != null && salaryMax != null) return `${fmt(salaryMin)} – ${fmt(salaryMax)}`;
  if (salaryMin != null) return `≥ ${fmt(salaryMin)}`;
  if (salaryMax != null) return `≤ ${fmt(salaryMax)}`;
  return negotiableLabel;
}

export function workplaceLabel(
  workplaceType: "AtOffice" | "Hybrid" | "Remote" | null | undefined,
  labels: { atOffice: string; hybrid: string; remote: string }
): string | null {
  if (workplaceType === "AtOffice") return labels.atOffice;
  if (workplaceType === "Hybrid") return labels.hybrid;
  if (workplaceType === "Remote") return labels.remote;
  return null;
}
