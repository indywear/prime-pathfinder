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
    title?: string;
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
                                text: `Lv.${data.level} ${data.title || ''}`,
                                weight: "bold",
                                size: "xl",
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
    level?: number;
    title?: string;
    totalPoints?: number;
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
                    ...(data.level ? [
                        createProfileRow("Level", `Lv.${data.level} ${data.title || ''}`),
                        createProfileRow("Points", `${data.totalPoints || 0} pts`),
                    ] : []),
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

export function createMenuFlex(): FlexMessage {
    return {
        type: "flex",
        altText: "เมนูหลัก",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "ProficienThAI",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                    {
                        type: "text",
                        text: "เมนูหลัก",
                        size: "sm",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#1DB446",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "การเรียน",
                        weight: "bold",
                        size: "md",
                        color: "#1DB446",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: { type: "message", label: "ส่งงาน", text: "ส่งงาน" },
                                style: "primary",
                                color: "#1DB446",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "ขอ Feedback", text: "ขอผลป้อนกลับ" },
                                style: "secondary",
                                height: "sm",
                            },
                        ],
                        spacing: "sm",
                        margin: "md",
                    },
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "text",
                        text: "ฝึกฝน",
                        weight: "bold",
                        size: "md",
                        color: "#FF6B35",
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: { type: "message", label: "เติมคำ", text: "เติมคำ" },
                                style: "primary",
                                color: "#3498DB",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "เลือกตอบ", text: "เลือกตอบ" },
                                style: "primary",
                                color: "#9B59B6",
                                height: "sm",
                            },
                        ],
                        spacing: "sm",
                        margin: "md",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: { type: "message", label: "เขียนประโยค", text: "เขียนประโยค" },
                                style: "primary",
                                color: "#1ABC9C",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "ดูทั้งหมด", text: "ฝึกฝน" },
                                style: "secondary",
                                height: "sm",
                            },
                        ],
                        spacing: "sm",
                        margin: "sm",
                    },
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "text",
                        text: "อื่นๆ",
                        weight: "bold",
                        size: "md",
                        color: "#5B5BFF",
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: { type: "message", label: "แดชบอร์ด", text: "แดชบอร์ด" },
                                style: "primary",
                                color: "#5B5BFF",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "อันดับ", text: "อันดับ" },
                                style: "primary",
                                color: "#5B5BFF",
                                height: "sm",
                            },
                        ],
                        spacing: "sm",
                        margin: "md",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: { type: "message", label: "ข้อมูลส่วนตัว", text: "ข้อมูลส่วนตัว" },
                                style: "secondary",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "หมุนวงล้อ", text: "หมุนวงล้อ" },
                                style: "secondary",
                                height: "sm",
                            },
                        ],
                        spacing: "sm",
                        margin: "sm",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createGameMenuFlex(): FlexMessage {
    return createPracticeMenuFlex();
}

export function createPracticeMenuFlex(): FlexMessage {
    return {
        type: "flex",
        altText: "เมนูฝึกฝน",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "ฝึกฝนภาษาไทย",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                    {
                        type: "text",
                        text: "เลือกหมวดที่ต้องการ (17 เกม)",
                        size: "sm",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#FF6B35",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    createGameButton("คำศัพท์", "จับคู่คำ, ความหมาย, ตรงข้าม, พ้อง", "เกมคำศัพท์", "#3498DB"),
                    createGameButton("ไวยากรณ์", "เติมคำ, แก้ประโยค, เรียงคำ, Speed", "เกมไวยากรณ์", "#9B59B6"),
                    createGameButton("อ่าน-เขียน", "อ่านตอบ, แต่งประโยค, สรุป, เขียนต่อ", "เกมอ่าน", "#1ABC9C"),
                    createGameButton("เกมสนุก", "คำศัพท์วันนี้, แข่งเวลา, กาชา", "เกมสนุก", "#E74C3C"),
                    createGameButton("วัฒนธรรม", "สำนวนไทย, มารยาท, คำต้องห้าม", "เกมวัฒนธรรม", "#F39C12"),
                ],
                paddingAll: "20px",
                spacing: "md",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "ภาระงาน", text: "ภาระงาน" },
                        style: "primary",
                        color: "#1DB446",
                        height: "sm",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "เมนูหลัก", text: "เมนู" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

function createGameButton(title: string, desc: string, command: string, color: string) {
    return {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
            {
                type: "box" as const,
                layout: "vertical" as const,
                contents: [
                    { type: "text" as const, text: title, weight: "bold" as const, size: "md" as const },
                    { type: "text" as const, text: desc, size: "xs" as const, color: "#999999" },
                ],
                flex: 3,
            },
            {
                type: "button" as const,
                action: { type: "message" as const, label: "เล่น", text: command },
                style: "primary" as const,
                color: color,
                height: "sm" as const,
                flex: 1,
            },
        ],
        spacing: "md" as const,
        alignItems: "center" as const,
    };
}

