// This is a new file: src/components/PollList.tsx
'use client';

import type { Poll } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { activatePoll, deactivatePoll, deletePoll } from '@/lib/actions';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Edit, PlayCircle, StopCircle, Share2, Eye, List } from 'lucide-react';
import { ShareLinkButton } from './ShareLinkButton';

interface PollListProps {
  polls: Poll[];
  activePollId?: string | null;
}

function PollActionButtons({ poll }: { poll: Poll }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleAction = (action: (id: string, owner: string) => Promise<any>, successMessage: string) => {
    startTransition(async () => {
      try {
        await action(poll.id, poll.owner);
        toast({ title: 'Successo!', description: successMessage });
        router.refresh();
      } catch (e) {
        const error = e as Error;
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {poll.isActive ? (
        <Button size="sm" variant="outline" onClick={() => handleAction(deactivatePoll, 'Sondaggio disattivato.')} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 animate-spin" /> : <StopCircle className="mr-2" />}
          Disattiva
        </Button>
      ) : (
        <Button size="sm" onClick={() => handleAction(activatePoll, 'Sondaggio attivato!')} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 animate-spin" /> : <PlayCircle className="mr-2" />}
          Attiva
        </Button>
      )}

      <Button asChild size="sm" variant="outline">
        <Link href={`/admin?edit=${poll.id}`}>
          <Edit className="mr-2" />
          Modifica
        </Link>
      </Button>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="icon" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Questo eliminerà permanentemente il sondaggio "{poll.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction(deletePoll, 'Sondaggio eliminato.')} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending && <Loader2 className="mr-2 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


export function PollList({ polls, activePollId }: PollListProps) {
  const activePoll = polls.find(p => p.id === activePollId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <List />
            I Tuoi Sondaggi
        </CardTitle>
        <CardDescription>
          Gestisci i tuoi sondaggi. Puoi attivarne solo uno alla volta. Quello attivo sarà visibile al pubblico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activePoll && (
             <div className="p-4 rounded-lg border border-primary bg-primary/10 mb-6">
                <h3 className="text-lg font-semibold text-primary mb-2">Sondaggio Attivo</h3>
                <div className="flex items-center justify-between gap-4">
                    <span className="font-bold">{activePoll.title}</span>
                    <div className="flex items-center gap-2">
                         <Button asChild variant="outline" size="sm">
                            <Link href={`/${activePoll.owner}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Vedi Live
                            </Link>
                        </Button>
                        <ShareLinkButton username={activePoll.owner} />
                    </div>
                </div>
             </div>
        )}

        {polls.length > 0 ? (
          <ul className="space-y-3">
            {polls.map((poll) => (
              <li key={poll.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="truncate font-medium" title={poll.title}>{poll.title}</span>
                  {poll.isActive && <Badge>Attivo</Badge>}
                </div>
                <PollActionButtons poll={poll} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Non hai ancora creato nessun sondaggio.</p>
            <p>Usa il modulo qui sopra per iniziare!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
