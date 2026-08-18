import { createApiClient, type FlagDetail } from '../api.js';
import type { ParsedArgs } from '../index.js';
import { requireToken } from '../index.js';

const SUBCOMMANDS = new Set([
  'list',
  'get',
  'states',
  'deprecate',
  'undeprecate',
  'restore',
  'purge',
]);

export async function cmdFlags(args: ParsedArgs): Promise<void> {
  const { token, positional } = args;
  requireToken(token);

  // Back-compat: `ship flags <project-key>` predates the sub-commands and must
  // keep listing, so a bare first argument that isn't a known sub-command is a
  // project key.
  const first = positional[0];
  const isSub = first !== undefined && SUBCOMMANDS.has(first);
  const sub = isSub ? first : 'list';
  const rest = isSub ? positional.slice(1) : positional;

  switch (sub) {
    case 'list':
      await listFlags(args, rest);
      break;
    case 'get':
      await getFlag(args, rest);
      break;
    case 'states':
      await flagStates(args, rest);
      break;
    case 'deprecate':
      await deprecateFlag(args, rest);
      break;
    case 'undeprecate':
      await undeprecateFlag(args, rest);
      break;
    case 'restore':
      await restoreFlag(args, rest);
      break;
    case 'purge':
      await purgeFlag(args, rest);
      break;
  }
}

function requireProjectKey(rest: string[], usage: string): string {
  const projectKey = rest[0];
  if (!projectKey) {
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }
  return projectKey;
}

function requireProjectAndFlag(rest: string[], usage: string): [string, string] {
  const projectKey = rest[0];
  const flagKey = rest[1];
  if (!projectKey || !flagKey) {
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }
  return [projectKey, flagKey];
}

async function listFlags(args: ParsedArgs, rest: string[]): Promise<void> {
  const projectKey = requireProjectKey(rest, 'ship flags <project-key>');
  const client = createApiClient(args.apiUrl, args.token);
  const { items } = await client.flags.list(projectKey);

  const active = items.filter((f) => !f.archivedAt);
  const archivedCount = items.length - active.length;

  if (active.length === 0) {
    console.log(`No flags found in project '${projectKey}'.`);
    return;
  }

  console.log(`Flags in '${projectKey}' (${active.length} active${archivedCount > 0 ? `, ${archivedCount} archived` : ''}):`);
  console.log('');
  const keyWidth = Math.max(...active.map((f) => f.key.length), 3);
  const typeWidth = Math.max(...active.map((f) => f.type.length), 4);
  console.log(`${'KEY'.padEnd(keyWidth)}  ${'TYPE'.padEnd(typeWidth)}  NAME`);
  console.log(`${'-'.repeat(keyWidth)}  ${'-'.repeat(typeWidth)}  ----`);
  for (const f of active) {
    const marker = f.deprecatedAt ? ' (deprecated)' : '';
    console.log(`${f.key.padEnd(keyWidth)}  ${f.type.padEnd(typeWidth)}  ${f.name}${marker}`);
  }
}

function printFlagDetail(flag: FlagDetail): void {
  console.log(`Flag        : ${flag.key}`);
  console.log(`Name        : ${flag.name}`);
  console.log(`Type        : ${flag.type}`);
  if (flag.description) {
    console.log(`Description : ${flag.description}`);
  }
  if (flag.tags.length > 0) {
    console.log(`Tags        : ${flag.tags.join(', ')}`);
  }
  console.log(`Temporary   : ${flag.temporary ? 'yes' : 'no'}`);
  if (flag.deprecatedAt) {
    console.log(`Deprecated  : ${new Date(flag.deprecatedAt).toLocaleDateString()}${flag.deprecationNote ? ` — ${flag.deprecationNote}` : ''}`);
  }
  if (flag.removeByAt) {
    console.log(`Remove by   : ${new Date(flag.removeByAt).toLocaleDateString()}`);
  }
  if (flag.archivedAt) {
    console.log(`Archived    : ${new Date(flag.archivedAt).toLocaleDateString()}`);
  }
  console.log(`Created     : ${new Date(flag.createdAt).toLocaleDateString()}`);

  console.log('');
  if (flag.environments.length === 0) {
    console.log('No per-environment state.');
  } else {
    console.log('Environments:');
    const envWidth = Math.max(...flag.environments.map((e) => e.envKey.length), 3);
    console.log(`  ${'ENV'.padEnd(envWidth)}  ${'ENABLED'.padEnd(7)}  DEFAULT`);
    console.log(`  ${'-'.repeat(envWidth)}  ${'-'.repeat(7)}  -------`);
    for (const e of flag.environments) {
      console.log(
        `  ${e.envKey.padEnd(envWidth)}  ${(e.enabled ? 'on' : 'off').padEnd(7)}  ${JSON.stringify(e.defaultValue)}`,
      );
    }
  }

  console.log('');
  if (flag.rules.length === 0) {
    console.log('No targeting rules.');
  } else {
    console.log(`Rules (${flag.rules.length}, in evaluation order per environment):`);
    for (const rule of flag.rules) {
      const rollout = rule.rolloutPercentage != null ? ` @ ${rule.rolloutPercentage}%` : '';
      console.log(
        `  [${rule.envKey}] #${rule.sortOrder} ${rule.name ?? rule.id} → ${JSON.stringify(rule.serveValue)}${rollout}`,
      );
      console.log(`    conditions: ${JSON.stringify(rule.conditions)}`);
    }
  }
}

