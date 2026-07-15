// backend/tuvi.js
// Thuật toán an sao Tử Vi — chuyển thể 1:1 từ script.js (bản gốc client-side đã kiểm chứng)
// sang module Node.js, giữ nguyên toàn bộ công thức tính lịch âm dương và an sao.

/* ==================================================================
  1. CHUYỂN ĐỔI DƯƠNG LỊCH <-> ÂM LỊCH (thuật toán Hồ Ngọc Đức)
  ================================================================== */
function jdFromDate(dd, mm, yy) {
let a = Math.floor((14 - mm) / 12);
let y = yy + 4800 - a;
let m = mm + 12 * a - 3;
let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
if (jd < 2299161) {
  jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}
return jd;
}

function NewMoon(k) {
let T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = Math.PI / 180;
let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
let M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
let Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
let F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
let deltat = (T < -11) ?
  0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 :
  -0.000278 + 0.000265 * T + 0.000262 * T2;
return Jd1 + C1 - deltat;
}

function SunLongitude(jdn) {
let T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = Math.PI / 180;
let M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
let L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
let L = (L0 + DL) * dr;
L -= Math.PI * 2 * Math.floor(L / (Math.PI * 2));
return L;
}

function getSunLongitude(dayNumber, tz) { return Math.floor(SunLongitude(dayNumber - 0.5 - tz / 24) / Math.PI * 6); }
function getNewMoonDay(k, tz) { return Math.floor(NewMoon(k) + 0.5 + tz / 24); }

function getLunarMonth11(yy, tz) {
let off = jdFromDate(31, 12, yy) - 2415021;
let k = Math.floor(off / 29.530588853);
let nm = getNewMoonDay(k, tz);
if (getSunLongitude(nm, tz) >= 9) nm = getNewMoonDay(k - 1, tz);
return nm;
}

function getLeapMonthOffset(a11, tz) {
let k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
let last = 0, i = 1, arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
do {
  last = arc; i++;
  arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
} while (arc !== last && i < 14);
return i - 1;
}

function convertSolar2Lunar(dd, mm, yy, tz) {
let dayNumber = jdFromDate(dd, mm, yy);
let k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
let monthStart = getNewMoonDay(k + 1, tz);
if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);
let a11 = getLunarMonth11(yy, tz);
let b11 = a11, lunarYear;
if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy - 1, tz); }
else { lunarYear = yy + 1; b11 = getLunarMonth11(yy + 1, tz); }
let lunarDay = dayNumber - monthStart + 1;
let diff = Math.floor((monthStart - a11) / 29);
let lunarLeap = 0, lunarMonth = diff + 11;
if (b11 - a11 > 365) {
  let leapMonthDiff = getLeapMonthOffset(a11, tz);
  if (diff >= leapMonthDiff) { lunarMonth = diff + 10; if (diff === leapMonthDiff) lunarLeap = 1; }
}
if (lunarMonth > 12) lunarMonth -= 12;
if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
}

/* ==================================================================
  2. HẰNG SỐ
  ================================================================== */
const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const CUNG_NAMES = ["MỆNH", "PHỤ MẪU", "PHÚC ĐỨC", "ĐIỀN TRẠCH", "QUAN LỘC", "NÔ BỘC", "THIÊN DI", "TẬT ÁCH", "TÀI BẠCH", "TỬ TỨC", "PHU THÊ", "HUYNH ĐỆ"];

