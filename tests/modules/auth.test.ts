import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../../src/app';

describe('Auth routes', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    // Set required env vars for test
    process.env['NODE_ENV'] = 'test';
    app = buildApp();
    await app.ready();
  });

  it('POST /api/v1/auth/register returns 400 for invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'not-an-email', password: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { status: string };
    expect(body.status).toBe('ok');
  });
});
