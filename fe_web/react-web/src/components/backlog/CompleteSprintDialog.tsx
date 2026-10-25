import { CheckCircle2, Undo2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { summarizeCompletion } from '@/lib/sprintLifecycle';
import type { Sprint } from '@/types/sprint';
import type { UserStory } from '@/types/userStory';

interface CompleteSprintDialogProps {
  sprint: Sprint | null;
  stories: UserStory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isCompleting?: boolean;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Confirms POST /sprints/{id}/complete and explains where each story ends up. */
export function CompleteSprintDialog({ sprint, stories, open, onOpenChange, onConfirm, isCompleting = false }: CompleteSprintDialogProps) {
  const { unfinished, done } = summarizeCompletion(stories);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete {sprint?.name ?? 'sprint'}?</DialogTitle>
          <DialogDescription>
            Completing ends the sprint. It becomes read-only and its stories can no longer change status.
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <Undo2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {unfinished === 0
                ? 'No unfinished stories — nothing returns to the backlog.'
                : <><strong className="font-semibold">{plural(unfinished, 'unfinished story', 'unfinished stories')}</strong> (To do or In progress) will return to the backlog as To do.</>}
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">{plural(done, 'done story', 'done stories')}</strong> will stay in this sprint.
            </span>
          </li>
        </ul>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={isCompleting}>Cancel</Button>
          <Button className="min-h-11" onClick={onConfirm} isLoading={isCompleting} disabled={isCompleting}>
            {isCompleting ? 'Completing…' : 'Complete sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
