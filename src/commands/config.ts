import { readConfig, writeConfig } from '../config.js';
import type { ParsedArgs } from '../index.js';

export async function cmdConfig(args: ParsedArgs): Promise<void> {
  const { positional } = args;
  const sub = positional[0];

  if (sub === 'set') {
    await configSet(positional);
  } else if (sub === 'get') {
    await configGet(positional);
  } else if (sub === 'show') {
    await configShow();
  } else {
    console.error(
      'Usage:\n' +
        '  ship config set token <value>\n' +
        '  ship config set api-url <value>\n' +
        '  ship config get token\n' +
        '  ship config show',
    );
    process.exit(1);
  }
}

async function configSet(positional: string[]): Promise<void> {
  const key = positional[1];
  const value = positional[2];

  if (!key || !value) {
    console.error('Usage: ship config set <key> <value>');
    process.exit(1);
  }

  const cfg = await readConfig();

  if (key === 'token') {
    cfg.token = value;
    await writeConfig(cfg);
    console.log(`Token saved to ~/.config/shipsilently/config.json`);
  } else if (key === 'api-url') {
    cfg.apiUrl = value;
    await writeConfig(cfg);
    console.log(`API URL saved: ${value}`);
  } else {
    console.error(`Unknown config key '${key}'. Supported keys: token, api-url`);
    process.exit(1);
  }
}

async function configGet(positional: string[]): Promise<void> {
  const key = positional[1];
  if (!key) {
    console.error('Usage: ship config get <key>');
    process.exit(1);
  }

  const cfg = await readConfig();

  if (key === 'token') {
    console.log(cfg.token ?? '(not set)');
  } else if (key === 'api-url') {
    console.log(cfg.apiUrl ?? '(not set)');
  } else {
    console.error(`Unknown config key '${key}'. Supported keys: token, api-url`);
    process.exit(1);
  }
}

async function configShow(): Promise<void> {
  const cfg = await readConfig();
  const tokenDisplay = cfg.token ? `${cfg.token.slice(0, 10)}… (set)` : '(not set)';
  console.log(`token  : ${tokenDisplay}`);
  console.log(`apiUrl : ${cfg.apiUrl ?? '(default)'}`);
}
