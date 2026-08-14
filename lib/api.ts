import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

/** Consistent success envelope: { data }. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

/** Consistent error envelope: { error }. */
export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Wrap a route handler with a try/catch that returns a 500 envelope. */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AuthError) return fail(err.message, err.status);
      console.error("[api] unhandled error:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return fail(message, 500);
    }
  };
}
