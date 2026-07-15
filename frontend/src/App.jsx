import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Form, Input, Select, Button, Card } from 'antd';
import axios from 'axios';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthBar from './components/AuthBar';
import QuizDemo from './components/QuizDemo';

const { Option } = Select;

const GIO_SINH = [
{ value: 0, label: "Tý (23h - 01h)" },
{ value: 1, label: "Sửu (01h - 03h)" },
{ value: 2, label: "Dần (03h - 05h)" },
{ value: 3, label: "Mão (05h - 07h)" },
{ value: 4, label: "Thìn (07h - 09h)" },
{ value: 5, label: "Tỵ (09h - 11h)" },
{ value: 6, label: "Ngọ (11h - 13h)" },
{ value: 7, label: "Mùi (13h - 15h)" },
{ value: 8, label: "Thân (15h - 17h)" },
{ value: 9, label: "Dậu (17h - 19h)" },
{ value: 10, label: "Tuất (19h - 21h)" },
{ value: 11, label: "Hợi (21h - 23h)" }
];

// Vị trí lưới 4x4 — khớp 1:1 với gridCellClass()/CELL_POS trong script.js gốc
const CUNG_VITRI = [
{ id: 'dan', label: 'Dần', gridArea: '4 / 1' },
{ id: 'mao', label: 'Mão', gridArea: '3 / 1' },
{ id: 'thin', label: 'Thìn', gridArea: '2 / 1' },
{ id: 'ty_chi', label: 'Tỵ', gridArea: '1 / 1' },
{ id: 'ngo', label: 'Ngọ', gridArea: '1 / 2' },
{ id: 'mui', label: 'Mùi', gridArea: '1 / 3' },
{ id: 'than', label: 'Thân', gridArea: '1 / 4' },
{ id: 'dau', label: 'Dậu', gridArea: '2 / 4' },
{ id: 'tuat', label: 'Tuất', gridArea: '3 / 4' },
{ id: 'hoi', label: 'Hợi', gridArea: '4 / 4' },
{ id: 'ty', label: 'Tý', gridArea: '4 / 3' },
{ id: 'suu', label: 'Sửu', gridArea: '4 / 2' }
];

// Phân loại kiểu sao phụ -> class CSS hiển thị (7 nhóm, đúng như script.js phân loại khi render)
const PHU_TINH_CLASS = {
'cat-lon': 'sao-cat-tinh-lon',
'cat-nho': 'sao-cat-tinh-nho',
'hung': 'sao-hung-tinh',
'tuhoa': 'sao-tu-hoa-tinh',
'truongsinh': 'sao-trang-sinh',
'tuan': 'sao-tuan',
'triet': 'sao-triet'
};

// ---------------------------------------------------------------------------
// Toạ độ điểm neo (%) nằm trên viền ô Thông Tin Trung Tâm — chuyển thể 1:1 từ
// CELL_ANCHOR trong script.js gốc, nhưng suy ra tổng quát từ gridArea "row / col"
// của từng cung (thay vì bảng tra cứu cố định theo tên ô c1..c16), để không phải
// định nghĩa lại toạ độ thủ công mỗi khi CUNG_VITRI thay đổi.
// Quy tắc: ô góc -> góc ô trung tâm gần nhất; ô cạnh -> điểm giữa cạnh ô trung
// tâm đối diện. Nhờ vậy đường nối luôn nằm gọn trong viền ô trung tâm.
// ---------------------------------------------------------------------------
function anchorPointForGridArea(gridArea) {
  const [rowStr, colStr] = gridArea.split('/').map(s => s.trim());
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);
  const colToX = (c) => (c === 1 ? 25 : c === 2 ? 37.5 : c === 3 ? 62.5 : 75);
  const rowToY = (r) => (r === 2 ? 37.5 : 62.5);
  if (row === 1) return { x: colToX(col), y: 25 };
  if (row === 4) return { x: colToX(col), y: 75 };
  if (col === 1) return { x: 25, y: rowToY(row) };
  return { x: 75, y: rowToY(row) }; // col === 4
}

// ---------------------------------------------------------------------------
// Nạp html2canvas qua CDN (giữ đúng cách làm của script.js gốc) — chỉ tải 1 lần,
// dùng chung cho tính năng "Xuất ảnh lá số chống vỡ layout mobile" + "Tải ảnh".
// ---------------------------------------------------------------------------
let _html2canvasLoading = null;
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (_html2canvasLoading) return _html2canvasLoading;
  _html2canvasLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => reject(new Error('Không tải được thư viện xuất ảnh.'));
    document.head.appendChild(s);
  });
  return _html2canvasLoading;
}

