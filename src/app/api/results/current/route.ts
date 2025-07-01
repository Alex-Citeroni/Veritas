import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPoll } from '@/lib/actions';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get('auth')?.value === 'true';

  if (!isAuthenticated) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const poll = await getPoll();

    if (!poll.title) {
      return new NextResponse(
        JSON.stringify({ error: 'Nessun sondaggio attivo da scaricare.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      title: poll.title,
      generatedAt: new Date().toISOString(),
      questions: poll.questions.map(q => ({
        question: q.text,
        results: q.answers.map(({ text, votes }) => ({ text, votes })),
        totalVotes: q.answers.reduce((sum, a) => sum + a.votes, 0)
      }))
    };
    
    const fileContent = JSON.stringify(results, null, 2);
    const filename = `risultati-live-${new Date().toISOString().slice(0, 10)}.json`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new NextResponse(fileContent, { status: 200, headers });
  } catch (error) {
    console.error('Failed to generate current results:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
