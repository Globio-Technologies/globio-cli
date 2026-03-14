import { Globio } from '@globio/sdk';
import { config } from './config.js';

export function getClient(profileName?: string): Globio {
  const { pat } = config.requireAuth(profileName);
  const { projectId } = config.requireProject(profileName);
  const profile = config.getProfile(profileName);
  const apiKey = profile?.project_api_key ?? pat;
  void projectId;
  return new Globio({ apiKey });
}

export function getClientWithKey(apiKey: string, projectId: string): Globio {
  void projectId;
  return new Globio({ apiKey });
}
