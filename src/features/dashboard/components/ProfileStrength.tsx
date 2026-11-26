import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';
import { Check, ChevronRight, Gauge } from 'lucide-react';

interface Step {
  label: string;
  done: boolean;
  to: string;
}

/** Profile completeness ring with a checklist of what's left. */
const ProfileStrength = ({ profile, publicationCount }: { profile: Profile | null; publicationCount: number }) => {
  const isStudent = profile?.accountType === 'student';
  const steps: Step[] = [
    isStudent
      ? { label: 'Add your program and university', done: Boolean(profile?.program && profile?.affiliation), to: '/profile' }
      : { label: 'Add your position and affiliation', done: Boolean(profile?.position && profile?.affiliation), to: '/profile' },
    { label: 'Upload a profile photo', done: Boolean(profile?.photoUrl), to: '/profile' },
    { label: 'Write a short bio', done: Boolean(profile?.bio?.trim()), to: '/profile' },
    { label: 'List your research interests', done: Boolean(profile?.researchInterests?.length), to: '/profile' },
    isStudent
      ? { label: 'Add a link (website, GitHub, ORCID)', done: Boolean(profile?.website || profile?.orcid || profile?.googleScholar), to: '/profile' }
      : { label: 'Link ORCID or Google Scholar', done: Boolean(profile?.orcid || profile?.googleScholar), to: '/profile' },
    { label: isStudent ? 'Add a project, thesis or paper' : 'Add your first publication', done: publicationCount > 0, to: '/dashboard' },
    { label: 'Publish your public profile', done: Boolean(profile?.isPublic && profile.publicSlug), to: '/profile' },
  ];
  const done = steps.filter(s => s.done).length;
  const percent = Math.round((done / steps.length) * 100);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const remaining = steps.filter(s => !s.done);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" /> Profile strength
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={percent === 100 ? 'hsl(var(--chart-3))' : 'hsl(var(--primary))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - percent / 100)}
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{percent}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {percent === 100
              ? 'Your profile is complete — nice work!'
              : `${remaining.length} step${remaining.length > 1 ? 's' : ''} left to a complete, shareable profile.`}
          </p>
        </div>

        <ul className="space-y-1">
          {steps.map(step => (
            <li key={step.label}>
              <Link
                to={step.to}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  step.done ? 'text-muted-foreground' : 'hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    step.done ? 'border-transparent bg-emerald-500 text-white' : 'border-muted-foreground/40',
                  )}
                >
                  {step.done && <Check className="h-3 w-3" />}
                </span>
                <span className={cn('flex-1', step.done && 'line-through decoration-muted-foreground/40')}>{step.label}</span>
                {!step.done && <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" />}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ProfileStrength;
