// Test evaluateSummary logic locally to see if it works
const https = require('https');

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";

function getApiKey() {
    return process.env.OPENROUTER_API_KEY?.trim();
}

function checkSummarizeKeywords(userSummary, keywords) {
    const found = [];
    const missing = [];
    for (const keyword of keywords) {
        if (userSummary.includes(keyword)) {
            found.push(keyword);
        } else {
            missing.push(keyword);
        }
    }
    return { found, missing };
}

async function evaluateSummary(userSummary, passage, sampleSummary, keywords) {
    const { found, missing } = checkSummarizeKeywords(userSummary, keywords);
    const keywordRatio = found.length / keywords.length;

    console.log('Keywords check:', { found, missing, keywordRatio, hasKeywords: keywordRatio >= 0.5 });

    if (userSummary.length < 20) {
        console.log('REJECTED: too short');
        return { correct: false, hasKeywords: keywordRatio >= 0.5, feedback: "too short" };
    }

    const apiKey = getApiKey();
    console.log('API Key available:', !!apiKey, apiKey ? '(' + apiKey.substring(0, 10) + '...)' : '');

    if (!apiKey) {
        const isCorrect = keywordRatio >= 0.6;
        console.log('No API key, fallback to keywords only:', { isCorrect });
        return { correct: isCorrect, hasKeywords: keywordRatio >= 0.5, feedback: "no api key" };
    }

    try {
        console.log('Calling OpenRouter AI...');
        const startTime = Date.now();

        const axios = require('axios');
        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: `คุณเป็นครูสอนภาษาไทย ตรวจการสรุปเรื่องของนักเรียน\nตอบเป็น JSON: {"correct": true/false, "feedback": "คำอธิบาย 1-2 ประโยค"}`
                    },
                    {
                        role: "user",
                        content: `เนื้อเรื่อง: "${passage}"\n\nตัวอย่างสรุปที่ดี: "${sampleSummary}"\n\nสรุปของนักเรียน: "${userSummary}"\n\nประเมิน: สรุปได้ใจความสำคัญไหม? ถูกต้องตามเนื้อเรื่องไหม?`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://proficienthai.vercel.app",
                    "X-Title": "ProficienThAI",
                },
                timeout: 10000,
            }
        );

        const elapsed = Date.now() - startTime;
        console.log('AI responded in', elapsed, 'ms');

        const aiResponse = response.data.choices[0]?.message?.content || "";
        console.log('AI response:', aiResponse);

        const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            console.log('Parsed AI result:', result);
            const isCorrect = result.correct === true;
            return {
                correct: isCorrect,
                hasKeywords: keywordRatio >= 0.5,
                feedback: result.feedback,
            };
        }

        console.log('Could not parse JSON from AI response, fallback');
        return { correct: keywordRatio >= 0.6, hasKeywords: keywordRatio >= 0.5, feedback: "parse fallback" };
    } catch (error) {
        console.error('AI error:', error.message);
        return { correct: keywordRatio >= 0.6, hasKeywords: keywordRatio >= 0.5, feedback: "error fallback" };
    }
}

async function main() {
    // Load .env
    require('dotenv').config();

    const passage = "เมื่อวานนี้ฝนตกหนักมาก ถนนหลายสายน้ำท่วม รถติดมากทำให้คนไปทำงานสาย โรงเรียนหลายแห่งประกาศหยุดเรียน ชาวบ้านต้องเอาของขึ้นที่สูง";
    const keywords = ["ฝนตก", "น้ำท่วม", "รถติด", "หยุดเรียน"];
    const sampleSummary = "ฝนตกหนักทำให้น้ำท่วม ส่งผลกระทบต่อการเดินทางและโรงเรียนต้องหยุดเรียน";
    const userSummary = "ฝนตกหนักทำให้น้ำท่วมบนถนนหลายสาย ส่งผลให้รถติดและโรงเรียนต้องหยุดเรียน ชาวบ้านต้องขนของหนีน้ำ";

    console.log('=== Testing evaluateSummary locally ===');
    console.log('User summary:', userSummary);
    console.log('Keywords:', keywords.join(', '));
    console.log();

    const startTime = Date.now();
    const result = await evaluateSummary(userSummary, passage, sampleSummary, keywords);
    const totalTime = Date.now() - startTime;

    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('Total time:', totalTime, 'ms');

    // Simulate the handler logic
    const isCorrect = result.correct;
    const points = isCorrect ? 20 : (result.hasKeywords ? 10 : 0);
    console.log('\nHandler would give:');
    console.log('  isCorrect:', isCorrect);
    console.log('  points:', points);
    console.log('  state cleared:', isCorrect || points > 0);
}

main();
