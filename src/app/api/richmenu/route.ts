import { NextRequest, NextResponse } from "next/server";
import { lineClient } from "@/lib/line/client";

export const dynamic = 'force-dynamic';

const RICH_MENU_TEMPLATE = {
    size: {
        width: 2500,
        height: 1686,
    },
    selected: true,
    name: "ProficienThAI Menu",
    chatBarText: "เมนู",
    areas: [
        {
            bounds: { x: 0, y: 0, width: 833, height: 843 },
            action: { type: "message" as const, text: "ส่งงาน" },
        },
        {
            bounds: { x: 833, y: 0, width: 834, height: 843 },
            action: { type: "message" as const, text: "ขอผลป้อนกลับ" },
        },
        {
            bounds: { x: 1667, y: 0, width: 833, height: 843 },
            action: { type: "message" as const, text: "เกม" },
        },
        {
            bounds: { x: 0, y: 843, width: 833, height: 843 },
            action: { type: "message" as const, text: "แดชบอร์ด" },
        },
        {
            bounds: { x: 833, y: 843, width: 834, height: 843 },
            action: { type: "message" as const, text: "ข้อมูลส่วนตัว" },
        },
        {
            bounds: { x: 1667, y: 843, width: 833, height: 843 },
            action: { type: "message" as const, text: "เมนู" },
        },
    ],
};

export async function POST(request: NextRequest) {
    try {
        const richMenuId = await lineClient.createRichMenu(RICH_MENU_TEMPLATE);
        
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
