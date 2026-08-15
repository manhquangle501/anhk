import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 1. KHI TRÌNH DUYỆT TẢI LẠI TRANG (F5) - Lấy dữ liệu về
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

    // 2. KHI LƯU DỮ LIỆU LÊN MÁY CHỦ
    if (req.method === 'POST') {
        const payload = req.body;

        try {
            // [CHUẨN] Gộp 3 mảng lớn vào chung 1 lệnh để tránh bị Vercel chặn đứng
            if (payload.action === 'SAVE_ALL') {
                await kv.set('sys_schedules', payload.schedules);
                await kv.set('sys_users', payload.users);
                await kv.set('sys_coursedb', payload.courseDb);
                return res.status(200).json({ success: true, message: "Lưu toàn bộ lên Đám mây thành công!" });
            }

            // Lưu điểm thi cá nhân (Chống xung đột)
            if (payload.action === 'UPDATE_USER_HISTORY') {
                let users = await kv.get('sys_users') || [];
                let userIndex = users.findIndex(u => u.email === payload.email);
                
                if (userIndex > -1) {
                    if (!users[userIndex].history) users[userIndex].history = [];
                    users[userIndex].history.push(payload.record);
                    await kv.set('sys_users', users);
                    return res.status(200).json({ success: true });
                }
                return res.status(404).json({ success: false, message: "Không tìm thấy User" });
            }

            // Lưu lịch sử đăng nhập, token
            if (payload.action === 'UPDATE_LOGIN') {
                let users = await kv.get('sys_users') || [];
                let userIndex = users.findIndex(u => u.email === payload.email);
                
                if (userIndex > -1) {
                    users[userIndex].loginCount = (users[userIndex].loginCount || 0) + 1;
                    users[userIndex].lastLogin = payload.lastLogin;
                    users[userIndex].sessionToken = payload.sessionToken;
                    await kv.set('sys_users', users);
                    return res.status(200).json({ success: true });
                }
                return res.status(404).json({ success: false, message: "Không tìm thấy User" });
            }

            // Dự phòng: Lưu đè biến đơn lẻ
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