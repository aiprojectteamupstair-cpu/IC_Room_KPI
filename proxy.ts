import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configured, isDemo, isLocal } from "@/lib/supabase/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/database/session";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (isLocal()) {
    if (
      request.nextUrl.pathname.startsWith("/admin") &&
      request.nextUrl.pathname !== "/admin/login" &&
      !verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
    )
      return NextResponse.redirect(new URL("/admin/login", request.url));
    return response;
  }
  if (!configured()) {
    if (
      !isDemo() &&
      request.nextUrl.pathname.startsWith("/admin") &&
      request.nextUrl.pathname !== "/admin/login"
    )
      return NextResponse.redirect(new URL("/admin/login", request.url));
    return response;
  }
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await db.auth.getUser();
  const protectedRoute =
    request.nextUrl.pathname.startsWith("/admin") && request.nextUrl.pathname !== "/admin/login";
  if (protectedRoute) {
    const { data: profile } = user
      ? await db.from("profiles").select("role").eq("id", user.id).single()
      : { data: null };
    if (!user || !profile || !["admin", "super_admin"].includes(profile.role)) {
      const redirect = NextResponse.redirect(new URL("/admin/login", request.url));
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
