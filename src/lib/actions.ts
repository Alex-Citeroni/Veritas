'use server';

import fs from 'fs/promises';
import path from 'path';
import { type Poll } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const dataDir = path.join(process.cwd(), 'data');
const pollFilePath = path.join(dataDir, 'poll.json');
const resultsDir = path.join(process.cwd(), 'results');

async function ensureDir(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function ensurePollFile() {
  await ensureDir(dataDir);
  try {
    await fs.access(pollFilePath);
  } catch {
    await fs.writeFile(pollFilePath, JSON.stringify({ title: null, questions: [] }), 'utf-8');
  }
}

async function getPollData(): Promise<Poll> {
  await ensurePollFile();
  try {
    const pollData = await fs.readFile(pollFilePath, 'utf-8');
    const parsedData = JSON.parse(pollData);
    if ('question' in parsedData) {
        return { title: null, questions: [] };
    }
    return parsedData;
  } catch (error) {
    return { title: null, questions: [] };
  }
}

async function writePollData(poll: Poll) {
  await ensurePollFile();
  await fs.writeFile(pollFilePath, JSON.stringify(poll, null, 2), 'utf-8');
}

export async function createPoll(data: { title: string; questions: { text: string; answers: { text: string }[] }[] }) {
  const { title, questions } = data;

  if (!title || questions.length < 1) {
    return { error: 'Sono richiesti un titolo e almeno una domanda.' };
  }
  for (const q of questions) {
    if (!q.text || q.answers.length < 2 || q.answers.some(a => !a.text.trim())) {
        return { error: 'Ogni domanda deve avere un testo e almeno due risposte non vuote.' };
    }
  }

  const newPoll: Poll = {
    title,
    questions: questions.map((question, qIndex) => ({
      id: qIndex,
      text: question.text,
      answers: question.answers.map((answer, aIndex) => ({
        id: aIndex,
        text: answer.text,
        votes: 0,
      })),
    })),
  };

  await writePollData(newPoll);

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: 'Sondaggio creato/aggiornato con successo!' };
}

export async function getPoll(): Promise<Poll> {
  return await getPollData();
}

export async function submitVote(questionId: number, answerId: number) {
  const poll = await getPollData();
  if (!poll.title) return { error: 'Nessun sondaggio attivo.' };

  const question = poll.questions.find(q => q.id === questionId);
  if (!question) return { error: 'Domanda non valida.' };
  
  const answer = question.answers.find(a => a.id === answerId);
  if (answer) {
    answer.votes += 1;
    await writePollData(poll);
    revalidatePath('/');
    return { success: 'Voto inviato!' };
  }
  return { error: 'Risposta non valida.' };
}

export async function endPoll() {
  await ensureDir(resultsDir);
  const poll = await getPollData();
  if (!poll.title) return { error: 'Nessun sondaggio attivo da terminare.' };

  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const resultFileName = `results-${timestamp}.json`;
  const resultFilePath = path.join(resultsDir, resultFileName);
  
  const results = {
    title: poll.title,
    questions: poll.questions.map(q => ({
      question: q.text,
      results: q.answers.map(({ text, votes }) => ({ text, votes })),
      totalVotes: q.answers.reduce((sum, a) => sum + a.votes, 0)
    }))
  };

  await fs.writeFile(resultFilePath, JSON.stringify(results, null, 2), 'utf-8');
  
  await writePollData({ title: null, questions: [] });

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: `Sondaggio terminato e risultati salvati in ${resultFileName}` };
}
