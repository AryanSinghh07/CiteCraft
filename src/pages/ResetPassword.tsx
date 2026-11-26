import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { authService } from '@/services';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { MIN_PASSWORD_LENGTH } from '@/features/auth/components/SignupForm';

/** Landing page for the password-reset email link (the link signs the user in). */
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: 'Password too short', description: `Use at least ${MIN_PASSWORD_LENGTH} characters.`, variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await authService.updatePassword(password);
      toast({ title: 'Password updated', description: 'You can now use your new password.' });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast({
        title: 'Could not update password',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" description="Pick something secure that you don't use elsewhere.">
      <Card className="w-full max-w-md mx-auto animate-scale-in glass-card">
        <CardHeader>
          <CardTitle className="text-2xl text-center">New password</CardTitle>
          {!loading && !user && (
            <CardDescription className="text-center text-destructive">
              This reset link is invalid or has expired. Request a new one from the sign in page.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
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
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !user}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default ResetPassword;
