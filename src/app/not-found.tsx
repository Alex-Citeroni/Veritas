import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 text-center bg-background">
      <div className="flex items-center justify-center gap-4 mb-4">
        <ShieldCheck className="w-16 h-16 text-destructive" />
        <h1 className="text-6xl font-bold text-primary">404</h1>
      </div>
      <h2 className="text-3xl font-semibold mb-2">Pagina Non Trovata</h2>
      <p className="text-xl text-muted-foreground max-w-lg mb-8">
        Spiacenti, la pagina che stai cercando non esiste o è stata spostata.
      </p>
      <Button asChild size="lg">
        <Link href="/">
          <Home className="mr-2 h-5 w-5" />
          Torna alla Home
        </Link>
      </Button>
    </main>
  );
}
