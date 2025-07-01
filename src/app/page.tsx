import { PollVoter } from '@/components/PollVoter';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCog } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 relative">
       <header className="absolute top-4 right-4">
        <Button asChild variant="outline">
          <Link href="/admin">
            <UserCog className="mr-2 h-4 w-4" />
            Admin Panel
          </Link>
        </Button>
      </header>
      <h1 className="text-5xl font-bold text-primary mb-4">PollsUp</h1>
      <p className="text-xl text-muted-foreground mb-8">Live Interactive Polling</p>
      <PollVoter />
    </main>
  );
}
