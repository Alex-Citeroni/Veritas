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
    await fs.writeFile(pollFilePath, JSON.stringify({ question: null, answers: [] }), 'utf-8');
  }
}

async function getPollData(): Promise<Poll> {
  await ensurePollFile();
  try {
    const pollData = await fs.readFile(pollFilePath, 'utf-8');
    return JSON.parse(pollData);
  } catch (error) {
    return { question: null, answers: [] };
  }
}

async function writePollData(poll: Poll) {
  await ensurePollFile();
  await fs.writeFile(pollFilePath, JSON.stringify(poll, null, 2), 'utf-8');
}

export async function createPoll(formData: FormData) {
  const question = formData.get('question') as string;
  const answers = formData.getAll('answers[]') as string[];

  if (!question || answers.length < 2 || answers.some(a => a.trim() === '')) {
    return { error: 'Question and at least two non-empty answers are required.' };
  }

  const newPoll: Poll = {
    question,
    answers: answers.filter(a => a.trim() !== '').map((answer, index) => ({
      id: index,
      text: answer,
      votes: 0,
    })),
  };

  await writePollData(newPoll);

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: 'Poll created/updated successfully!' };
}

export async function getPoll(): Promise<Poll> {
  return await getPollData();
}

export async function submitVote(answerId: number) {
  const poll = await getPollData();
  if (!poll.question) return { error: 'No active poll.' };

  const answer = poll.answers.find(a => a.id === answerId);
  if (answer) {
    answer.votes += 1;
    await writePollData(poll);
    revalidatePath('/');
    return { success: 'Vote submitted!' };
  }
  return { error: 'Invalid answer.' };
}

export async function endPoll() {
  await ensureDir(resultsDir);
  const poll = await getPollData();
  if (!poll.question) return { error: 'No active poll to end.' };

  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const resultFileName = `results-${timestamp}.json`;
  const resultFilePath = path.join(resultsDir, resultFileName);
  
  const results = {
    question: poll.question,
    results: poll.answers.map(({ text, votes }) => ({ text, votes })),
    totalVotes: poll.answers.reduce((sum, a) => sum + a.votes, 0)
  };

  await fs.writeFile(resultFilePath, JSON.stringify(results, null, 2), 'utf-8');
  
  await writePollData({ question: null, answers: [] });

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: `Poll ended and results saved to ${resultFileName}` };
}
