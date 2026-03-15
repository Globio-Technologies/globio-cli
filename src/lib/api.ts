import { config } from './config.js';

const BASE_URL = 'https://api.globio.stanlink.online';

export async function apiCall(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    profile?: string;
  } = {}
): Promise<unknown> {
  const profileName = options.profile ?? config.getActiveProfile();
  const profile = config.getProfile(profileName);

  if (!profile?.project_api_key) {
    throw new Error('No active project. Run: globio projects use <id>');
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Globio-Key': profile.project_api_key,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json()) as {
    success: boolean;
    error?: string;
  };

  if (!data.success) {
    throw new Error(data.error ?? `API error ${res.status}`);
  }

  return data;
}

export async function docSet(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  profile?: string
): Promise<void> {
  await apiCall(`/doc/${collection}/${docId}`, {
    method: 'PUT',
    body: data,
    profile,
  });
}
