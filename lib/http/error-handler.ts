import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ErrorHandlerOptions = {
  requestId?: string;
  defaultStatus?: number;
};

function resolveError(error: unknown, defaultStatus = 500) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details: error.issues
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return {
        status: 409,
        code: 'CONFLICT',
        message: 'Resource already exists'
      };
    }

    return {
      status: 400,
      code: 'DATABASE_ERROR',
      message: 'Database request failed'
    };
  }

  return {
    status: defaultStatus,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error'
  };
}

export function handleApiError(error: unknown, options?: ErrorHandlerOptions) {
  const resolved = resolveError(error, options?.defaultStatus);
  const requestId = options?.requestId;

  console.error(
    JSON.stringify({
      level: 'error',
      requestId,
      status: resolved.status,
      code: resolved.code,
      message: resolved.message
    })
  );

  return NextResponse.json(
    {
      success: false,
      error: {
        code: resolved.code,
        message: resolved.message,
        details: resolved.details,
        requestId
      }
    },
    { status: resolved.status }
  );
}
