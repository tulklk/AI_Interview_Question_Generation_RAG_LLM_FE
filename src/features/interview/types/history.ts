export interface HistorySession {
  id: string;
  title: string;
  role: string;
  roleColor: string;
  roleBg: string;
  level: string;
  levelColor: string;
  levelBg: string;
  date: string;
  questionsCount: number;
  maxQuestions: number;
}

export interface HistoryStat {
  id: string;
  label: string;
  value: string;
}
