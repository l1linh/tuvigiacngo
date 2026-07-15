// backend/server.js
const express = require('express');
const cors = require('cors');
const { khoiTaoLaSo } = require('./tuvi');

const app = express();
const PORT = 5000;

// Cấu hình Middleware
app.use(cors());
app.use(express.json()); // Phân tích dữ liệu JSON từ request body

// API an lá số tử vi
app.post('/api/an-la-so', (req, res, next) => {
  try {
    // 1. Kiểm tra request body có tồn tại không
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Không nhận được dữ liệu yêu cầu (Request body is empty)!"
      });
    }

    const { name, gender, calendarType, day, month, year, hour } = req.body;

    // 2. Ép kiểu dữ liệu và kiểm tra tính hợp lệ ban đầu
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

    // 3. Thực hiện khởi tạo lá số
    const dataLaSo = khoiTaoLaSo(name, gender, calendarType, d, m, y, hourChiIndex);
    
    // 4. Trả kết quả về cho Client
    return res.json({
      success: true,
      data: dataLaSo
    });

  } catch (error) {
    // Nếu có bất cứ lỗi nào xảy ra trong quá trình tính toán, chuyển tiếp tới Error Handler
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