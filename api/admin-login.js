export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { password } = req.body;
        // Lấy mật khẩu ẩn từ biến ADMIN_PASSWORD trên Vercel
        const REAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (password === REAL_ADMIN_PASSWORD) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(401).json({ success: false, message: 'Mật khẩu Admin không chính xác!' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống máy chủ' });
    }
}