const NAP_AM = [
{ name: "Hải Trung Kim", el: "Kim" }, { name: "Lư Trung Hỏa", el: "Hỏa" }, { name: "Đại Lâm Mộc", el: "Mộc" },
{ name: "Lộ Bàng Thổ", el: "Thổ" }, { name: "Kiếm Phong Kim", el: "Kim" }, { name: "Sơn Đầu Hỏa", el: "Hỏa" },
{ name: "Giản Hạ Thủy", el: "Thủy" }, { name: "Thành Đầu Thổ", el: "Thổ" }, { name: "Bạch Lạp Kim", el: "Kim" },
{ name: "Dương Liễu Mộc", el: "Mộc" }, { name: "Tuyền Trung Thủy", el: "Thủy" }, { name: "Ốc Thượng Thổ", el: "Thổ" },
{ name: "Tích Lịch Hỏa", el: "Hỏa" }, { name: "Tùng Bách Mộc", el: "Mộc" }, { name: "Trường Lưu Thủy", el: "Thủy" },
{ name: "Sa Trung Kim", el: "Kim" }, { name: "Sơn Hạ Hỏa", el: "Hỏa" }, { name: "Bình Địa Mộc", el: "Mộc" },
{ name: "Bích Thượng Thổ", el: "Thổ" }, { name: "Kim Bạc Kim", el: "Kim" }, { name: "Phú Đăng Hỏa", el: "Hỏa" },
{ name: "Thiên Hà Thủy", el: "Thủy" }, { name: "Đại Trạch Thổ", el: "Thổ" }, { name: "Thoa Xuyến Kim", el: "Kim" },
{ name: "Tang Đố Mộc", el: "Mộc" }, { name: "Đại Khê Thủy", el: "Thủy" }, { name: "Sa Trung Thổ", el: "Thổ" },
{ name: "Thiên Thượng Hỏa", el: "Hỏa" }, { name: "Thạch Lựu Mộc", el: "Mộc" }, { name: "Đại Hải Thủy", el: "Thủy" },
];
const CUC_MAP = { "Thủy": "Thủy Nhị Cục (2)", "Mộc": "Mộc Tam Cục (3)", "Kim": "Kim Tứ Cục (4)", "Thổ": "Thổ Ngũ Cục (5)", "Hỏa": "Hỏa Lục Cục (6)" };
const MENH_Y = {
"Kim": "cứng cỏi, quyết đoán, đề cao nguyên tắc và danh dự.",
"Mộc": "hướng thiện, ưa phát triển, thích vun đắp và mở rộng.",
"Thủy": "linh hoạt, thích nghi tốt, giàu trực giác và cảm xúc.",
"Hỏa": "nhiệt huyết, bộc trực, có tinh thần dẫn dắt.",
"Thổ": "điềm đạm, chắc chắn, coi trọng sự ổn định lâu dài.",
};

const CHINH_TINH = ["TỬ VI", "LIÊM TRINH", "THIÊN ĐỒNG", "VŨ KHÚC", "THÁI DƯƠNG", "THIÊN CƠ", "THIÊN PHỦ", "THÁI ÂM", "THAM LANG", "CỰ MÔN", "THIÊN TƯỚNG", "THIÊN LƯƠNG", "THẤT SÁT", "PHÁ QUÂN"];

const CHINH_TINH_HANH = {
"TỬ VI": "tho", "THIÊN PHỦ": "tho",
"THIÊN CƠ": "moc", "THIÊN LƯƠNG": "moc",
"THÁI DƯƠNG": "hoa", "LIÊM TRINH": "hoa",
"VŨ KHÚC": "kim", "THẤT SÁT": "kim",
"THIÊN ĐỒNG": "thuy", "THÁI ÂM": "thuy", "THAM LANG": "thuy", "CỰ MÔN": "thuy", "THIÊN TƯỚNG": "thuy", "PHÁ QUÂN": "thuy"
};

// Danh sách phân loại phụ tinh (giữ đúng như cách script.js phân nhóm khi render)
const VONG_TRUONG_SINH_LIST = ["Trường Sinh", "Mộc Dục", "Quan Đới", "Lâm Quan", "Đế Vượng", "Suy", "Bệnh", "Tử", "Mộ", "Tuyệt", "Thai", "Dưỡng"];
const TU_HOA_LIST = ["Hóa Lộc", "Hóa Quyền", "Hóa Khoa", "Hóa Kỵ"];
const SAT_TINH_LIST = ["Kình Dương", "Đà La", "Địa Không", "Địa Kiếp", "Hỏa Tinh", "Linh Tinh", "Thiên Hình", "Thiên Không", "Hóa Kỵ", "Kiếp Sát", "Phá Toái", "Đại Hao", "Tiểu Hao", "Tuế Phá"];
const CAT_TINH_LON_LIST = ["Lộc Tồn", "Thiên Khôi", "Thiên Việt", "Văn Xương", "Văn Khúc", "Tả Phù", "Hữu Bật", "Thiên Mã", "Thiên Quan", "Thiên Phúc", "L.N.V Tinh"];

