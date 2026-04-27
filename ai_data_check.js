/**
 * Optional post-scrape audit using an OpenAI-compatible Chat API.
 * Set OPENAI_API_KEY in .env. Does not run if the key is missing.
 *
 * This only reviews JSON you already scraped — it does not drive the browser or bypass CAPTCHA/OTP.
 */

require('dotenv').config();

const MAX_PAYLOAD_CHARS = 70000;

function buildPayload(vehicleNo, allData) {
    const json = JSON.stringify(allData, null, 2);
    const truncated = json.length > MAX_PAYLOAD_CHARS;
    const body = truncated ? json.slice(0, MAX_PAYLOAD_CHARS) + '\n…[truncated]' : json;
    return { text: `Vehicle number: ${vehicleNo}\n\nScraped JSON:\n${body}`, truncated };
}

async function auditScrapedData(vehicleNo, allData) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
        return { skipped: true, reason: 'OPENAI_API_KEY not set' };
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const { text: userContent, truncated } = buildPayload(vehicleNo, allData);

    const system = [
        'You are an expert at parsing Indian VAHAN portal data. Your goal is to extract specific fields from raw scraped JSON data.',
        'Always return your response in PURE JSON format. Do not include any markdown or extra text.',
        'Extract the following fields:',
        'owner_name, registration_date, chassis_no, engine_no, vehicle_class, fuel_type, fitness_upto, insurance_upto, pucc_upto, mv_tax_upto, maker_model.',
        'If a field is not found, use null. For dates, use the exact string found in the data (e.g. "12-Jan-2025").',
        'If multiple owner names are found, use the current/latest one.'
    ].join(' ');

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: userContent },
            ],
        }),
    });

    const raw = await res.text();
    if (!res.ok) {
        return { error: true, status: res.status, detail: raw.slice(0, 500) };
    }

    let parsed;
    try {
        const responseJson = JSON.parse(raw);
        const aiResponse = responseJson.choices?.[0]?.message?.content;
        parsed = JSON.parse(aiResponse);
    } catch (e) {
        return { error: true, detail: 'Failed to parse AI response as JSON: ' + e.message };
    }

    return { ok: true, data: parsed, model, truncated };
}

module.exports = { auditScrapedData };
