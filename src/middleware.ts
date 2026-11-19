import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
    const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
    const isLoginPage = req.nextUrl.pathname === "/admin/login";
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    const isAdminApi = req.nextUrl.pathname.startsWith("/api/admin");

    if (isAuthRoute) {
        return NextResponse.next();
    }

    const sessionCookie =
        req.cookies.get("__Secure-authjs.session-token") ||
        req.cookies.get("authjs.session-token") ||
        req.cookies.get("__Secure-next-auth.session-token") ||
        req.cookies.get("next-auth.session-token");

    const isLoggedIn = !!sessionCookie?.value;

    if (isAdminApi && !isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isAdminRoute && !isLoginPage && !isLoggedIn) {
        const loginUrl = new URL("/admin/login", req.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isLoginPage && isLoggedIn) {
        return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
