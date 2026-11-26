import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

const CONFIRM_WORD = 'DELETE';

/** "Danger zone": permanently delete the account after typing DELETE. */
const DeleteAccountCard = () => {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (typed !== CONFIRM_WORD) return;
    setBusy(true);
    try {
      await deleteAccount();
      setOpen(false);
      toast({ title: 'Your account has been deleted', description: 'All your data has been removed. We’re sorry to see you go.' });
      navigate('/', { replace: true });
    } catch (error) {
      toast({ title: 'Could not delete account', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/40 animate-fade-up">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" /> Delete account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and everything in it. This can’t be undone — download your data first if you want a copy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => {
            setTyped('');
            setOpen(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete my account
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={o => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{user?.email}</strong> and all of its data:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>your profile, public profile page and photo</li>
            <li>publications, documents and document summaries</li>
            <li>reading list, timetable, deadlines, attendance and grades</li>
            <li>support tickets and their messages</li>
          </ul>
          <div className="space-y-2 pt-2">
            <Label htmlFor="confirm-delete">
              Type <strong>{CONFIRM_WORD}</strong> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && void confirm()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={typed !== CONFIRM_WORD || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DeleteAccountCard;
