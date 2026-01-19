import {
    Client,
    ClientConfig,
    messagingApi,
    WebhookEvent,
    TextMessage,
    FlexMessage,
    FlexBubble,
    QuickReply,
    QuickReplyItem,
} from "@line/bot-sdk";

// LINE Client Configuration
const config: ClientConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
};

// Create LINE Messaging API client
export const lineClient = new messagingApi.MessagingApiClient(config);

// =====================
// Message Helpers
// =====================

export function createTextMessage(text: string, quickReply?: QuickReply): TextMessage {
    return {
        type: "text",
        text,
        ...(quickReply && { quickReply }),
    };
}

export function createQuickReplyItem(label: string, text: string): QuickReplyItem {
    return {
        type: "action",
        action: {
            type: "message",
            label,
            text,
        },
    };
}

export function createQuickReply(items: Array<{ label: string; text: string }>): QuickReply {
    return {
        items: items.map((item) => createQuickReplyItem(item.label, item.text)),
    };
}

// =====================
// Flex Message Templates
// =====================

export function createDashboardFlex(data: {
    thaiName: string;
    level: number;
    points: number;
    submissionCount: number;
    totalTasks: number;
    vocabularyCount: number;
    nextLevelPoints: number;
}): FlexMessage {
    const progressPercent = Math.min(
        100,
        Math.round((data.points / data.nextLevelPoints) * 100)
    );

    return {
        type: "flex",
        altText: `Dashboard - Level ${data.level}`,
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "Dashboard",
                        weight: "bold",
                        size: "xl",
                        color: "#1DB446",
                    },
                    {
                        type: "text",
                        text: data.thaiName,
                        size: "sm",
                        color: "#666666",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#F5F5F5",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: `Level ${data.level}`,
                                weight: "bold",
                                size: "xxl",
                                flex: 0,
                            },
                            {
                                type: "text",
                                text: `${data.points} pts`,
                                size: "sm",
                                color: "#999999",
                                align: "end",
                                gravity: "bottom",
                            },
                        ],
                    },
                    {
                        type: "text",
                        text: `Progress: ${progressPercent}%`,
                        size: "xs",
                        color: "#999999",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: `${data.nextLevelPoints - data.points} points to Level ${data.level + 1}`,
                        size: "xs",
                        color: "#999999",
                        margin: "sm",
                    },
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "xl",
                        contents: [
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: `${data.submissionCount}/${data.totalTasks}`,
                                        size: "xl",
                                        weight: "bold",
                                        align: "center",
                                    },
                                    {
                                        type: "text",
                                        text: "Tasks Done",
                                        size: "xs",
                                        color: "#999999",
                                        align: "center",
                                    },
                                ],
                                flex: 1,
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: `${data.vocabularyCount}`,
                                        size: "xl",
                                        weight: "bold",
                                        align: "center",
                                    },
                                    {
                                        type: "text",
                                        text: "Vocabulary",
                                        size: "xs",
                                        color: "#999999",
                                        align: "center",
                                    },
                                ],
                                flex: 1,
                            },
                        ],
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: {
                            type: "message",
                            label: "ดูข้อมูลส่วนตัว",
                            text: "ข้อมูลส่วนตัว",
                        },
                        style: "primary",
                        color: "#1DB446",
                    },
                    {
                        type: "button",
                        action: {
                            type: "message",
                            label: "หมุนวงล้อ",
                            text: "หมุนวงล้อ",
                        },
                        style: "secondary",
                        margin: "sm",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createProfileFlex(data: {
    chineseName: string;
    thaiName: string;
    university: string;
    email: string;
    nationality: string;
    thaiLevel: string;
}): FlexMessage {
    return {
        type: "flex",
        altText: "My Profile",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "My Profile",
                        weight: "bold",
                        size: "xl",
                        color: "#5B5BFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#F0F0FF",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    createProfileRow("Name", data.chineseName),
                    createProfileRow("Thai Name", data.thaiName),
                    createProfileRow("University", data.university),
                    createProfileRow("Email", data.email),
                    createProfileRow("Nationality", data.nationality),
                    createProfileRow("Thai Level", data.thaiLevel),
                ],
                paddingAll: "20px",
                spacing: "md",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "Want to edit your info?",
                        size: "sm",
                        color: "#666666",
                        align: "center",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

function createProfileRow(label: string, value: string) {
    return {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
            {
                type: "text" as const,
                text: label,
                size: "sm" as const,
                color: "#999999",
                flex: 2,
            },
            {
                type: "text" as const,
                text: value || "-",
                size: "sm" as const,
                weight: "bold" as const,
                flex: 3,
                wrap: true,
            },
        ],
    };
}

// =====================
// Reply Helpers
// =====================

export async function replyText(replyToken: string, text: string) {
    await lineClient.replyMessage({
        replyToken,
        messages: [createTextMessage(text)] as any,
    });
}

export async function replyWithQuickReply(
    replyToken: string,
    text: string,
    options: Array<{ label: string; text: string }>
) {
    await lineClient.replyMessage({
        replyToken,
        messages: [createTextMessage(text, createQuickReply(options))] as any,
    });
}

export async function pushMessage(userId: string, messages: Array<TextMessage | FlexMessage>) {
    await lineClient.pushMessage({
        to: userId,
        messages: messages as any,
    });
}

// =====================
// Webhook Signature Verification
// =====================

export async function verifySignature(
    body: string,
    signature: string
): Promise<boolean> {
    const crypto = await import("crypto");
    const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

    const hash = crypto
        .createHmac("SHA256", channelSecret)
        .update(body)
        .digest("base64");

    return hash === signature;
}

export type { WebhookEvent, TextMessage, FlexMessage };
