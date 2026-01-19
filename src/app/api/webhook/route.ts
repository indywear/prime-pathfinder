import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent } from "@line/bot-sdk";
import { verifySignature } from "@/lib/line/client";
import { handleTextMessage } from "@/lib/line/handlers";

export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature verification
        const body = await request.text();
        const signature = request.headers.get("x-line-signature");

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }

        // Verify LINE signature
        const isValid = await verifySignature(body, signature);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Parse webhook events
        const { events }: { events: WebhookEvent[] } = JSON.parse(body);

        // Process each event
        await Promise.all(
            events.map(async (event) => {
                try {
                    // Handle text messages
                    if (event.type === "message" && event.message.type === "text") {
                        console.log(`[Webhook] Processing text message from ${event.source.userId}: ${event.message.text}`);
                        await handleTextMessage(event as WebhookEvent & {
                            type: "message";
                            message: { type: "text"; text: string }
                        });
                        console.log(`[Webhook] Finished processing message from ${event.source.userId}`);
                    }

                    // Handle follow event (new friend)
                    if (event.type === "follow") {
                        // User added bot as friend - can send welcome message
                        console.log("New follower:", event.source.userId);
                    }

                    // Handle unfollow event
                    if (event.type === "unfollow") {
                        console.log("User unfollowed:", event.source.userId);
                    }
                } catch (error) {
                    console.error("Error processing event:", error);
                }
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Handle GET request (for webhook URL verification)
export async function GET() {
    return NextResponse.json({ status: "ProficienThAI webhook is running" });
}
