/**
 * ProficienThAI LINE Flex Message Design System
 * ใช้สี และ style ที่สอดคล้องกันทั้งระบบ
 */

// =====================
// Color Palette
// =====================
export const COLORS = {
    // Primary Colors
    PRIMARY: "#1E88E5",       // น้ำเงินหลัก - ใช้กับเมนู/ปุ่มหลัก
    PRIMARY_DARK: "#1565C0",  // น้ำเงินเข้ม - ใช้กับ header

    // Game Colors
    PRACTICE: "#FF6B35",      // ส้ม - สำหรับเมนูฝึกฝน
    FILL_BLANK: "#3498DB",    // ฟ้า - เกมเติมคำ
    MULTIPLE_CHOICE: "#9B59B6", // ม่วง - เกมเลือกตอบ
    SENTENCE_WRITING: "#1ABC9C", // เขียวน้ำทะเล - เกมเขียนประโยค

    // Status Colors
    SUCCESS: "#27AE60",       // เขียว - ถูกต้อง/สำเร็จ
    ERROR: "#E74C3C",         // แดง - ผิด/ข้อผิดพลาด
    WARNING: "#F39C12",       // เหลือง - เตือน/รางวัล

    // Neutral Colors
    TEXT_PRIMARY: "#333333",  // ข้อความหลัก
    TEXT_SECONDARY: "#666666", // ข้อความรอง
    TEXT_MUTED: "#999999",    // ข้อความจาง
    BACKGROUND: "#F5F5F5",    // พื้นหลัง
    WHITE: "#FFFFFF",
} as const;

// =====================
// Typography
// =====================
export const TEXT_SIZES = {
    TITLE: "xl",
    SUBTITLE: "lg",
    BODY: "md",
    SMALL: "sm",
    TINY: "xs",
} as const;

// =====================
// Spacing
// =====================
export const SPACING = {
    NONE: "none",
    XS: "xs",
    SM: "sm",
    MD: "md",
    LG: "lg",
    XL: "xl",
    XXL: "xxl",
} as const;

// =====================
// Button Styles
// =====================
export const BUTTON_STYLES = {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    LINK: "link",
} as const;

export const BUTTON_HEIGHT = {
    SM: "sm",
    MD: "md",
} as const;

// =====================
// Quick Reply Presets
// =====================
export const QUICK_REPLIES = {
    // During game
    GAME_CONTROLS: [
        { label: "ข้าม", text: "ข้าม" },
        { label: "ออกจากเกม", text: "ออกจากเกม" },
    ],

    // After answer
    AFTER_ANSWER: [
        { label: "ข้อต่อไป", text: "ข้อต่อไป" },
        { label: "กลับเมนู", text: "ฝึกฝน" },
    ],

    // Main menu
    MAIN_MENU: [
        { label: "ฝึกฝน", text: "ฝึกฝน" },
        { label: "แดชบอร์ด", text: "แดชบอร์ด" },
        { label: "เมนู", text: "เมนู" },
    ],

    // Practice menu
    PRACTICE_MENU: [
        { label: "เติมคำ", text: "เติมคำ" },
        { label: "เลือกตอบ", text: "เลือกตอบ" },
        { label: "เขียนประโยค", text: "เขียนประโยค" },
        { label: "กลับ", text: "เมนู" },
    ],
} as const;

// =====================
// Helper Functions
// =====================

/**
 * Create consistent header box
 */
export function createHeaderBox(title: string, subtitle?: string, color: string = COLORS.PRIMARY) {
    const contents: any[] = [
        {
            type: "text",
            text: title,
            weight: "bold",
            size: TEXT_SIZES.TITLE,
            color: COLORS.WHITE,
        },
    ];

    if (subtitle) {
        contents.push({
            type: "text",
            text: subtitle,
            size: TEXT_SIZES.SMALL,
            color: COLORS.WHITE,
        });
    }

    return {
        type: "box",
        layout: "vertical",
        contents,
        paddingAll: "20px",
        backgroundColor: color,
    };
}

/**
 * Create consistent button
 */
export function createButton(
    label: string,
    text: string,
    style: "primary" | "secondary" = "primary",
    color?: string
) {
    return {
        type: "button",
        action: {
            type: "message",
            label,
            text,
        },
        style,
        ...(style === "primary" && color ? { color } : {}),
        height: BUTTON_HEIGHT.SM,
    };
}

/**
 * Create horizontal button row
 */
export function createButtonRow(buttons: Array<{ label: string; text: string; color?: string; style?: "primary" | "secondary" }>) {
    return {
        type: "box",
        layout: "horizontal",
        contents: buttons.map(btn =>
            createButton(btn.label, btn.text, btn.style || "primary", btn.color)
        ),
        spacing: SPACING.SM,
    };
}

/**
 * Create info row (label: value)
 */
export function createInfoRow(label: string, value: string) {
    return {
        type: "box",
        layout: "horizontal",
        contents: [
            {
                type: "text",
                text: label,
                size: TEXT_SIZES.SMALL,
                color: COLORS.TEXT_MUTED,
                flex: 2,
            },
            {
                type: "text",
                text: value || "-",
                size: TEXT_SIZES.SMALL,
                weight: "bold",
                flex: 3,
                wrap: true,
            },
        ],
    };
}

/**
 * Create separator
 */
export function createSeparator(margin: string = SPACING.XL) {
    return {
        type: "separator",
        margin,
    };
}

/**
 * Create game question number badge
 */
export function createQuestionBadge(current: number, total: number) {
    return {
        type: "text",
        text: `${current}/${total}`,
        size: TEXT_SIZES.SMALL,
        color: COLORS.WHITE,
        align: "end",
    };
}
