'use server';

import fs from 'fs/promises';
import path from 'path';
import { type Poll } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomUUID, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const dataDir = path.join(process.cwd(), 'data');
const resultsBaseDir = path.join(process.cwd(), 'results');

// --- User and Path Helpers ---

function getUserDir(username: string): string {
    return path.join(dataDir, username);
}

function getUserFilePath(username: string): string {
    return path.join(getUserDir(username), 'user.json');
}


function getPollFilePath(username: string): string {
    return path.join(getUserDir(username), 'poll.json');
}

function getResultsDir(username: string): string {
    return path.join(resultsBaseDir, username);
}

// --- Password Hashing Helpers ---

async function hashPassword(password: string): Promise<string> {
    const salt = randomUUID();
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(keyBuffer, derivedKey);
}


// --- File System Helpers ---

async function ensureDir(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function ensurePollFile(username: string) {
  const userDir = path.join(dataDir, username);
  await ensureDir(userDir);
  const pollFilePath = getPollFilePath(username);
  try {
    await fs.access(pollFilePath);
  } catch {
    await fs.writeFile(pollFilePath, JSON.stringify({ id: null, title: null, questions: [], owner: username }), 'utf-8');
  }
}

async function getPollData(username: string): Promise<Poll> {
  await ensurePollFile(username);
  const pollFilePath = getPollFilePath(username);
  try {
    const pollData = await fs.readFile(pollFilePath, 'utf-8');
     if (!pollData.trim()) {
        return { id: null, title: null, questions: [], owner: username };
    }
    const parsedData = JSON.parse(pollData);
    if (!parsedData.owner) {
        return { ...parsedData, owner: username };
    }
    return parsedData;
  } catch (error) {
    console.error(`Error reading or parsing poll data for user ${username}:`, error);
    return { id: null, title: null, questions: [], owner: username };
  }
}

async function writePollData(poll: Poll, username: string) {
  await ensurePollFile(username);
  const pollFilePath = getPollFilePath(username);
  await fs.writeFile(pollFilePath, JSON.stringify(poll, null, 2), 'utf-8');
}

async function archivePollResults(poll: Poll, username: string, reason: 'updated' | 'ended'): Promise<string> {
    if (!poll.title) {
        throw new Error('Nessun sondaggio attivo da archiviare.');
    }

    const userResultsDir = getResultsDir(username);
    await ensureDir(userResultsDir);
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const safeTitle = poll.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s/g, '_').substring(0, 50);
    const prefix = reason === 'ended' ? 'results' : 'archived-results';
    const resultFileName = `${prefix}-${timestamp}-${safeTitle}.json`;
    const resultFilePath = path.join(userResultsDir, resultFileName);

    const results = {
        title: poll.title,
        owner: username,
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


// --- Auth Actions ---

export async function checkUsername(username: string) {
  if (!username || username.trim().length < 3) {
    return { error: 'Username deve avere almeno 3 caratteri.' };
  }
  const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');
  if (safeUsername !== username) {
      return { error: 'Username contiene caratteri non validi.' };
  }

  const userFilePath = getUserFilePath(safeUsername);
  try {
    await fs.access(userFilePath);
    return { exists: true, username: safeUsername };
  } catch {
    return { exists: false, username: safeUsername };
  }
}

async function loginUser(username: string) {
    cookies().set('username', username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
    });
}

export async function authenticateAction(prevState: any, formData: FormData) {
  const mode = formData.get('mode') as 'login' | 'register';
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username e password sono obbligatori.' };
  }

  if (mode === 'register') {
    const confirmPassword = formData.get('confirmPassword') as string;
    if (password !== confirmPassword) {
      return { error: 'Le password non coincidono.' };
    }
  }

  try {
    if (mode === 'login') {
      const userFilePath = getUserFilePath(username);
      const userData = await fs.readFile(userFilePath, 'utf-8');
      const { passwordHash } = JSON.parse(userData);
      const isValid = await verifyPassword(password, passwordHash);
      if (!isValid) {
        return { error: 'Password non corretta.' };
      }
    } else { // register
      const userDir = getUserDir(username);
      await ensureDir(userDir);
      const userFilePath = getUserFilePath(username);
      const passwordHash = await hashPassword(password);
      await fs.writeFile(userFilePath, JSON.stringify({ username, passwordHash }));
    }

    await loginUser(username);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && mode === 'login') {
      return { error: 'Utente non trovato.' };
    }
    console.error(`Authentication failed for user ${username}:`, error);
    return { error: 'Si è verificato un errore del server. Riprova.' };
  }
  redirect('/admin');
}

