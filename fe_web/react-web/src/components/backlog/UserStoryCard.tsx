import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
      {...listeners}
      className={cn(
        'group flex items-start gap-3 bg-white border border-gray-100 rounded p-3 cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:border-gray-200 hover:shadow-sm',
        isCurrentlyDragging && 'opacity-50 shadow-lg border-blue-300 border-2',
        isInSprint && 'border-l-2 border-l-blue-500'
      )}
    >
      {/* Drag Handle / Checkbox */}
      <div className="flex-shrink-0 pt-0.5">
        <svg
          className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 leading-snug line-clamp-2">{story.storyText}</p>

        <div className="flex items-center gap-2 mt-2">
          {/* Status Badge */}
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide',
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
