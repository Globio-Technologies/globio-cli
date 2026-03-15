import { config } from './config.js';

const API_BASE_URL = 'https://api.globio.stanlink.online';
const CONSOLE_BASE_URL = 'https://console.globio.stanlink.online';

interface ManageRequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  profileName?: string;
}

export interface ManageAccount {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: number;
}

export interface ManageOrg {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  created_at: number;
}

export interface ManageProject {
  id: string;
  name: string;
  slug: string;
  org_id: string;
  org_name: string;
  environment: string;
  active: boolean;
}

export interface ManageProjectServices {
  [key: string]: boolean;
}

export interface ManageProjectKey {
  id: string;
  name: string;
  key_prefix: string;
  scope: string;
  created_at: number;
  last_used_at: number | null;
  token?: string;
}

function getAuthToken(explicitToken?: string, profileName?: string): string | undefined {
  if (explicitToken) return explicitToken;
  return config.getProfile(profileName)?.pat;
}

export async function manageRequest<T>(
  path: string,
  options: ManageRequestOptions = {}
): Promise<T> {
  const headers = new Headers();
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken(options.token, options.profileName);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/manage${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Management request failed');
  }

  return (payload.data ?? payload) as T;
}

export function getConsoleCliAuthUrl(state: string): string {
  return `${CONSOLE_BASE_URL}/cli-auth?state=${encodeURIComponent(state)}`;
}
