'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Activity } from 'lucide-react';

interface ResultsManagerProps {
  files: string[];
  hasActivePoll: boolean;
}

export function ResultsManager({ files, hasActivePoll }: ResultsManagerProps) {
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
          Scarica i risultati dei sondaggi precedenti e di quello attualmente in corso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {hasActivePoll && (
            <li key="current" className="flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/10">
              <div className="flex items-center gap-3 font-semibold text-primary">
                <Activity className="h-5 w-5" />
                <span>Sondaggio Attuale (Live)</span>
              </div>
              <Button asChild size="sm">
                <a href={`/api/results/current`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Scarica
                </a>
              </Button>
            </li>
          )}
          {files.map((file) => (
            <li key={file} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
              <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground">
                <FileText className="h-5 w-5 text-primary" />
                <span className="truncate">{file}</span>
              </div>
              <Button asChild size="sm">
                <a href={`/api/results/${encodeURIComponent(file)}`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Scarica
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