const EXPORT_WIDTH = 780; // Chiều rộng cố định kiểu desktop dùng khi chụp ảnh, để ảnh xuất ra không bao giờ bị vỡ trên mobile

function AppContent() {
const { user } = useAuth();
const [showQuiz, setShowQuiz] = useState(false);
const [loading, setLoading] = useState(false);
const [chartData, setChartData] = useState(null);
const [error, setError] = useState('');

// ----- State phục vụ xuất ảnh lá số -----
const [chartImgUrl, setChartImgUrl] = useState(null);   // data URL PNG của lá số sau khi chụp
const [viewMode, setViewMode] = useState('interactive'); // 'interactive' | 'image'
const [exporting, setExporting] = useState(false);
const [exportError, setExportError] = useState('');

const gridRef = useRef(null); // tham chiếu tới lưới 4x4 đang hiển thị, dùng làm nguồn để chụp ảnh

const onFinish = async (values) => {
  setLoading(true);
  setError('');
  setChartImgUrl(null);
  setViewMode('interactive');
  try {
    const response = await axios.post('http://localhost:5000/api/an-la-so', values);
    if (response.data.success) {
      setChartData(response.data.data);
    } else {
      setError(response.data.message || 'Không thể an lá số.');
    }
  } catch (err) {
    console.error("Lỗi kết nối API:", err);
    setError(err.response?.data?.message || 'Không thể kết nối tới Backend!');
  } finally {
    setLoading(false);
  }
};

// ---------------------------------------------------------------------------
// Tính toạ độ 3 đường nối: Mệnh -> Tài Bạch, Mệnh -> Quan Lộc, Mệnh -> Thiên Di.
// Chuyển thể trực tiếp từ đoạn "coordinates.menh/tai/quan/di" + svgLines trong
// script.js gốc (dùng CELL_ANCHOR cho cả điểm đầu lẫn điểm cuối).
// ---------------------------------------------------------------------------
const lineCoords = useMemo(() => {
  if (!chartData) return null;
  const findAnchor = (tenCung) => {
    const cungBackend = chartData.cungData.find(c => c.tenCung === tenCung);
    if (!cungBackend) return null;
    const vitri = CUNG_VITRI.find(v => v.label === cungBackend.label);
    if (!vitri) return null;
    return anchorPointForGridArea(vitri.gridArea);
  };
  return {
    menh: findAnchor('MỆNH'),
    tai: findAnchor('TÀI BẠCH'),
    quan: findAnchor('QUAN LỘC'),
    di: findAnchor('THIÊN DI'),
  };
}, [chartData]);

// ---------------------------------------------------------------------------
// Xuất lưới lá số đang hiển thị thành ảnh PNG. Mấu chốt (giữ đúng như script.js
// gốc): KHÔNG chụp trực tiếp phần tử đang hiển thị (nó có thể bị CSS responsive
// co nhỏ lại trên mobile), mà tạo bản sao (clone) đặt ra ngoài khung nhìn với
// chiều rộng cố định bằng bản desktop (EXPORT_WIDTH), rồi mới dùng html2canvas
// chụp bản sao đó. Nhờ vậy ảnh luôn có bố cục chuẩn desktop, không bị vỡ.
// ---------------------------------------------------------------------------
async function exportChartToImage() {
  if (!gridRef.current) return null;
  setExporting(true);
  setExportError('');
  let clone = null;
  try {
    await loadHtml2Canvas();

    clone = gridRef.current.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '-99999px';
    clone.style.transform = 'none';
    clone.style.width = EXPORT_WIDTH + 'px';
    clone.style.maxWidth = EXPORT_WIDTH + 'px';
    clone.style.margin = '0';
    clone.style.zIndex = '-1';
    clone.style.display = 'grid';
    document.body.appendChild(clone);

    // Đợi 2 khung hình để trình duyệt kịp layout bản sao trước khi chụp
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await window.html2canvas(clone, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: EXPORT_WIDTH,
      windowWidth: 1200
    });

    const dataUrl = canvas.toDataURL('image/png');
    setChartImgUrl(dataUrl);
    return dataUrl;
  } catch (e) {
    console.error('Lỗi xuất ảnh lá số:', e);
    setExportError('Không thể tạo ảnh: ' + (e && e.message ? e.message : 'lỗi không xác định'));
    return null;
  } finally {
    if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
    setExporting(false);
  }
}

