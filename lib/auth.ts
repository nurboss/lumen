import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import type { Role } from "@/src/generated/prisma/enums";

export const SESSION_COOKIE = "lumen_session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  role: Role;
  status: string;
  avatarUrl: string | null;
};

// ── Password hashing ─────────────────────────────────────────────────────────
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000);

  await prisma.session.create({
    data: { sessionToken: token, userId, expires },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });

  return token;
}

/** Read the current session user (or null). Node runtime only. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          avatarUrl: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session || session.expires < new Date() || session.user.deletedAt) {
    return null;
  }

  const { deletedAt, ...user } = session.user;
  void deletedAt;
  return user;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  }
  store.delete(SESSION_COOKIE);
}

// ── Authorization guards (for route handlers / server components) ─────────────

/** Returns the session user or throws a 401-style error. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError("Not authenticated", 401);
  return user;
}

/** Returns the session user if their role is allowed, else throws 401/403. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (roles.length && !roles.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}
