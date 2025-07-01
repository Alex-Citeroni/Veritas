import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 text-center">
      <div className="flex items-center justify-center gap-4 mb-4">
        <ShieldCheck className="w-16 h-16 text-primary" />
        <h1 className="text-6xl font-bold text-primary">Veritas</h1>
      </div>
      <p className="text-xl text-muted-foreground max-w-lg mb-8">
        Crea e condividi sondaggi interattivi in tempo reale. Accedi per iniziare a creare il tuo primo sondaggio.
      </p>
      <Button asChild size="lg">
        <Link href="/admin">
          <LogIn className="mr-2 h-5 w-5" />
          Accedi e crea un sondaggio
        </Link>
      </Button>
    </main>
  );
}
