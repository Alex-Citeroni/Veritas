'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share2 } from 'lucide-react';

export function ShareLinkButton({ username, disabled }: { username: string, disabled?: boolean }) {
  const { toast } = useToast();

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${username}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Link Copiato!',
        description: 'Puoi condividere questo link per far votare al sondaggio.',
        className: 'bg-primary text-primary-foreground',
      });
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: 'Impossibile copiare il link.',
        });
    });
  };

  return (
    <Button onClick={handleCopyLink} variant="outline" disabled={disabled}>
      <Share2 className="mr-2 h-4 w-4" />
      Condividi
    </Button>
  );
}
