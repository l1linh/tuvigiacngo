// backend/routes/quiz.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const QuizResult = require('../models/QuizResult');

const QUIZ_ID = 'demo-tu-vi-1'; // mã bài trắc nghiệm mẫu — sau này có nhiều bài thì đặt mã khác nhau

// Ngân hàng câu hỏi mẫu — correctIndex CHỈ dùng ở server, không bao giờ gửi về client
const QUESTIONS = [
  {
    id: 1,
    question: 'Trong lá số Tử Vi, cung nào thể hiện bản chất và vận mệnh tổng quát của một người?',
    options: ['Cung Mệnh', 'Cung Tài Bạch', 'Cung Nô Bộc', 'Cung Điền Trạch'],
    correctIndex: 0,
  },
  {
    id: 2,
    question: 'Sao nào được coi là chính tinh quan trọng nhất trong 14 chính tinh?',
    options: ['Thiên Cơ', 'Tử Vi', 'Cự Môn', 'Thiên Lương'],
    correctIndex: 1,
  },
  {
    id: 3,
    question: 'Tứ Hóa trong Tử Vi gồm những gì?',
    options: [
      'Lộc, Quyền, Khoa, Kỵ',
      'Kim, Mộc, Thủy, Hỏa',
      'Xuân, Hạ, Thu, Đông',
      'Tý, Sửu, Dần, Mão',
    ],
    correctIndex: 0,
  },
  {
    id: 4,
    question: 'Vòng Trường Sinh có bao nhiêu giai đoạn?',
    options: ['8', '10', '12', '14'],
    correctIndex: 2,
  },
];

// ===== LẤY DANH SÁCH CÂU HỎI (ẩn đáp án đúng) =====
router.get('/questions', verifyToken, (req, res) => {
  const publicQuestions = QUESTIONS.map(({ id, question, options }) => ({ id, question, options }));
  res.json({ success: true, data: publicQuestions });
});

// ===== NỘP BÀI, CHẤM ĐIỂM, LƯU KẾT QUẢ =====
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { answers } = req.body; // dạng [{ id: 1, selectedIndex: 0 }, ...]

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu bài làm không hợp lệ!' });
    }

    let score = 0;
    QUESTIONS.forEach((q) => {
      const userAnswer = answers.find((a) => a.id === q.id);
      if (userAnswer && userAnswer.selectedIndex === q.correctIndex) {
        score += 1;
      }
    });

    const total = QUESTIONS.length;

    // Upsert: nếu user đã làm bài này rồi thì ghi đè kết quả mới nhất
    const result = await QuizResult.findOneAndUpdate(
      { userId: req.user.id, quizId: QUIZ_ID },
      { userId: req.user.id, quizId: QUIZ_ID, score, total, answers },
      { new: true, upsert: true }
    );

    res.json({ success: true, score: result.score, total: result.total });
  } catch (error) {
    console.error('💥 [Quiz Submit] Lỗi:', error);
    res.status(500).json({ success: false, message: 'Nộp bài thất bại, vui lòng thử lại!', error: error.message });
  }
});

// ===== LẤY KẾT QUẢ ĐÃ LÀM TRƯỚC ĐÓ (nếu có) =====
router.get('/my-result', verifyToken, async (req, res) => {
  try {
    const result = await QuizResult.findOne({ userId: req.user.id, quizId: QUIZ_ID });
    res.json({
      success: true,
      data: result ? { score: result.score, total: result.total, updatedAt: result.updatedAt } : null,
    });
  } catch (error) {
    console.error('💥 [Quiz My-Result] Lỗi:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy kết quả!', error: error.message });
  }
});

module.exports = router;
