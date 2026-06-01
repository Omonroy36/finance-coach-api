import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    // What we pass to `jwt.sign(...)`. `iat`/`exp` are added automatically by the
    // signer, so they must NOT be required here.
    payload: {
      sub: string;
      email: string;
    };
    // What `jwt.verify(...)` returns — includes the standard claims.
    user: {
      sub: string;
      email: string;
      iat: number;
      exp: number;
    };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
  }
}
