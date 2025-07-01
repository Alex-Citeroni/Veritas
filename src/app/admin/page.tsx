import { PollForm } from '@/components/PollForm';
import { getPoll } from '@/lib/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export default async function AdminPage() {
  const poll = await getPoll();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <header className="absolute top-4 right-4">
        <Button asChild variant="outline">
          <Link href="/">
            <Eye className="mr-2 h-4 w-4" />
            View Poll
          </Link>
        </Button>
      </header>
      <PollForm currentPoll={poll} />
    </div>
  );
}
