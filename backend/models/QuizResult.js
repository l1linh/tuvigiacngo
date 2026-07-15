// backend/models/QuizResult.js
const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: String, required: true }, // mã bài trắc nghiệm, cho phép sau này có nhiều bài khác nhau
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    answers: { type: Array, default: [] }, // lưu lại đáp án đã chọn, để sau này có thể hiện lại bài làm
  },
  { timestamps: true }
);

// Mỗi user chỉ có 1 kết quả cho mỗi quizId — làm lại thì ghi đè (upsert), không tạo bản ghi mới
quizResultSchema.index({ userId: 1, quizId: 1 }, { unique: true });

module.exports = mongoose.model('QuizResult', quizResultSchema);
