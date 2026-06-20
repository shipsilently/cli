import { createApiClient } from '../api.js';
import type { ParsedArgs } from '../index.js';
import { requireToken } from '../index.js';

export async function cmdEnvs(args: ParsedArgs): Promise<void> {
  const { token, apiUrl, positional } = args;
  requireToken(token);

  const projectKey = positional[0];
  if (!projectKey) {
    console.error('Usage: ship envs <project-key>');
    process.exit(1);
  }

  const client = createApiClient(apiUrl, token);
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