/* ==================================================================
  3. CÁC HÀM CAN CHI / NẠP ÂM / AN TỬ VI
  ================================================================== */
function canChiOfYear(y) { return { can: (y + 6) % 10, chi: (y + 8) % 12 }; }
function canDanOfYear(yearCanIdx) { return (2 * (yearCanIdx % 5) + 2) % 10; }
function canOfChi(yearCanIdx, chiIdx) {
const canDan = canDanOfYear(yearCanIdx);
return (canDan + ((chiIdx - 2 + 12) % 12)) % 10;
}
function napAmOf(canIdx, chiIdx) {
for (let p = 0; p < 60; p++) { if (p % 10 === canIdx && p % 12 === chiIdx) return NAP_AM[Math.floor(p / 2)]; }
return NAP_AM[0];
}
function timViTriTuVi(cucNum, lunarDay) {
let x = Math.ceil(lunarDay / cucNum);
let y = (x * cucNum) - lunarDay;
let khoiDiem = 2;
return (y % 2 !== 0) ? ((khoiDiem + x - 1 - y) % 12 + 12) % 12 : ((khoiDiem + x - 1 + y) % 12);
}

/* ==================================================================
  4. LÕI TÍNH LÁ SỐ (chuyển thể chính xác từ hàm tinhLaSo trong script.js)
  ================================================================== */
