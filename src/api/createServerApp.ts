import {
  createInMemoryCandidateRuntime,
  createPostgresCandidateRuntime,
} from '@/infrastructure/createCandidateRuntime';
import { resolveDatabaseUrl } from '@/infrastructure/persistence/resolveDatabaseUrl';
import { resolveIapAuthConfig, type IapAuthConfig } from './auth/iapAuth';
import { createIapJwtVerifier } from './auth/iapJwt';
import { createApp, type ApiRuntime, type AppType } from './app';
import { resolveStaticRoot } from './staticSpa';

export interface ServerApp {
  app: AppType;
  port: number;
  persistence: ApiRuntime['persistence'];
  auth: IapAuthConfig;
  staticRoot?: string;
  close: () => Promise<void>;
}

export async function createServerApp(env: NodeJS.ProcessEnv): Promise<ServerApp> {
  const auth = resolveIapAuthConfig(env);
  const databaseUrl = resolveDatabaseUrl(env);
  const staticRoot = resolveStaticRoot(env);
  const runtime = await openRuntime(databaseUrl);

  const app = createApp({
    ...runtime.api,
    auth: {
      config: auth,
      verifier: auth.enabled
        ? createIapJwtVerifier()
        : {
            async verify() {
              throw new Error('IAP は無効です。');
            },
          },
    },
    staticRoot,
  });

  return {
    app,
    port: Number(env.PORT ?? 4317),
    persistence: runtime.api.persistence,
    auth,
    staticRoot,
    close: () => runtime.close(),
  };
}

async function openRuntime(connectionString: string | undefined): Promise<{
  api: ApiRuntime;
  close: () => Promise<void>;
}> {
  const candidate = connectionString
    ? await createPostgresCandidateRuntime(connectionString)
    : createInMemoryCandidateRuntime();
  if (!connectionString) {
    await candidate.prepare();
  }
  return {
    api: {
      persistence: candidate.persistence,
      queries: candidate.queries,
      useCases: candidate.useCases,
      eventBus: candidate.eventBus,
    },
    close: () => candidate.close(),
  };
}
