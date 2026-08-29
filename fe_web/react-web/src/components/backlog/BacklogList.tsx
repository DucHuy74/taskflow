import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UserStoryCard } from './UserStoryCard';
import { ANIMATION_DURATION, EASING, staggerItemVariants } from '@/lib/animations';
import type { UserStory } from '@/types/userStory';

interface BacklogListProps {
  stories: UserStory[];
  isLoading?: boolean;
  onCreateStory: (text: string) => void;
  onStartSprint: () => void;
  onDragEnd?: (storyId: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export function BacklogList({
  stories,
  isLoading = false,
  onCreateStory,
  onStartSprint,
}: BacklogListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newStoryText, setNewStoryText] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog-drop-zone',
    data: { type: 'backlog' },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStoryText.trim()) {
      onCreateStory(newStoryText.trim());
      setNewStoryText('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewStoryText('');
    }
  };

  if (isLoading) {
    return (
      <motion.div
        className="bg-white rounded-lg border border-gray-100 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ANIMATION_DURATION.normal }}
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <motion.div
            className="h-5 w-20 bg-gray-200 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-20 bg-gray-100 rounded"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        'bg-white rounded-lg border border-gray-100 shadow-sm transition-colors',
        isOver && 'border-2 border-dashed border-green-400 bg-green-50/30'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_DURATION.page, ease: EASING.easeOut }}
    >
      {/* Header */}
      <motion.div
        className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <motion.svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            whileHover={{ rotate: 90 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
          <h3 className="font-semibold text-gray-900">Backlog</h3>
          <motion.span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {stories.length}
          </motion.span>
        </div>

        <motion.button
          onClick={onStartSprint}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded border border-gray-200',
            'bg-gray-50 text-gray-700'
          )}
          whileHover={{ scale: 1.02, backgroundColor: 'rgb(243, 244, 246)' }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: ANIMATION_DURATION.fast }}
        >
          Create sprint
        </motion.button>
      </motion.div>

      {/* Stories List */}
      <div className="min-h-[100px]">
        {stories.length === 0 && !isCreating ? (
          <motion.div
            className="flex flex-col items-center justify-center py-10 text-gray-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.svg
              className="w-12 h-12 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </motion.svg>
            <p className="text-sm">Your backlog is empty.</p>
          </motion.div>
        ) : (
          <SortableContext items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <motion.div
              className="divide-y divide-gray-50"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {stories.map((story) => (
                <motion.div
                  key={story.id}
                  className="p-3"
                  variants={staggerItemVariants}
                  layout
                >
                  <UserStoryCard story={story} draggable />
                </motion.div>
              ))}
            </motion.div>
          </SortableContext>
        )}
      </div>

      {/* Create Area */}
      <motion.div
        className="border-t border-gray-100 bg-gray-50/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {isCreating ? (
          <motion.form
            onSubmit={handleSubmit}
            className="p-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
          >
            <div className="flex items-start gap-3">
              <motion.svg
                className="w-5 h-5 text-gray-400 mt-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: [0, 90, 0] }}
                transition={{ duration: 0.3 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </motion.svg>
              <div className="flex-1">
                <motion.textarea
                  autoFocus
                  value={newStoryText}
                  onChange={(e) => setNewStoryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Create issue (Press Enter to save)"
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-gray-200 rounded',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'placeholder:text-gray-400 resize-none'
                  )}
                  rows={2}
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <motion.button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewStoryText('');
                    }}
                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={!newStoryText.trim()}
                    className={cn(
                      'px-3 py-1 text-sm font-medium rounded bg-blue-600 text-white',
                      'hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Save
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.form>
        ) : (
          <motion.button
            onClick={() => setIsCreating(true)}
            className={cn(
              'w-full px-4 py-3 flex items-center gap-3 text-gray-500',
              'hover:bg-gray-100 text-left'
            )}
            whileHover={{ backgroundColor: 'rgb(243, 244, 246)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
          >
            <motion.svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              whileHover={{ rotate: 90 }}
              transition={{ duration: ANIMATION_DURATION.fast }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </motion.svg>
            <span className="text-sm font-medium">Create issue</span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
