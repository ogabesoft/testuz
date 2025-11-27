export type Role = 'student' | 'admin' | null;

export interface AnswerOption {
  id: number;
  text: string;
  is_correct?: boolean;
}

export interface Question {
  id: number;
  text: string;
  options: AnswerOption[];
}

export interface AttemptAnswer {
  id: number;
  question: number;
  question_text: string;
  selected_option: number;
  option_text: string;
  is_correct: boolean;
}

export interface TestAttempt {
  id: number;
  first_name: string;
  last_name: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  created_at: string;
  answers: AttemptAnswer[];
}

export interface NotificationSetting {
  bot_token: string;
  admin_chat_id: string;
  is_active: boolean;
}
