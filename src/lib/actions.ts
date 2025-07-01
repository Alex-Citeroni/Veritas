'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Poll, Question } from '@/lib/types';
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

function getPollsDir(username: string): string {
    return path.join(getUserDir(username), 'polls');
}

function getPollFilePath(username: string, pollId: string): string {
    const pollsDir = getPollsDir(username);
    // Basic validation to prevent path traversal
    if (pollId.includes('..') || pollId.includes('/')) {
        throw new Error('Invalid Poll ID');
    }
    return path.join(pollsDir, `${pollId}.json`);
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

async function readPollFile(filePath: string): Promise<Poll | null> {
    try {
        const pollData = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(pollData) as Poll;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null; // File not found is a valid case
        }
        console.error(`Error reading poll file ${filePath}:`, error);
        throw new Error('Could not read poll file.');
    }
}

async function writePollFile(filePath: string, poll: Poll) {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(poll, null, 2), 'utf-8');
}

async function archivePollResults(poll: Poll, reason: 'updated' | 'ended'): Promise<string> {
    const userResultsDir = getResultsDir(poll.owner);
    await ensureDir(userResultsDir);
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    
    // Use poll ID for a unique, safe filename
    const resultFileName = `${poll.id}-${reason}-${timestamp}.json`;
    const resultFilePath = path.join(userResultsDir, resultFileName);

    const results = {
        pollId: poll.id,
        title: poll.title,
        owner: poll.owner,
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

export async function listPolls(username: string): Promise<Poll[]> {
    const pollsDir = getPollsDir(username);
    await ensureDir(pollsDir);
    try {
        const files = await fs.readdir(pollsDir);
        const pollPromises = files
            .filter(file => file.endsWith('.json'))
            .map(file => readPollFile(path.join(pollsDir, file)));
        
        const polls = (await Promise.all(pollPromises)).filter(p => p !== null) as Poll[];
        return polls.sort((a, b) => a.title.localeCompare(b.title));
    } catch (error) {
        console.error(`Failed to list polls for user ${username}:`, error);
        return [];
    }
}

export async function getPollById(pollId: string, username: string): Promise<Poll | null> {
    const filePath = getPollFilePath(username, pollId);
    return readPollFile(filePath);
}


export async function savePoll(
    data: { title: string; questions: { text: string; answers: { text: string }[] }[] },
    username: string,
    pollIdToUpdate?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { title, questions } = data;
        let poll: Poll;

        if (pollIdToUpdate) {
            // Update existing poll
            const existingPoll = await getPollById(pollIdToUpdate, username);
            if (!existingPoll || existingPoll.owner !== username) {
                return { success: false, error: 'Sondaggio non trovato o non autorizzato.' };
            }
            poll = {
                ...existingPoll,
                title,
                questions: questions.map((q, qIndex) => ({
                    id: qIndex,
                    text: q.text,
                    answers: q.answers.map((a, aIndex) => ({
                        id: aIndex,
                        text: a.text,
                        votes: 0, // Reset votes on update
                    })),
                })),
            };
        } else {
            // Create new poll
            poll = {
                id: randomUUID(),
                title,
                owner: username,
                isActive: false, // New polls are not active by default
                questions: questions.map((q, qIndex) => ({
                    id: qIndex,
                    text: q.text,
                    answers: q.answers.map((a, aIndex) => ({
                        id: aIndex,
                        text: a.text,
                        votes: 0,
                    })),
                })),
            };
        }

        const filePath = getPollFilePath(username, poll.id);
        await writePollFile(filePath, poll);

        revalidatePath('/admin');
        revalidatePath(`/${username}`);
        
        return { success: true };
    } catch (e) {
        console.error("savePoll failed:", e);
        const error = e as Error;
        return { success: false, error: error.message || 'Si è verificato un errore durante il salvataggio del sondaggio.' };
    }
}

export async function deletePoll(pollId: string, username: string) {
    const poll = await getPollById(pollId, username);
    if (!poll || poll.owner !== username) {
        return { error: 'Sondaggio non trovato o non autorizzato.' };
    }
    
    // If poll is active, archive its results
    if (poll.isActive) {
       await archivePollResults(poll, 'ended');
    }

    const filePath = getPollFilePath(username, pollId);
    await fs.unlink(filePath);

    revalidatePath(`/${username}`);
    revalidatePath('/admin');
}


export async function activatePoll(pollId: string, username: string) {
    const allPolls = await listPolls(username);
    let targetPoll: Poll | null = null;
    
    for (const p of allPolls) {
        if (p.id === pollId) {
            targetPoll = p;
        } else if (p.isActive) {
            p.isActive = false;
            await writePollFile(getPollFilePath(username, p.id), p);
        }
    }

    if (targetPoll) {
        targetPoll.isActive = true;
        await writePollFile(getPollFilePath(username, targetPoll.id), targetPoll);
    }

    revalidatePath(`/${username}`);
    revalidatePath('/admin');
}

export async function deactivatePoll(pollId: string, username: string) {
    const poll = await getPollById(pollId, username);
    if (!poll || poll.owner !== username) {
        return { error: 'Sondaggio non trovato o non autorizzato.' };
    }
    if (poll.isActive) {
        await archivePollResults(poll, 'ended');
        poll.isActive = false;
        await writePollFile(getPollFilePath(username, poll.id), poll);
    }
    
    revalidatePath(`/${username}`);
    revalidatePath('/admin');
}

// --- Voting Page Actions ---

export async function getPoll(username: string): Promise<Poll | null> {
    const allPolls = await listPolls(username);
    const activePoll = allPolls.find(p => p.isActive) || null;
    return activePoll;
}


export async function submitVote(questionId: number, answerId: number, username: string) {
  const poll = await getPoll(username);
  if (!poll?.id) return { error: 'Nessun sondaggio attivo.' };

  const question = poll.questions.find(q => q.id === questionId);
  if (!question) return { error: 'Domanda non valida.' };
  
  const answer = question.answers.find(a => a.id === answerId);
  if (answer) {
    answer.votes += 1;
    try {
        const filePath = getPollFilePath(username, poll.id);
        await writePollFile(filePath, poll);
    } catch (error) {
        console.error("Failed to write poll data on vote:", error);
        return { error: "Impossibile salvare il voto. Si è verificato un errore del server." };
    }
    revalidatePath(`/${username}`);
    return { success: 'Voto inviato!' };
  }
  return { error: 'Risposta non valida.' };
}


// --- Results Actions ---

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
