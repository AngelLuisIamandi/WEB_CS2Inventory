export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { password } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

    if (password === ADMIN_PASSWORD) {
        return res.status(200).json({ success: true });
    } else {
        return res.status(401).json({ success: false, message: 'Invalid password' });
    }
}
