import { NextRequest, NextResponse } from "next/server";
import { lineClient } from "@/lib/line/client";
import { RICH_MENU_TEMPLATE } from "@/lib/line/richMenuTemplate";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({
                error: "imageUrl required",
                hint: "Provide a direct URL to a PNG/JPEG image (2500x1686 pixels)"
            }, { status: 400 });
        }

        // Validate URL to prevent SSRF
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        // Only allow HTTPS and specific safe hostnames
        if (parsedUrl.protocol !== 'https:') {
            return NextResponse.json({ error: "Only HTTPS URLs are allowed" }, { status: 400 });
        }

        // Block internal/private IP ranges
        const hostname = parsedUrl.hostname.toLowerCase();
        const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '[::1]', 'metadata.google', 'metadata.aws'];
        if (blockedPatterns.some(p => hostname.includes(p))) {
            return NextResponse.json({ error: "URL points to a blocked address" }, { status: 400 });
        }

        const richMenuResult = await lineClient.createRichMenu(RICH_MENU_TEMPLATE);
        const richMenuId = richMenuResult.richMenuId;
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
