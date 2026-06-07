export interface TimeGreetingLabels {
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

export function getTimeOfDayGreeting(
  labels: TimeGreetingLabels,
  date: Date = new Date()
): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return labels.morning;
  if (hour >= 12 && hour < 18) return labels.afternoon;
  if (hour >= 18 && hour < 22) return labels.evening;
  return labels.night;
}

export function buildWelcomeMessage(
  template: string,
  greeting: string,
  name: string
): string {
  return template.replace("{{greeting}}", greeting).replace("{{name}}", name);
}
