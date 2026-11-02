export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const rawPort = env.PORT ?? '3001';
  if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const databasePath = env.DATABASE_PATH ?? './data/shiftledger.sqlite';
  if (!databasePath.trim()) throw new Error('DATABASE_PATH must not be empty.');

  return { host: env.HOST ?? '127.0.0.1', port: Number(rawPort), databasePath };
}
