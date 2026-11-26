import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import PasswordStrengthMeter from '@/features/security/PasswordStrengthMeter';
import { passwordStrength } from '@/features/security/passwordStrength';
import { securityLevel } from '@/features/security/level';
import {
  publicationService,
  readingListService,
  securityService,
  studentService,
  ticketService,
  type SecurityStatus,
} from '@/services';
import {
  CheckCircle2,
  Circle,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  MonitorSmartphone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/** Account security: level, password, two-factor authentication, devices and data. */
const Security = () => {
  const { user, profile, mode } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: status, isLoading, refetch } = useQuery({ queryKey: ['security', user?.id], queryFn: () => securityService.getStatus(), enabled: Boolean(user) });

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const strength = passwordStrength(password, [user?.email ?? '', profile?.name ?? '']);
  const level = status ? securityLevel(status) : null;
  const twoFactor = status?.factors.find(f => f.verified);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.acceptable) {
      toast({ title: 'Choose a stronger password', description: strength.tips[0], variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      await securityService.changePassword(password, strength.score);
      setPassword('');
      setConfirm('');
      void refetch();
      toast({ title: 'Password changed', description: 'Use your new password next time you sign in.' });
    } catch (error) {
      toast({ title: 'Could not change password', description: errorText(error), variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const startEnroll = async () => {
    setBusy('enroll');
    try {
      setEnrolling(await securityService.enrollTotp());
      setCode('');
    } catch (error) {
      toast({ title: 'Could not start set-up', description: errorText(error), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const finishEnroll = async (value = code) => {
    if (!enrolling || value.length !== 6) return;
    setBusy('verify');
    try {
      await securityService.verifyTotp(enrolling.factorId, value);
      setEnrolling(null);
      void refetch();
      toast({ title: 'Two-factor authentication is on 🎉', description: 'You’ll enter a code from your app when you sign in.' });
    } catch (error) {
      setCode('');
      toast({ title: 'Code not accepted', description: errorText(error), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const removeFactor = async (factorId: string) => {
    setBusy('remove');
    try {
      await securityService.removeFactor(factorId);
      void refetch();
      toast({ title: 'Two-factor authentication turned off' });
    } catch (error) {
      toast({ title: 'Could not turn it off', description: errorText(error), variant: 'destructive' });
    } finally {
      setBusy(null);
      setConfirmRemove(null);
    }
  };

  const signOutOthers = async () => {
    setBusy('others');
    try {
      await securityService.signOutOtherDevices();
      toast({ title: 'Signed out everywhere else', description: 'Only this device is still signed in.' });
    } catch (error) {
      toast({ title: 'Could not sign out other devices', description: errorText(error), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const downloadData = async () => {
    if (!user) return;
    setBusy('export');
    try {
      const [publications, readingList, tickets, courses, timetable, tasks, grades] = await Promise.all([
        publicationService.list(user.id),
        readingListService.list(user.id),
        ticketService.listMine(user.id),
        studentService.courses.list(user.id),
        studentService.sessions.list(user.id),
        studentService.tasks.list(user.id),
        studentService.grades.list(user.id),
      ]);
      const data = { exportedAt: new Date().toISOString(), profile, publications, readingList, tickets, courses, timetable, tasks, grades };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `citecraft-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      void queryClient.invalidateQueries({ queryKey: ['security'] });
    } catch (error) {
      toast({ title: 'Export failed', description: errorText(error), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const checklist = status
    ? [
        { done: status.emailVerified, label: 'Email address verified', hint: 'Confirms the account is really yours.' },
        {
          done: (status.passwordScore ?? 0) >= 3,
          label: 'Strong password',
          hint: status.passwordScore === undefined ? 'Set a new password below so we can check its strength.' : 'Use 12+ characters with a mix of types.',
        },
        { done: Boolean(twoFactor), label: 'Two-factor authentication', hint: 'Needs a code from your phone as well as your password.' },
      ]
    : [];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-6">
          <header className="animate-fade-up">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" /> Security
            </h1>
            <p className="text-muted-foreground">Protect your account and control your data.</p>
          </header>

          {/* Level */}
          {isLoading || !status || !level ? (
            <Skeleton className="h-44 rounded-2xl" />
          ) : (
            <section className="rounded-2xl border bg-card p-6 shadow-sm animate-fade-up" aria-label="Security level">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-4 sm:w-56 shrink-0">
                  <level.icon className={cn('h-14 w-14', level.color)} />
                  <div>
                    <p className="text-sm text-muted-foreground">Security level</p>
                    <p className={cn('text-3xl font-bold', level.color)}>{level.name}</p>
                    <div className="mt-2 flex gap-1" aria-hidden>
                      {[1, 2, 3, 4].map(i => (
                        <span
                          key={i}
                          className={cn(
                            'h-1.5 w-8 rounded-full',
                            i <= level.score
                              ? level.name === 'High'
                                ? 'bg-emerald-500'
                                : level.name === 'Medium'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              : 'bg-muted',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <ul className="flex-1 space-y-3">
                  {checklist.map(item => (
                    <li key={item.label} className="flex gap-3">
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <p className={cn('text-sm font-medium', item.done && 'text-muted-foreground')}>{item.label}</p>
                        {!item.done && <p className="text-xs text-muted-foreground">{item.hint}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Two-factor */}
          <Card className="animate-fade-up [animation-delay:80ms]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" /> Two-factor authentication
              </CardTitle>
              <CardDescription>
                Sign-in also needs a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!securityService.available.mfa ? (
                <p className="text-sm text-muted-foreground">Available when CiteCraft is connected to its server (not in {mode} mode).</p>
              ) : twoFactor ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                    <div>
                      <p className="font-medium">On · {twoFactor.name}</p>
                      <p className="text-xs text-muted-foreground">Added {new Date(twoFactor.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setConfirmRemove(twoFactor.id)} disabled={busy === 'remove'}>
                    Turn off
                  </Button>
                </div>
              ) : enrolling ? (
                <div className="grid gap-6 sm:grid-cols-[auto_1fr] items-start animate-fade-in">
                  <div className="mx-auto rounded-xl bg-white p-3 shadow-sm">
                    <img src={enrolling.qrCode} alt="QR code to scan with your authenticator app" className="h-44 w-44" />
                  </div>
                  <div className="space-y-4">
                    <ol className="list-decimal space-y-1 pl-5 text-sm">
                      <li>Open your authenticator app and scan the QR code.</li>
                      <li>Enter the 6-digit code it shows.</li>
                    </ol>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Can’t scan? Enter this key in the app:</p>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs break-all">{enrolling.secret}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => void navigator.clipboard.writeText(enrolling.secret).then(() => toast({ title: 'Key copied' }))}
                          aria-label="Copy key"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={value => {
                        const digits = value.replace(/\D/g, '');
                        setCode(digits);
                        if (digits.length === 6) void finishEnroll(digits);
                      }}
                      disabled={busy === 'verify'}
                      aria-label="Code from your authenticator app"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }, (_, i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <div className="flex gap-2">
                      <Button onClick={() => finishEnroll()} disabled={code.length !== 6 || busy === 'verify'}>
                        {busy === 'verify' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Turn on
                      </Button>
                      <Button variant="ghost" onClick={() => setEnrolling(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button onClick={startEnroll} disabled={busy === 'enroll'}>
                  {busy === 'enroll' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Set up two-factor authentication
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="animate-fade-up [animation-delay:140ms]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" /> Change password
              </CardTitle>
              {status?.passwordChangedAt && (
                <CardDescription>Last changed {new Date(status.passwordChangedAt).toLocaleDateString()}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} context={[user?.email ?? '', profile?.name ?? '']} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  {confirm && confirm !== password && <p className="text-xs text-destructive">Passwords don’t match</p>}
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={savingPassword || !password || !confirm}>
                    {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Devices */}
            <Card className="animate-fade-up [animation-delay:200ms]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MonitorSmartphone className="h-5 w-5 text-primary" /> Devices
                </CardTitle>
                <CardDescription>
                  {status?.lastSignInAt ? `Last sign-in ${new Date(status.lastSignInAt).toLocaleString()}` : 'Signed in on this device.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">Lost a phone or used a shared computer? Sign out of every other device.</p>
                <Button variant="outline" onClick={signOutOthers} disabled={!securityService.available.otherDevices || busy === 'others'}>
                  {busy === 'others' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  Sign out other devices
                </Button>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card className="animate-fade-up [animation-delay:260ms]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" /> Privacy & data
                </CardTitle>
                <CardDescription>
                  Public profile:{' '}
                  <strong>{profile?.isPublic ? 'visible to anyone with the link' : 'private'}</strong> ·{' '}
                  <Link to="/profile" className="text-primary hover:underline">
                    change
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  Your data is private to your account. Download a copy of everything you’ve added (JSON).
                </p>
                <Button variant="outline" onClick={downloadData} disabled={busy === 'export'}>
                  {busy === 'export' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download my data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AlertDialog open={Boolean(confirmRemove)} onOpenChange={open => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>Your account will only be protected by your password. Your security level will drop.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it on</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemove && removeFactor(confirmRemove)}
            >
              Turn off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default Security;
