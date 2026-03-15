import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

interface GlobalConfig {
  active_profile: string;
}

export interface ProfileData {
  pat: string;
  account_email: string;
  account_name: string;
  org_name?: string;
  active_project_id?: string;
  active_project_name?: string;
  project_api_key?: string;
  created_at: number;
}

const baseDir = path.join(os.homedir(), '.globio');
const profilesDir = path.join(baseDir, 'profiles');
const configPath = path.join(baseDir, 'config.json');

function ensureBaseDir() {
  mkdirSync(baseDir, { recursive: true });
}

function ensureProfilesDir() {
  ensureBaseDir();
  mkdirSync(profilesDir, { recursive: true });
}

function readGlobalConfig(): GlobalConfig {
  if (!existsSync(configPath)) {
    return { active_profile: 'default' };
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as Partial<GlobalConfig>;
    return {
      active_profile: raw.active_profile ?? 'default',
    };
  } catch {
    return { active_profile: 'default' };
  }
}

function writeGlobalConfig(data: GlobalConfig) {
  ensureBaseDir();
  writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n');
}

function profilePath(name: string) {
  return path.join(profilesDir, `${name}.json`);
}

function readProfile(name: string): ProfileData | null {
  const file = profilePath(name);
  if (!existsSync(file)) return null;

  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as ProfileData;
  } catch {
    return null;
  }
}

function writeProfile(name: string, data: ProfileData) {
  ensureProfilesDir();
  writeFileSync(profilePath(name), JSON.stringify(data, null, 2) + '\n');
}

export const config = {
  getBaseDir: () => baseDir,
  getProfilesDir: () => profilesDir,
  getActiveProfile: (): string => readGlobalConfig().active_profile,
  setActiveProfile: (name: string): void => {
    writeGlobalConfig({ active_profile: name });
  },
  getProfile: (name?: string): ProfileData | null => {
    const profileName = name ?? config.getActiveProfile();
    if (!profileName) return null;
    return readProfile(profileName);
  },
  setProfile: (name: string, data: Partial<ProfileData>): void => {
    const existing = readProfile(name);
    const next: ProfileData = {
      pat: data.pat ?? existing?.pat ?? '',
      account_email: data.account_email ?? existing?.account_email ?? '',
      account_name: data.account_name ?? existing?.account_name ?? '',
      org_name: data.org_name ?? existing?.org_name,
      active_project_id: data.active_project_id ?? existing?.active_project_id,
      active_project_name: data.active_project_name ?? existing?.active_project_name,
      project_api_key: data.project_api_key ?? existing?.project_api_key,
      created_at: data.created_at ?? existing?.created_at ?? Date.now(),
    };
    writeProfile(name, next);
  },
  deleteProfile: (name: string): void => {
    const file = profilePath(name);
    if (existsSync(file)) {
      rmSync(file);
    }
  },
  listProfiles: (): string[] => {
    if (!existsSync(profilesDir)) return [];
    return readdirSync(profilesDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''))
      .sort();
  },
  getActiveProfileData: (): ProfileData | null => {
    const active = config.getActiveProfile();
    if (!active) return null;
    return config.getProfile(active);
  },
  requireAuth: (profileName?: string): { pat: string; profileName: string } => {
    const resolvedProfile = profileName ?? config.getActiveProfile() ?? 'default';
    const profile = config.getProfile(resolvedProfile);
    if (!profile?.pat) {
      console.error(chalk.red('Not logged in. Run: npx @globio/cli login'));
      process.exit(1);
    }
    return { pat: profile.pat, profileName: resolvedProfile };
  },
  requireProject: (profileName?: string): { projectId: string; projectName: string } => {
    const resolvedProfile = profileName ?? config.getActiveProfile() ?? 'default';
    const profile = config.getProfile(resolvedProfile);
    if (!profile?.active_project_id) {
      console.error(
        chalk.red('No active project. Run: npx @globio/cli projects use <projectId>')
      );
      process.exit(1);
    }
    return {
      projectId: profile.active_project_id,
      projectName: profile.active_project_name ?? 'unnamed',
    };
  },
};
