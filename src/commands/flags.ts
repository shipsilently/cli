import { createApiClient } from '../api.js';
import type { ParsedArgs } from '../index.js';
import { requireToken } from '../index.js';

export async function cmdFlags(args: ParsedArgs): Promise<void> {
  const { token, apiUrl, positional } = args;
  requireToken(token);

  const projectKey = positional[0];
  if (!projectKey) {
    console.error('Usage: ship flags <project-key>');
    process.exit(1);
  }

  const client = createApiClient(apiUrl, token);
  const { items, totalCount } = await client.flags.list(projectKey);

  const active = items.filter((f) => !f.archivedAt);

  if (active.length === 0) {
    console.log(`No flags found in project '${projectKey}'.`);
    return;
  }

  console.log(`Flags in '${projectKey}' (${active.length} active${totalCount !== active.length ? `, ${totalCount - active.length} archived` : ''}):`);
  console.log('');
  const keyWidth = Math.max(...active.map((f) => f.key.length), 3);
  const typeWidth = Math.max(...active.map((f) => f.type.length), 4);
  console.log(`${'KEY'.padEnd(keyWidth)}  ${'TYPE'.padEnd(typeWidth)}  NAME`);
  console.log(`${'-'.repeat(keyWidth)}  ${'-'.repeat(typeWidth)}  ----`);
  for (const f of active) {
    console.log(`${f.key.padEnd(keyWidth)}  ${f.type.padEnd(typeWidth)}  ${f.name}`);
  }
}
