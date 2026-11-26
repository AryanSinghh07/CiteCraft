import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { PUBLIC_SLUG_PATTERN, slugify } from '@/services';
import type { Profile } from '@/types';
import { Copy, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { useUpdateProfile } from '../hooks/useUpdateProfile';

/** Opt-in shareable page at /u/<slug>. */
const PublicProfileSettings = ({ profile }: { profile: Profile }) => {
  const [slug, setSlug] = useState(profile.publicSlug ?? slugify(profile.name));
  const [isPublic, setIsPublic] = useState(Boolean(profile.isPublic));
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  useEffect(() => {
    setSlug(profile.publicSlug ?? slugify(profile.name));
    setIsPublic(Boolean(profile.isPublic));
  }, [profile.publicSlug, profile.isPublic, profile.name]);

  const url = `${window.location.origin}/u/${slug}`;
  const slugValid = PUBLIC_SLUG_PATTERN.test(slug);
  const dirty = slug !== (profile.publicSlug ?? '') || isPublic !== Boolean(profile.isPublic);
  const live = Boolean(profile.isPublic && profile.publicSlug);

  const save = async () => {
    if (!slugValid) return;
    try {
      await updateProfile.mutateAsync({ patch: { publicSlug: slug, isPublic } });
      toast({
        title: isPublic ? 'Public profile is live' : 'Public profile hidden',
        description: isPublic ? url : 'Only you can see your profile now.',
      });
    } catch (error) {
      toast({
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: url });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Public profile
        </CardTitle>
        <CardDescription>
          Share a page with your profile, publications and research metrics. Your email is never shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="public-toggle" className="cursor-pointer">
            Make my profile public
          </Label>
          <Switch id="public-toggle" checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Profile link</Label>
          <div className="flex rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring overflow-hidden">
            <span className="hidden sm:flex items-center px-3 text-sm text-muted-foreground bg-muted border-r whitespace-nowrap">
              {window.location.host}/u/
            </span>
            <Input
              id="slug"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="border-0 focus-visible:ring-0 rounded-none"
              maxLength={40}
              aria-invalid={!slugValid}
            />
          </div>
          {!slugValid && (
            <p className="text-xs text-destructive">
              Use 3–40 lowercase letters, numbers and single hyphens (no hyphen at the start or end).
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!live || dirty}>
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </Button>
            <Button type="button" variant="outline" size="sm" asChild disabled={!live || dirty}>
              <Link
                to={`/u/${profile.publicSlug ?? ''}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!live || dirty}
                className={!live || dirty ? 'pointer-events-none opacity-50' : undefined}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> View
              </Link>
            </Button>
          </div>
          <Button type="button" size="sm" onClick={save} disabled={!dirty || !slugValid || updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save public profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicProfileSettings;
