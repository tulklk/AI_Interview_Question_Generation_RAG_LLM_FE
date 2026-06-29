export type Difficulty = "Easy" | "Medium" | "Hard";
export type QuestionCategory = "Technical" | "Behavioral" | "Situational";

export interface InterviewQuestion {
  id: number;
  difficulty: Difficulty;
  tags: string[];
  question: string;
  suggestedAnswer: string;
  category: QuestionCategory;
}

export interface ResultSession {
  jobTitle: string;
  keywords: string[];
  questions: InterviewQuestion[];
}
