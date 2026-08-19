import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useBacklogStore } from '../../stores/backlogStore';

const PRIORITIES = [
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
  { value: 'HIGH', label: 'High', color: 'text-amber-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-blue-600' },
  { value: 'LOW', label: 'Low', color: 'text-gray-600' },
];

export function CreateStoryModal({ isOpen, onClose, workspaceId, sprintId }) {
  const { createStory, isLoading } = useBacklogStore();

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    verb: '',
    object: '',
    storyPoint: 1,
    priority: 'MEDIUM',
    description: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      await createStory({
        ...formData,
        workspaceId,
        sprintId,
      });
      onClose();
      setFormData({
        title: '',
        subject: '',
        verb: '',
        object: '',
        storyPoint: 1,
        priority: 'MEDIUM',
        description: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to create story');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Story
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Input
            label="Story Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="As a user, I want to..."
            required
          />

          {/* SVO Pattern */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              SVO Pattern (Subject → Verb → Object)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="User"
              />
              <Input
                label="Verb"
                name="verb"
                value={formData.verb}
                onChange={handleChange}
                placeholder="Edit"
              />
              <Input
                label="Object"
                name="object"
                value={formData.object}
                onChange={handleChange}
                placeholder="Profile"
              />
            </div>
          </div>

          {/* Story Point & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Story Points
              </label>
              <select
                name="storyPoint"
                value={formData.storyPoint}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1, 2, 3, 5, 8, 13, 21].map((point) => (
                  <option key={point} value={point}>
                    {point} SP
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={`flex-1 py-2 px-2 rounded text-xs font-medium border transition-colors ${
                      formData.priority === p.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Add more details about this story..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create Story
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
