import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const richMenuId = request.nextUrl.searchParams.get("richMenuId");
    
    if (!richMenuId) {
        return NextResponse.json({ error: "richMenuId required" }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("image") as File;
        
        if (!file) {
            return NextResponse.json({ error: "Image file required" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        const response = await fetch(
            `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                    "Content-Type": file.type,
                },
                body: buffer,
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return NextResponse.json({
            success: true,
            message: "Rich Menu image uploaded successfully",
        });
    } catch (error: any) {
        console.error("Upload Rich Menu Image Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to upload image" },
            { status: 500 }
        );
    }
}
