import { createApiClient } from '../api.js';
import type { ParsedArgs } from '../index.js';
import { requireToken } from '../index.js';

export async function cmdProjects(args: ParsedArgs): Promise<void> {
  const { token, apiUrl } = args;
  requireToken(token);

  const client = createApiClient(apiUrl, token);
  const { items, totalCount } = await client.projects.list();

  if (totalCount === 0) {
    console.log('No projects found.');
    return;
  }

  console.log(`Projects (${totalCount}):`);
  console.log('');
  const keyWidth = Math.max(...items.map((p) => p.key.length), 7);
  console.log(`${'KEY'.padEnd(keyWidth)}  NAME`);
  console.log(`${'-'.repeat(keyWidth)}  ----`);
  for (const p of items) {
    console.log(`${p.key.padEnd(keyWidth)}  ${p.name}`);
  }
}