function tinhLaSo({ day, month, year, hourChi, gender, lunarOverride }) {
const lunar = lunarOverride || convertSolar2Lunar(day, month, year, 7);
const yearCC = canChiOfYear(lunar.year);

const isYangYear = (lunar.year % 2 === 0);
const isMale = (gender === 'nam');
const isThuanVan = (isYangYear && isMale) || (!isYangYear && !isMale);

// --- AN MỆNH / THÂN ---
const cungKhoiThang = (2 + (lunar.month - 1)) % 12;
const menhChi = ((cungKhoiThang - hourChi) % 12 + 12) % 12;
const thanChi = (cungKhoiThang + hourChi) % 12;

const menhCan = canOfChi(yearCC.can, menhChi);
// "nap" = nạp âm của Can-Chi CUNG MỆNH — CHỈ dùng để suy ra Cục số (Kim tứ cục, Hỏa lục cục...)
// và điểm khởi vòng Trường Sinh. Đây KHÔNG phải là nạp âm bản mệnh cá nhân của đương số.
const nap = napAmOf(menhCan, menhChi);

// "napBanMenh" = nạp âm của Can-Chi NĂM SINH (yearCC) — đây mới đúng là "Bản Mệnh"
// nạp âm cá nhân hiển thị cho người xem số (vd: Đinh Mão -> Lư Trung Hỏa).
// Trước đây code dùng nhầm "nap" (nạp âm cung Mệnh) để hiển thị Bản Mệnh, gây sai kết quả
// vì cung Mệnh có thể rơi vào một Can-Chi hoàn toàn khác với Can-Chi năm sinh.
const napBanMenh = napAmOf(yearCC.can, yearCC.chi);

const cucString = CUC_MAP[nap.el];
const cucNum = parseInt(cucString.match(/\d+/)[0], 10);

const palacesMap = {};
for (let i = 0; i < 12; i++) {
  palacesMap[i] = { cung: "", chi: i, can: canOfChi(yearCC.can, i), daiVan: 0, tieuVan: "", sao: [] };
}

// 12 cung chức năng đi thuận
for (let i = 0; i < 12; i++) {
  let targetChi = (menhChi + i) % 12;
  palacesMap[targetChi].cung = CUNG_NAMES[i];
}

// Khởi Đại vận
for (let i = 0; i < 12; i++) {
  let daiVanKhoi = cucNum + (i * 10);
  let targetChi = isThuanVan ? (menhChi + i) % 12 : ((menhChi - i) % 12 + 12) % 12;
  palacesMap[targetChi].daiVan = daiVanKhoi;
}

// --- AN TIỂU VẬN ---
let khoiTieuVanChi = 0;
if ([2, 6, 10].includes(yearCC.chi)) khoiTieuVanChi = 4;
else if ([4, 8, 0].includes(yearCC.chi)) khoiTieuVanChi = 10;
else if ([5, 9, 1].includes(yearCC.chi)) khoiTieuVanChi = 7;
else if ([11, 3, 7].includes(yearCC.chi)) khoiTieuVanChi = 1;

for (let i = 0; i < 12; i++) {
  let targetChi = isMale ? (khoiTieuVanChi + i) % 12 : ((khoiTieuVanChi - i) % 12 + 12) % 12;
  let labelChi = (yearCC.chi + i) % 12;
  palacesMap[targetChi].tieuVan = CHI[labelChi];
}

// --- AN VÒNG CHÍNH TINH ---
const posTuVi = timViTriTuVi(cucNum, lunar.day);

palacesMap[posTuVi].sao.push("TỬ VI");
palacesMap[((posTuVi - 1) % 12 + 12) % 12].sao.push("THIÊN CƠ");
palacesMap[((posTuVi - 3) % 12 + 12) % 12].sao.push("THÁI DƯƠNG");
palacesMap[((posTuVi - 4) % 12 + 12) % 12].sao.push("VŨ KHÚC");
palacesMap[((posTuVi - 5) % 12 + 12) % 12].sao.push("THIÊN ĐỒNG");
palacesMap[((posTuVi - 8) % 12 + 12) % 12].sao.push("LIÊM TRINH");

const posThienPhu = (16 - posTuVi) % 12;
palacesMap[posThienPhu].sao.push("THIÊN PHỦ");
palacesMap[(posThienPhu + 1) % 12].sao.push("THÁI ÂM");
palacesMap[(posThienPhu + 2) % 12].sao.push("THAM LANG");
palacesMap[(posThienPhu + 3) % 12].sao.push("CỰ MÔN");
palacesMap[(posThienPhu + 4) % 12].sao.push("THIÊN TƯỚNG");
palacesMap[(posThienPhu + 5) % 12].sao.push("THIÊN LƯƠNG");
palacesMap[(posThienPhu + 6) % 12].sao.push("THẤT SÁT");
palacesMap[(posThienPhu + 10) % 12].sao.push("PHÁ QUÂN");

// --- AN CÁC PHỤ TINH ---
const can = yearCC.can, chi = yearCC.chi, m = lunar.month - 1, d = lunar.day - 1, h = hourChi;

const posXuong = ((10 - h) % 12 + 12) % 12;
const posKhuc = (4 + h) % 12;
palacesMap[posXuong].sao.push("Văn Xương");
palacesMap[posKhuc].sao.push("Văn Khúc");

const posThaiPhu = (6 + h) % 12;
const posPhongCao = (2 + h) % 12;
palacesMap[posThaiPhu].sao.push("Thai Phụ");
palacesMap[posPhongCao].sao.push("Phong Cáo");

const posTaiPhu = (4 + m) % 12;
const posHuuBat = ((10 - m) % 12 + 12) % 12;
palacesMap[posTaiPhu].sao.push("Tả Phù");
palacesMap[posHuuBat].sao.push("Hữu Bật");

const luuNienVanTinhMap = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
palacesMap[luuNienVanTinhMap[can]].sao.push("L.N.V Tinh");

const posThienHinh = (9 + m) % 12;
const posThienDieu = (1 + m) % 12;
palacesMap[posThienHinh].sao.push("Thiên Hình");
palacesMap[posThienDieu].sao.push("Thiên Diêu");

const posNguyetDuc = (5 + chi) % 12;
palacesMap[posNguyetDuc].sao.push("Nguyệt Đức");
palacesMap[posThienDieu].sao.push("Thiên Y");
palacesMap[(7 + m) % 12].sao.push("Địa Giải");
palacesMap[(8 + m) % 12].sao.push("Thiên Giải");

palacesMap[((11 - h) % 12 + 12) % 12].sao.push("Địa Không");
palacesMap[(11 + h) % 12].sao.push("Địa Kiếp");

let khoiHoa = 0, khoiLinh = 0;
if ([2, 6, 10].includes(chi)) { khoiHoa = 1; khoiLinh = 3; }
else if ([8, 0, 4].includes(chi)) { khoiHoa = 2; khoiLinh = 10; }
else if ([5, 9, 1].includes(chi)) { khoiHoa = 3; khoiLinh = 10; }
else if ([11, 3, 7].includes(chi)) { khoiHoa = 9; khoiLinh = 10; }

let posHoa = 0, posLinh = 0;
if ((isYangYear && isMale) || (!isYangYear && !isMale)) {
  posHoa = (khoiHoa + h) % 12;
  posLinh = ((khoiLinh - h) % 12 + 12) % 12;
} else {
  posHoa = ((khoiHoa - h) % 12 + 12) % 12;
  posLinh = (khoiLinh + h) % 12;
}
palacesMap[posHoa].sao.push("Hỏa Tinh");
palacesMap[posLinh].sao.push("Linh Tinh");

palacesMap[(posTaiPhu + d) % 12].sao.push("Tam Thai");
palacesMap[((posHuuBat - d) % 12 + 12) % 12].sao.push("Bát Tọa");
palacesMap[(posXuong + d - 1 + 12) % 12].sao.push("Ân Quang");
palacesMap[((posKhuc - d + 1) % 12 + 12) % 12].sao.push("Thiên Quý");

const locTonIdx = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][can];
palacesMap[locTonIdx].sao.push("Lộc Tồn");
palacesMap[(locTonIdx + 1) % 12].sao.push("Kình Dương");
palacesMap[((locTonIdx - 1) % 12 + 12) % 12].sao.push("Đà La");

