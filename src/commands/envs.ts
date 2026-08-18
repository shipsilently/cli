import { createApiClient } from '../api.js';
import type { ParsedArgs } from '../index.js';
import { requireToken } from '../index.js';

export async function cmdEnvs(args: ParsedArgs): Promise<void> {
  const { token, positional } = args;
  requireToken(token);

  // Back-compat: `ship envs <project-key>` predates the sub-command, so a bare
  // first argument that isn't `update` is a project key.
  if (positional[0] === 'update') {
    await updateEnv(args, positional.slice(1));
    return;
  }
  await listEnvs(args, positional);
}

async function listEnvs(args: ParsedArgs, rest: string[]): Promise<void> {
  const projectKey = rest[0];
  if (!projectKey) {
    console.error('Usage: ship envs <project-key>');
    process.exit(1);
  }

  const client = createApiClient(args.apiUrl, args.token);
  const { items, totalCount } = await client.environments.list(projectKey);

  if (totalCount === 0) {
    console.log(`No environments found in project '${projectKey}'.`);
    return;
  }

  console.log(`Environments in '${projectKey}' (${totalCount}):`);
  console.log('');
  const keyWidth = Math.max(...items.map((e) => e.key.length), 3);
  console.log(`${'KEY'.padEnd(keyWidth)}  ${'NAME'.padEnd(20)}  PRODUCTION`);
  console.log(`${'-'.repeat(keyWidth)}  ${'----'.padEnd(20)}  ----------`);
  for (const e of items) {
    console.log(
      `${e.key.padEnd(keyWidth)}  ${e.name.padEnd(20)}  ${e.isProduction ? 'yes' : 'no'}`,
    );
  }
}

async function updateEnv(args: ParsedArgs, rest: string[]): Promise<void> {
  // The API's update schema also lists `color`, but the server has nowhere to
  // store it (environments have no color column) — offering it here would be a
  // silent no-op, so the CLI updates name only.
  const usage = 'ship envs update <project-key> <env-key> --name <name>';
  const projectKey = rest[0];
  const envKey = rest[1];
  if (!projectKey || !envKey) {
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }

  const name = typeof args.flags['name'] === 'string' ? args.flags['name'] : undefined;
  if (name === undefined) {
    console.error(`Nothing to update. ${usage}`);
    process.exit(1);
  }

  const client = createApiClient(args.apiUrl, args.token);
  const updated = await client.environments.update(projectKey, envKey, { name });
  console.log(`Updated environment '${updated.key}'.`);
  console.log(`Name  : ${updated.name}`);
}