export function createLeaderboardFlex(data: {
    topUsers: { thaiName: string; totalPoints: number; currentLevel: number; title?: string }[];
    myRank: number;
    myPoints: number;
    myLevel: number;
    myTitle?: string;
}): FlexMessage {
    const medals = ["🥇", "🥈", "🥉"];
    
    return {
        type: "flex",
        altText: "Leaderboard",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "🏆 Leaderboard",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                    {
                        type: "text",
                        text: "Top 10 นักเรียน",
                        size: "sm",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#F39C12",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    ...data.topUsers.slice(0, 5).map((user, i) => ({
                        type: "box" as const,
                        layout: "horizontal" as const,
                        contents: [
                            {
                                type: "text" as const,
                                text: i < 3 ? medals[i] : `${i + 1}.`,
                                flex: 1,
                                size: "lg" as const,
                            },
                            {
                                type: "text" as const,
                                text: user.thaiName || "Unknown",
                                flex: 4,
                                size: "sm" as const,
                                weight: "bold" as const,
                            },
                            {
                                type: "text" as const,
                                text: `Lv.${user.currentLevel}`,
                                flex: 2,
                                size: "xs" as const,
                                color: "#999999",
                                align: "end" as const,
                            },
                            {
                                type: "text" as const,
                                text: `${user.totalPoints}`,
                                flex: 2,
                                size: "sm" as const,
                                align: "end" as const,
                                weight: "bold" as const,
                                color: "#F39C12",
                            },
                        ],
                        margin: "md" as const,
                    })),
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: `#${data.myRank}`,
                                flex: 1,
                                size: "lg",
                                weight: "bold",
                                color: "#1DB446",
                            },
                            {
                                type: "text",
                                text: "คุณ",
                                flex: 4,
                                size: "sm",
                                weight: "bold",
                            },
                            {
                                type: "text",
                                text: `Lv.${data.myLevel}`,
                                flex: 2,
                                size: "xs",
                                color: "#999999",
                                align: "end",
                            },
                            {
                                type: "text",
                                text: `${data.myPoints}`,
                                flex: 2,
                                size: "sm",
                                align: "end",
                                weight: "bold",
                                color: "#1DB446",
                            },
                        ],
                        margin: "xl",
                        backgroundColor: "#E8F5E9",
                        paddingAll: "10px",
                        cornerRadius: "md",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createVocabGameFlex(data: {
    chineseWord: string;
    category: string;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมคำศัพท์",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "🇨🇳 คำศัพท์จีน-ไทย",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#E74C3C",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.chineseWord,
                        weight: "bold",
                        size: "3xl",
                        align: "center",
                        margin: "xl",
                    },
                    {
                        type: "text",
                        text: `หมวด: ${data.category || "ทั่วไป"}`,
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: "คำนี้แปลว่าอะไร?",
                        size: "md",
                        align: "center",
                        margin: "xl",
                        color: "#666666",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "ดูเฉลย", text: "เฉลย" },
                        style: "primary",
                        color: "#E74C3C",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "ข้อถัดไป", text: "คำศัพท์" },
                        style: "secondary",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

export function createFillBlankGameFlex(data: {
    sentence: string;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมเติมคำ",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "📝 เติมคำในช่องว่าง",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#3498DB",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.sentence,
                        wrap: true,
                        size: "md",
                        align: "center",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: "พิมพ์คำตอบของคุณ",
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "ดูเฉลย", text: "เฉลยเติมคำ" },
                        style: "primary",
                        color: "#3498DB",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "ข้อถัดไป", text: "เติมคำ" },
                        style: "secondary",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

export function createWordOrderGameFlex(data: {
    words: { number: number; word: string }[];
    questionNumber: number;
}): FlexMessage {
    const wordsText = data.words.map(w => `${w.number}.${w.word}`).join("  ");
    
    return {
        type: "flex",
        altText: "เกมเรียงคำ",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "🔤 เรียงคำเป็นประโยค",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#9B59B6",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เรียงคำต่อไปนี้ให้เป็นประโยค",
                        size: "sm",
                        color: "#666666",
                        align: "center",
                    },
                    {
                        type: "text",
                        text: wordsText,
                        wrap: true,
                        size: "lg",
                        weight: "bold",
                        align: "center",
                        margin: "xl",
                    },
                    {
                        type: "text",
                        text: "พิมพ์ลำดับตัวเลข เช่น 2134",
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "ดูเฉลย", text: "เฉลยเรียงคำ" },
                        style: "primary",
                        color: "#9B59B6",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "ข้อถัดไป", text: "เรียงคำ" },
                        style: "secondary",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

