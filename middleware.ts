import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, getAuthCookieToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { buildCorsHeaders } from '@/lib/security/cors';
import { consumeRateLimit, resolvePolicy } from '@/lib/security/rate-limit';

const PROTECTED_ROUTES = ['/dashboard'];
const AUTH_REQUIRED_API_ROUTES = [
  '/api/workspace/create',
  '/api/workspace/current',
  '/api/billing/checkout'
];
const WORKSPACE_SCOPED_API_PREFIXES = ['/api/chatbot', '/api/conversation', '/api/subscription'];
const PUBLIC_API_ROUTES = ['/api/chatbot/message'];
const API_CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

function applyResponseHeaders(
  request: NextRequest,
  response: NextResponse,
  requestId: string,
  rateLimit?: { limit: number; remaining: number; resetAt: number }
) {
  response.headers.set('X-Request-Id', requestId);

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const corsHeaders = buildCorsHeaders(request, API_CORS_METHODS);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  if (rateLimit) {
    response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimit.resetAt / 1000)));
  }

  return response;
}

function logRequest(request: NextRequest, requestId: string, status: number, durationMs: number) {
  console.info(
    JSON.stringify({
      level: 'info',
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      status,
      durationMs,
      ip: getClientIp(request)
    })
  );
}

export async function middleware(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  let rateLimitMeta: { limit: number; remaining: number; resetAt: number } | undefined;

  if (isApiRoute && request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    const finalPreflight = applyResponseHeaders(request, preflightResponse, requestId);
    logRequest(request, requestId, finalPreflight.status, Date.now() - startedAt);
    return finalPreflight;
  }

  if (isApiRoute) {
    const policy = resolvePolicy(pathname);
    if (policy) {
      const key = `${getClientIp(request)}:${pathname}`;
      const result = consumeRateLimit(key, policy);
      rateLimitMeta = {
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.resetAt
      };

      if (result.limited) {
        const limitedResponse = NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests'
            }
          },
          { status: 429 }
        );
        limitedResponse.headers.set('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
        const finalLimited = applyResponseHeaders(request, limitedResponse, requestId, rateLimitMeta);
        logRequest(request, requestId, finalLimited.status, Date.now() - startedAt);
        return finalLimited;
      }
    }
  }

  const isPublicApiRoute = PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublicApiRoute) {
    const response = NextResponse.next();
    const finalResponse = applyResponseHeaders(request, response, requestId, rateLimitMeta);
    logRequest(request, requestId, finalResponse.status, Date.now() - startedAt);
    return finalResponse;
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRequiredApiRoute = AUTH_REQUIRED_API_ROUTES.some((route) => pathname.startsWith(route));
  const isWorkspaceScopedRoute = WORKSPACE_SCOPED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtectedRoute && !isAuthRequiredApiRoute && !isWorkspaceScopedRoute) {
    const response = NextResponse.next();
    const finalResponse = applyResponseHeaders(request, response, requestId, rateLimitMeta);
    logRequest(request, requestId, finalResponse.status, Date.now() - startedAt);
    return finalResponse;
  }

  const token = getAuthCookieToken(request);
  if (!token) {
    let response: NextResponse;
    if (isApiRoute) {
      response = NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    } else {
      const loginUrl = new URL('/login', request.url);
      response = NextResponse.redirect(loginUrl);
    }
    const finalResponse = applyResponseHeaders(request, response, requestId, rateLimitMeta);
    logRequest(request, requestId, finalResponse.status, Date.now() - startedAt);
    return finalResponse;
  }

  try {
    const auth = await verifyAccessToken(token);

    if (isWorkspaceScopedRoute) {
      const workspaceId =
        request.headers.get('x-workspace-id') ?? request.nextUrl.searchParams.get('workspaceId');

      if (!workspaceId || workspaceId !== auth.workspaceId) {
        const response = NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden workspace access' } },
          { status: 403 }
        );
        const finalResponse = applyResponseHeaders(request, response, requestId, rateLimitMeta);
        logRequest(request, requestId, finalResponse.status, Date.now() - startedAt);
        return finalResponse;
      }
    }
  } catch {
    let response: NextResponse;
    if (isApiRoute) {
      response = NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid auth token' } },
        { status: 401 }
      );
    } else {
      const loginUrl = new URL('/login', request.url);
      response = NextResponse.redirect(loginUrl);
    }
    response.cookies.delete(AUTH_COOKIE_NAME);
    const finalResponse = applyResponseHeaders(request, response, requestId, rateLimitMeta);
    logRequest(request, requestId, finalResponse.status, Date.now() - startedAt);
    return finalResponse;
  }

  const response = NextResponse.next();
  const finalResponse = applyResponseHeaders(request, response, requestId, rateLimitMeta);
  logRequest(request, requestId, finalResponse.status, Date.now() - startedAt);
  return finalResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/workspace/create',
    '/api/workspace/current',
    '/api/billing/checkout',
    '/api/chatbot/:path*',
    '/api/conversation/:path*',
    '/api/subscription/:path*'
  ]
};
