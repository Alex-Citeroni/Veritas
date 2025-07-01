import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPoll } from '@/lib/actions';
import type { Poll } from '@/lib/types';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;

  if (!username) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const poll: Poll | null = await getPoll(username);

    if (!poll) {
      return new NextResponse(
        JSON.stringify({ error: 'Nessun sondaggio attivo da scaricare.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    let fileContent = `# Risultati Live Sondaggio: ${poll.title}\n\n`;
    fileContent += `- **Proprietario**: ${poll.owner}\n`;
    fileContent += `- **Generato il**: ${now.toLocaleString('it-IT')}\n\n`;
    
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
    
    const filename = `risultati-live-${new Date().toISOString().slice(0, 10)}.md`;

    const headers = new Headers();
    headers.set('Content-Type', 'text/markdown; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new NextResponse(fileContent, { status: 200, headers });
  } catch (error) {
    console.error('Failed to generate current results:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