export function createSentenceGameFlex(data: {
    word1: string;
    word2: string;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมแต่งประโยค",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "✍️ แต่งประโยค",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#1ABC9C",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "แต่งประโยคโดยใช้คำต่อไปนี้",
                        size: "sm",
                        color: "#666666",
                        align: "center",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: data.word1,
                                        weight: "bold",
                                        size: "xl",
                                        align: "center",
                                    },
                                ],
                                backgroundColor: "#E8F8F5",
                                paddingAll: "15px",
                                cornerRadius: "lg",
                                flex: 1,
                            },
                            {
                                type: "text",
                                text: "+",
                                size: "xl",
                                align: "center",
                                gravity: "center",
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: data.word2,
                                        weight: "bold",
                                        size: "xl",
                                        align: "center",
                                    },
                                ],
                                backgroundColor: "#E8F8F5",
                                paddingAll: "15px",
                                cornerRadius: "lg",
                                flex: 1,
                            },
                        ],
                        margin: "xl",
                        spacing: "md",
                    },
                    {
                        type: "text",
                        text: "พิมพ์ประโยคของคุณ",
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "ข้อถัดไป", text: "แต่งประโยค" },
                        style: "primary",
                        color: "#1ABC9C",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "กลับเมนู", text: "เกม" },
                        style: "secondary",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

export function createMultipleChoiceGameFlex(data: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    questionNumber: number;
    totalQuestions: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมเลือกตอบ",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "📋 เลือกตอบ",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `${data.questionNumber}/${data.totalQuestions}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#9B59B6",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.question,
                        wrap: true,
                        size: "md",
                        weight: "bold",
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            createChoiceRow("ก", data.optionA),
                            createChoiceRow("ข", data.optionB),
                            createChoiceRow("ค", data.optionC),
                            createChoiceRow("ง", data.optionD),
                        ],
                        spacing: "sm",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: "พิมพ์ ก, ข, ค หรือ ง",
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "ข้าม", text: "ข้าม" },
                        style: "secondary",
                        height: "sm",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "ออกจากเกม", text: "ออกจากเกม" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

function createChoiceRow(label: string, text: string) {
    return {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
            {
                type: "box" as const,
                layout: "vertical" as const,
                contents: [
                    {
                        type: "text" as const,
                        text: label,
                        weight: "bold" as const,
                        size: "md" as const,
                        align: "center" as const,
                        color: "#9B59B6",
                    },
                ],
                width: "30px",
                height: "30px",
                backgroundColor: "#F3E5F5",
                cornerRadius: "15px",
                justifyContent: "center" as const,
            },
            {
                type: "text" as const,
                text: text,
                size: "sm" as const,
                wrap: true,
                flex: 1,
                margin: "md" as const,
            },
        ],
        alignItems: "center" as const,
        paddingAll: "5px" as const,
    };
}

export function createWelcomeFlex(userName?: string): FlexMessage {
    return {
        type: "flex",
        altText: "ยินดีต้อนรับ",
        contents: {
            type: "bubble",
            size: "kilo",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: userName ? `สวัสดีครับ ${userName}!` : "สวัสดีครับ!",
                        weight: "bold",
                        size: "lg",
                    },
                    {
                        type: "text",
                        text: "วันนี้อยากฝึกอะไรครับ?",
                        size: "sm",
                        color: "#666666",
                        margin: "md",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: { type: "message", label: "ฝึกฝน", text: "ฝึกฝน" },
                                style: "primary",
                                color: "#FF6B35",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "ส่งงาน", text: "ส่งงาน" },
                                style: "primary",
                                color: "#1DB446",
                                height: "sm",
                            },
                        ],
                        spacing: "sm",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: { type: "message", label: "ดูความก้าวหน้า", text: "แดชบอร์ด" },
                                style: "secondary",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "เมนูทั้งหมด", text: "เมนู" },
                                style: "secondary",
                                height: "sm",
                            },
                        ],
                        spacing: "sm",
                        margin: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

