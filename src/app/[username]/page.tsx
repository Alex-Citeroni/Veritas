import { PollVoter } from '@/components/PollVoter';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCog, ShieldCheck } from 'lucide-react';
import { getPoll } from '@/lib/actions';
import type { Poll } from '@/lib/types';

export default async function UserPollPage({ params }: { params: { username: string } }) {
  const { username } = params;
  const poll: Poll | null = await getPoll(username);

  return (
    <div className="flex flex-col h-screen bg-muted/40">
       <header className="flex-shrink-0 bg-background border-b z-10 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
                        <ShieldCheck className="h-6 w-6" />
                        <span>Veritas</span>
                    </Link>
                    <Button asChild variant="outline">
                      <Link href="/admin">
                        <UserCog className="mr-2 h-4 w-4" />
                        Pannello Admin
                      </Link>
                    </Button>
                </div>
            </div>
        </header>
      <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 flex justify-center">
        <PollVoter initialPoll={poll} username={username} />
      </main>
    </div>
  );
}
