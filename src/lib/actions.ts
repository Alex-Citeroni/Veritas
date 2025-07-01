'use server';

import fs from 'fs/promises';
import path from 'path';
import { type Poll } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

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
     if (!pollData.trim()) {
        return { title: null, questions: [] };
    }
    const parsedData = JSON.parse(pollData);
    if ('question' in parsedData) {
        return { title: null, questions: [] };
    }
    return parsedData;
  } catch (error) {
    console.error("Error reading or parsing poll data:", error);
    return { title: null, questions: [] };
  }
}

async function writePollData(poll: Poll) {
  await ensurePollFile();
  await fs.writeFile(pollFilePath, JSON.stringify(poll, null, 2), 'utf-8');
}

// Helper function to archive results
async function archivePollResults(poll: Poll, reason: 'updated' | 'ended'): Promise<string> {
    if (!poll.title) {
        throw new Error('Nessun sondaggio attivo da archiviare.');
    }

    await ensureDir(resultsDir);
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const safeTitle = poll.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s/g, '_').substring(0, 50);
    const prefix = reason === 'ended' ? 'results' : 'archived-results';
    const resultFileName = `${prefix}-${timestamp}-${safeTitle}.json`;
    const resultFilePath = path.join(resultsDir, resultFileName);

    const results = {
        title: poll.title,
        timestamp: new Date().toISOString(),
        status: reason,
        questions: poll.questions.map(q => ({
            question: q.text,
            results: q.answers.map(({ text, votes }) => ({ text, votes })),
            totalVotes: q.answers.reduce((sum, a) => sum + a.votes, 0)
        }))
    };

    try {
        await fs.writeFile(resultFilePath, JSON.stringify(results, null, 2), 'utf-8');
        return resultFileName;
    } catch (error) {
        console.error(`Failed to archive results for poll "${poll.title}":`, error);
        throw new Error(`Impossibile archiviare i risultati per il sondaggio "${poll.title}".`);
    }
}


export async function login(formData: FormData) {
  const password = formData.get('password') as string;

  if (password === 'Leonardo') {
    cookies().set('auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    redirect('/admin');
  } else {
    return { error: 'Password errata.' };
  }
}

export async function logout() {
  cookies().delete('auth');
  redirect('/admin');
}

export async function createPoll(data: { title: string; questions: { text: string; answers: { text: string }[] }[] }, isUpdate: boolean) {
  const { title, questions } = data;

  if (!title || questions.length < 1) {
    return { error: 'Sono richiesti un titolo e almeno una domanda.' };
  }
  for (const q of questions) {
    if (!q.text || q.answers.length < 2 || q.answers.some(a => !a.text.trim())) {
        return { error: 'Ogni domanda deve avere un testo e almeno due risposte non vuote.' };
    }
  }

  if (isUpdate) {
    try {
      const currentPoll = await getPollData();
      if (currentPoll.title) {
        await archivePollResults(currentPoll, 'updated');
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Impossibile archiviare i risultati del sondaggio precedente.";
        return { error: errorMessage };
    }
  }

  const newPoll: Poll = {
    id: randomUUID(),
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

  try {
    await writePollData(newPoll);
  } catch (error) {
    console.error("Failed to write poll data:", error);
    return { error: "Impossibile salvare il sondaggio. Si è verificato un errore del server." };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  
  redirect('/');
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
    try {
        await writePollData(poll);
    } catch (error) {
        console.error("Failed to write poll data on vote:", error);
        return { error: "Impossibile salvare il voto. Si è verificato un errore del server." };
    }
    revalidatePath('/');
    return { success: 'Voto inviato!' };
  }
  return { error: 'Risposta non valida.' };
}

export async function endPoll() {
    try {
        const poll = await getPollData();
        if (!poll.title) {
            return { error: 'Nessun sondaggio attivo da terminare.' };
        }
        const resultFileName = await archivePollResults(poll, 'ended');
        await writePollData({ title: null, questions: [] });
        
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: `Sondaggio terminato e risultati salvati in ${resultFileName}` };

    } catch (error) {
        console.error("Failed to end poll:", error);
        const errorMessage = error instanceof Error ? error.message : "Impossibile terminare il sondaggio. Si è verificato un errore del server.";
        return { error: errorMessage };
    }
}

export async function getResultsFiles(): Promise<string[]> {
  await ensureDir(resultsDir);
  try {
    const files = await fs.readdir(resultsDir);
    // Sort files by name descending to get the latest ones first
    return files.filter(file => file.endsWith('.json')).sort((a, b) => b.localeCompare(a));
  } catch (error) {
    console.error("Failed to read results directory:", error);
    return [];
  }
}
