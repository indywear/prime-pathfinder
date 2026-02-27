import { NextRequest, NextResponse } from "next/server";

export function verifyAdminAuth(request: NextRequest): boolean {
    const basicAuth = request.headers.get("authorization");

    if (!basicAuth) {
        return false;
    }

    try {
        const authValue = basicAuth.split(" ")[1];
        const decoded = atob(authValue);
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) return false;

        const user = decoded.substring(0, colonIndex).trim();
        const pwd = decoded.substring(colonIndex + 1).trim();

        const validUser = (process.env.ADMIN_EMAIL || 'admin').trim();
        const validPass = (process.env.ADMIN_PASSWORD || 'prime-pathfinder-admin').trim();

        return user === validUser && pwd === validPass;
    } catch {
        return false;
    }
}

export function unauthorizedResponse(): NextResponse {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
            "Content-Type": "application/json",
            "WWW-Authenticate": 'Basic realm="Admin API"',
        },
    });
}
