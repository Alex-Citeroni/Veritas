import { cookies } from 'next/headers';
import { listPolls, getPollById } from '@/lib/actions';
import { Login } from '@/components/Login';
import { LogoutButton } from '@/components/LogoutButton';
import { PollForm } from '@/components/PollForm';
import { PollList } from '@/components/PollList';
import { Separator } from '@/components/ui/separator';

export default async function AdminPage({ searchParams }: { searchParams: { edit?: string } }) {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;

  if (!username) {
    return <Login />;
  }

  const polls = await listPolls(username);
  const pollIdToEdit = searchParams.edit;
  
  let pollToEdit = null;
  if (pollIdToEdit) {
    pollToEdit = await getPollById(pollIdToEdit, username);
  }

  const activePoll = polls.find(p => p.isActive) || null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-5xl flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard Sondaggi ({username})</h1>
        <LogoutButton />
      </header>
      <main className="w-full max-w-5xl flex flex-col gap-8">
        <PollForm
          key={pollIdToEdit || 'new-poll'}
          username={username}
          currentPoll={pollToEdit}
          pollId={pollIdToEdit}
        />
        <Separator />
        <PollList polls={polls} activePollId={activePoll?.id} />
      </main>
    </div>
  );
}
