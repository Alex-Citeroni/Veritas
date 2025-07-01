'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkUsername, loginAction, registerAction } from '@/lib/actions';
import { Loader2, KeyRound, User, UserPlus, Eye, EyeOff } from 'lucide-react';

type LoginStep = 'enter-username' | 'login-password' | 'register-password';

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<LoginStep>('enter-username');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleUsernameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const submittedUsername = formData.get('username') as string;

    startTransition(async () => {
      const result = await checkUsername(submittedUsername);
      if (result?.error) {
        setError(result.error);
      } else {
        setUsername(result.username);
        if (result.exists) {
          setStep('login-password');
        } else {
          setStep('register-password');
        }
      }
    });
  };

  const handleAuthSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('username', username);

    if (step === 'register-password') {
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;
        if (password !== confirmPassword) {
            setError('Le password non coincidono.');
            return;
        }
    }

    startTransition(async () => {
      const action = step === 'login-password' ? loginAction : registerAction;
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.refresh();
      }
    });
  };

  const resetFlow = () => {
    setError(null);
    setUsername('');
    setStep('enter-username');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  if (step === 'login-password' || step === 'register-password') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <form onSubmit={handleAuthSubmit}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                 {step === 'login-password' ? <KeyRound className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
                 {step === 'login-password' ? `Benvenuto, ${username}!` : `Crea Account per ${username}`}
              </CardTitle>
              <CardDescription>
                {step === 'login-password' ? 'Inserisci la tua password per accedere.' : 'Crea una password sicura per il tuo nuovo account.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isPending}
                  autoComplete={step === 'login-password' ? "current-password" : "new-password"}
                  autoFocus
                  className="pr-10"
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-1 right-1 h-7 w-7 text-muted-foreground hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
              </div>
              {step === 'register-password' && (
                <div className="space-y-2 relative">
                    <Label htmlFor="confirmPassword">Conferma Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      disabled={isPending}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-1 right-1 h-7 w-7 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                        tabIndex={-1}
                    >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
              )}
              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === 'login-password' ? 'Accedi' : 'Registrati e Accedi'}
              </Button>
               <Button variant="link" size="sm" onClick={resetFlow} type="button" disabled={isPending}>
                Usa un altro username
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleUsernameSubmit}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <User className="h-6 w-6" />
              Accesso Utente
            </CardTitle>
            <CardDescription>
              Inserisci il tuo username per accedere o per creare un nuovo account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                disabled={isPending}
                autoComplete="username"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continua
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
