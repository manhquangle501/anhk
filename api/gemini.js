export const config = {
    runtime: 'edge', 
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const { contents, systemInstruction } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Missing API Key on Vercel' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Đã cập nhật sang thế hệ model 3.5 mới nhất của Google để tránh lỗi 404 Deprecated
        const model = 'gemini-3.5-flash';
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, systemInstruction })
        });

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({ error: data.error?.message || 'Lỗi từ Gemini API' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}