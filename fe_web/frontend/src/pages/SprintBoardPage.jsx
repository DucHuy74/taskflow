import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus } from 'lucide-react';
import { useBacklogStore } from '../stores/backlogStore';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanCard } from '../components/kanban/KanbanCard';
import { CreateStoryModal } from '../components/kanban/CreateStoryModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'bg-gray-400' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'REVIEW', title: 'Review', color: 'bg-yellow-500' },
  { id: 'DONE', title: 'Done', color: 'bg-green-500' },
];

export function SprintBoardPage() {
  const { workspaceId, sprintId } = useParams();
  const navigate = useNavigate();
  const {
    sprints,
    sprintStories,
    fetchSprints,
    fetchSprintStories,
    updateStoryStatus,
    isLoading
  } = useBacklogStore();

  const [activeId, setActiveId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (workspaceId) {
      fetchSprints(workspaceId);
      if (sprintId) {
        fetchSprintStories(sprintId);
      }
    }
  }, [workspaceId, sprintId]);

  const sprint = sprints.find(s => s.id === sprintId);

  const getStoriesByStatus = (status) => {
    return sprintStories.filter(story => story.status === status);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (over) {
      setActiveColumn(over.id);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveColumn(null);

    if (!over) return;

    const activeStory = sprintStories.find(s => s.id === active.id);
    if (!activeStory) return;

    // Determine the new status based on where it was dropped
    let newStatus = activeStory.status;

    // If dropped on a column
    if (COLUMNS.find(c => c.id === over.id)) {
      newStatus = over.id;
    } else {
      // Dropped on another card - find which column that card is in
      const overStory = sprintStories.find(s => s.id === over.id);
      if (overStory) {
        newStatus = overStory.status;
      }
    }

    // Update status if changed
    if (newStatus !== activeStory.status) {
      await updateStoryStatus(active.id, newStatus);
      if (sprintId) {
        fetchSprintStories(sprintId);
      }
    }
  };

  const activeStory = activeId ? sprintStories.find(s => s.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Backlog
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {sprint?.name || 'Sprint Board'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {sprintStories.length} stories
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Story
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto bg-gray-50 dark:bg-gray-900 p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                stories={getStoriesByStatus(column.id)}
                isActive={activeColumn === column.id}
              />
            ))}
          </div>

          <DragOverlay>
            {activeStory ? (
              <KanbanCard story={activeStory} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Story Modal */}
      {showCreateModal && (
        <CreateStoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          workspaceId={workspaceId}
          sprintId={sprintId}
        />
      )}
    </div>
  );
}
