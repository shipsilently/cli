import { createApiClient } from '../api.js';
import type { ParsedArgs } from '../index.js';
import { requireToken } from '../index.js';

export async function cmdKeys(args: ParsedArgs): Promise<void> {
  const { token, apiUrl, positional } = args;
  requireToken(token);

  const sub = positional[0] ?? 'list';

  if (sub === 'list') {
    await listKeys(apiUrl, token);
  } else if (sub === 'create') {
    await createKey(args);
  } else if (sub === 'revoke') {
    await revokeKey(args);
  } else {
    console.error(`Unknown keys sub-command '${sub}'. Available: list, create, revoke`);
    process.exit(1);
  }
}

async function listKeys(apiUrl: string, token: string): Promise<void> {
  const client = createApiClient(apiUrl, token);
  const { items, totalCount } = await client.tokens.list();

  if (totalCount === 0) {
    console.log('No operator tokens found.');
    return;
  }

  console.log(`Operator tokens (${totalCount}):`);
  console.log('');
  const prefixWidth = 12;
  const roleWidth = 6;
  const nameWidth = Math.max(...items.map((t) => t.name.length), 4);
  console.log(`${'PREFIX'.padEnd(prefixWidth)}  ${'ROLE'.padEnd(roleWidth)}  ${'NAME'.padEnd(nameWidth)}  LAST USED`);
  console.log(`${'-'.repeat(prefixWidth)}  ${'-'.repeat(roleWidth)}  ${'-'.repeat(nameWidth)}  ---------`);
  for (const t of items) {
    const lastUsed = t.lastUsedAt
      ? new Date(t.lastUsedAt).toLocaleDateString()
      : 'never';
    console.log(
      `${(t.tokenPrefix + '…').padEnd(prefixWidth)}  ${t.role.padEnd(roleWidth)}  ${t.name.padEnd(nameWidth)}  ${lastUsed}`,
    );
  }
}

async function createKey(args: ParsedArgs): Promise<void> {
  const { token, apiUrl, positional, flags: cliFlags } = args;

  const name = positional[1];
  if (!name) {
    console.error('Usage: ship keys create <name> [--role reader|writer|admin] [--description <text>] [--service]');
    process.exit(1);
  }

  const role = (cliFlags['role'] as 'reader' | 'writer' | 'admin' | undefined) ?? 'writer';
  const description = cliFlags['description'] as string | undefined;
  const isServiceToken = 'service' in cliFlags;

  const client = createApiClient(apiUrl, token);
  const created = await client.tokens.create({ name, role, description, isServiceToken });

  console.log('Token created successfully.');
  console.log('');
  console.log(`Name        : ${created.name}`);
  console.log(`Role        : ${created.role}`);
  console.log(`Prefix      : ${created.tokenPrefix}…`);
  if (created.token) {
    console.log('');
    console.log(`Token       : ${created.token}`);
    console.log('');
    console.log('⚠  Save this token now — it will not be shown again.');
  }
}

async function revokeKey(args: ParsedArgs): Promise<void> {
  const { token, apiUrl, positional } = args;

  const id = positional[1];
  if (!id) {
    console.error('Usage: ship keys revoke <token-id>');
    process.exit(1);
  }

  const client = createApiClient(apiUrl, token);
  await client.tokens.revoke(id);
  console.log(`Token ${id} revoked.`);
}
