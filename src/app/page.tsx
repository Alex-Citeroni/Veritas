import { PollVoter } from '@/components/PollVoter';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCog, Sparkles } from 'lucide-react';

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
      <div className="flex items-center justify-center gap-4 mb-4">
        <Sparkles className="w-16 h-16 text-primary" />
        <h1 className="text-6xl font-bold text-primary">Sondiamo</h1>
      </div>
      <p className="text-xl text-muted-foreground mb-8">Sondaggi interattivi in tempo reale</p>
      <PollVoter />
    </main>
  );
}
