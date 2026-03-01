import { NextRequest } from 'next/server';
import { env } from '@/lib/config/env';

export function resolveTenantSlug(request: NextRequest): string {
  const headerSlug = request.headers.get('x-tenant-slug');
  if (headerSlug && headerSlug.length > 0) {
    return headerSlug;
  }

  return env.DEFAULT_TENANT_SLUG;
}
