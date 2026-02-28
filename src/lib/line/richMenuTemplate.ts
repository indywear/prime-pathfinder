/**
 * Shared Rich Menu template for LINE Bot.
 * Used by both /api/richmenu and /api/richmenu/setup routes.
 */
export const RICH_MENU_TEMPLATE = {
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
            action: { type: "message" as const, text: "ฝึกฝน" },
        },
        {
            bounds: { x: 0, y: 843, width: 833, height: 843 },
            action: { type: "message" as const, text: "แดชบอร์ด" },
        },
        {
            bounds: { x: 833, y: 843, width: 834, height: 843 },
            action: { type: "message" as const, text: "อันดับ" },
        },
        {
            bounds: { x: 1667, y: 843, width: 833, height: 843 },
            action: { type: "message" as const, text: "หมุนวงล้อ" },
        },
    ],
}
