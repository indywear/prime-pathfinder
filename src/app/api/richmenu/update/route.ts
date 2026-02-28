import { NextResponse } from "next/server";
import { lineClient } from "@/lib/line/client";
import { RICH_MENU_TEMPLATE } from "@/lib/line/richMenuTemplate";

export const dynamic = 'force-dynamic';

/**
 * POST /api/richmenu/update
 * อัปเดต Rich Menu โดยใช้รูปจาก Rich Menu เดิม
 * ไม่ต้องส่ง imageUrl — ดึงรูปจาก Rich Menu ปัจจุบันอัตโนมัติ
 */
export async function POST() {
    try {
        // 1. Get current default Rich Menu ID
        const defaultResult = await lineClient.getDefaultRichMenuId();
        const oldRichMenuId = defaultResult.richMenuId;
        console.log("Current Rich Menu:", oldRichMenuId);

        // 2. Download current Rich Menu image
        const imageResponse = await fetch(
            `https://api-data.line.me/v2/bot/richmenu/${oldRichMenuId}/content`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                },
            }
        );

        if (!imageResponse.ok) {
            throw new Error("Failed to download current Rich Menu image");
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const contentType = imageResponse.headers.get("content-type") || "image/png";
        console.log(`Downloaded image: ${imageBuffer.length} bytes, type: ${contentType}`);

        // 3. Create new Rich Menu with updated template
        const richMenuResult = await lineClient.createRichMenu(RICH_MENU_TEMPLATE);
        const newRichMenuId = richMenuResult.richMenuId;
        console.log("Created new Rich Menu:", newRichMenuId);

        // 4. Upload image to new Rich Menu
        const uploadResponse = await fetch(
            `https://api-data.line.me/v2/bot/richmenu/${newRichMenuId}/content`,
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
        console.log("Uploaded image to new Rich Menu");

        // 5. Set new Rich Menu as default
        await lineClient.setDefaultRichMenu(newRichMenuId);
        console.log("Set new Rich Menu as default");

        // 6. Delete old Rich Menu
        try {
            await lineClient.deleteRichMenu(oldRichMenuId);
            console.log("Deleted old Rich Menu:", oldRichMenuId);
        } catch (deleteError: any) {
            console.warn("Could not delete old Rich Menu:", deleteError.message);
        }

        return NextResponse.json({
            success: true,
            oldRichMenuId,
            newRichMenuId,
            message: "Rich Menu updated! รูปเดิม + template ใหม่",
        });
    } catch (error: any) {
        console.error("Update Rich Menu Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update rich menu" },
            { status: 500 }
        );
    }
}
