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
  id: string;
  title: string;
  questions: Question[];
  owner: string;
  isActive: boolean;
}
