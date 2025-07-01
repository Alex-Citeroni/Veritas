import { cookies } from 'next/headers';
import { PollForm } from '@/components/PollForm';
import { getPoll } from '@/lib/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Login } from '@/components/Login';
import { LogoutButton } from '@/components/LogoutButton';

export default async function AdminPage() {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get('auth')?.value === 'true';

  if (!isAuthenticated) {
    return <Login />;
  }

  const poll = await getPoll();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <header className="absolute top-4 right-4 flex items-center gap-4">
        <Button asChild variant="outline">
          <Link href="/">
            <Eye className="mr-2 h-4 w-4" />
            Vedi Sondaggio
          </Link>
        </Button>
        <LogoutButton />
      </header>
      <PollForm currentPoll={poll} />
    </div>
  );
}
