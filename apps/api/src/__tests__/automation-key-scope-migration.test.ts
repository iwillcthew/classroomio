import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_SCOPES } from '@api/services/organization/automation-key';

const MIGRATIONS_DIR = join(__dirname, '../../../../packages/db/src/migrations');

function readMigration(tag: string): string {
  return readFileSync(join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8');
}

function scopesInFirstJsonbArray(sql: string, afterOperator: string): string[] {
  const start = sql.indexOf(afterOperator);
  expect(start, `expected to find ${afterOperator} in the migration`).toBeGreaterThan(-1);

  const open = sql.indexOf('[', start);
  const close = sql.indexOf(']', open);

  return JSON.parse(sql.slice(open, close + 1)) as string[];
}

const SCOPE_BACKFILLS = [
  {
    tag: '0035_public_api_scopes_and_instance',
    added: [
      'course:submission:read',
      'course:submission:write',
      'course:student:write',
      'audience:read',
      'audience:write',
      'team:read',
      'team:write'
    ]
  },
  {
    tag: '0042_mp_learning_media_webhooks',
    added: ['organization:read', 'organization:write']
  }
];

describe.each(SCOPE_BACKFILLS.map((backfill, index) => ({ ...backfill, index })))('$tag', ({ tag, added, index }) => {
  const sql = readMigration(tag);
  const addedLater = SCOPE_BACKFILLS.slice(index + 1).flatMap((backfill) => backfill.added);
  const defaultAfter = DEFAULT_SCOPES.mcp.filter((scope: string) => !addedLater.includes(scope));

  it('requires exactly the MCP default set as it stood before the new scopes', () => {
    const required = scopesInFirstJsonbArray(sql, 'AND "scopes" @>');
    const priorDefault = defaultAfter.filter((scope: string) => !added.includes(scope));

    expect(new Set(required)).toEqual(new Set(priorDefault));
  });

  it('adds every scope the default gained, so a new key and a migrated key agree', () => {
    const addedInSql = scopesInFirstJsonbArray(sql, 'SET "scopes" =');
    const required = scopesInFirstJsonbArray(sql, 'AND "scopes" @>');

    expect(new Set(addedInSql)).toEqual(new Set(added));
    expect(new Set([...required, ...addedInSql])).toEqual(new Set(defaultAfter));
  });

  it('only touches mcp keys, leaving public_api:* keys alone', () => {
    expect(sql).toContain(`"type" = 'mcp'`);
  });

  it('skips keys already holding every new scope, so re-running is a no-op', () => {
    expect(sql).toContain(`AND NOT "scopes" @> '${JSON.stringify(added).replace(/","/g, '", "')}'::jsonb`);
  });
});
