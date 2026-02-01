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
                        text: "เกม",
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
                                action: { type: "message", label: "คำศัพท์", text: "คำศัพท์" },
                                style: "primary",
                                color: "#FF6B35",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "เติมคำ", text: "เติมคำ" },
                                style: "primary",
                                color: "#FF6B35",
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
                                action: { type: "message", label: "เรียงคำ", text: "เรียงคำ" },
                                style: "primary",
                                color: "#FF6B35",
                                height: "sm",
                            },
                            {
                                type: "button",
                                action: { type: "message", label: "แต่งประโยค", text: "แต่งประโยค" },
                                style: "primary",
                                color: "#FF6B35",
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
    return {
        type: "flex",
        altText: "เมนูเกม",
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "เกมฝึกภาษา",
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                    },
                    {
                        type: "text",
                        text: "เลือกเกมที่ต้องการเล่น",
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
                    createGameButton("คำศัพท์จีน-ไทย", "ทดสอบความรู้คำศัพท์", "คำศัพท์", "#E74C3C"),
                    createGameButton("เติมคำในช่องว่าง", "ฝึกไวยากรณ์และคำศัพท์", "เติมคำ", "#3498DB"),
                    createGameButton("เรียงคำเป็นประโยค", "ฝึกโครงสร้างประโยค", "เรียงคำ", "#9B59B6"),
                    createGameButton("แต่งประโยค", "ฝึกเขียนประโยคอิสระ", "แต่งประโยค", "#1ABC9C"),
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
    topUsers: { thaiName: string; totalPoints: number; currentLevel: number }[];
    myRank: number;
    myPoints: number;
    myLevel: number;
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
                                action: { type: "message", label: "เล่นเกม", text: "เกม" },
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
