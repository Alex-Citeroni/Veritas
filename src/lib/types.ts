export interface Answer {
  id: number;
  text: string;
  votes: number;
}

export interface Question {
  id: number;
  text: string;
  answers: Answer[];
}

export interface Poll {
  title: string | null;
  questions: Question[];
}
