'use client';

import type { Poll } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { activatePoll, deactivatePoll, deletePoll, archiveCurrentPollResults } from '@/lib/actions';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Loader2, Trash2, Edit, PlayCircle, StopCircle, Eye, Download, FileText } from 'lucide-react';
import { ShareLinkButton } from './ShareLinkButton';

type PollWithResults = Poll & { results: string[] };

interface PollListProps {
  polls: PollWithResults[];
  activePollId?: string | null;
}

function ResultFileList({ files }: { files: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, startDeleting] = useTransition();

  const getDisplayDate = (filename: string): string => {
    const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.md$/);
    if (!match) return filename;

    const timestampStr = match[1];
    const parts = timestampStr.split(/[-T]/);
    if (parts.length < 6) return filename;

    const date = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1, // Month is 0-indexed
      parseInt(parts[2], 10),
      parseInt(parts[3], 10),
      parseInt(parts[4], 10),
      parseInt(parts[5], 10)
    );

    if (isNaN(date.getTime())) return filename;

    return date.toLocaleString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
  }

  const handleDelete = (filename: string) => {
    startDeleting(async () => {
      const response = await fetch(`/api/results/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        toast({
          title: 'Successo',
          description: `Il file "${filename}" è stato eliminato.`,
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: result.message || 'Impossibile eliminare il file.',
        });
      }
    });
  };

  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground mt-2">Nessun risultato archiviato per questo sondaggio.</p>;
  }

  return (
    <ul className="space-y-2 mt-4">
      {files.map((file) => (
        <li key={file} className="flex items-center justify-between p-2 rounded-md border bg-background">
          <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground overflow-hidden">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate" title={file}>{getDisplayDate(file)}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button asChild size="sm" variant="ghost">
              <a href={`/api/results/${encodeURIComponent(file)}`} download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isDeleting} className="h-8 w-8 text-destructive hover:text-destructive">
                   <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione eliminerà permanentemente il file dei risultati "{file}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(file)}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PollAccordionItem({ poll }: { poll: PollWithResults }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  
  const handleAction = async (
    action: (id: string, username: string) => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => {
    startTransition(async () => {
      const result = await action(poll.id, poll.owner);
      if (result.success) {
        toast({ title: 'Successo!', description: successMessage });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: result.error || 'Si è verificato un errore sconosciuto.',
        });
      }
    });
  };

  return (
    <AccordionItem value={poll.id} className="border-b-0">
      <div className="border rounded-lg mb-2 overflow-hidden bg-secondary/20">
        <AccordionTrigger className="p-4 hover:no-underline hover:bg-secondary/50 data-[state=open]:bg-secondary/50 data-[state=open]:border-b">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="font-medium truncate" title={poll.title}>{poll.title}</span>
              {poll.isActive && <Badge>Attivo</Badge>}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 bg-background">
            <div className="flex items-center gap-2 flex-wrap mb-4 pb-4 border-b">
              {poll.isActive ? (
                <Button size="sm" variant="outline" onClick={() => handleAction(deactivatePoll, 'Sondaggio disattivato.')} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                  <span className="hidden sm:inline ml-2">Disattiva</span>
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleAction(activatePoll, 'Sondaggio attivato!')} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                   <span className="hidden sm:inline ml-2">Attiva</span>
                </Button>
              )}

              <Button asChild size="sm" variant="outline">
                <Link href={`/admin?edit=${poll.id}`}>
                  <Edit className="h-4 w-4" />
                   <span className="hidden sm:inline ml-2">Modifica</span>
                </Link>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Elimina</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione eliminerà permanentemente il sondaggio "{poll.title}" e tutti i suoi risultati archiviati.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction(deletePoll, 'Sondaggio eliminato.')} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <h4 className="font-semibold">Risultati Salvati</h4>
            <ResultFileList files={poll.results} />
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}


export function PollList({ polls, activePollId }: PollListProps) {
  const activePoll = polls.find(p => p.id === activePollId);
  const [isArchiving, startArchiving] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleArchive = () => {
    if (!activePoll) return;
    startArchiving(async () => {
        const result = await archiveCurrentPollResults(activePoll.owner);
        if (result.success && result.filename) {
            toast({
                title: 'Successo!',
                description: `I risultati sono stati archiviati come "${result.filename}".`,
            });
            router.refresh();
        } else {
            toast({
                variant: 'destructive',
                title: 'Errore',
                description: result.error || 'Impossibile archiviare i risultati.',
            });
        }
    });
  };

  return (
    <div className="p-2 sm:p-4">
        {activePoll && (
             <div className="p-4 rounded-lg border border-primary bg-primary/10 mb-6">
                <h3 className="text-lg font-semibold text-primary mb-2">Sondaggio Attivo</h3>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="font-bold">{activePoll.title}</span>
                    <div className="flex items-center gap-2">
                         <Button asChild variant="outline" size="sm">
                            <Link href={`/${activePoll.owner}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Live
                            </Link>
                        </Button>
                        <ShareLinkButton username={activePoll.owner} />
                        <Button onClick={handleArchive} variant="outline" size="sm" disabled={isArchiving}>
                            {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Salva Risultati
                        </Button>
                    </div>
                </div>
             </div>
        )}

        {polls.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {polls.map((poll) => (
              <PollAccordionItem key={poll.id} poll={poll} />
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground py-8 px-4">
            <p className="mb-2 font-medium">Nessun sondaggio trovato.</p>
            <p className="text-sm">Usa il pulsante "Nuovo" in alto per crearne uno.</p>
          </div>
        )}
    </div>
  );
}
