'use client';

import { useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkUsername, authenticateAction } from '@/lib/actions';
import { Loader2, KeyRound, User, UserPlus, Eye, EyeOff } from 'lucide-react';

type LoginStep = 'enter-username' | 'login-password' | 'register-password';

function AuthSubmitButton({ step }: { step: LoginStep }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 'login-password' ? 'Accedi' : 'Registrati e Accedi'}
        </Button>
    );
}

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<LoginStep>('enter-username');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [authState, formAction] = useFormState(authenticateAction, null);

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
          <form action={formAction}>
            <input type="hidden" name="username" value={username} />
            <input type="hidden" name="mode" value={step === 'login-password' ? 'login' : 'register'} />
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
              {authState?.error && (
                <p className="text-sm font-medium text-destructive">{authState.error}</p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <AuthSubmitButton step={step} />
               <Button variant="link" size="sm" onClick={resetFlow} type="button">
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
