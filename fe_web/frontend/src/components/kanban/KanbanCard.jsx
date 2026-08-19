import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MessageSquare, CheckSquare } from 'lucide-react';

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export function KanbanCard({ story, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: story.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = story.priority || 'MEDIUM';
  const storyPoint = story.storyPoint || 0;
  const tasks = story.tasks || [];
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging || isSortableDragging ? 'shadow-lg ring-2 ring-blue-400 opacity-90' : 'hover:shadow-md'
      }`}
    >
      {/* Drag Handle & Priority */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <div
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
          {priority}
        </span>

        <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
          {storyPoint} SP
        </span>
      </div>

      {/* Story Title */}
      <div className="px-3 py-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
          {story.title}
        </h4>
        {story.subject && story.verb && story.object && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="text-blue-600 dark:text-blue-400">{story.subject}</span>
            {' → '}
            <span className="text-purple-600 dark:text-purple-400">{story.verb}</span>
            {' → '}
            <span className="text-green-600 dark:text-green-400">{story.object}</span>
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-3">
          {completedTasks > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{completedTasks}/{tasks.length}</span>
            </div>
          )}
          {story.commentsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{story.commentsCount}</span>
            </div>
          )}
        </div>

        {story.assignee && (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
            {story.assignee.name?.charAt(0) || story.assignee.email?.charAt(0) || '?'}
          </div>
        )}
      </div>
    </div>
  );
}
