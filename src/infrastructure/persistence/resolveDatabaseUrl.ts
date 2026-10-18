export interface DatabaseEnv {
  DATABASE_URL?: string;
  INSTANCE_CONNECTION_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
}

const INSTANCE_CONNECTION_NAME = /^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/;

/**
 * `DATABASE_URL` is used as-is for local TCP connections.
 * Cloud Run can instead pass the Cloud SQL instance connection name.
 * The socket path is the one created by `--add-cloudsql-instances`.
 */
export function resolveDatabaseUrl(env: DatabaseEnv): string | undefined {
  const direct = env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  const instance = env.INSTANCE_CONNECTION_NAME?.trim() ?? '';
  const user = env.DB_USER?.trim() ?? '';
  const database = env.DB_NAME?.trim() ?? '';
  const password = env.DB_PASSWORD;
  const hasCloudSqlHint =
    instance.length > 0 ||
    user.length > 0 ||
    database.length > 0 ||
    (password !== undefined && password !== '');
  if (!hasCloudSqlHint) {
    return undefined;
  }
  if (!instance || !user || !database) {
    throw new Error(
      'Cloud SQL 接続には INSTANCE_CONNECTION_NAME, DB_USER, DB_NAME が必要です。DATABASE_URL を使う場合はそれだけを設定してください。'
    );
  }
  if (!INSTANCE_CONNECTION_NAME.test(instance)) {
    throw new Error(
      'INSTANCE_CONNECTION_NAME は project:region:instance の形式で指定してください。'
    );
  }

  const userName = encodeURIComponent(user);
  const auth =
    password !== undefined && password !== ''
      ? `${userName}:${encodeURIComponent(password)}`
      : userName;
  return `postgresql://${auth}@/${encodeURIComponent(database)}?host=/cloudsql/${instance}`;
}
