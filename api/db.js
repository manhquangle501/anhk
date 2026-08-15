import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const schedules = await kv.get('sys_schedules') || [];
            const users = await kv.get('sys_users') || [];
            const courseDb = await kv.get('sys_coursedb') || {};
            return res.status(200).json({ schedules, users, courseDb });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'POST') {
        const payload = req.body;

        try {
            // [MỚI] 1. Action: Lưu điểm thi cá nhân rẽ nhánh (Chống xung đột)
            if (payload.action === 'UPDATE_USER_HISTORY') {
                let users = await kv.get('sys_users') || [];
                let userIndex = users.findIndex(u => u.email === payload.email);
                
                if (userIndex > -1) {
                    if (!users[userIndex].history) users[userIndex].history = [];
                    users[userIndex].history.push(payload.record);
                    await kv.set('sys_users', users);
                    return res.status(200).json({ success: true, message: "Lưu điểm cá nhân thành công!" });
                }
                return res.status(404).json({ success: false, message: "Không tìm thấy User" });
            }

            // [MỚI] 2. Action: Lưu phiên đăng nhập & Thời gian rẽ nhánh (Chống xung đột)
            if (payload.action === 'UPDATE_LOGIN') {
                let users = await kv.get('sys_users') || [];
                let userIndex = users.findIndex(u => u.email === payload.email);
                
                if (userIndex > -1) {
                    users[userIndex].loginCount = (users[userIndex].loginCount || 0) + 1;
                    users[userIndex].lastLogin = payload.lastLogin;
                    users[userIndex].sessionToken = payload.sessionToken;
                    await kv.set('sys_users', users);
                    return res.status(200).json({ success: true, message: "Cập nhật đăng nhập thành công!" });
                }
                return res.status(404).json({ success: false, message: "Không tìm thấy User" });
            }

            // 3. Cơ chế mặc định: Lưu đè cả mảng (Dành cho Admin khi sửa Bài giảng / Môn học)
            if (payload.key && payload.value) {
                await kv.set(payload.key, payload.value);
                return res.status(200).json({ success: true });
            }

            return res.status(400).json({ success: false, message: 'Sai định dạng payload' });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
    
    return res.status(405).json({ message: 'Method Not Allowed' });
}