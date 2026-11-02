import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/server/config.js';

describe('server configuration', () => {
  it('works without an environment file', () => {
    expect(readConfig({})).toEqual({ host: '127.0.0.1', port: 3001, databasePath: './data/shiftledger.sqlite' });
  });

  it('accepts explicit settings', () => {
    expect(readConfig({ HOST: '0.0.0.0', PORT: '4321', DATABASE_PATH: '/tmp/custom.sqlite' }))
      .toEqual({ host: '0.0.0.0', port: 4321, databasePath: '/tmp/custom.sqlite' });
  });

  it.each(['', '0', '-1', '65536', '3001oops', '3.5'])('rejects invalid port %j', (port) => {
    expect(() => readConfig({ PORT: port })).toThrow(/PORT/);
  });

  it('rejects an empty database path', () => {
    expect(() => readConfig({ DATABASE_PATH: ' ' })).toThrow(/DATABASE_PATH/);
  });
});
