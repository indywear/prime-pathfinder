import { NextRequest, NextResponse } from "next/server";
import { lineClient } from "@/lib/line/client";
import { RICH_MENU_TEMPLATE } from "@/lib/line/richMenuTemplate";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const richMenuResult = await lineClient.createRichMenu(RICH_MENU_TEMPLATE);
        const richMenuId = richMenuResult.richMenuId;
        
        return NextResponse.json({
            success: true,
            richMenuId,
            message: "Rich Menu created. Now upload image and set as default.",
            nextSteps: [
                "1. Upload image: POST /api/richmenu/image?richMenuId=" + richMenuId,
                "2. Set default: POST /api/richmenu/default?richMenuId=" + richMenuId,
            ],
        });
    } catch (error: any) {
        console.error("Create Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create rich menu" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const richMenuList = await lineClient.getRichMenuList();
        return NextResponse.json(richMenuList);
    } catch (error: any) {
        console.error("Get Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get rich menus" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const richMenuId = request.nextUrl.searchParams.get("richMenuId");
    
    if (!richMenuId) {
        return NextResponse.json({ error: "richMenuId required" }, { status: 400 });
    }

    try {
        await lineClient.deleteRichMenu(richMenuId);
        return NextResponse.json({ success: true, message: "Rich Menu deleted" });
    } catch (error: any) {
        console.error("Delete Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete rich menu" },
            { status: 500 }
        );
    }
}
