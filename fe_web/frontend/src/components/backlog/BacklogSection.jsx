import { useState, useEffect, useRef } from 'react';
import { Plus, Send, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useBacklogStore } from '../../stores/backlogStore';
import { Badge } from '../ui/Badge';

export function BacklogSection({ workspaceId, onCreateSprint }) {
  const { backlogStories, fetchBacklog, createStories, isLoading } = useBacklogStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newStory, setNewStory] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (workspaceId) {
      fetchBacklog(workspaceId);
    }
  }, [workspaceId]);

  const handleCreate = async () => {
    if (!newStory.trim()) return;

    const success = await createStories(workspaceId, [newStory.trim()]);
    if (success) {
      setNewStory('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Backlog</h2>
          <Badge variant="secondary" size="sm">{backlogStories.length}</Badge>
        </div>
        <button
          onClick={onCreateSprint}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        >
          Create Sprint
        </button>
      </div>

      {/* Stories List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {backlogStories.length === 0 && !isCreating ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Your backlog is empty</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Add your first story
            </button>
          </div>
        ) : (
          backlogStories.map((story) => (
            <div
              key={story.id}
              className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group"
            >
              <div className="w-5 h-5 mt-0.5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">{story.storyText}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    #{story.id?.slice(0, 8)}
                  </span>
                  <Badge size="xs" variant={story.status === 'TODO' ? 'default' : story.status === 'IN_PROGRESS' ? 'primary' : 'success'}>
                    {story.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Story */}
      {isCreating ? (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 mt-2 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newStory}
                onChange={(e) => setNewStory(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter issue description..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleCreate}
                  disabled={!newStory.trim() || isLoading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={() => { setIsCreating(false); setNewStory(''); }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full px-4 py-3 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
        >
          <Plus className="w-4 h-4" />
          Create issue
        </button>
      )}
    </div>
  );
}
