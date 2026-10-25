/** Backend error body: { code, message } with an HTTP status (see GlobalExceptionHandler). */
interface ApiErrorBody {
  code?: number;
  message?: string;
}

interface AxiosLikeError {
  response?: { status?: number; data?: ApiErrorBody };
  message?: string;
}

export const ERROR_CODES = {
  UNAUTHENTICATED: 1006,
  WORKSPACE_NOT_FOUND: 1012,
  NO_PERMISSION: 1014,
  SPRINT_NOT_FOUND: 1020,
  SPRINT_INVALID_STATE: 1021,
  SPRINT_ALREADY_ACTIVE: 1022,
  USER_STORY_NOT_FOUND: 1023,
  USER_STORY_NOT_IN_SPRINT: 1026,
  SPRINT_NOT_ACTIVE: 1027,
  INVALID_USER_STORY_STATUS: 1028,
  CANNOT_DEMOTE_LAST_ADMIN: 1031,
  USER_STORY_VERSION_CONFLICT: 1039,
  CONCURRENT_UPDATE_CONFLICT: 1040,
  SPRINT_END_BEFORE_START: 1041,
  SPRINT_NAME_REQUIRED: 1042,
  FIRST_NAME_REQUIRED: 1043,
  LAST_NAME_REQUIRED: 1044,
  INVALID_DOB: 1045,
  IDENTITY_SYNC_FAILED: 1046,
} as const;

export function getApiErrorStatus(error: unknown): number | undefined {
  return (error as AxiosLikeError | null)?.response?.status;
}

export function getApiErrorCode(error: unknown): number | undefined {
  return (error as AxiosLikeError | null)?.response?.data?.code;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as AxiosLikeError | null;
  return err?.response?.data?.message || (error instanceof Error && !err?.response ? error.message : '') || fallback;
}

/** True when the backend rejected a write because the entity changed since it was loaded. */
export function isVersionConflict(error: unknown): boolean {
  const code = getApiErrorCode(error);
  return (
    code === ERROR_CODES.USER_STORY_VERSION_CONFLICT ||
    code === ERROR_CODES.CONCURRENT_UPDATE_CONFLICT ||
    (code === undefined && getApiErrorStatus(error) === 409)
  );
}

export function isForbidden(error: unknown): boolean {
  return getApiErrorStatus(error) === 403 || getApiErrorCode(error) === ERROR_CODES.NO_PERMISSION;
}
