import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "lumen_session";

// Prefixes that require an authenticated session.
const PROTECTED_PREFIXES = ["/admin", "/instructor", "/agent", "/student"];

// Auth pages a logged-in user shouldn't see.
const AUTH_PAGES = ["/login", "/signUp", "/otpConfirmation", "/userInformation", "/resetPassword"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Coarse gate: no cookie → bounce to login. Fine-grained role checks and
  // session validity are enforced server-side in each dashboard layout.
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged-in users skip auth pages.
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/agent/:path*",
    "/student/:path*",
    "/login",
    "/signUp",
    "/otpConfirmation",
    "/userInformation",
    "/resetPassword",
  ],
};
