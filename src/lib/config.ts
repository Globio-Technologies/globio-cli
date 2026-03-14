import chalk from 'chalk';
import Conf from 'conf';

interface GlobioConfig {
  pat?: string;
  accountEmail?: string;
  accountName?: string;
  projectId?: string;
  projectName?: string;
  projectApiKeys?: Record<string, string>;
  projectNames?: Record<string, string>;
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
  getPat: () => store.get('pat'),
  requirePat: () => {
    const pat = store.get('pat');
    if (!pat) {
      console.error(chalk.red('Not logged in. Run: npx @globio/cli login'));
      process.exit(1);
    }
    return pat;
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
  setProjectAuth: (projectId: string, apiKey: string, projectName?: string) => {
    const projectApiKeys = store.get('projectApiKeys') ?? {};
    const projectNames = store.get('projectNames') ?? {};
    projectApiKeys[projectId] = apiKey;
    if (projectName) {
      projectNames[projectId] = projectName;
    }

    store.set('projectApiKeys', projectApiKeys);
    store.set('projectNames', projectNames);
    store.set('projectId', projectId);
    if (projectName) {
      store.set('projectName', projectName);
    }
  },
  getProjectApiKey: (projectId: string) => {
    const projectApiKeys = store.get('projectApiKeys') ?? {};
    return projectApiKeys[projectId];
  },
  requireProjectApiKey: () => {
    const projectId = store.get('projectId');
    if (!projectId) {
      console.error(
        chalk.red('No active project. Run: npx @globio/cli projects use <projectId>')
      );
      process.exit(1);
    }

    const projectApiKeys = store.get('projectApiKeys') ?? {};
    const apiKey = projectApiKeys[projectId];
    if (!apiKey) {
      console.error(
        chalk.red(
          'No project API key stored for the active project. Run: npx @globio/cli projects use <projectId>'
        )
      );
      process.exit(1);
    }

    return apiKey;
  },
};

export type { GlobioConfig };
