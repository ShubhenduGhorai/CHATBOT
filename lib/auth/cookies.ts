import { NextRequest, NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'chatbot_auth_token';
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_DAY_IN_SECONDS
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

export function getAuthCookieToken(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}
