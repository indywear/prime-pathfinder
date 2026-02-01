import { NextRequest, NextResponse } from "next/server";

export function verifyAdminAuth(request: NextRequest): boolean {
    const basicAuth = request.headers.get("authorization");

    if (!basicAuth) {
        return false;
    }

    try {
        const authValue = basicAuth.split(" ")[1];
        const [user, pwd] = atob(authValue).split(":");

        const validUser = process.env.ADMIN_EMAIL;
        const validPass = process.env.ADMIN_PASSWORD;

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