async function getFlag(args: ParsedArgs, rest: string[]): Promise<void> {
  const [projectKey, flagKey] = requireProjectAndFlag(rest, 'ship flags get <project-key> <flag-key>');
  const client = createApiClient(args.apiUrl, args.token);
  const flag = await client.flags.get(projectKey, flagKey);

  if (args.flags['json']) {
    console.log(JSON.stringify(flag, null, 2));
    return;
  }
  printFlagDetail(flag);
}

async function flagStates(args: ParsedArgs, rest: string[]): Promise<void> {
  const projectKey = requireProjectKey(rest, 'ship flags states <project-key> [--env <env-key>]');
  const envKey = typeof args.flags['env'] === 'string' ? args.flags['env'] : undefined;
  const client = createApiClient(args.apiUrl, args.token);
  const { items } = await client.flags.states(projectKey, envKey);

  if (args.flags['json']) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  if (items.length === 0) {
    console.log(`No flag state found in project '${projectKey}'${envKey ? ` for env '${envKey}'` : ''}.`);
    return;
  }

  const flagWidth = Math.max(...items.map((s) => s.flagKey.length), 4);
  const envWidth = Math.max(...items.map((s) => s.envKey.length), 3);
  console.log(`${'FLAG'.padEnd(flagWidth)}  ${'ENV'.padEnd(envWidth)}  ${'ENABLED'.padEnd(7)}  ${'RULES'.padEnd(5)}  DEFAULT`);
  console.log(`${'-'.repeat(flagWidth)}  ${'-'.repeat(envWidth)}  ${'-'.repeat(7)}  ${'-'.repeat(5)}  -------`);
  for (const s of items) {
    console.log(
      `${s.flagKey.padEnd(flagWidth)}  ${s.envKey.padEnd(envWidth)}  ${(s.enabled ? 'on' : 'off').padEnd(7)}  ${(s.hasRules ? 'yes' : 'no').padEnd(5)}  ${JSON.stringify(s.defaultValue)}`,
    );
  }
}

async function deprecateFlag(args: ParsedArgs, rest: string[]): Promise<void> {
  const [projectKey, flagKey] = requireProjectAndFlag(
    rest,
    'ship flags deprecate <project-key> <flag-key> [--note <text>] [--remove-by <ISO date>]',
  );
  const note = typeof args.flags['note'] === 'string' ? args.flags['note'] : undefined;
  const removeByRaw = typeof args.flags['remove-by'] === 'string' ? args.flags['remove-by'] : undefined;
  // Accept anything Date can parse and send the API the ISO form it requires.
  let removeByAt: string | undefined;
  if (removeByRaw !== undefined) {
    const parsed = new Date(removeByRaw);
    if (Number.isNaN(parsed.getTime())) {
      console.error(`Cannot parse --remove-by date '${removeByRaw}'.`);
      process.exit(1);
    }
    removeByAt = parsed.toISOString();
  }

  const client = createApiClient(args.apiUrl, args.token);
  const flag = await client.flags.deprecate(projectKey, flagKey, { note, removeByAt });
  console.log(`Deprecated '${flag.key}'.`);
  if (flag.removeByAt) {
    console.log(`Remove by: ${new Date(flag.removeByAt).toLocaleDateString()}`);
  }
}

async function undeprecateFlag(args: ParsedArgs, rest: string[]): Promise<void> {
  const [projectKey, flagKey] = requireProjectAndFlag(rest, 'ship flags undeprecate <project-key> <flag-key>');
  const client = createApiClient(args.apiUrl, args.token);
  const flag = await client.flags.undeprecate(projectKey, flagKey);
  console.log(`'${flag.key}' is active again.`);
}

async function restoreFlag(args: ParsedArgs, rest: string[]): Promise<void> {
  const [projectKey, flagKey] = requireProjectAndFlag(rest, 'ship flags restore <project-key> <flag-key>');
  const client = createApiClient(args.apiUrl, args.token);
  const flag = await client.flags.restore(projectKey, flagKey);
  console.log(`Restored '${flag.key}' from the archive.`);
}

async function purgeFlag(args: ParsedArgs, rest: string[]): Promise<void> {
  const [projectKey, flagKey] = requireProjectAndFlag(
    rest,
    'ship flags purge <project-key> <flag-key> --yes',
  );
  // Purge is unrecoverable and frees the key for reuse; make the caller say so.
  if (!args.flags['yes']) {
    console.error(
      `Purging permanently deletes '${flagKey}' and cannot be undone. Re-run with --yes to confirm.`,
    );
    process.exit(1);
  }
  const client = createApiClient(args.apiUrl, args.token);
  await client.flags.purge(projectKey, flagKey);
  console.log(`Permanently deleted '${flagKey}'. Its key is free for reuse.`);
}
