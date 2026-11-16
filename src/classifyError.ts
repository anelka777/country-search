import { HttpError } from './httpError.js';

export type ErrorKind = 'cancelled' | 'timeout' | 'http' | 'network';

function hasName(error: unknown, name: string): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
}

export function classifyError(error: unknown): ErrorKind {
  if (hasName(error, 'AbortError')) {
    return 'cancelled';
  }

  if (hasName(error, 'TimeoutError')) {
    return 'timeout';
  }

  if (error instanceof HttpError) {
    return 'http';
  }

  return 'network';
}
