import { cookies } from 'next/headers';
import { PollForm } from '@/components/PollForm';
import { getPoll, getResultsFiles } from '@/lib/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Login } from '@/components/Login';
import { LogoutButton } from '@/components/LogoutButton';
import { ShareLinkButton } from '@/components/ShareLinkButton';
import { ResultsManager } from '@/components/ResultsManager';
import { Separator } from '@/components/ui/separator';


export default async function AdminPage() {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;

  if (!username) {
    return <Login />;
  }

  const poll = await getPoll(username);
  const resultsFiles = await getResultsFiles(username);
  const hasActivePoll = !!poll?.title;

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-3xl flex justify-between items-center mb-8">
         <h1 className="text-2xl font-bold">Pannello Admin ({username})</h1>
        <div className="flex items-center gap-2">
            {hasActivePoll && (
              <Button asChild variant="outline">
                <Link href={`/${username}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Vedi Sondaggio
                </Link>
              </Button>
            )}
            <ShareLinkButton username={username} disabled={!hasActivePoll} />
            <LogoutButton />
        </div>
      </header>
      <main className="w-full max-w-3xl flex flex-col gap-8">
        <PollForm currentPoll={poll} username={username} />
        <Separator />
        <ResultsManager files={resultsFiles} hasActivePoll={hasActivePoll} />
      </main>
    </div>
  );
}
