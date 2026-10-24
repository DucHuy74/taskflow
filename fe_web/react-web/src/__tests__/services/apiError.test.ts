import { describe, it, expect } from 'vitest';
import { getApiErrorMessage, isForbidden, isVersionConflict } from '@/services/apiError';

const httpError = (status: number, data?: { code?: number; message?: string }) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });

describe('apiError helpers', () => {
  it('detects user story version conflicts (1039) and concurrent update conflicts (1040)', () => {
    expect(isVersionConflict(httpError(409, { code: 1039 }))).toBe(true);
    expect(isVersionConflict(httpError(409, { code: 1040 }))).toBe(true);
    expect(isVersionConflict(httpError(409))).toBe(true);
    expect(isVersionConflict(httpError(400, { code: 1001 }))).toBe(false);
    expect(isVersionConflict(new Error('Network error'))).toBe(false);
  });

  it('detects forbidden responses', () => {
    expect(isForbidden(httpError(403))).toBe(true);
    expect(isForbidden(httpError(400, { code: 1014 }))).toBe(true);
    expect(isForbidden(httpError(500))).toBe(false);
  });

  it('prefers the backend message, falling back otherwise', () => {
    expect(getApiErrorMessage(httpError(400, { message: 'Invalid role' }), 'fallback')).toBe('Invalid role');
    expect(getApiErrorMessage(httpError(500), 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(new Error('Plain failure'), 'fallback')).toBe('Plain failure');
  });
});
