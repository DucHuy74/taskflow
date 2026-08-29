import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CreateSprintRequest } from '@/types/sprint';

interface CreateSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSprint: (data: CreateSprintRequest) => Promise<void>;
  defaultName?: string;
}

export function CreateSprintDialog({
  open,
  onOpenChange,
  onCreateSprint,
  defaultName = 'Sprint 1',
}: CreateSprintDialogProps) {
  const [name, setName] = useState(defaultName);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    return twoWeeks.toISOString().split('T')[0];
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onCreateSprint({ name: name.trim(), startDate, endDate });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start Sprint</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sprint Name */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Sprint name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                'w-full px-3 py-2 text-sm border border-gray-300 rounded',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              )}
              placeholder="Enter sprint name"
            />
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Start date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    // Auto adjust end date if needed
                    if (new Date(e.target.value) > new Date(endDate)) {
                      const newEnd = new Date(e.target.value);
                      newEnd.setDate(newEnd.getDate() + 14);
                      setEndDate(newEnd.toISOString().split('T')[0]);
                    }
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-gray-300 rounded',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  )}
                />
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {formatDateDisplay(startDate)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                End date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className={cn(
                    'w-full px-3 py-2 text-sm border border-gray-300 rounded',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  )}
                />
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {formatDateDisplay(endDate)}
              </span>
            </div>
          </div>

          {/* Duration Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700 text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>
                Sprint duration:{' '}
                {Math.ceil(
                  (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days
              </span>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Start'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
