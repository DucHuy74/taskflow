import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({ id, title, color, stories, isActive }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 bg-gray-100 dark:bg-gray-800 rounded-xl transition-all ${
        isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
            {stories.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        <SortableContext
          items={stories.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {stories.length === 0 ? (
            <div className={`py-8 text-center text-sm text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg transition-colors ${
              isOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''
            }`}>
              Drop stories here
            </div>
          ) : (
            stories.map((story) => (
              <KanbanCard key={story.id} story={story} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
