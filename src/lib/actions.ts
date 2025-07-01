'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Poll, Question } from '@/lib/types';
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
    if (!password || !hash) return false;
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
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
    const now = new Date();
    
    const timestampForFilename = now.toISOString().replace(/:/g, '-').slice(0, 19);
    
    const safeTitle = (poll.title || 'sondaggio-senza-titolo')
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s-]/g, '') // Remove non-word chars, spaces, hyphens
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .slice(0, 50); // Truncate

    const resultFileName = `${poll.id}-${safeTitle}-${timestampForFilename}.md`;
    const resultFilePath = path.join(userResultsDir, resultFileName);

    let fileContent = `# Risultati Sondaggio: ${poll.title}\n\n`;
    fileContent += `- **Proprietario**: ${poll.owner}\n`;
    fileContent += `- **Stato**: ${reason === 'ended' ? 'Terminato' : 'Archiviato'}\n`;
    fileContent += `- **Generato il**: ${now.toLocaleString('it-IT')}\n`;
    fileContent += `- **ID Sondaggio**: ${poll.id}\n\n`;
    
    poll.questions.forEach((q, index) => {
        const totalVotes = q.answers.reduce((sum, a) => sum + a.votes, 0);
        fileContent += '---\n\n';
        fileContent += `## Domanda ${index + 1}: ${q.text}\n\n`;
        fileContent += `*(Voti totali: ${totalVotes})*\n\n`;
        
        q.answers.forEach(a => {
            const percentage = totalVotes > 0 ? ((a.votes / totalVotes) * 100).toFixed(1) : "0.0";
            fileContent += `- ${a.text}: **${a.votes}** voti (${percentage}%)\n`;
        });
        fileContent += '\n';
    });

    try {
        await fs.writeFile(resultFilePath, fileContent, 'utf-8');
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
        return polls.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
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
        const updatedAt = new Date().toISOString();

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
                updatedAt,
            };
        } else {
            // Create new poll
            const allPolls = await listPolls(username);
            const isFirstPoll = allPolls.length === 0;

            poll = {
                id: randomUUID(),
                title,
                owner: username,
                isActive: isFirstPoll,
                questions: questions.map((q, qIndex) => ({
                    id: qIndex,
                    text: q.text,
                    answers: q.answers.map((a, aIndex) => ({
                        id: aIndex,
                        text: a.text,
                        votes: 0,
                    })),
                })),
                updatedAt,
            };
        }

        const filePath = getPollFilePath(username, poll.id);
        await writePollFile(filePath, poll);
        
        return { success: true };
    } catch (e) {
        console.error("savePoll failed:", e);
        const error = e as Error;
        return { success: false, error: error.message || 'Si è verificato un errore durante il salvataggio del sondaggio.' };
    }
}

export async function deletePoll(pollId: string, username: string): Promise<{ success: boolean; error?: string }> {
    try {
        const poll = await getPollById(pollId, username);
        if (!poll || poll.owner !== username) {
            return { success: false, error: 'Sondaggio non trovato o non autorizzato.' };
        }
        
        if (poll.isActive) {
           await archivePollResults(poll, 'ended');
        }

        const filePath = getPollFilePath(username, pollId);
        await fs.unlink(filePath);

        // Also delete associated result files
        const userResultsDir = getResultsDir(username);
        const allResultFiles = await getResultsFiles(username); 
        const pollResultFiles = allResultFiles.filter(file => file.startsWith(pollId));

        for (const file of pollResultFiles) {
            try {
                const resultFilePath = path.join(userResultsDir, file);
                await fs.unlink(resultFilePath);
            } catch (unlinkError) {
                console.warn(`Could not delete result file ${file}:`, unlinkError)
                // Continue even if one file fails to delete
            }
        }

        return { success: true };
    } catch (e) {
        const error = e as Error;
        console.error(`deletePoll failed for poll ${pollId}:`, error);
        return { success: false, error: error.message || 'Impossibile eliminare il sondaggio.' };
    }
}


export async function activatePoll(pollId: string, username: string): Promise<{ success: boolean; error?: string }> {
    try {
        const allPolls = await listPolls(username);
        let targetPoll: Poll | null = null;
        
        for (const p of allPolls) {
            if (p.id === pollId) {
                targetPoll = p;
            } else if (p.isActive) {
                // Archive previous active poll before deactivating
                await archivePollResults(p, 'ended');
                p.isActive = false;
                await writePollFile(getPollFilePath(username, p.id), p);
            }
        }

        if (targetPoll) {
            targetPoll.isActive = true;
            await writePollFile(getPollFilePath(username, targetPoll.id), targetPoll);
        } else {
            return { success: false, error: 'Sondaggio non trovato.' };
        }

        return { success: true };
    } catch (e) {
        const error = e as Error;
        console.error(`activatePoll failed for poll ${pollId}:`, error);
        return { success: false, error: error.message || 'Impossibile attivare il sondaggio.' };
    }
}

export async function deactivatePoll(pollId: string, username: string): Promise<{ success: boolean; error?: string }> {
    try {
        const poll = await getPollById(pollId, username);
        if (!poll || poll.owner !== username) {
            return { success: false, error: 'Sondaggio non trovato o non autorizzato.' };
        }
        if (poll.isActive) {
            await archivePollResults(poll, 'ended');
            poll.isActive = false;
            await writePollFile(getPollFilePath(username, poll.id), poll);
        }
        
        return { success: true };
    } catch (e) {
        const error = e as Error;
        console.error(`deactivatePoll failed for poll ${pollId}:`, error);
        return { success: false, error: error.message || 'Impossibile disattivare il sondaggio.' };
    }
}

// --- Voting Page Actions ---

