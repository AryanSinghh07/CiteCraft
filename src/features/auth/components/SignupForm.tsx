import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Briefcase, GraduationCap, Loader2, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccountType } from '@/types';
import { MIN_PASSWORD_LENGTH, passwordStrength } from '@/features/security/passwordStrength';
import PasswordStrengthMeter from '@/features/security/PasswordStrengthMeter';
import { securityService } from '@/services';
import { useAuth } from '../hooks/useAuth';

export { MIN_PASSWORD_LENGTH } from '@/features/security/passwordStrength';

const SignupForm = () => {
  const [searchParams] = useSearchParams();
  const [accountType, setAccountType] = useState<AccountType>(
    searchParams.get('type') === 'student' ? 'student' : 'researcher',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const strength = passwordStrength(password, [email, name]);
    if (!strength.acceptable) {
      toast({ title: 'Choose a stronger password', description: strength.tips[0] ?? `Use at least ${MIN_PASSWORD_LENGTH} characters.`, variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Please re-enter your password.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { signedIn } = await signUp({ name, email, password, accountType });
      if (signedIn) {
        void securityService.recordPasswordStrength(passwordStrength(password, [email, name]).score).catch(() => undefined);
        toast({ title: 'Account created', description: 'Welcome to CiteCraft! Complete your profile to get started.' });
        navigate('/profile', { replace: true });
      } else {
        setCheckEmail(true);
      }
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <Card className="w-full max-w-md mx-auto animate-scale-in glass-card text-center">
        <CardHeader>
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto animate-scale-in glass-card">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Create your account</CardTitle>
        <CardDescription className="text-center">Start managing and showcasing your publications</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-2">I am a…</legend>
            <div className="grid grid-cols-2 gap-3" role="radiogroup">
              {(
                [
                  { value: 'student', label: 'Student', hint: 'UG, PG or PhD', icon: GraduationCap },
                  { value: 'researcher', label: 'Researcher', hint: 'Faculty or staff', icon: Briefcase },
                ] as const
              ).map(option => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={accountType === option.value}
                  onClick={() => setAccountType(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all',
                    accountType === option.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <option.icon className={cn('h-6 w-6', accountType === option.value ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-[11px] text-muted-foreground">{option.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={accountType === 'student' ? 'you@student.university.edu' : 'you@university.edu'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          {password ? (
            <PasswordStrengthMeter password={password} context={[email, name]} />
          ) : (
            <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters — longer is stronger.</p>
          )}

          <Button type="submit" className="w-full button-hover" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default SignupForm;
