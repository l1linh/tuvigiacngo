// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const { khoiTaoLaSo } = require('./tuvi');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình Middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("❌ Lỗi: Chưa cấu hình MONGODB_URI trong file .env!");
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log('🔌 [Database] Kết nối thành công tới MongoDB!'))
    .catch((err) => console.error('💥 [Database] Lỗi kết nối dữ liệu:', err));
}

// Routes đăng ký/đăng nhập + trắc nghiệm
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

// API an lá số tử vi (giữ nguyên như cũ)
app.post('/api/an-la-so', (req, res, next) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Không nhận được dữ liệu yêu cầu (Request body is empty)!"
      });
    }

    const { name, gender, calendarType, day, month, year, hour } = req.body;

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const hourChiIndex = parseInt(hour, 10);

    if (isNaN(d) || isNaN(m) || isNaN(y)) {
      return res.status(400).json({
        success: false,
        message: "Ngày, tháng hoặc năm sinh không hợp lệ. Vui lòng kiểm tra lại!"
      });
    }

    if (isNaN(hourChiIndex) || hourChiIndex < 0 || hourChiIndex > 11) {
      return res.status(400).json({
        success: false,
        message: "Giờ sinh không hợp lệ. Vui lòng chọn lại đúng giờ từ Tý đến Hợi!"
      });
    }

    const dataLaSo = khoiTaoLaSo(name, gender, calendarType, d, m, y, hourChiIndex);

    return res.json({
      success: true,
      data: dataLaSo
    });

  } catch (error) {
    next(error);
  }
});

// Middleware xử lý khi gọi sai API (404 Not Found)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Đường dẫn API [${req.method}] ${req.originalUrl} không tồn tại trên hệ thống!`
  });
});

// Middleware xử lý lỗi toàn cục (Global Error Handler)
app.use((err, req, res, next) => {
  console.error("💥 LỖI BACKEND CHI TIẾT:", err.stack || err);
  res.status(500).json({
    success: false,
    message: "Hệ thống tính toán lá số gặp sự cố!",
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log(`[Backend] Server đang chạy ổn định tại: http://localhost:${PORT}`);
});
