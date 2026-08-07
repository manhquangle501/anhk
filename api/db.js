export const config = {
    runtime: 'edge', 
};

export default async function handler(req) {
    // Vercel sẽ tự đọc chìa khóa từ máy chủ thông qua process.env
    const KV_REST_API_URL = process.env.KV_REST_API_URL;
    const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
        return new Response(JSON.stringify({ error: 'Chưa kết nối được Database' }), { status: 500 });
    }

    // 1. Xử lý lấy dữ liệu từ Database về Web (GET)
    if (req.method === 'GET') {
        try {
            const fetchKV = async (key) => {
                const res = await fetch(`${KV_REST_API_URL}/get/${key}`, {
                    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
                });
                const json = await res.json();
                return json.result ? JSON.parse(json.result) : null;
            };

            const [schedules, users, courseDb] = await Promise.all([
                fetchKV('sys_schedules'),
                fetchKV('sys_users'),
                fetchKV('sys_coursedb')
            ]);

            return new Response(JSON.stringify({ schedules, users, courseDb }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Lỗi đọc Database' }), { status: 500 });
        }
    }

    // 2. Xử lý lưu dữ liệu từ Web lên Database (POST)
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            const { key, value } = body;
            
            await fetch(`${KV_REST_API_URL}/set/${key}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${KV_REST_API_TOKEN}`,
                },
                body: JSON.stringify(value)
            });
            
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' }});
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Lỗi ghi Database' }), { status: 500 });
        }
    }

    return new Response('Method not allowed', { status: 405 });
}