const duongPhuMap = [7, 8, 10, 11, 10, 11, 1, 2, 4, 5];
palacesMap[duongPhuMap[can]].sao.push("Đường Phù");

const thienKhoiMap = [1, 0, 11, 11, 1, 0, 6, 6, 3, 3];
const thienVietMap = [7, 8, 9, 9, 7, 8, 2, 2, 5, 5];
palacesMap[thienKhoiMap[can]].sao.push("Thiên Khôi");
palacesMap[thienVietMap[can]].sao.push("Thiên Việt");

const posQuocAn = (locTonIdx + 8) % 12;
palacesMap[posQuocAn].sao.push("Quốc Ấn");

const thienQuanCanMap = [5, 4, 5, 2, 3, 9, 11, 9, 10, 1];
const thienPhucCanMap = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5];
palacesMap[thienQuanCanMap[can]].sao.push("Thiên Quan");
palacesMap[thienPhucCanMap[can]].sao.push("Thiên Phúc");

palacesMap[[9, 10, 7, 8, 0, 6, 3, 4, 11, 2][can]].sao.push("Lưu Hà");
palacesMap[[5, 6, 0, 5, 6, 8, 2, 6, 9, 10][can]].sao.push("Thiên Trù");

// An Tứ Hóa
const tuHoaRules = [
  ["LIÊM TRINH", "PHÁ QUÂN", "VŨ KHÚC", "THÁI DƯƠNG"],
  ["THIÊN CƠ", "THIÊN LƯƠNG", "TỬ VI", "THÁI ÂM"],
  ["THIÊN ĐỒNG", "THIÊN CƠ", "Văn Xương", "LIÊM TRINH"],
  ["THÁI ÂM", "THIÊN ĐỒNG", "THIÊN CƠ", "CỰ MÔN"],
  ["THAM LANG", "THÁI ÂM", "Hữu Bật", "THIÊN CƠ"],
  ["VŨ KHÚC", "THAM LANG", "THIÊN LƯƠNG", "Văn Khúc"],
  ["THÁI DƯƠNG", "VŨ KHÚC", "THIÊN ĐỒNG", "THÁI ÂM"],
  ["CỰ MÔN", "THÁI DƯƠNG", "Văn Khúc", "Văn Xương"],
  ["THIÊN LƯƠNG", "TỬ VI", "Tả Phù", "VŨ KHÚC"],
  ["PHÁ QUÂN", "CỰ MÔN", "THÁI ÂM", "THAM LANG"]
];
const suffixes = ["Hóa Lộc", "Hóa Quyền", "Hóa Khoa", "Hóa Kỵ"];
tuHoaRules[can].forEach((starName, idx) => {
  for (let i = 0; i < 12; i++) {
    if (palacesMap[i].sao.includes(starName)) {
      palacesMap[i].sao.push(suffixes[idx]);
      break;
    }
  }
});

