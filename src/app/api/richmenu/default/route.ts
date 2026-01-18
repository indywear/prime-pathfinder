import { NextRequest, NextResponse } from "next/server";
import { lineClient } from "@/lib/line/client";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const richMenuId = request.nextUrl.searchParams.get("richMenuId");
    
    if (!richMenuId) {
        return NextResponse.json({ error: "richMenuId required" }, { status: 400 });
    }

    try {
        await lineClient.setDefaultRichMenu(richMenuId);
        return NextResponse.json({
            success: true,
            message: "Rich Menu set as default for all users",
        });
    } catch (error: any) {
        console.error("Set Default Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to set default rich menu" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const defaultRichMenuId = await lineClient.getDefaultRichMenuId();
        return NextResponse.json({ defaultRichMenuId });
    } catch (error: any) {
        console.error("Get Default Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "No default rich menu set" },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        await lineClient.cancelDefaultRichMenu();
        return NextResponse.json({
            success: true,
            message: "Default rich menu removed",
        });
    } catch (error: any) {
        console.error("Delete Default Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete default rich menu" },
            { status: 500 }
        );
    }
}
