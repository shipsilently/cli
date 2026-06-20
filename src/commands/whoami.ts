import { createApiClient, ApiError } from '../api.js';
import type { ParsedArgs } from '../index.js';

export async function cmdWhoami(args: ParsedArgs): Promise<void> {
  const { token, apiUrl } = args;

  if (!token) {
    console.error(
      'No token found. Set SHIP_TOKEN, pass --token, or run:\n' +
        '  ship config set token <your-ssat-token>',
    );
    process.exit(1);
  }

  const client = createApiClient(apiUrl, token);

  try {
    const { items, totalCount } = await client.projects.list();
    const prefix = token.slice(0, 10);
    console.log(`Authenticated  token prefix : ${prefix}…`);
    console.log(`API URL        : ${apiUrl}`);
    console.log(`Projects       : ${totalCount}`);
    if (items.length > 0) {
      console.log('\nProjects:');
      for (const p of items) {
        console.log(`  ${p.key.padEnd(24)} ${p.name}`);
      }
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      console.error('Authentication failed — token is invalid or revoked.');
      process.exit(1);
    }
    throw err;
  }
}