// Tự động xuất ảnh ngay khi có lá số mới, để nút "Tải ảnh" luôn sẵn sàng dùng ngay
useEffect(() => {
  if (chartData) {
    exportChartToImage();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [chartData]);

async function handleDownloadImage() {
  let url = chartImgUrl;
  if (!url) {
    url = await exportChartToImage();
    if (!url) return;
  }
  const rawName = (chartData?.name || 'la-so-tu-vi').trim();
  const safeName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'la-so-tu-vi';
  const a = document.createElement('a');
  a.href = url;
  a.download = `laso_${safeName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

return (
  <div style={{ padding: '40px 20px', background: '#12141c', minHeight: '100vh', color: '#e9e3d2', position: 'relative' }}>
    <AuthBar />

    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <h1 style={{ color: '#c9a24b', fontSize: '32px', fontFamily: 'serif' }}>TỬ VI GIÁC NGỘ</h1>
      <p style={{ color: '#a79c82' }}>Hệ thống an sao tự động - Phiên bản Client-Server</p>

      {/* Nút chuyển đổi giữa Lập lá số và Bài trắc nghiệm mẫu */}
      <div style={{ marginTop: '10px' }}>
        <Button
          type={!showQuiz ? 'primary' : 'default'}
          onClick={() => setShowQuiz(false)}
          style={!showQuiz ? { background: '#c9a24b', borderColor: '#c9a24b', marginRight: 8 } : { marginRight: 8 }}
        >
          🔮 Lập lá số
        </Button>
        <Button
          type={showQuiz ? 'primary' : 'default'}
          onClick={() => setShowQuiz(true)}
          style={showQuiz ? { background: '#c9a24b', borderColor: '#c9a24b' } : {}}
        >
          📝 Bài trắc nghiệm mẫu
        </Button>
      </div>
    </div>

    {showQuiz ? (
      <QuizDemo />
    ) : (
    <div className="lapla-wrap">
      <div className="lapla-form">
        <Card style={{ background: '#1c2131', borderColor: '#33395083' }}>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item label={<span style={{color: '#a79c82'}}>Họ và tên</span>} name="name" rules={[{ required: true, message: 'Nhập tên!' }]}>
              <Input placeholder="Lê Duy Linh" style={{ background: '#12141c', color: '#fff', border: '1px solid #333950' }} />
            </Form.Item>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Form.Item label={<span style={{color: '#a79c82'}}>Giới tính</span>} name="gender" initialValue="nam" style={{ flex: 1 }}>
                <Select dropdownStyle={{ background: '#1c2131' }}>
                  <Option value="nam">Nam</Option>
                  <Option value="nu">Nữ</Option>
                </Select>
              </Form.Item>

              <Form.Item label={<span style={{color: '#a79c82'}}>Loại lịch</span>} name="calendarType" initialValue="solan" style={{ flex: 1 }}>
                <Select dropdownStyle={{ background: '#1c2131' }}>
                  <Option value="solan">Dương Lịch</Option>
                  <Option value="lunar">Âm Lịch</Option>
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Form.Item label={<span style={{color: '#a79c82'}}>Giờ sinh</span>} name="hour" initialValue={0} style={{ flex: 1 }}>
                <Select dropdownStyle={{ background: '#1c2131' }}>
                  {GIO_SINH.map(gio => <Option key={gio.value} value={gio.value}>{gio.label}</Option>)}
                </Select>
              </Form.Item>

              <Form.Item label={<span style={{color: '#a79c82'}}>Ngày</span>} name="day" initialValue="9" style={{ width: '60px' }}>
                <Input style={{ background: '#12141c', color: '#fff' }} />
              </Form.Item>
              <Form.Item label={<span style={{color: '#a79c82'}}>Tháng</span>} name="month" initialValue="12" style={{ width: '60px' }}>
                <Input style={{ background: '#12141c', color: '#fff' }} />
              </Form.Item>
              <Form.Item label={<span style={{color: '#a79c82'}}>Năm</span>} name="year" initialValue="1995" style={{ width: '80px' }}>
                <Input style={{ background: '#12141c', color: '#fff' }} />
              </Form.Item>
            </div>

            <Button type="primary" htmlType="submit" loading={loading} block style={{ background: '#c9a24b', borderColor: '#c9a24b', color: '#12141c', fontWeight: 'bold', marginTop: '10px' }}>
              An Lá Số
            </Button>

            {error && <div style={{ color: '#e63946', marginTop: '10px', fontSize: '13px' }}>{error}</div>}
          </Form>
        </Card>
      </div>

      {chartData && (
        <div className="chart-wrap">

          {/* Thanh hành động: chuyển đổi xem dạng ảnh / tương tác + tải ảnh */}
          <div className="chart-actions">
            <button
              type="button"
              className="chart-action-btn"
              onClick={() => setViewMode(m => m === 'interactive' ? 'image' : 'interactive')}
              disabled={viewMode === 'image' && !chartImgUrl}
            >
              {viewMode === 'interactive' ? '🖼️ Xem dạng ảnh (chống vỡ)' : '🔄 Xem dạng tương tác'}
            </button>
            <button
              type="button"
              className="chart-action-btn primary"
              onClick={handleDownloadImage}
              disabled={exporting}
            >
              {exporting ? 'Đang tạo ảnh...' : '📥 Tải ảnh lá số'}
            </button>
          </div>
          {exportError && <div style={{ color: '#e63946', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>{exportError}</div>}

          {/* Chế độ ảnh tĩnh: hiển thị PNG đã chụp — không bao giờ vỡ layout trên mobile */}
          {viewMode === 'image' && chartImgUrl && (
            <img
              src={chartImgUrl}
              alt="Lá số Tử Vi"
              className="responsive-chart-img"
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
            />
          )}

          {/* Chế độ tương tác: lưới sống, luôn được render (kể cả khi đang ở chế độ ảnh)
              để làm nguồn chụp ảnh cho gridRef; ẩn khỏi mắt người dùng bằng style khi viewMode==='image' */}
          <div
            className="chart-grid"
            ref={gridRef}
            style={viewMode === 'image' ? { position: 'absolute', left: '-99999px', top: 0 } : undefined}
          >
            <div className="chart-center">
              <h3 style={{ marginTop: '5px', fontSize: '15px', color: '#231717', }}>Họ và Tên:{chartData.name.toUpperCase()}</h3>
              <h4  style={{ marginTop: '5px', fontSize: '15px', color: '#231717',  }}>{chartData.gender === 'nam' ? 'Nam Mệnh' : 'Nữ Mệnh'}</h4>

              <div style={{ marginTop: '5px', fontSize: '15px', color: '#231717',  }}>Cục mệnh: {chartData.cucTen}</div>

              <div style={{ marginTop: '10px', fontSize: '15px', color: '#231717', textAlign: 'center', lineHeight: '1.6' }}>
                {chartData.thongTinLich}
              </div>

          

              <div style={{ marginTop: '4px', fontSize: '14px', color: '#231717' }}>
                  Bản mệnh: {chartData.napAm?.name}({chartData.napAm?.el})
              </div>

              <div style={{ marginTop: '6px', fontSize: '15px',color: '#231717' }}>
                Kim Xà Thiết Tỏa:{' '}
                <b style={{ color: chartData.kimSa?.pham ? '#e63946' : '#2a9d8f' }}>
                  {chartData.kimSa?.chiTiet}
                </b>
              </div>
            </div>

            {CUNG_VITRI.map((cungVitri) => {
              const cungBackend = chartData.cungData.find(c => c.label === cungVitri.label);
              const isMenh = chartData.cungMenhLabel === cungVitri.label;
              const isThan = cungBackend?.laCungThan;

              return (
                <div key={cungVitri.id} className={`chart-cell ${isMenh ? 'is-menh' : ''} ${isThan ? 'is-than' : ''}`} style={{ gridArea: cungVitri.gridArea }}>

                  {/* HÀNG TRÊN: Địa chi, Can Chi của cung, Đại vận / Tiểu vận */}
                  <div className="cell-header">
                  <span className="cell-dv-tv">
                      {cungBackend ? `ĐV: ${cungBackend.daiVan} | TV: ${cungBackend.tieuVan}` : ''}
                    </span>
                    <span className="cell-chi">{isThan ? ' (Thân)' : ''}</span>
              
                  </div>

                  <div className="cell-cung">
                    {cungBackend ? cungBackend.tenCung : ''}
                  </div>

                  <div className="cell-saolist">
                    {cungBackend && (
                      <>
                        {/* Chính Tinh */}
                        <div className="chinh-tinh-group">
                          {cungBackend.chinhTinh.map((s, idx) => (
                            <div key={idx} className={`sao-chinh-tinh ${s.hanh ? `hanh-${s.hanh}` : ''}`}>
                              {s.name}
                            </div>
                          ))}
                        </div>

                  {/* Toàn bộ cấu trúc Phụ Tinh có bổ sung kiểm tra Tứ Hóa */}
                      <div className="cell-saolist">

                      {/* 1. Nhóm Phụ tinh đối lập (Cát tinh vs Sát tinh) */}
                      <div className="wrap-phu-tinh-doi-lap">
                        
                        {/* Cột Cát Tinh: Bao gồm cat-lon, cat-nho VÀ các Hóa tốt (Lộc, Quyền, Khoa) */}
                        <div className="col-cat-tinh">
                          {cungBackend.phuTinh
                            .filter(s => 
                              s.kieu === 'cat-lon' || 
                              s.kieu === 'cat-nho' || 
                              (s.kieu === 'tuhoa' && s.name !== 'Hóa Kỵ') || // Nếu API đặt kieu là tuhoa
                              ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa'].includes(s.name) // Check trực tiếp theo tên sao cho chắc chắn
                            )
                            .map((s, idx) => (
                              <div key={`cat-${idx}`} className={`sao-phu-tinh ${PHU_TINH_CLASS[s.kieu] || 'sao-cat-tinh-nho'}`}>
                                {s.name}
                                </div>
                              ))
                            }
                          </div>

                          {/* Cột Sát Tinh / Hung Tinh: Bao gồm hung, sat VÀ Hóa Kỵ */}
                          <div className="col-sat-tinh">
                            {cungBackend.phuTinh
                              .filter(s => 
                                s.kieu === 'hung' || 
                                s.kieu === 'sat' || 
                                s.name === 'Hóa Kỵ' // Đưa Hóa Kỵ vào nhóm sát tinh/hung tinh
                              )
                              .map((s, idx) => (
                                <div key={`sat-${idx}`} className={`sao-phu-tinh ${PHU_TINH_CLASS[s.kieu] || 'sao-sat-tinh-nho'}`}>
                                  {s.name}
                                </div>
                              ))
                            }
                          </div>

                        </div>

                        {/* 2. Vòng Trường Sinh */}
                        <div className="wrap-truong-sinh">
                          {cungBackend.phuTinh
                            .filter(s => s.kieu === 'truongsinh')
                            .map((s, idx) => (
                              <div key={`ts-${idx}`} className={`sao-truong-sinh ${PHU_TINH_CLASS[s.kieu] || ''}`}>
                                {s.name}
                              </div>
                            ))
                          }
                        </div>

                        {/* 3. Tuần / Triệt */}
                        <div className="wrap-tuan-triet">
                          {cungBackend.phuTinh
                            .filter(s => s.kieu === 'tuan' || s.kieu === 'triet')
                            .map((s, idx) => (
                              <div key={`tt-${idx}`} className={`sao-tuan-triet ${PHU_TINH_CLASS[s.kieu] || ''}`}>
                                {s.name}
                              </div>
                            ))
                          }
                        </div>

                        </div>
                        
                      </>
                    )}
                  </div>

                  {/* HÀNG DƯỚI: Can Chi của cung */}
                  <div className="cell-canchi">
                    {cungBackend ? cungBackend.canChi : ''}
                  </div>

                </div>
              );
            })}

            {/* Yêu cầu: Vẽ 3 đường liên kết từ Mệnh đến Tài Bạch, Quan Lộc, Thiên Di.
                Dùng anchorPointForGridArea (điểm trên viền ô trung tâm) cho cả điểm
                đầu lẫn điểm cuối, nên toàn bộ đoạn thẳng luôn nằm gọn trong ô trung tâm. */}
            {lineCoords?.menh && (
              <svg
                className="chart-svg-overlay"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20, overflow: 'visible' }}
              >
                {lineCoords.tai && (
                  <line x1={`${lineCoords.menh.x}%`} y1={`${lineCoords.menh.y}%`} x2={`${lineCoords.tai.x}%`} y2={`${lineCoords.tai.y}%`} stroke="#a79c82" strokeWidth="1.5" strokeDasharray="4,4" />
                )}
                {lineCoords.quan && (
                  <line x1={`${lineCoords.menh.x}%`} y1={`${lineCoords.menh.y}%`} x2={`${lineCoords.quan.x}%`} y2={`${lineCoords.quan.y}%`} stroke="#a79c82" strokeWidth="1.5" strokeDasharray="4,4" />
                )}
                {lineCoords.di && (
                  <line x1={`${lineCoords.menh.x}%`} y1={`${lineCoords.menh.y}%`} x2={`${lineCoords.di.x}%`} y2={`${lineCoords.di.y}%`} stroke="#a79c82" strokeWidth="1.5" strokeDasharray="4,4" />
                )}
              </svg>
            )}
          </div>

        </div>
      )}
    </div>
    )}
  </div>
);
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

