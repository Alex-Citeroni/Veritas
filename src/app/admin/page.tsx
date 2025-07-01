import { cookies } from 'next/headers';
import Link from 'next/link';
import { listPolls, getPollById, getResultsFiles } from '@/lib/actions';
import { Login } from '@/components/Login';
import { LogoutButton } from '@/components/LogoutButton';
import { PollForm } from '@/components/PollForm';
import { PollList } from '@/components/PollList';
import type { Poll } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserCog } from 'lucide-react';

export type PollWithResults = Poll & { results: string[] };

export default async function AdminPage({ searchParams }: { searchParams: { edit?: string } }) {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;

  if (!username) {
    return <Login />;
  }

  const allPolls = await listPolls(username);
  const allResultFiles = await getResultsFiles(username);
  
  const pollsWithResults: PollWithResults[] = allPolls.map(poll => ({
    ...poll,
    results: allResultFiles
      .filter(file => file.startsWith(poll.id))
      .sort((a, b) => b.localeCompare(a)), // Sort descending to show newest first
  }));

  const pollIdToEdit = searchParams.edit;
  
  let pollToEdit = null;
  if (pollIdToEdit) {
    try {
      pollToEdit = await getPollById(pollIdToEdit, username);
    } catch (error) {
      console.error(`Failed to load poll for editing (id: ${pollIdToEdit}).`, error);
      pollToEdit = null;
    }
  }

  const activePoll = allPolls.find(p => p.isActive) || null;

  return (
    <div className="h-screen w-full flex flex-col bg-muted/30">
      <header className="flex-shrink-0 bg-background border-b z-10 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <h1 className="text-xl font-bold text-primary">Dashboard Veritas</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">Ciao, {username}!</span>
                    <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                      <Link href="/admin/profile" title="Gestisci Profilo">
                          <UserCog className="h-5 w-5" />
                      </Link>
                    </Button>
                    <LogoutButton />
                </div>
            </div>
        </div>
      </header>
      
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Poll List */}
        <aside className="w-full md:w-1/3 lg:w-2/5 flex flex-col border-r bg-background">
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                <h2 className="text-lg font-semibold">I Tuoi Sondaggi</h2>
                <Button asChild size="sm" variant="outline">
                   <Link href="/admin">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuovo
                   </Link>
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto">
                <PollList polls={pollsWithResults} activePollId={activePoll?.id} />
            </div>
        </aside>

        {/* Right Panel: Poll Form */}
        <main className="w-full md:w-2/3 lg:w-3/5 flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8">
          <PollForm
            key={pollIdToEdit || 'new-poll'}
            username={username}
            currentPoll={pollToEdit}
            pollId={pollIdToEdit}
          />
        </main>
      </div>
    </div>
  );
}
