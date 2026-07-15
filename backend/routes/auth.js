// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');

function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function toUserData(user) {
  return { id: user._id, username: user.username, name: user.name };
}

// ===== ĐĂNG KÝ =====
router.post('/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và tên hiển thị!',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự!',
      });
    }

    const existed = await User.findOne({ username: username.toLowerCase() });
    if (existed) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập đã được sử dụng, vui lòng chọn tên khác!',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
    });

    const token = generateToken(newUser);
    res.json({ success: true, token, user: toUserData(newUser) });
  } catch (error) {
    console.error('💥 [Register] Lỗi:', error);
    res.status(500).json({ success: false, message: 'Đăng ký thất bại, vui lòng thử lại!', error: error.message });
  }
});

// ===== ĐĂNG NHẬP =====
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu!' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng!' });
    }

    const token = generateToken(user);
    res.json({ success: true, token, user: toUserData(user) });
  } catch (error) {
    console.error('💥 [Login] Lỗi:', error);
    res.status(500).json({ success: false, message: 'Đăng nhập thất bại, vui lòng thử lại!', error: error.message });
  }
});

// ===== LẤY THÔNG TIN USER HIỆN TẠI =====
router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = router;
