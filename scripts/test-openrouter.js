require('dotenv').config();
const axios = require('axios');

async function main() {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    console.log('API Key:', apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET');

    if (!apiKey) {
        console.log('ERROR: No API key!');
        return;
    }

    try {
        console.log('Testing OpenRouter API...');
        const start = Date.now();
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'anthropic/claude-haiku-4.5',
                messages: [{ role: 'user', content: 'Say "OK" in one word' }],
                max_tokens: 10,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://proficienthai.vercel.app',
                    'X-Title': 'ProficienThAI',
                },
                timeout: 15000,
            }
        );
        const elapsed = Date.now() - start;
        console.log('SUCCESS in', elapsed, 'ms');
        console.log('Response:', response.data.choices[0]?.message?.content);
        console.log('Model:', response.data.model);
        console.log('Usage:', response.data.usage);
    } catch (error) {
        console.error('FAILED:', error.response?.status, error.response?.data || error.message);
    }
}
main();
