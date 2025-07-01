'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Activity, Trash2, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';


interface ResultsManagerProps {
  files: string[];
  hasActivePoll: boolean;
}

export function ResultsManager({ files, hasActivePoll }: ResultsManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, startDeleting] = useTransition();

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

  if (files.length === 0 && !hasActivePoll) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Download Risultati</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nessun risultato di sondaggio salvato ancora.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Download Risultati</CardTitle>
        <CardDescription>
          Scarica o elimina i risultati dei sondaggi precedenti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {files.map((file) => (
            <li key={file} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
              <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground overflow-hidden">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="truncate" title={file}>{file}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button asChild size="sm">
                  <a href={`/api/results/${encodeURIComponent(file)}`} download>
                    <Download className="mr-2 h-4 w-4" />
                    Scarica
                  </a>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" disabled={isDeleting}>
                       <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Questa azione non può essere annullata. Questo eliminerà permanentemente il file dei risultati "{file}".
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
      </CardContent>
    </Card>
  );
}