export async function getPoll(username: string): Promise<Poll | null> {
    try {
      const allPolls = await listPolls(username);
      const activePoll = allPolls.find(p => p.isActive) || null;
      return activePoll;
    } catch (error) {
      console.error(`Error getting poll for user ${username}:`, error);
      // Return a "no poll" state instead of throwing
      return null;
    }
}


export async function submitVote(questionId: number, newAnswerId: number, oldAnswerId: number | null, username: string) {
  const poll = await getPoll(username);
  if (!poll?.id) return { error: 'Nessun sondaggio attivo.' };

  const question = poll.questions.find(q => q.id === questionId);
  if (!question) return { error: 'Domanda non valida.' };
  
  const newAnswer = question.answers.find(a => a.id === newAnswerId);
  if (!newAnswer) return { error: 'Nuova risposta non valida.' };

  // Increment the new answer
  newAnswer.votes += 1;

  // Decrement the old answer if it exists
  if (oldAnswerId !== null) {
      const oldAnswer = question.answers.find(a => a.id === oldAnswerId);
      if (oldAnswer && oldAnswer.votes > 0) {
          oldAnswer.votes -= 1;
      }
  }

  try {
    const filePath = getPollFilePath(username, poll.id);
    await writePollFile(filePath, poll);
  } catch (error) {
    console.error("Failed to write poll data on vote:", error);
    return { error: "Impossibile salvare il voto. Si è verificato un errore del server." };
  }
  return { success: true };
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
    return files.filter(file => file.endsWith('.md')).sort((a, b) => b.localeCompare(a));
  } catch (error) {
    console.error("Failed to read results directory:", error);
    return [];
  }
}

export async function archiveCurrentPollResults(username: string): Promise<{ success: boolean; error?: string; filename?: string }> {
    try {
        const poll = await getPoll(username);
        if (!poll) {
            return { success: false, error: 'Nessun sondaggio attivo da archiviare.' };
        }
        
        const filename = await archivePollResults(poll, 'updated');
        
        return { success: true, filename };
    } catch (e) {
        const error = e as Error;
        console.error(`archiveCurrentPollResults failed for user ${username}:`, error);
        return { success: false, error: error.message || 'Impossibile archiviare i risultati.' };
    }
}

// --- Profile Actions ---

export async function changeUsernameAction(prevState: any, formData: FormData) {
  const currentUsername = cookies().get('username')?.value;
  if (!currentUsername) {
    return { error: 'Sessione scaduta. Effettua nuovamente il login.' };
  }

  const newUsername = formData.get('newUsername') as string;
  const password = formData.get('password') as string;
  
  // Validation
  if (!newUsername || !password) {
    return { error: 'Tutti i campi sono obbligatori.' };
  }
  if (newUsername === currentUsername) {
    return { error: 'Il nuovo username deve essere diverso da quello attuale.' };
  }

  const checkResult = await checkUsername(newUsername);
  if (checkResult.exists) {
      return { error: `L'username "${newUsername}" è già in uso.` };
  }
  if (checkResult.error) {
       return { error: checkResult.error };
  }

  try {
    // Verify password
    const userFilePath = getUserFilePath(currentUsername);
    const userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    const isValid = await verifyPassword(password, userData.passwordHash);
    if (!isValid) {
        return { error: 'La password attuale non è corretta.' };
    }
    
    // Perform rename
    const safeNewUsername = checkResult.username;

    const oldUserDir = getUserDir(currentUsername);
    const newUserDir = getUserDir(safeNewUsername);
    const oldResultsDir = getResultsDir(currentUsername);
    const newResultsDir = getResultsDir(safeNewUsername);

    // Rename data directory
    await fs.rename(oldUserDir, newUserDir);
    
    // Rename results directory if it exists
    try {
        await fs.access(oldResultsDir);
        await fs.rename(oldResultsDir, newResultsDir);
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.warn(`Impossibile rinominare la cartella dei risultati per ${currentUsername}:`, e);
        }
    }
    
    // Update owner in all poll files
    const pollsDir = getPollsDir(safeNewUsername); // Use new path
    const pollFiles = await fs.readdir(pollsDir);
    for (const file of pollFiles.filter(f => f.endsWith('.json'))) {
        const pollPath = path.join(pollsDir, file);
        const poll = await readPollFile(pollPath);
        if (poll) {
            poll.owner = safeNewUsername;
            await writePollFile(pollPath, poll);
        }
    }

    // Update user file
    userData.username = safeNewUsername;
    await fs.writeFile(getUserFilePath(safeNewUsername), JSON.stringify(userData, null, 2));

    // Update cookie
    cookies().set('username', safeNewUsername, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24, path: '/' });

  } catch(e) {
      console.error("Errore durante la modifica dell'username:", e);
      return { error: 'Si è verificato un errore del server durante la modifica dello username.' };
  }
  
  return { success: true };
}

export async function changePasswordAction(prevState: any, formData: FormData) {
  const username = cookies().get('username')?.value;
  if (!username) {
    return { error: 'Sessione scaduta. Effettua nuovamente il login.' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: 'Tutti i campi sono obbligatori.' };
  }
  if (newPassword !== confirmPassword) {
      return { error: 'Le nuove password non coincidono.' };
  }
  if (newPassword.length < 6) {
      return { error: 'La nuova password deve contenere almeno 6 caratteri.'};
  }

  try {
    // Verify current password
    const userFilePath = getUserFilePath(username);
    const userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    const isValid = await verifyPassword(currentPassword, userData.passwordHash);
    if (!isValid) {
        return { error: 'La password attuale non è corretta.' };
    }
    
    // Update password
    userData.passwordHash = await hashPassword(newPassword);
    await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));

  } catch (e) {
      console.error("Errore durante la modifica della password:", e);
      return { error: 'Si è verificato un errore del server durante la modifica della password.' };
  }

  return { success: true };
}
