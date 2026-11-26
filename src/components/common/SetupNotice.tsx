import { AlertTriangle, Wrench } from 'lucide-react';
import { isSetupError } from '@/utils/errors';

/** Friendly message for features whose database or server part isn't set up yet. */
const SetupNotice = ({ error, feature, migration }: { error: unknown; feature: string; migration?: string }) => {
  const setup = isSetupError(error);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm" role="alert">
      {setup ? <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
      <div>
        <p className="font-medium">{setup ? `${feature} isn't set up on the server yet` : `Couldn't load ${feature.toLowerCase()}`}</p>
        <p className="text-muted-foreground">
          {setup
            ? `The site owner needs to run the database update${migration ? ` (${migration})` : ''} in Supabase. See docs/SETUP.md.`
            : error instanceof Error
              ? error.message
              : 'Please try again.'}
        </p>
      </div>
    </div>
  );
};

export default SetupNotice;
