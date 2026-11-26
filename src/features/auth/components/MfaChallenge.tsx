import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/** Second sign-in step for accounts with two-factor authentication. */
const MfaChallenge = ({ onVerified }: { onVerified: () => void }) => {
  const { pendingMfa, verifyMfa, cancelMfa } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async (value = code) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    try {
      await verifyMfa(value);
      toast({ title: 'Welcome back!', description: 'Two-factor check passed.' });
      onVerified();
    } catch (error) {
      setCode('');
      toast({ title: 'Verification failed', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto animate-scale-in glass-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Two-factor check</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app for <strong>{pendingMfa?.email}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <form
          onSubmit={e => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col items-center gap-4"
        >
          <InputOTP
            maxLength={6}
            value={code}
            onChange={value => {
              const digits = value.replace(/\D/g, '');
              setCode(digits);
              if (digits.length === 6) void submit(digits);
            }}
            autoFocus
            disabled={busy}
            aria-label="Authentication code"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button type="submit" className="w-full min-w-[200px]" disabled={code.length !== 6 || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <button type="button" onClick={() => void cancelMfa()} className="text-sm text-muted-foreground hover:text-primary">
          Use a different account
        </button>
      </CardFooter>
    </Card>
  );
};

export default MfaChallenge;
