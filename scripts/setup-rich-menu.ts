/**
 * LINE Rich Menu Setup Script
 * Run this script to create and configure the LINE Rich Menu
 * 
 * Usage: npx ts-node scripts/setup-rich-menu.ts
 */

import { Client } from '@line/bot-sdk'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const client = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
})

// Rich Menu Configuration
const RICH_MENU_CONFIG = {
    size: { width: 1200, height: 810 },
    selected: true,
    name: 'ProficienThAI Main Menu',
    chatBarText: 'เมนู',
    areas: [
        {
            bounds: { x: 0, y: 0, width: 400, height: 405 },
            action: { type: 'postback' as const, data: 'action=submit', displayText: '📝 ส่งงาน' },
        },
        {
            bounds: { x: 400, y: 0, width: 400, height: 405 },
            action: { type: 'postback' as const, data: 'action=feedback', displayText: '💬 ขอ Feedback' },
        },
        {
            bounds: { x: 800, y: 0, width: 400, height: 405 },
            action: { type: 'postback' as const, data: 'action=practice', displayText: '🎮 ฝึกฝน' },
        },
        {
            bounds: { x: 0, y: 405, width: 400, height: 405 },
            action: { type: 'postback' as const, data: 'action=dashboard', displayText: '📊 แดชบอร์ด' },
        },
        {
            bounds: { x: 400, y: 405, width: 400, height: 405 },
            action: { type: 'postback' as const, data: 'action=leaderboard', displayText: '🏆 Leaderboard' },
        },
        {
            bounds: { x: 800, y: 405, width: 400, height: 405 },
            action: { type: 'postback' as const, data: 'action=spin', displayText: '🎰 Spin Wheel' },
        },
    ],
}

async function createRichMenu() {
    try {
        console.log('🎨 Creating Rich Menu...')

        // Create rich menu
        const richMenuId = await client.createRichMenu(RICH_MENU_CONFIG)
        console.log(`✅ Rich Menu created: ${richMenuId}`)

        // Upload rich menu image
        const imagePath = path.join(__dirname, '../public/rich-menu.png')

        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath)
            await client.setRichMenuImage(richMenuId, imageBuffer, 'image/png')
            console.log('✅ Rich Menu image uploaded')
        } else {
            console.log('⚠️ Rich menu image not found at:', imagePath)
            console.log('Please create a 2500x1686 PNG image and place it at public/rich-menu.png')
        }

        // Set as default rich menu
        await client.setDefaultRichMenu(richMenuId)
        console.log('✅ Set as default Rich Menu')

        console.log('\n🎉 Rich Menu setup complete!')
        console.log(`Rich Menu ID: ${richMenuId}`)

        return richMenuId
    } catch (error) {
        console.error('❌ Error setting up Rich Menu:', error)
        throw error
    }
}

async function listRichMenus() {
    const menus = await client.getRichMenuList()
    console.log('📋 Existing Rich Menus:')
    menus.forEach((menu, index) => {
        console.log(`  ${index + 1}. ${menu.name} (${menu.richMenuId})`)
    })
    return menus
}

async function deleteRichMenu(richMenuId: string) {
    await client.deleteRichMenu(richMenuId)
    console.log(`🗑️ Deleted Rich Menu: ${richMenuId}`)
}

// Main execution
async function main() {
    const args = process.argv.slice(2)
    const command = args[0] || 'create'

    switch (command) {
        case 'create':
            await createRichMenu()
            break
        case 'list':
            await listRichMenus()
            break
        case 'delete':
            if (args[1]) {
                await deleteRichMenu(args[1])
            } else {
                console.log('Usage: npx ts-node scripts/setup-rich-menu.ts delete <richMenuId>')
            }
            break
        default:
            console.log('Usage: npx ts-node scripts/setup-rich-menu.ts [create|list|delete <id>]')
    }
}

main().catch(console.error)
