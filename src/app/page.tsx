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
            Pannello Admin
          </Link>
        </Button>
      </header>
      <PollVoter />
    </main>
  );
}
