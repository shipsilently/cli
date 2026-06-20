import { resolveToken, resolveApiUrl } from './config.js';
import { cmdWhoami } from './commands/whoami.js';
import { cmdProjects } from './commands/projects.js';
import { cmdEnvs } from './commands/envs.js';
import { cmdFlags } from './commands/flags.js';
import { cmdKeys } from './commands/keys.js';
import { cmdConfig } from './commands/config.js';

const VERSION = '0.1.0';

const HELP = `
ShipSilently CLI v${VERSION}

Usage: ship <command> [options]

Commands:
  whoami                      Verify token and show account info
  projects                    List projects
  envs <project-key>          List environments for a project
  flags <project-key>         List feature flags for a project
  keys list                   List operator tokens
  keys create <name>          Create a new operator token
  keys revoke <token-id>      Revoke an operator token
  config set token <token>    Save a token to the local config file
  config set api-url <url>    Override the API base URL
  config show                 Show current config

Options:
  --token <token>             Override the active operator token
  --api-url <url>             Override the API base URL
  --version                   Print version and exit
  --help                      Show this help message

Auth:
  Tokens are resolved in this order:
    1. --token flag
    2. SHIP_TOKEN environment variable
    3. ~/.config/shipsilently/config.json

  Generate an operator token in the ShipSilently dashboard under
  Settings → Tokens, or via: ship keys create <name>

Examples:
  ship config set token ssat_abc123
  ship whoami
  ship projects
  ship envs my-project
  ship flags my-project
  ship keys list
  ship keys create ci-deploy --role writer
`.trim();

// ─── Argument parser ────────────────────────────────────────────────────────

export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
  token: string;
  apiUrl: string;
}

function parseArgs(argv: string[]): {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
  rawToken: string | undefined;
  rawApiUrl: string | undefined;
} {
  const args = argv.slice(2); // strip node + script
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command = '';

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === undefined) break;

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (!command) {
      command = arg;
      i++;
    } else {
      positional.push(arg);
      i++;
    }
  }

  return {
    command,
    positional,
    flags,
    rawToken: flags['token'] as string | undefined,
    rawApiUrl: flags['api-url'] as string | undefined,
  };
}

/** Exits with an error if no token is available. */
export function requireToken(token: string | undefined): asserts token is string {
  if (!token) {
    console.error(
      'No token found. Set SHIP_TOKEN, pass --token, or run:\n' +
        '  ship config set token <your-ssat-token>',
    );
    process.exit(1);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { command, positional, flags, rawToken, rawApiUrl } = parseArgs(process.argv);

  if (flags['version'] || command === 'version') {
    console.log(`ship v${VERSION}`);
    return;
  }

  if (!command || flags['help'] || command === 'help') {
    console.log(HELP);
    return;
  }

  // Resolve credentials (may read from disk for any command)
  const token = await resolveToken(rawToken);
  const apiUrl = await resolveApiUrl(rawApiUrl);

  const resolvedArgs: ParsedArgs = {
    command,
    positional,
    flags,
    token: token ?? '',
    apiUrl,
  };

  switch (command) {
    case 'whoami':
      await cmdWhoami({ ...resolvedArgs, token: token ?? '' });
      break;
    case 'projects':
      await cmdProjects(resolvedArgs);
      break;
    case 'envs':
      await cmdEnvs(resolvedArgs);
      break;
    case 'flags':
      await cmdFlags(resolvedArgs);
      break;
    case 'keys':
      await cmdKeys(resolvedArgs);
      break;
    case 'config':
      await cmdConfig(resolvedArgs);
      break;
    default:
      console.error(`Unknown command '${command}'. Run 'ship --help' for usage.`);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
