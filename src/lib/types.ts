export interface Answer {
  id: number;
  text: string;
  votes: number;
}

export interface Poll {
  question: string | null;
  answers: Answer[];
}