const vongLocTon = ["Bác Sĩ", "Lực Sĩ", "Thanh Long", "Tiểu Hao", "Tướng Quân", "Tấu Thư", "Phi Liêm", "Hỷ Thần", "Bệnh Phù", "Đại Hao", "Phục Binh", "Quan Phủ"];
for (let i = 0; i < 12; i++) {
  let idx = isThuanVan ? (locTonIdx + i) % 12 : ((locTonIdx - i) % 12 + 12) % 12;
  palacesMap[idx].sao.push(vongLocTon[i]);
}

let posKiepSat = 0;
if ([0, 4, 8].includes(chi)) posKiepSat = 5;
else if ([2, 6, 10].includes(chi)) posKiepSat = 11;
else if ([1, 5, 9].includes(chi)) posKiepSat = 2;
else if ([3, 7, 11].includes(chi)) posKiepSat = 8;
palacesMap[posKiepSat].sao.push("Kiếp Sát");
palacesMap[((2 + chi) % 12)].sao.push("Thiên Hỷ");

let posHoaCai = 0;
if ([8, 0, 4].includes(chi)) posHoaCai = 4;
else if ([2, 6, 10].includes(chi)) posHoaCai = 10;
else if ([5, 9, 1].includes(chi)) posHoaCai = 1;
else if ([11, 3, 7].includes(chi)) posHoaCai = 7;
palacesMap[posHoaCai].sao.push("Hoa Cái");

const posThienKhoc = ((6 - chi) % 12 + 12) % 12;
const posThienHu = (6 + chi) % 12;
palacesMap[posThienKhoc].sao.push("Thiên Khốc");
palacesMap[posThienHu].sao.push("Thiên Hư");

const posLongTri = (4 + chi) % 12;
const posPhuongCac = ((10 - chi) % 12 + 12) % 12;
palacesMap[posLongTri].sao.push("Long Trì");
palacesMap[posPhuongCac].sao.push("Phượng Các", "Giải Thần");

let posDaoHoa = 0;
if ([11, 3, 7].includes(chi)) posDaoHoa = 0;
else if ([5, 9, 1].includes(chi)) posDaoHoa = 6;
else if ([8, 0, 4].includes(chi)) posDaoHoa = 9;
else if ([2, 6, 10].includes(chi)) posDaoHoa = 3;
palacesMap[posDaoHoa].sao.push("Đào Hoa");

let posThienMa = 0;
if ([2, 6, 10].includes(chi)) posThienMa = 8;
else if ([8, 0, 4].includes(chi)) posThienMa = 2;
else if ([5, 9, 1].includes(chi)) posThienMa = 11;
else if ([11, 3, 7].includes(chi)) posThienMa = 5;
palacesMap[posThienMa].sao.push("Thiên Mã");

const vongThaiTue = ["Thái Tuế", "Thiếu Dương", "Tang Môn", "Thiếu Âm", "Quan Phù", "Tử Phù", "Tuế Phá", "Long Đức", "Bạch Hổ", "Phúc Đức", "Điếu Khách", "Trực Phù"];
for (let i = 0; i < 12; i++) {
  let targetIdx = (chi + i) % 12;
  palacesMap[targetIdx].sao.push(vongThaiTue[i]);
  if (i === 1) palacesMap[targetIdx].sao.push("Thiên Không");
  if (i === 9) palacesMap[targetIdx].sao.push("Thiên Đức");
}