export function createEditProfileFlex(currentData: {
    thaiName: string;
    chineseName: string;
    email: string;
    university: string;
}): FlexMessage {
    return {
        type: "flex",
        altText: "แก้ไขข้อมูลส่วนตัว",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "แก้ไขข้อมูลส่วนตัว",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "15px",
                backgroundColor: "#5B5BFF",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เลือกข้อมูลที่ต้องการแก้ไข:",
                        size: "sm",
                        color: "#666666",
                        margin: "none",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            createEditButton("ชื่อไทย", currentData.thaiName, "แก้ไข:ชื่อไทย"),
                            createEditButton("ชื่อจีน", currentData.chineseName, "แก้ไข:ชื่อจีน"),
                            createEditButton("อีเมล", currentData.email, "แก้ไข:อีเมล"),
                            createEditButton("มหาวิทยาลัย", currentData.university, "แก้ไข:มหาวิทยาลัย"),
                        ],
                        spacing: "sm",
                        margin: "lg",
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
                        action: { type: "message", label: "ยกเลิก", text: "เมนู" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

function createEditButton(label: string, currentValue: string, command: string) {
    return {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
            {
                type: "box" as const,
                layout: "vertical" as const,
                contents: [
                    { type: "text" as const, text: label, size: "sm" as const, color: "#666666" },
                    { type: "text" as const, text: currentValue || "-", size: "md" as const, weight: "bold" as const },
                ],
                flex: 3,
            },
            {
                type: "button" as const,
                action: { type: "message" as const, label: "แก้ไข", text: command },
                style: "primary" as const,
                color: "#5B5BFF",
                height: "sm" as const,
                flex: 1,
            },
        ],
        spacing: "md" as const,
        alignItems: "center" as const,
        paddingAll: "10px" as const,
        backgroundColor: "#F8F8FF",
        cornerRadius: "md" as const,
    };
}

export function createSpinWheelResultFlex(data: {
    reward: string;
    points: number;
    totalPoints: number;
    isWin: boolean;
}): FlexMessage {
    return {
        type: "flex",
        altText: "ผลหมุนวงล้อ",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "🎡 หมุนวงล้อ",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                        align: "center",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: data.isWin ? "#27AE60" : "#95A5A6",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.isWin ? "🎉 ยินดีด้วย!" : "😅 เสียใจด้วย",
                        size: "xl",
                        weight: "bold",
                        align: "center",
                    },
                    {
                        type: "text",
                        text: data.reward,
                        size: "xxl",
                        weight: "bold",
                        align: "center",
                        margin: "lg",
                        color: data.isWin ? "#27AE60" : "#95A5A6",
                    },
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: "คะแนนรวม",
                                size: "sm",
                                color: "#999999",
                            },
                            {
                                type: "text",
                                text: `${data.totalPoints} pts`,
                                size: "lg",
                                weight: "bold",
                                align: "end",
                                color: "#1DB446",
                            },
                        ],
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "หมุนได้อีกครั้งใน 24 ชั่วโมง",
                        size: "xs",
                        color: "#999999",
                        align: "center",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
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
    options: Array<{ label: string; text: string }>,
    imageUrl?: string | null
) {
    const messages: any[] = [];
    if (imageUrl) {
        messages.push({
            type: "image",
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
        });
    }
    messages.push(createTextMessage(text, createQuickReply(options)));
    await lineClient.replyMessage({
        replyToken,
        messages,
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

export function createGameResultFlex(data: {
    gameType: string;
    correctCount: number;
    totalCount: number;
    pointsEarned: number;
    totalPoints: number;
}): FlexMessage {
    const percentage = Math.round((data.correctCount / data.totalCount) * 100);
    let emoji = "🎉";
    let message = "ยอดเยี่ยม!";
    let headerColor = "#27AE60";

    if (percentage < 50) {
        emoji = "💪";
        message = "พยายามอีกนิด!";
        headerColor = "#F39C12";
    } else if (percentage < 80) {
        emoji = "👍";
        message = "ดีมาก!";
        headerColor = "#3498DB";
    }

    return {
        type: "flex",
        altText: `ผลลัพธ์ - ${data.correctCount}/${data.totalCount} ข้อ`,
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: `${emoji} ${message}`,
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                        align: "center",
                    },
                    {
                        type: "text",
                        text: `จบเกม${data.gameType}แล้ว!`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "center",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: headerColor,
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
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: `${data.correctCount}/${data.totalCount}`,
                                        size: "xxl",
                                        weight: "bold",
                                        align: "center",
                                        color: headerColor,
                                    },
                                    {
                                        type: "text",
                                        text: "ถูกต้อง",
                                        size: "sm",
                                        color: "#999999",
                                        align: "center",
                                    },
                                ],
                                flex: 1,
                            },
                            {
                                type: "separator",
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: `${percentage}%`,
                                        size: "xxl",
                                        weight: "bold",
                                        align: "center",
                                        color: headerColor,
                                    },
                                    {
                                        type: "text",
                                        text: "อัตราถูก",
                                        size: "sm",
                                        color: "#999999",
                                        align: "center",
                                    },
                                ],
                                flex: 1,
                            },
                        ],
                        margin: "lg",
                    },
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: "คะแนนที่ได้",
                                size: "md",
                                color: "#666666",
                            },
                            {
                                type: "text",
                                text: `+${data.pointsEarned}`,
                                size: "lg",
                                weight: "bold",
                                align: "end",
                                color: "#27AE60",
                            },
                        ],
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: "คะแนนรวม",
                                size: "md",
                                color: "#666666",
                            },
                            {
                                type: "text",
                                text: `${data.totalPoints}`,
                                size: "lg",
                                weight: "bold",
                                align: "end",
                                color: "#1E88E5",
                            },
                        ],
                        margin: "md",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "เล่นอีกครั้ง", text: data.gameType },
                        style: "primary",
                        color: headerColor,
                        height: "sm",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "เกมอื่น", text: "ฝึกฝน" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

