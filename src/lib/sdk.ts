import { Globio } from '@globio/sdk';
import { config } from './config.js';

export function getClient(): Globio {
  const apiKey = config.requireProjectApiKey();
  return new Globio({ apiKey });
}

export function getClientWithKey(apiKey: string, projectId: string): Globio {
  void projectId;
  return new Globio({ apiKey });
}