let posCoThan = 0, posQuaTu = 0;
if ([2, 3, 4].includes(chi)) { posCoThan = 5; posQuaTu = 1; }
else if ([5, 6, 7].includes(chi)) { posCoThan = 8; posQuaTu = 4; }
else if ([8, 9, 10].includes(chi)) { posCoThan = 11; posQuaTu = 7; }
else if ([11, 0, 1].includes(chi)) { posCoThan = 2; posQuaTu = 10; }
palacesMap[posCoThan].sao.push("Cô Thần");
palacesMap[posQuaTu].sao.push("Quả Tú");

let khoiTruongSinh = 0;
if (nap.el === "Hỏa") khoiTruongSinh = 2;
else if (nap.el === "Kim") khoiTruongSinh = 5;
else if (nap.el === "Mộc") khoiTruongSinh = 11;
else if (nap.el === "Thổ" || nap.el === "Thủy") khoiTruongSinh = 8;

const vongTruongSinh = ["Trường Sinh", "Mộc Dục", "Quan Đới", "Lâm Quan", "Đế Vượng", "Suy", "Bệnh", "Tử", "Mộ", "Tuyệt", "Thai", "Dưỡng"];
const isYangManOrYinWoman = (isYangYear && isMale) || (!isYangYear && !isMale);

for (let i = 0; i < 12; i++) {
  let idx = isYangManOrYinWoman ? (khoiTruongSinh + i) % 12 : ((khoiTruongSinh - i) % 12 + 12) % 12;
  palacesMap[idx].sao.push(vongTruongSinh[i]);
}

const tuanIdx1 = ((chi - can - 2) % 12 + 12) % 12;
const tuanIdx2 = ((chi - can - 1) % 12 + 12) % 12;
palacesMap[tuanIdx1].sao.push("Tuần");
palacesMap[tuanIdx2].sao.push("Tuần");
const trietMap = [[8, 9], [6, 7], [4, 5], [2, 3], [0, 1], [8, 9], [6, 7], [4, 5], [2, 3], [0, 1]];
trietMap[can].forEach(idx => { palacesMap[idx].sao.push("Triệt"); });

let posPhaToai = 0;
if ([2, 8, 5, 11].includes(chi)) posPhaToai = 9;
else if ([0, 6, 3, 9].includes(chi)) posPhaToai = 5;
else if ([4, 10, 1, 7].includes(chi)) posPhaToai = 1;
palacesMap[posPhaToai].sao.push("Phá Toái");

const posDauQuanThang = ((chi - m) % 12 + 12) % 12;
const posDauQuan = (posDauQuanThang + h) % 12;
palacesMap[posDauQuan].sao.push("Đẩu Quân");

const posThienTai = (menhChi + chi) % 12;
palacesMap[posThienTai].sao.push("Thiên Tài");

const posThienTho = (thanChi + chi) % 12;
palacesMap[posThienTho].sao.push("Thiên Thọ");

palacesMap[4].sao.push("Thiên La");
palacesMap[10].sao.push("Địa Võng");

const posNoBoc = (menhChi + 5) % 12;
const posTatAch = (menhChi + 7) % 12;
palacesMap[posNoBoc].sao.push("T. Thương");
palacesMap[posTatAch].sao.push("Thiên Sứ");

// Xếp ngược chiều kim đồng hồ để khớp giao diện hiển thị vòng tròn 12 cung
const finalPalaces = [];
for (let i = 0; i < 12; i++) {
  const chiIdx = ((menhChi - i) % 12 + 12) % 12;
  finalPalaces.push(palacesMap[chiIdx]);
}

// --- TÍNH GIỜ KIM XÀ THIẾT TỎA ---
let posKimSa = (10 + chi) % 12;
posKimSa = ((posKimSa - (lunar.month - 1)) % 12 + 12) % 12;
posKimSa = (posKimSa + (lunar.day - 1)) % 12;
posKimSa = ((posKimSa - hourChi) % 12 + 12) % 12;

let phamKimSa = false;
let thongTinKimSa = "Không phạm";
if (isMale) {
  if (posKimSa === 4 || posKimSa === 10) {
    phamKimSa = true;
    thongTinKimSa = `Phạm giờ (tại cung ${CHI[posKimSa]})`;
  }
} else {
  if (posKimSa === 1 || posKimSa === 7) {
    phamKimSa = true;
    thongTinKimSa = `Phạm giờ (tại cung ${CHI[posKimSa]})`;
  }
}

