import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { config } from '../config';

export default fp(async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyCookie);

  const decodeKey = (b64: string) =>
    Buffer.from(b64, 'base64').toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  await app.register(fastifyJwt, {
    secret: {
      private: decodeKey(config.JWT_PRIVATE_KEY_BASE64),
      public: decodeKey(config.JWT_PUBLIC_KEY_BASE64),
    },
    // NOTE: @fastify/jwt v10 uses the `fast-jwt` engine, whose option names
    // differ from jsonwebtoken: issuer/audience -> iss/aud on signing, and
    // allowedIss/allowedAud on verification. Using the old names compiles away
    // silently and produces tokens WITHOUT iss/aud claims.
    sign: {
      algorithm: 'RS256',
      expiresIn: config.JWT_ACCESS_TOKEN_TTL,
      iss: config.JWT_ISSUER,
      aud: config.JWT_AUDIENCE,
    },
    verify: {
      allowedIss: config.JWT_ISSUER,
      allowedAud: config.JWT_AUDIENCE,
    },
  });
});