// =====================
// Game Category Menu Flex
// =====================

export function createGameCategoryMenuFlex(): FlexMessage {
    return {
        type: "flex",
        altText: "เลือกหมวดเกม",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "ฝึกฝนภาษาไทย",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                    {
                        type: "text",
                        text: "เลือกหมวดที่ต้องการ",
                        size: "sm",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#FF6B35",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    createCategoryButton("คำศัพท์", "4 เกม", "เกมคำศัพท์", "#3498DB"),
                    createCategoryButton("ไวยากรณ์", "4 เกม", "เกมไวยากรณ์", "#9B59B6"),
                    createCategoryButton("อ่าน-เขียน", "4 เกม", "เกมอ่าน", "#1ABC9C"),
                    createCategoryButton("เกมสนุก", "3 เกม", "เกมสนุก", "#E74C3C"),
                ],
                paddingAll: "20px",
                spacing: "md",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "กลับเมนูหลัก", text: "เมนู" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

function createCategoryButton(title: string, count: string, command: string, color: string) {
    return {
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
            {
                type: "box" as const,
                layout: "vertical" as const,
                contents: [
                    { type: "text" as const, text: title, weight: "bold" as const, size: "md" as const },
                    { type: "text" as const, text: count, size: "xs" as const, color: "#999999" },
                ],
                flex: 3,
            },
            {
                type: "button" as const,
                action: { type: "message" as const, label: "เล่น", text: command },
                style: "primary" as const,
                color: color,
                height: "sm" as const,
                flex: 1,
            },
        ],
        spacing: "md" as const,
        alignItems: "center" as const,
    };
}

// =====================
// Vocabulary Games Menu
// =====================

export function createVocabGamesMenuFlex(): FlexMessage {
    return {
        type: "flex",
        altText: "เกมคำศัพท์",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เกมคำศัพท์",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#3498DB",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    createGameButton("จับคู่คำ", "จับคู่คำกับความหมาย", "จับคู่คำ", "#3498DB"),
                    createGameButton("ความหมาย", "พิมพ์ความหมายของคำ", "ความหมาย", "#2980B9"),
                    createGameButton("คำตรงข้าม", "เลือกคำที่มีความหมายตรงข้าม", "คำตรงข้าม", "#1ABC9C"),
                    createGameButton("คำพ้อง", "เลือกคำที่มีความหมายเหมือนกัน", "คำพ้อง", "#16A085"),
                ],
                paddingAll: "20px",
                spacing: "md",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "กลับ", text: "ฝึกฝน" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

// =====================
// Grammar Games Menu
// =====================

export function createGrammarGamesMenuFlex(): FlexMessage {
    return {
        type: "flex",
        altText: "เกมไวยากรณ์",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เกมไวยากรณ์",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#9B59B6",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    createGameButton("เติมคำ", "เติมคำในช่องว่างให้ถูกต้อง", "เติมคำ", "#9B59B6"),
                    createGameButton("แก้ประโยค", "แก้ไขประโยคที่ผิดให้ถูกต้อง", "แก้ประโยค", "#8E44AD"),
                    createGameButton("เรียงประโยค", "เรียงคำให้เป็นประโยคที่ถูกต้อง", "เรียงประโยค", "#7D3C98"),
                    createGameButton("Speed Grammar", "ตอบไวยากรณ์แข่งกับเวลา", "speed grammar", "#6C3483"),
                ],
                paddingAll: "20px",
                spacing: "md",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "กลับ", text: "ฝึกฝน" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

// =====================
// Reading Games Menu
// =====================

export function createReadingGamesMenuFlex(): FlexMessage {
    return {
        type: "flex",
        altText: "เกมอ่าน-เขียน",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เกมอ่าน-เขียน",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#1ABC9C",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    createGameButton("อ่านตอบ", "อ่านเนื้อเรื่องแล้วตอบคำถาม", "อ่านตอบ", "#1ABC9C"),
                    createGameButton("เขียนประโยค", "แต่งประโยคโดยใช้คำที่กำหนด", "เขียนประโยค", "#16A085"),
                    createGameButton("สรุปเรื่อง", "อ่านเรื่องแล้วเขียนสรุป", "สรุปเรื่อง", "#148F77"),
                    createGameButton("เขียนต่อ", "เขียนต่อเรื่องจากที่กำหนดให้", "เขียนต่อ", "#117A65"),
                ],
                paddingAll: "20px",
                spacing: "md",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "กลับ", text: "ฝึกฝน" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

// =====================
// Fun Games Menu
// =====================

export function createFunGamesMenuFlex(): FlexMessage {
    return {
        type: "flex",
        altText: "เกมสนุก",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เกมสนุก",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#E74C3C",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    createGameButton("คำศัพท์วันนี้", "เรียนคำศัพท์ใหม่ทุกวัน", "คำศัพท์วันนี้", "#E74C3C"),
                    createGameButton("แข่งเวลา", "ตอบคำถามแข่งกับเวลา", "แข่งเวลา", "#C0392B"),
                    createGameButton("กาชาคำศัพท์", "สุ่มรับคำศัพท์ใหม่", "กาชา", "#A93226"),
                ],
                paddingAll: "20px",
                spacing: "md",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "กลับ", text: "ฝึกฝน" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

// =====================
// Individual Game Flex Messages
// =====================

export function createVocabMatchGameFlex(data: {
    word: string;
    options: string[];
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมจับคู่คำ",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "จับคู่คำ",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#3498DB",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.word,
                        weight: "bold",
                        size: "xxl",
                        align: "center",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: "เลือกความหมายที่ถูกต้อง",
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "lg",
                    },
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            createChoiceRow("ก", data.options[0] || ""),
                            createChoiceRow("ข", data.options[1] || ""),
                            createChoiceRow("ค", data.options[2] || ""),
                            createChoiceRow("ง", data.options[3] || ""),
                        ],
                        spacing: "sm",
                        margin: "lg",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createVocabMeaningGameFlex(data: {
    word: string;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมความหมาย",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "ความหมายคำศัพท์",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#2980B9",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.word,
                        weight: "bold",
                        size: "xxl",
                        align: "center",
                        margin: "xl",
                    },
                    {
                        type: "text",
                        text: "พิมพ์ความหมายของคำนี้",
                        size: "md",
                        color: "#666666",
                        align: "center",
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createVocabOppositeGameFlex(data: {
    word: string;
    options: string[];
    questionNumber: number;
}): FlexMessage {
    return createVocabMatchGameFlex({ ...data, word: `คำตรงข้ามของ "${data.word}"` });
}

export function createVocabSynonymGameFlex(data: {
    word: string;
    options: string[];
    questionNumber: number;
}): FlexMessage {
    return createVocabMatchGameFlex({ ...data, word: `คำพ้องของ "${data.word}"` });
}

export function createFixSentenceGameFlex(data: {
    wrongSentence: string;
    hint?: string;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมแก้ประโยค",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "แก้ไขประโยค",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#8E44AD",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "ประโยคที่ผิด:",
                        size: "sm",
                        color: "#999999",
                    },
                    {
                        type: "text",
                        text: `"${data.wrongSentence}"`,
                        wrap: true,
                        size: "md",
                        weight: "bold",
                        margin: "md",
                        color: "#E74C3C",
                    },
                    ...(data.hint ? [{
                        type: "text" as const,
                        text: `💡 ${data.hint}`,
                        size: "sm" as const,
                        color: "#666666",
                        margin: "lg" as const,
                        wrap: true,
                    }] : []),
                    {
                        type: "text",
                        text: "พิมพ์ประโยคที่ถูกต้อง",
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createArrangeSentenceGameFlex(data: {
    shuffledWords: string[];
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เกมเรียงประโยค",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "เรียงประโยค",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#7D3C98",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เรียงคำต่อไปนี้ให้เป็นประโยค:",
                        size: "sm",
                        color: "#999999",
                    },
                    {
                        type: "text",
                        text: data.shuffledWords.join("  |  "),
                        wrap: true,
                        size: "lg",
                        weight: "bold",
                        margin: "lg",
                        align: "center",
                    },
                    {
                        type: "text",
                        text: "พิมพ์ประโยคที่ถูกต้อง",
                        size: "sm",
                        color: "#999999",
                        align: "center",
                        margin: "xl",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createSpeedGrammarGameFlex(data: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    timeLimit: number;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "Speed Grammar",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "Speed Grammar",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `${data.timeLimit}s`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#6C3483",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.question,
                        wrap: true,
                        size: "md",
                        weight: "bold",
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            createChoiceRow("ก", data.optionA),
                            createChoiceRow("ข", data.optionB),
                            createChoiceRow("ค", data.optionC),
                            createChoiceRow("ง", data.optionD),
                        ],
                        spacing: "sm",
                        margin: "lg",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createReadAnswerGameFlex(data: {
    passage: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "อ่านแล้วตอบ",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "อ่านแล้วตอบ",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#1ABC9C",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.passage.length > 200 ? data.passage.substring(0, 200) + "..." : data.passage,
                        wrap: true,
                        size: "sm",
                        color: "#666666",
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: data.question,
                        wrap: true,
                        size: "md",
                        weight: "bold",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            createChoiceRow("ก", data.optionA),
                            createChoiceRow("ข", data.optionB),
                            createChoiceRow("ค", data.optionC),
                            createChoiceRow("ง", data.optionD),
                        ],
                        spacing: "sm",
                        margin: "lg",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createSummarizeGameFlex(data: {
    passage: string;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "สรุปเรื่อง",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "สรุปเรื่อง",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#148F77",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "อ่านเรื่องต่อไปนี้:",
                        size: "sm",
                        color: "#999999",
                    },
                    {
                        type: "text",
                        text: data.passage.length > 300 ? data.passage.substring(0, 300) + "..." : data.passage,
                        wrap: true,
                        size: "sm",
                        margin: "md",
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: "พิมพ์สรุปเรื่องนี้ (2-3 ประโยค)",
                        size: "sm",
                        color: "#666666",
                        align: "center",
                        margin: "lg",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createContinueStoryGameFlex(data: {
    storyStart: string;
    minLength: number;
    questionNumber: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "เขียนต่อเรื่อง",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "เขียนต่อเรื่อง",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `#${data.questionNumber}`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "end",
                        flex: 1,
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#117A65",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เรื่องเริ่มต้น:",
                        size: "sm",
                        color: "#999999",
                    },
                    {
                        type: "text",
                        text: `"${data.storyStart}"`,
                        wrap: true,
                        size: "sm",
                        margin: "md",
                        style: "italic",
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: `เขียนต่อเรื่องนี้ (อย่างน้อย ${data.minLength} ตัวอักษร)`,
                        size: "sm",
                        color: "#666666",
                        align: "center",
                        margin: "lg",
                        wrap: true,
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createDailyVocabFlex(data: {
    word: string;
    meaning: string;
    example: string;
    date: string;
}): FlexMessage {
    return {
        type: "flex",
        altText: "คำศัพท์วันนี้",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "คำศัพท์วันนี้",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                    {
                        type: "text",
                        text: data.date,
                        size: "sm",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#E74C3C",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.word,
                        weight: "bold",
                        size: "xxl",
                        align: "center",
                    },
                    {
                        type: "text",
                        text: data.meaning,
                        size: "lg",
                        color: "#666666",
                        align: "center",
                        margin: "lg",
                    },
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "text",
                        text: "ตัวอย่างประโยค:",
                        size: "sm",
                        color: "#999999",
                        margin: "lg",
                    },
                    {
                        type: "text",
                        text: `"${data.example}"`,
                        wrap: true,
                        size: "sm",
                        margin: "md",
                        style: "italic",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createRaceClockGameFlex(data: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    questionNumber: number;
    timeLimit: number;
}): FlexMessage {
    return {
        type: "flex",
        altText: "แข่งกับเวลา",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: "แข่งกับเวลา!",
                        weight: "bold",
                        size: "lg",
                        color: "#FFFFFF",
                        flex: 4,
                    },
                    {
                        type: "text",
                        text: `${data.timeLimit}s`,
                        size: "lg",
                        color: "#FFEB3B",
                        align: "end",
                        flex: 1,
                        weight: "bold",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#C0392B",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.question,
                        wrap: true,
                        size: "md",
                        weight: "bold",
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            createChoiceRow("ก", data.optionA),
                            createChoiceRow("ข", data.optionB),
                            createChoiceRow("ค", data.optionC),
                            createChoiceRow("ง", data.optionD),
                        ],
                        spacing: "sm",
                        margin: "lg",
                    },
                ],
                paddingAll: "20px",
            },
        } as FlexBubble,
    };
}

export function createGachaResultFlex(data: {
    word: string;
    meaning: string;
    example?: string;
    rarity: string;
    isNew: boolean;
    points: number;
}): FlexMessage {
    const rarityColors: Record<string, string> = {
        'COMMON': '#95A5A6',
        'RARE': '#3498DB',
        'EPIC': '#9B59B6',
        'LEGENDARY': '#F39C12',
    };
    const rarityNames: Record<string, string> = {
        'COMMON': 'ธรรมดา',
        'RARE': 'หายาก',
        'EPIC': 'พิเศษ',
        'LEGENDARY': 'ตำนาน',
    };

    return {
        type: "flex",
        altText: "ผลกาชา",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.isNew ? "คำศัพท์ใหม่!" : "ได้รับคำศัพท์",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                        align: "center",
                    },
                    {
                        type: "text",
                        text: `[${rarityNames[data.rarity] || 'ธรรมดา'}]`,
                        size: "sm",
                        color: "#FFFFFF",
                        align: "center",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: rarityColors[data.rarity] || '#95A5A6',
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: data.word,
                        weight: "bold",
                        size: "xxl",
                        align: "center",
                    },
                    {
                        type: "text",
                        text: data.meaning,
                        size: "lg",
                        color: "#666666",
                        align: "center",
                        margin: "lg",
                    },
                    ...(data.example ? [
                        {
                            type: "separator" as const,
                            margin: "xl" as const,
                        },
                        {
                            type: "text" as const,
                            text: `"${data.example}"`,
                            wrap: true,
                            size: "sm" as const,
                            margin: "lg" as const,
                            style: "italic" as const,
                            color: "#999999",
                        },
                    ] : []),
                    {
                        type: "separator",
                        margin: "xl",
                    },
                    {
                        type: "text",
                        text: `+${data.points} คะแนน`,
                        size: "lg",
                        weight: "bold",
                        align: "center",
                        margin: "lg",
                        color: "#27AE60",
                    },
                ],
                paddingAll: "20px",
            },
            footer: {
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "สุ่มอีก", text: "กาชา" },
                        style: "primary",
                        color: rarityColors[data.rarity] || '#95A5A6',
                        height: "sm",
                    },
                    {
                        type: "button",
                        action: { type: "message", label: "เกมอื่น", text: "ฝึกฝน" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                spacing: "sm",
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

// =====================
// My Task Flex (Task จากอาจารย์)
// =====================

export function createMyTaskFlex(data: {
    tasks: {
        id: string;
        weekNumber: number;
        title: string;
        description: string;
        deadline: Date;
        isSubmitted: boolean;
    }[];
    userName: string;
}): FlexMessage {
    return {
        type: "flex",
        altText: "ภาระงานของฉัน",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "ภาระงานประจำสัปดาห์",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                    {
                        type: "text",
                        text: `สวัสดี ${data.userName}`,
                        size: "sm",
                        color: "#FFFFFF",
                    },
                ],
                paddingAll: "20px",
                backgroundColor: "#1DB446",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: data.tasks.length > 0
                    ? data.tasks.map(task => ({
                        type: "box" as const,
                        layout: "vertical" as const,
                        contents: [
                            {
                                type: "box" as const,
                                layout: "horizontal" as const,
                                contents: [
                                    {
                                        type: "text" as const,
                                        text: `สัปดาห์ ${task.weekNumber}`,
                                        weight: "bold" as const,
                                        size: "md" as const,
                                        flex: 3,
                                    },
                                    {
                                        type: "text" as const,
                                        text: task.isSubmitted ? "ส่งแล้ว" : "ยังไม่ส่ง",
                                        size: "sm" as const,
                                        color: task.isSubmitted ? "#27AE60" : "#E74C3C",
                                        align: "end" as const,
                                        flex: 1,
                                    },
                                ],
                            },
                            {
                                type: "text" as const,
                                text: task.title,
                                size: "sm" as const,
                                color: "#666666",
                                margin: "sm" as const,
                                wrap: true,
                            },
                            {
                                type: "text" as const,
                                text: `กำหนดส่ง: ${task.deadline.toLocaleDateString('th-TH')}`,
                                size: "xs" as const,
                                color: "#999999",
                                margin: "sm" as const,
                            },
                            ...(task.isSubmitted ? [] : [{
                                type: "button" as const,
                                action: { type: "message" as const, label: "ส่งงาน", text: "ส่งงาน" },
                                style: "primary" as const,
                                color: "#1DB446",
                                height: "sm" as const,
                                margin: "md" as const,
                            }]),
                        ],
                        paddingAll: "15px" as const,
                        backgroundColor: "#F8F8F8",
                        cornerRadius: "md" as const,
                        margin: "md" as const,
                    }))
                    : [{
                        type: "text" as const,
                        text: "ไม่มีภาระงานในขณะนี้",
                        size: "md" as const,
                        color: "#999999",
                        align: "center" as const,
                    }],
                paddingAll: "20px",
                spacing: "sm",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "message", label: "กลับเมนูหลัก", text: "เมนู" },
                        style: "secondary",
                        height: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        } as FlexBubble,
    };
}

export type { WebhookEvent, TextMessage, FlexMessage };
