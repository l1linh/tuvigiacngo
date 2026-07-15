// frontend/src/components/QuizDemo.jsx
import React, { useState, useEffect } from 'react';
import { Card, Radio, Button, message, Spin } from 'antd';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000';

export default function QuizDemo() {
  const { user, token } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [result, setResult] = useState(null); // { score, total }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const [qRes, resultRes] = await Promise.all([
        axios.get(`${API_URL}/api/quiz/questions`, authHeader),
        axios.get(`${API_URL}/api/quiz/my-result`, authHeader),
      ]);
      setQuestions(qRes.data.data);
      if (resultRes.data.data) {
        setResult(resultRes.data.data); // đã làm trước đó rồi -> hiện điểm cũ luôn
      }
    } catch (err) {
      message.error('Không tải được bài trắc nghiệm!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      message.warning('Bạn chưa trả lời hết các câu hỏi!');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([id, selectedIndex]) => ({
          id: Number(id),
          selectedIndex,
        })),
      };
      const res = await axios.post(`${API_URL}/api/quiz/submit`, payload, authHeader);
      if (res.data.success) {
        setResult({ score: res.data.score, total: res.data.total });
        message.success('Đã chấm điểm xong!');
      }
    } catch (err) {
      message.error('Nộp bài thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
  };

  if (!user) {
    return (
      <Card style={{ maxWidth: 600, margin: '30px auto', textAlign: 'center' }}>
        <p>Bạn cần <b>đăng nhập</b> để làm bài trắc nghiệm.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card
      title="📝 Bài trắc nghiệm Tử Vi cơ bản (mẫu)"
      style={{ maxWidth: 600, margin: '30px auto', background: '#1c2131', borderColor: '#33395083', color: '#e9e3d2' }}
      headStyle={{ color: '#e6c877' }}
    >
      {result ? (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#e6c877' }}>
            Điểm của bạn: {result.score} / {result.total}
          </h2>
          <p style={{ color: '#a79c82' }}>
            Kết quả này được lưu lại — lần sau đăng nhập vào vẫn thấy điểm này.
          </p>
          <Button onClick={handleRetry}>Làm lại bài</Button>
        </div>
      ) : (
        <>
          {questions.map((q, idx) => (
            <div key={q.id} style={{ marginBottom: 20 }}>
              <p style={{ color: '#e9e3d2', fontWeight: 600 }}>
                Câu {idx + 1}: {q.question}
              </p>
              <Radio.Group
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                value={answers[q.id]}
              >
                {q.options.map((opt, optIdx) => (
                  <Radio key={optIdx} value={optIdx} style={{ display: 'block', color: '#e9e3d2', marginBottom: 4 }}>
                    {opt}
                  </Radio>
                ))}
              </Radio.Group>
            </div>
          ))}

          <Button
            type="primary"
            block
            loading={submitting}
            onClick={handleSubmit}
            style={{ background: '#c9a24b', borderColor: '#c9a24b', fontWeight: 'bold' }}
          >
            Nộp bài
          </Button>
        </>
      )}
    </Card>
  );
}
