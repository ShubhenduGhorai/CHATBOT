import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const jwtEnv = z
  .object({
    JWT_SECRET: z.string().min(32),
    JWT_ISSUER: z.string().min(1),
    JWT_AUDIENCE: z.string().min(1),
    JWT_EXPIRES_IN: z.string().default('1d')
  })
  .parse(process.env);

const secretKey = new TextEncoder().encode(jwtEnv.JWT_SECRET);

export type AccessTokenPayload = {
  sub: string;
  workspaceId: string;
  role: UserRole;
  email: string;
};

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email, workspaceId: payload.workspaceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(jwtEnv.JWT_ISSUER)
    .setAudience(jwtEnv.JWT_AUDIENCE)
    .setExpirationTime(jwtEnv.JWT_EXPIRES_IN)
    .setIssuedAt()
    .sign(secretKey);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey, {
    issuer: jwtEnv.JWT_ISSUER,
    audience: jwtEnv.JWT_AUDIENCE
  });

  return payload as {
    sub?: string;
    workspaceId?: string;
    role?: UserRole;
    email?: string;
  };
}
