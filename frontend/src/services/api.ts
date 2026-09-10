import type { ApiEnvelope } from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'zorvyn.session.token';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | undefined;

export const setUnauthorizedHandler = (handler: () => void): void => {
  unauthorizedHandler = handler;
};

export const getToken = (): string | null => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => sessionStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => sessionStorage.removeItem(TOKEN_KEY);

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Unable to reach the finance API. Check that the backend is running.', 0);
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | { message?: string } | null;
  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(payload && 'message' in payload && payload.message ? payload.message : 'The request could not be completed.', response.status);
  }

  if (!payload || !('data' in payload)) throw new ApiError('The API returned an unexpected response.', response.status);
  return payload.data;
}