export async function logout() {
  cookies().delete('username');
  redirect('/');
}

// --- Poll Actions ---

export async function createPoll(data: { title: string; questions: { text: string; answers: { text: string }[] }[] }, isUpdate: boolean, username: string): Promise<{ error: string } | void> {
  if (!username) {
    throw new Error("Utente non autenticato.");
  }

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
      const currentPoll = await getPollData(username);
      if (currentPoll.title) {
        await archivePollResults(currentPoll, username, 'updated');
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Impossibile archiviare i risultati del sondaggio precedente.";
        return { error: errorMessage };
    }
  }

  const newPoll: Poll = {
    id: randomUUID(),
    title,
    owner: username,
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
    await writePollData(newPoll, username);
  } catch (error) {
    console.error("Failed to write poll data:", error);
    return { error: "Impossibile salvare il sondaggio. Si è verificato un errore del server." };
  }

  revalidatePath(`/${username}`);
  revalidatePath('/admin');
  
  redirect(`/${username}`);
}

export async function getPoll(username: string): Promise<Poll> {
  if (!username) {
    return { id: null, title: null, questions: [], owner: null };
  }
  return await getPollData(username);
}

export async function submitVote(questionId: number, answerId: number, username: string) {
  const poll = await getPollData(username);
  if (!poll.title) return { error: 'Nessun sondaggio attivo.' };

  const question = poll.questions.find(q => q.id === questionId);
  if (!question) return { error: 'Domanda non valida.' };
  
  const answer = question.answers.find(a => a.id === answerId);
  if (answer) {
    answer.votes += 1;
    try {
        await writePollData(poll, username);
    } catch (error) {
        console.error("Failed to write poll data on vote:", error);
        return { error: "Impossibile salvare il voto. Si è verificato un errore del server." };
    }
    revalidatePath(`/${username}`);
    return { success: 'Voto inviato!' };
  }
  return { error: 'Risposta non valida.' };
}

export async function endPoll(username: string) {
    if (!username) {
      return { error: "Utente non autenticato." };
    }

    try {
        const poll = await getPollData(username);
        if (!poll.title) {
            return { error: 'Nessun sondaggio attivo da terminare.' };
        }
        const resultFileName = await archivePollResults(poll, username, 'ended');
        await writePollData({ id: null, title: null, questions: [], owner: username }, username);
        
        revalidatePath(`/${username}`);
        revalidatePath('/admin');
        return { success: `Sondaggio terminato e risultati salvati in ${resultFileName}` };

    } catch (error) {
        console.error("Failed to end poll:", error);
        const errorMessage = error instanceof Error ? error.message : "Impossibile terminare il sondaggio. Si è verificato un errore del server.";
        return { error: errorMessage };
    }
}

export async function getResultsFiles(username: string): Promise<string[]> {
  if (!username) {
    return [];
  }
  const userResultsDir = getResultsDir(username);
  await ensureDir(userResultsDir);
  try {
    const files = await fs.readdir(userResultsDir);
    return files.filter(file => file.endsWith('.json')).sort((a, b) => b.localeCompare(a));
  } catch (error) {
    console.error("Failed to read results directory:", error);
    return [];
  }
}
