import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, CheckCircle2, CircleDashed, GripVertical, Pencil, Sparkles } from 'lucide-react';
import type { UserStory } from '@/types/userStory';

interface UserStoryCardProps {
  story: UserStory;
  isDragging?: boolean;
  isInSprint?: boolean;
  onStatusChange?: (storyId: string, status: 'ToDo' | 'InProgress' | 'Done') => void;
  draggable?: boolean;
  /** When provided, renders an "Edit story" button. */
  onEdit?: (story: UserStory) => void;
}

const priorityColors = {
  High: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
  Medium: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300',
  Low: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300',
};

const statusColors = {
  ToDo: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300',
  InProgress: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
  Done: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300',
};

export function UserStoryCard({
  story,
  isDragging = false,
  isInSprint = false,
  draggable = true,
  onEdit,
}: UserStoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: story.id,
    data: { type: 'userStory', story },
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statusLabel = story.status === 'InProgress' ? 'In progress' : story.status === 'ToDo' ? 'To do' : story.status;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        // @container: the card lays itself out from its own width (narrow board column vs. wide backlog list).
        '@container group bg-white px-2 py-2 transition-colors dark:bg-slate-900 sm:px-3',
        'hover:bg-slate-50 dark:hover:bg-slate-800/70',
        isCurrentlyDragging && 'opacity-50 shadow-lg ring-2 ring-indigo-300 dark:ring-indigo-500/60',
        isInSprint && 'border-l-2 border-l-indigo-500'
      )}
    >
      <div className="flex items-start gap-2">
        <button ref={setActivatorNodeRef} {...listeners} type="button" className="grid h-11 w-8 shrink-0 cursor-grab place-items-center rounded text-slate-400 opacity-70 hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200" aria-label={`Move story: ${story.storyText}`}>
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <span className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300" title="User story">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>

        {/* Compact (narrow container): text on top, meta + actions in a footer row.
            Wide container (@xl): everything on a single row. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 @xl:flex-row @xl:items-center @xl:gap-3">
          <p className="min-w-0 flex-1 pt-2.5 text-sm font-medium leading-5 text-slate-900 [overflow-wrap:anywhere] line-clamp-3 dark:text-slate-100 @xl:py-2.5" title={story.storyText}>{story.storyText}</p>

          <div className="flex min-w-0 items-center gap-2 @xl:shrink-0">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 @xl:flex-none">
              <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', statusColors[story.status])}>{statusLabel}</span>

              {story.priority && (
                <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', priorityColors[story.priority])}>
                  {story.priority}
                </span>
              )}

              {story.analysisStatus && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', story.analysisStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : story.analysisStatus === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300')}>
                {story.analysisStatus === 'COMPLETED' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : story.analysisStatus === 'FAILED' ? <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> : story.analysisStatus === 'PROCESSING' ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />}
                {story.analysisStatus.toLowerCase()}
              </span>}
            </div>

            {/* Assignee Avatar */}
            {story.assignee && (
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={story.assignee.avatar} alt={story.assignee.name} />
                <AvatarFallback className="bg-blue-600 text-xs text-white">
                  {getInitials(story.assignee.name)}
                </AvatarFallback>
              </Avatar>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(story)}
                onPointerDown={(event) => event.stopPropagation()}
                className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                aria-label={`Edit story: ${story.storyText}`}
                title="Edit story"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Static version for dragging preview
export function UserStoryCardStatic({ story, isInSprint = false }: { story: UserStory; isInSprint?: boolean }) {
  const statusColors = {
    ToDo: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300',
    InProgress: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
    Done: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300',
  };

  const priorityColors = {
    High: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
    Medium: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300',
    Low: 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded p-3 shadow-lg',
        isInSprint && 'border-l-2 border-l-blue-500'
      )}
    >
      <div className="flex-shrink-0 pt-0.5">
        <svg
          className="w-5 h-5 text-gray-300 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-slate-100 leading-snug line-clamp-3">{story.storyText}</p>

        <div className="flex items-center gap-2 mt-2">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide',
              statusColors[story.status]
            )}
          >
            {story.status}
          </span>

          {story.priority && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                priorityColors[story.priority]
              )}
            >
              {story.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
