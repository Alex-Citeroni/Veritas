import { UserProfile } from '@/components/UserProfile';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;

  if (!username) {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 p-4 sm:p-6 lg:p-10">
      <header className="w-full max-w-2xl mb-6 self-start md:self-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Dashboard
          </Link>
        </Button>
      </header>
      <main className="w-full max-w-2xl">
        <UserProfile username={username} />
      </main>
    </div>
  );
}
