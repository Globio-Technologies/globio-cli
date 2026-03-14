import chalk from 'chalk';
import Conf from 'conf';

interface GlobioConfig {
  apiKey?: string;
  projectId?: string;
  projectName?: string;
  email?: string;
}

const store = new Conf<GlobioConfig>({
  projectName: 'globio',
  defaults: {},
});

export const config = {
  get: (): GlobioConfig => store.store,
  set: (values: Partial<GlobioConfig>) => {
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) {
        store.set(key as keyof GlobioConfig, value);
      }
    });
  },
  clear: () => store.clear(),
  getApiKey: () => store.get('apiKey'),
  requireAuth: () => {
    const key = store.get('apiKey');
    if (!key) {
      console.error(chalk.red('Not logged in. Run: npx @globio/cli login'));
      process.exit(1);
    }
    return key;
  },
  requireProject: () => {
    const projectId = store.get('projectId');
    if (!projectId) {
      console.error(
        chalk.red('No active project. Run: npx @globio/cli projects use <projectId>')
      );
      process.exit(1);
    }
    return projectId;
  },
};

export type { GlobioConfig };
