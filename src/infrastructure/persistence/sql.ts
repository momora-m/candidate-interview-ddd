import type { Result } from '@/domain/shared/Result';
import { PersistenceError } from './PersistenceError';
import type { SqlQuery } from './SqlClient';

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export function splitSqlStatements(sql: string): string[] {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutComments
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function unwrap<T>(result: Result<T>, context: string): T {
  if (result.isFailure()) {
    throw new PersistenceError(`${context}: ${result.getError()}`);
  }
  return result.getValue();
}

export function asDate(value: Date | string, context: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PersistenceError(`${context}: 不正な日時です (${String(value)})`);
  }
  return date;
}

export function asOptionalDate(
  value: Date | string | null | undefined,
  context: string
): Date | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return asDate(value, context);
}

export function asOptionalString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return value;
}

export function asOptionalNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new PersistenceError(`数値カラムが不正です: ${String(value)}`);
  }
  return numeric;
}

export function asNumber(value: number | string, context: string): number {
  const numeric = asOptionalNumber(value);
  if (numeric === undefined) {
    throw new PersistenceError(`${context}: 数値が空です`);
  }
  return numeric;
}

export function asBoolean(value: unknown, context: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 't' || value === 'true' || value === 1) {
    return true;
  }
  if (value === 'f' || value === 'false' || value === 0) {
    return false;
  }
  throw new PersistenceError(`${context}: 真偽値が不正です (${String(value)})`);
}

export function asStringArray(value: unknown, context: string): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string') {
    return parsePostgresTextArray(value);
  }
  if (value === null || value === undefined) {
    return [];
  }
  throw new PersistenceError(`${context}: 配列カラムが配列ではありません`);
}

export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }
  return grouped;
}

export async function insertRows(
  tx: SqlQuery,
  table: string,
  columns: readonly string[],
  rows: readonly (readonly unknown[])[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const tableName = assertIdentifier(table);
  const columnNames = columns.map(assertIdentifier);
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    if (row.length !== columnNames.length) {
      throw new PersistenceError(
        `${tableName} の挿入列数 (${columnNames.length}) と値の数 (${row.length}) が一致しません。`
      );
    }
    const placeholders = row.map((value) => {
      values.push(value ?? null);
      return `$${values.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });

  await tx.query(
    `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES ${tuples.join(', ')}`,
    values
  );
}

export function isForeignKeyViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (code === '23503') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /foreign key|violates foreign key|FOREIGN KEY/i.test(message);
}

function assertIdentifier(name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new PersistenceError(`不正な SQL 識別子です: ${name}`);
  }
  return name;
}

/**
 * Fallback for drivers that return a PostgreSQL text[] literal such as `{a,b}`.
 * Values produced by this schema do not contain commas, quotes, or braces.
 */
function parsePostgresTextArray(literal: string): string[] {
  const trimmed = literal.trim();
  if (trimmed === '{}' || trimmed === '') {
    return [];
  }
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new PersistenceError(`text[] の表現を解釈できません: ${literal}`);
  }
  const body = trimmed.slice(1, -1);
  if (body.length === 0) {
    return [];
  }
  return body.split(',').map((item) => item.trim());
}
