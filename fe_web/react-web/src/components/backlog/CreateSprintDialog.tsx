import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToastMessage } from '@/components/ui/toast';
import { sprintService } from '@/services/sprintService';
import { ERROR_CODES, getApiErrorCode, getApiErrorMessage, isForbidden } from '@/services/apiError';
import { addDays, daysBetween, formatShortDate, toIsoDate } from '@/lib/sprintDates';
import type { CreateSprintRequest, Sprint } from '@/types/sprint';

interface SprintFormValues {
  name: string;
  /** 'YYYY-MM-DD' or '' when unset. */
  startDate: string;
  endDate: string;
}

type SprintFieldErrors = Partial<Record<keyof SprintFormValues, string>>;

function validateSprint(values: SprintFormValues): SprintFieldErrors {
  const errors: SprintFieldErrors = {};
  if (!values.name.trim()) errors.name = 'Sprint name is required.';
  // Same-day sprints are allowed; only an end before the start is rejected.
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = 'End date must be on or after the start date.';
  }
  return errors;
}

const inputClass = cn(
  'h-11 w-full px-3 text-sm rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
);
const errorInputClass = 'border-red-500 dark:border-red-400';

/** Name + optional start/end date fields shared by the create and edit dialogs. */
function SprintFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initialValues,
  onSubmit,
  mapError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  initialValues: SprintFormValues;
  onSubmit: (values: SprintFormValues) => Promise<void>;
  mapError: (error: unknown) => { fields: SprintFieldErrors; form?: string };
}) {
  const id = useId();
  const [values, setValues] = useState<SprintFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<SprintFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = { ...values, name: values.name.trim() };
    const errors = validateSprint(trimmed);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch (error) {
      const mapped = mapError(error);
      setFieldErrors(mapped.fields);
      setFormError(mapped.form ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  const describedBy = (key: keyof SprintFormValues, hint?: string) =>
    [fieldErrors[key] ? `${id}-${key}-error` : '', hint ?? ''].filter(Boolean).join(' ') || undefined;
  const errorText = (key: keyof SprintFormValues) =>
    fieldErrors[key] ? (
      <p id={`${id}-${key}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors[key]}</p>
    ) : null;

  const duration = daysBetween(values.startDate, values.endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form id={`${id}-form`} onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          {/* Sprint Name */}
          <div>
            <label htmlFor={`${id}-name`} className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">
              Sprint name <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${id}-name`}
              type="text"
              required
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={describedBy('name')}
              className={cn(inputClass, fieldErrors.name && errorInputClass)}
              placeholder="Enter sprint name"
            />
            {errorText('name')}
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-startDate`} className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">
                Start date <span className="font-normal">(optional)</span>
              </label>
              <input
                id={`${id}-startDate`}
                type="date"
                value={values.startDate}
                max={values.endDate || undefined}
                onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))}
                aria-invalid={fieldErrors.startDate ? true : undefined}
                aria-describedby={describedBy('startDate', values.startDate ? `${id}-startDate-hint` : undefined)}
                className={cn(inputClass, fieldErrors.startDate && errorInputClass)}
              />
              {values.startDate && (
                <span id={`${id}-startDate-hint`} className="text-xs text-gray-500 dark:text-slate-400 mt-1 block">
                  {formatShortDate(values.startDate)}
                </span>
              )}
              {errorText('startDate')}
            </div>

            <div>
              <label htmlFor={`${id}-endDate`} className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">
                End date <span className="font-normal">(optional)</span>
              </label>
              <input
                id={`${id}-endDate`}
                type="date"
                value={values.endDate}
                min={values.startDate || undefined}
                onChange={(e) => setValues((v) => ({ ...v, endDate: e.target.value }))}
                aria-invalid={fieldErrors.endDate ? true : undefined}
                aria-describedby={describedBy('endDate', values.endDate ? `${id}-endDate-hint` : undefined)}
                className={cn(inputClass, fieldErrors.endDate && errorInputClass)}
              />
              {values.endDate && (
                <span id={`${id}-endDate-hint`} className="text-xs text-gray-500 dark:text-slate-400 mt-1 block">
                  {formatShortDate(values.endDate)}
                </span>
              )}
              {errorText('endDate')}
            </div>
          </div>

          {/* Duration Info */}
          {duration !== null && duration >= 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Sprint duration: {duration === 0 ? 'same day' : `${duration} ${duration === 1 ? 'day' : 'days'}`}</span>
              </div>
            </div>
          )}
        </form>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button
            type="submit"
            form={`${id}-form`}
            isLoading={isLoading}
            disabled={isLoading}
            className="min-h-11 bg-blue-600 hover:bg-blue-700"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Map backend sprint validation/permission codes to friendly messages. */
function mapSprintError(error: unknown, fallback: string): { fields: SprintFieldErrors; form?: string } {
  switch (getApiErrorCode(error)) {
    case ERROR_CODES.SPRINT_NAME_REQUIRED:
      return { fields: { name: 'Sprint name is required.' } };
    case ERROR_CODES.SPRINT_END_BEFORE_START:
      return { fields: { endDate: 'End date must be on or after the start date.' } };
    case ERROR_CODES.SPRINT_NOT_FOUND:
      return { fields: {}, form: 'This sprint no longer exists. Refresh the page to see the latest sprints.' };
    default:
      if (isForbidden(error)) return { fields: {}, form: 'You do not have permission to edit sprints in this workspace.' };
      return { fields: {}, form: getApiErrorMessage(error, fallback) };
  }
}

interface CreateSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Should throw (or reject) when the sprint could not be created. */
  onCreateSprint: (data: CreateSprintRequest) => Promise<void>;
  defaultName?: string;
}

export function CreateSprintDialog({
  open,
  onOpenChange,
  onCreateSprint,
  defaultName = 'Sprint 1',
}: CreateSprintDialogProps) {
  const today = toIsoDate(new Date());
  return (
    <SprintFormDialog
      // Remount on open so each new sprint starts from fresh defaults.
      key={open ? 'open' : 'closed'}
      open={open}
      onOpenChange={onOpenChange}
      title="Create sprint"
      description="Dates are optional. You can change them later from the sprint menu."
      submitLabel="Create"
      initialValues={{ name: defaultName, startDate: today, endDate: addDays(today, 14) }}
      onSubmit={(values) =>
        onCreateSprint({ name: values.name, startDate: values.startDate || null, endDate: values.endDate || null })
      }
      mapError={(error) => mapSprintError(error, 'The sprint could not be created. Please try again.')}
    />
  );
}

interface EditSprintDialogProps {
  sprint: Sprint | null;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Rename a sprint and set/clear its dates via PUT /sprints/{id}. Remount per sprint (key). */
export function EditSprintDialog({ sprint, workspaceId, open, onOpenChange }: EditSprintDialogProps) {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();

  const mutation = useMutation({
    mutationFn: (values: SprintFormValues) =>
      sprintService.updateSprint(sprint!.id, {
        name: values.name,
        // Always send the current dates: missing values clear them on the backend.
        startDate: values.startDate || null,
        endDate: values.endDate || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Sprint[]>(['sprints', workspaceId], (current) =>
        current?.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );
      void queryClient.invalidateQueries({ queryKey: ['sprints', workspaceId] });
      showToast(`${updated.name} has been updated.`, 'success', 'Sprint updated');
    },
    onError: (error) => {
      if (getApiErrorCode(error) === ERROR_CODES.SPRINT_NOT_FOUND) {
        void queryClient.invalidateQueries({ queryKey: ['sprints', workspaceId] });
      }
    },
  });

  if (!sprint) return null;

  return (
    <SprintFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit sprint"
      description="Rename the sprint or change its dates. Clear a date to remove it."
      submitLabel="Save changes"
      initialValues={{ name: sprint.name, startDate: sprint.startDate ?? '', endDate: sprint.endDate ?? '' }}
      onSubmit={async (values) => { await mutation.mutateAsync(values); }}
      mapError={(error) => mapSprintError(error, 'The sprint could not be updated. Please try again.')}
    />
  );
}
