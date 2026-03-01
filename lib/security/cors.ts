import { NextRequest } from 'next/server';
import { env } from '@/lib/config/env';

type CorsConfig = {
  allowAnyOrigin: boolean;
  allowedOrigins: string[];
};

function parseCorsConfig(): CorsConfig {
  const raw = env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return {
      allowAnyOrigin: false,
      allowedOrigins: [env.NEXT_PUBLIC_APP_URL]
    };
  }

  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (origins.includes('*')) {
    return {
      allowAnyOrigin: true,
      allowedOrigins: []
    };
  }

  return {
    allowAnyOrigin: false,
    allowedOrigins: origins
  };
}

const corsConfig = parseCorsConfig();

export function resolveCorsOrigin(origin: string | null) {
  if (corsConfig.allowAnyOrigin) {
    return '*';
  }

  if (!origin) {
    return null;
  }

  return corsConfig.allowedOrigins.includes(origin) ? origin : null;
}

export function buildCorsHeaders(request: NextRequest, allowedMethods: string) {
  const origin = request.headers.get('origin');
  const corsOrigin = resolveCorsOrigin(origin);
  if (!corsOrigin) {
    return {} as Record<string, string>;
  }

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workspace-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  } as Record<string, string>;
}
