import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, CheckCircle2, CircleDashed, GripVertical, Sparkles } from 'lucide-react';
import type { UserStory } from '@/types/userStory';

interface UserStoryCardProps {
  story: UserStory;
  isDragging?: boolean;
  isInSprint?: boolean;
  onStatusChange?: (storyId: string, status: 'ToDo' | 'InProgress' | 'Done') => void;
  draggable?: boolean;
}

const priorityColors = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
};

const statusColors = {
  ToDo: 'bg-gray-100 text-gray-600',
  InProgress: 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
};

export function UserStoryCard({
  story,
  isDragging = false,
  isInSprint = false,
  draggable = true,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'group flex min-h-14 items-center gap-2 bg-white px-3 py-2 transition-colors dark:bg-slate-900 sm:gap-3 sm:px-4',
        'hover:bg-slate-50 dark:hover:bg-slate-800/70',
        isCurrentlyDragging && 'opacity-50 shadow-lg ring-2 ring-indigo-300',
        isInSprint && 'border-l-2 border-l-indigo-500'
      )}
    >
      <button ref={setActivatorNodeRef} {...listeners} type="button" className="grid h-9 w-8 shrink-0 cursor-grab place-items-center rounded text-slate-400 opacity-70 hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-200" aria-label={`Move story: ${story.storyText}`}>
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300" title="User story">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-5 text-slate-900 dark:text-slate-100 sm:line-clamp-2">{story.storyText}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
          {/* Status Badge */}
          <span
            className={cn(
              'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
              statusColors[story.status]
            )}
          >
            {story.status}
          </span>

          {/* Priority Badge */}
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

      {story.analysisStatus && <span className={cn('hidden items-center gap-1 rounded-full px-2 py-1 text-xs font-medium sm:inline-flex', story.analysisStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : story.analysisStatus === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300')}>
        {story.analysisStatus === 'COMPLETED' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : story.analysisStatus === 'FAILED' ? <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> : story.analysisStatus === 'PROCESSING' ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />}
        {story.analysisStatus.toLowerCase()}
      </span>}

      <span className={cn('hidden rounded px-2 py-1 text-xs font-semibold sm:inline-flex', statusColors[story.status])}>{story.status === 'InProgress' ? 'In progress' : story.status}</span>

      {/* Assignee Avatar */}
      {story.assignee && (
        <div className="flex-shrink-0">
          <Avatar className="w-6 h-6">
            <AvatarImage src={story.assignee.avatar} alt={story.assignee.name} />
            <AvatarFallback className="text-xs bg-blue-600 text-white">
              {getInitials(story.assignee.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

// Static version for dragging preview
export function UserStoryCardStatic({ story, isInSprint = false }: { story: UserStory; isInSprint?: boolean }) {
  const statusColors = {
    ToDo: 'bg-gray-100 text-gray-600',
    InProgress: 'bg-blue-100 text-blue-700',
    Done: 'bg-green-100 text-green-700',
  };

  const priorityColors = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 bg-white border border-gray-200 rounded p-3 shadow-lg',
        isInSprint && 'border-l-2 border-l-blue-500'
      )}
    >
      <div className="flex-shrink-0 pt-0.5">
        <svg
          className="w-5 h-5 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 leading-snug line-clamp-2">{story.storyText}</p>

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
