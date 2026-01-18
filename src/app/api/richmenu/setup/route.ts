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
        const { imageUrl } = await request.json();
        
        if (!imageUrl) {
            return NextResponse.json({ 
                error: "imageUrl required",
                hint: "Provide a direct URL to a PNG/JPEG image (2500x1686 pixels)"
            }, { status: 400 });
        }

        const richMenuId = await lineClient.createRichMenu(RICH_MENU_TEMPLATE);
        console.log("Created Rich Menu:", richMenuId);

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error("Failed to fetch image from URL");
        }
        
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const contentType = imageResponse.headers.get("content-type") || "image/png";

        const uploadResponse = await fetch(
            `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                    "Content-Type": contentType,
                },
                body: imageBuffer,
            }
        );

        if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            throw new Error(`Upload failed: ${error}`);
        }
        console.log("Uploaded image to Rich Menu");

        await lineClient.setDefaultRichMenu(richMenuId);
        console.log("Set as default Rich Menu");

        return NextResponse.json({
            success: true,
            richMenuId,
            message: "Rich Menu created, image uploaded, and set as default!",
        });
    } catch (error: any) {
        console.error("Auto Setup Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to setup rich menu" },
            { status: 500 }
        );
    }
}
