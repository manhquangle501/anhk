export default async function handler(req, res) {
    // 1. Lấy Chìa khóa kết nối từ Vercel (Tự động sinh ra khi bạn bấm Connect)
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    // Nếu chưa có chìa khóa, báo lỗi để Frontend biết đường xử lý
    if (!KV_URL || !KV_TOKEN) {
        return res.status(500).json({ error: "Vercel chưa nhận được chìa khóa Database KV" });
    }

    // HÀM ĐỌC DỮ LIỆU TRỰC TIẾP (Native Fetch - Không dùng thư viện)
    async function kvGet(key) {
        try {
            const response = await fetch(`${KV_URL}/get/${key}`, {
                headers: { Authorization: `Bearer ${KV_TOKEN}` }
            });
            const data = await response.json();
            if (data.result) { return JSON.parse(data.result); }
            return null;
        } catch (err) { return null; }
    }

    // HÀM LƯU DỮ LIỆU TRỰC TIẾP (Native Fetch - Không dùng thư viện)
    async function kvSet(key, value) {
        try {
            const response = await fetch(`${KV_URL}/set/${key}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${KV_TOKEN}` },
                body: JSON.stringify(value)
            });
            return await response.json();
        } catch (err) { return null; }
    }

    // ================= XỬ LÝ LỆNH TỪ GIAO DIỆN (HTML) =================

    // [GET] TẢI DỮ LIỆU KHI HỌC VIÊN F5 HOẶC MỞ WEB LÊN
    if (req.method === 'GET') {
        try {
            const schedules = await kvGet('sys_schedules') || [];
            const users = await kvGet('sys_users') || [];
            const courseDb = await kvGet('sys_coursedb') || {};
            return res.status(200).json({ schedules, users, courseDb });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // [POST] KHI CÓ NGƯỜI NHẬP ĐIỂM HOẶC ADMIN SỬA BÀI
    if (req.method === 'POST') {
        const payload = req.body;

        try {
            // [A] Gộp chung 1 chuyến xe khi Admin ấn Lưu bài giảng/Môn học
            if (payload.action === 'SAVE_ALL') {
                await kvSet('sys_schedules', payload.schedules);
                await kvSet('sys_users', payload.users);
                await kvSet('sys_coursedb', payload.courseDb);
                return res.status(200).json({ success: true, message: "Lưu Đám mây thành công!" });
            }

            // [B] Khi Học viên nộp bài -> Cập nhật lịch sử (chống xung đột)
            if (payload.action === 'UPDATE_USER_HISTORY') {
                let users = await kvGet('sys_users') || [];
                let userIndex = users.findIndex(u => u.email === payload.email);
                
                if (userIndex > -1) {
                    if (!users[userIndex].history) users[userIndex].history = [];
                    users[userIndex].history.push(payload.record);
                    await kvSet('sys_users', users);
                    return res.status(200).json({ success: true });
                }
                return res.status(404).json({ success: false, message: "Không tìm thấy User" });
            }

            // [C] Khi Học viên Đăng nhập -> Cập nhật token chống 1 tài khoản nhiều máy
            if (payload.action === 'UPDATE_LOGIN') {
                let users = await kvGet('sys_users') || [];
                let userIndex = users.findIndex(u => u.email === payload.email);
                
                if (userIndex > -1) {
                    users[userIndex].loginCount = (users[userIndex].loginCount || 0) + 1;
                    users[userIndex].lastLogin = payload.lastLogin;
                    users[userIndex].sessionToken = payload.sessionToken;
                    await kvSet('sys_users', users);
                    return res.status(200).json({ success: true });
                }
                return res.status(404).json({ success: false, message: "Không tìm thấy User" });
            }

            return res.status(400).json({ success: false, message: 'Sai định dạng lệnh gửi lên' });
        } catch (e) {
            return res.status(500).json({ success: false, error: e.message });
        }
    }
    
    return res.status(405).json({ message: 'Method Not Allowed' });
}