import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Play, Check, MoreHorizontal, Calendar, Clock, LayoutGrid } from 'lucide-react';
import { useBacklogStore } from '../../stores/backlogStore';
import { Badge } from '../ui/Badge';
import { format } from 'date-fns';

export function SprintSection({ workspaceId }) {
  const navigate = useNavigate();
  const { sprints, fetchSprints, startSprint, completeSprint, fetchSprintStories, sprintStories } = useBacklogStore();
  const [expandedSprints, setExpandedSprints] = useState({});

  useEffect(() => {
    if (workspaceId) {
      fetchSprints(workspaceId);
    }
  }, [workspaceId]);

  const toggleSprint = async (sprintId) => {
    if (!expandedSprints[sprintId]) {
      await fetchSprintStories(sprintId);
    }
    setExpandedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
  };

  const handleStartSprint = async (sprintId) => {
    await startSprint(sprintId, workspaceId);
    await fetchSprints(workspaceId);
  };

  const handleCompleteSprint = async (sprintId) => {
    await completeSprint(sprintId, workspaceId);
    await fetchSprints(workspaceId);
  };

  const openBoard = (sprintId) => {
    navigate(`/workspace/${workspaceId}/sprint/${sprintId}/board`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="primary">Active</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="default">Planning</Badge>;
    }
  };

  if (sprints.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No sprints yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Create a sprint to start planning your work
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sprints.map((sprint) => (
        <div
          key={sprint.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Sprint Header */}
          <div
            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
            onClick={() => toggleSprint(sprint.id)}
          >
            <div className="flex items-center gap-3">
              {expandedSprints[sprint.id] ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{sprint.name}</h3>
                  {getStatusBadge(sprint.status)}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {sprint.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(sprint.startDate), 'MMM d')}
                    </span>
                  )}
                  {sprint.endDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(sprint.endDate), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {sprint.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => openBoard(sprint.id)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"
                >
                  <LayoutGrid className="w-3 h-3" />
                  Open Board
                </button>
              )}
              {sprint.status === 'PLANNING' && (
                <button
                  onClick={() => handleStartSprint(sprint.id)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Start Sprint
                </button>
              )}
              {sprint.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleCompleteSprint(sprint.id)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Complete
                </button>
              )}
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sprint Stories */}
          {expandedSprints[sprint.id] && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              {sprintStories.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No stories in this sprint
                </div>
              ) : (
                sprintStories.map((story) => (
                  <div
                    key={story.id}
                    className="px-4 py-3 flex items-start gap-3 border-t border-gray-100 dark:border-gray-700 first:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="w-5 h-5 mt-0.5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 flex-shrink-0 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">{story.title || story.storyText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          #{story.id?.slice(0, 8)}
                        </span>
                        <Badge size="xs">{story.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
