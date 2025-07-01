import { PollVoter } from '@/components/PollVoter';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCog } from 'lucide-react';
import { getPoll } from '@/lib/actions';
import type { Poll } from '@/lib/types';

export default async function UserPollPage({ params }: { params: { username: string } }) {
  const { username } = params;
  const poll: Poll = await getPoll(username);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 relative">
       <header className="absolute top-4 right-4 z-10">
        <Button asChild variant="outline">
          <Link href="/admin">
            <UserCog className="mr-2 h-4 w-4" />
            Pannello Admin
          </Link>
        </Button>
      </header>
      <PollVoter initialPoll={poll} username={username} />
    </main>
  );
}
