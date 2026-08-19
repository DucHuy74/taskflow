import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBacklogStore } from '../../stores/backlogStore';

export function CreateSprintModal({ isOpen, onClose, workspaceId }) {
  const navigate = useNavigate();
  const { createSprint, isLoading } = useBacklogStore();
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Sprint name is required');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError('End date must be after start date');
      return;
    }

    try {
      const result = await createSprint(workspaceId, formData);
      if (result) {
        onClose();
        navigate(`/workspace/${workspaceId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create sprint');
    }
  };

  const setDuration = (days) => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    setFormData({
      ...formData,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Sprint" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <Input
          label="Sprint Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Sprint 1"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required
          />
          <Input
            label="End Date"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            required
          />
        </div>

        {/* Duration presets */}
        <div>
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
            Duration presets
          </label>
          <div className="flex gap-2">
            {[7, 14, 21, 28].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDuration(days)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Sprint
          </Button>
        </div>
      </form>
    </Modal>
  );
}
