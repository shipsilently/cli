import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.config', 'shipsilently');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export const DEFAULT_API_URL = 'https://api.shipsilently.dev';

export interface Config {
  token?: string;
  apiUrl?: string;
}

export async function readConfig(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

export async function writeConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

/**
 * Resolve the active token from (in priority order):
 *   1. `--token <value>` CLI flag
 *   2. `SHIP_TOKEN` environment variable
 *   3. Config file (~/.config/shipsilently/config.json)
 */
export async function resolveToken(flagToken?: string): Promise<string | undefined> {
  if (flagToken) return flagToken;
  if (process.env['SHIP_TOKEN']) return process.env['SHIP_TOKEN'];
  const cfg = await readConfig();
  return cfg.token;
}

/**
 * Resolve the active API URL from (in priority order):
 *   1. `--api-url <value>` CLI flag
 *   2. `SHIP_API_URL` environment variable
 *   3. Config file
 *   4. Default production URL
 */
export async function resolveApiUrl(flagApiUrl?: string): Promise<string> {
  if (flagApiUrl) return flagApiUrl.replace(/\/$/, '');
  if (process.env['SHIP_API_URL']) return process.env['SHIP_API_URL'].replace(/\/$/, '');
  const cfg = await readConfig();
  return (cfg.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
}