return {
  lunar, yearCC, menhChi, thanChi, menhCan, nap, napBanMenh, cuc: cucString, cucNum,
  palaces: finalPalaces, gender, isThuanVan,
  kimSa: { pham: phamKimSa, chiTiet: thongTinKimSa }
};
}

/* ==================================================================
  5. PHÂN LOẠI SAO CHO GIAO DIỆN (tương ứng cách script.js gán class khi render)
  ================================================================== */
function phanLoaiPhuTinh(name) {
if (VONG_TRUONG_SINH_LIST.includes(name)) return "truongsinh";
if (name === "Tuần") return "tuan";
if (name === "Triệt") return "triet";
if (TU_HOA_LIST.includes(name)) return "tuhoa";
if (SAT_TINH_LIST.includes(name)) return "hung";
if (CAT_TINH_LON_LIST.includes(name)) return "cat-lon";
return "cat-nho";
}

function xayDungCungData(result) {
return result.palaces.map(p => {
  const chinhTinh = [];
  const phuTinh = [];
  p.sao.forEach(s => {
    if (CHINH_TINH.includes(s)) {
      chinhTinh.push({ name: s, hanh: CHINH_TINH_HANH[s] || null });
    } else {
      phuTinh.push({ name: s, kieu: phanLoaiPhuTinh(s) });
    }
  });
  return {
    chi: p.chi,
    label: CHI[p.chi],
    canChi: `${CAN[p.can]} ${CHI[p.chi]}`,
    tenCung: p.cung,
    laCungThan: p.chi === result.thanChi,
    daiVan: p.daiVan,
    tieuVan: p.tieuVan,
    chinhTinh,
    phuTinh
  };
});
}

/* ==================================================================
  6. HÀM KHỞI TẠO LÁ SỐ — Điểm vào chính được server.js gọi
  ================================================================== */
function khoiTaoLaSo(name, gender, calendarType, day, month, year, hourChiIndex) {
const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10);
const hourChi = parseInt(hourChiIndex, 10);

let lunarOverride = null;
if (calendarType === "lunar" || calendarType === "amlich") {
  lunarOverride = { day: d, month: m, year: y, leap: 0 };
}

const result = tinhLaSo({ day: d, month: m, year: y, hourChi, gender, lunarOverride });
const cungData = xayDungCungData(result);

const namSinhCanChi = `${CAN[result.yearCC.can]} ${CHI[result.yearCC.chi]}`;
const menhCanChi = `${CAN[result.menhCan]} ${CHI[result.menhChi]}`;
const displayName = (name && name.trim()) ? name.trim() : 'Bạn';

return {
  name: displayName,
  gender,
  duongLich: { day: d, month: m, year: y },
  amLich: { day: result.lunar.day, month: result.lunar.month, year: result.lunar.year, leap: result.lunar.leap },
  namSinhCanChi,
  menhCanChi,
  // napAm = nạp âm BẢN MỆNH cá nhân (tính theo Can-Chi năm sinh) — vd Đinh Mão -> Lư Trung Hỏa
  napAm: result.napBanMenh,
  // napCuc = nạp âm của Can-Chi cung Mệnh, chỉ dùng để suy ra Cục số bên dưới (giữ lại để tham chiếu/debug)
  napCuc: result.nap,
  banMenhY: MENH_Y[result.napBanMenh.el] || '',
  cucTen: result.cuc,
  cucNum: result.cucNum,
  isThuanVan: result.isThuanVan,
  cungMenhLabel: CHI[result.menhChi],
  cungThanLabel: CHI[result.thanChi],
  kimSa: result.kimSa,
  thongTinLich: `Dương lịch: Ngày ${d}/${m}/${y} | Âm lịch: Ngày ${result.lunar.day}/${result.lunar.month}${result.lunar.leap ? ' (nhuận)' : ''}/${result.lunar.year} (Năm ${namSinhCanChi} - Giờ ${CHI[hourChi]})`,
  cungData
};
}

module.exports = { khoiTaoLaSo, tinhLaSo, convertSolar2Lunar };
