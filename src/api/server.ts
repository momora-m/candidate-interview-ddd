import { serve } from '@hono/node-server';
import { createServerApp } from './createServerApp';

const started = await createServerApp(process.env);
const server = serve(
  {
    fetch: started.app.fetch,
    port: started.port,
    hostname: '0.0.0.0',
  },
  (info) => {
    const staticMode = started.staticRoot ? ', static' : '';
    const authMode = started.auth.enabled ? ', iap' : '';
    console.log(
      `Candidate API listening on http://0.0.0.0:${info.port} (${started.persistence}${staticMode}${authMode})`
    );
  }
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await started.close();
      process.exit(0);
    });
  });
}
