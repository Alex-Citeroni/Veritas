'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { changeUsernameAction, changePasswordAction } from '@/lib/actions';
import { Loader2, User, KeyRound } from 'lucide-react';

export function UserProfile({ username }: { username: string }) {
    const { toast } = useToast();
    const router = useRouter();
    
    const passwordFormRef = useRef<HTMLFormElement>(null);
    const usernameFormRef = useRef<HTMLFormElement>(null);

    const [usernameState, changeUsername, isUsernamePending] = useActionState(changeUsernameAction, null);
    const [passwordState, changePassword, isPasswordPending] = useActionState(changePasswordAction, null);

    useEffect(() => {
        if (usernameState?.success) {
            toast({
                title: 'Successo!',
                description: 'Il tuo username è stato aggiornato. Sarai reindirizzato alla dashboard.',
                className: 'bg-primary text-primary-foreground',
            });
            router.push('/admin'); 
        }
    }, [usernameState, toast, router]);

    useEffect(() => {
        if (passwordState?.success) {
            toast({
                title: 'Successo!',
                description: 'La tua password è stata aggiornata.',
            });
            passwordFormRef.current?.reset();
        }
    }, [passwordState, toast]);


    return (
        <div className="space-y-8">
            <Card>
                <form action={changeUsername} ref={usernameFormRef}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl"><User /> Modifica Username</CardTitle>
                        <CardDescription>
                           Per modificare il tuo username, inseriscine uno nuovo e conferma con la tua password attuale.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newUsername">Nuovo Username</Label>
                            <Input id="newUsername" name="newUsername" defaultValue={username} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passwordForUsername">Password Attuale</Label>
                            <Input id="passwordForUsername" name="password" type="password" required />
                        </div>
                         {usernameState?.error && <p className="text-sm font-medium text-destructive">{usernameState.error}</p>}
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isUsernamePending}>
                            {isUsernamePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Aggiorna Username
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <form action={changePassword} ref={passwordFormRef}>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl"><KeyRound /> Modifica Password</CardTitle>
                        <CardDescription>
                            Per modificare la tua password, inserisci quella attuale e poi la nuova password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Password Attuale</Label>
                            <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nuova Password</Label>
                            <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
                            <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
                        </div>
                        {passwordState?.error && <p className="text-sm font-medium text-destructive">{passwordState.error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isPasswordPending}>
                            {isPasswordPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Aggiorna Password
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
