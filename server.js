// ============================================================
//  OK골프 레슨 예약 — server.js (Node.js 프록시 서버)
//  포트: 3001  |  React(3000) ↔ Google Apps Script 중계
// ============================================================

const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app  = express();
const PORT = 3001;

// ──────────────────────────────────────────────
//  ① 환경 변수 설정
//  .env 파일 또는 여기에 직접 입력하세요.
//  배포 시 Vercel 환경변수로 설정하세요.
// ──────────────────────────────────────────────
const GAS_URL       = process.env.GAS_URL       || "https://script.google.com/macros/s/여기에_배포URL_입력/exec";
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || "";  // AI 채팅용 (선택)

// ──────────────────────────────────────────────
//  ② 미들웨어
// ──────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));   // 스윙 영상 업로드 (MP4, Base64)
app.use(express.text({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 요청 로깅
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString("ko-KR")}] ${req.method} ${req.path}`);
  next();
});

// ──────────────────────────────────────────────
//  ③ 헬스체크
// ──────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), gasUrl: GAS_URL });
});

// ──────────────────────────────────────────────
//  ④ GAS 프록시 — GET
// ──────────────────────────────────────────────
app.get("/gas", async (req, res) => {
  try {
    const response = await axios.get(GAS_URL, {
      params : req.query,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });
    res.json(response.data);
  } catch (err) {
    console.error("GAS GET 오류:", err.message);
    res.status(502).json({ ok: false, error: "GAS 서버 오류: " + err.message });
  }
});

// ──────────────────────────────────────────────
//  ⑤ GAS 프록시 — POST
//  GAS 웹앱은 POST 요청 시 302 리디렉션 발생
//  → maxRedirects:0 으로 막고 Location 헤더로 직접 재요청
// ──────────────────────────────────────────────
app.post("/gas", async (req, res) => {
  try {
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    console.log("[POST→GAS] body:", body.slice(0, 200));

    let finalUrl = GAS_URL;
    let response;

    // 1차 시도: 리디렉션 비허용으로 POST
    try {
      response = await axios.post(finalUrl, body, {
        timeout: 30000,
        maxRedirects: 0,          // ← 리디렉션 막기
        headers: {
          "Content-Type": "application/json",
        },
        validateStatus: s => s < 400 || s === 302,
      });
    } catch (redirectErr) {
      // axios가 리디렉션을 throw 하는 경우
      if (redirectErr.response && redirectErr.response.status === 302) {
        response = redirectErr.response;
      } else {
        throw redirectErr;
      }
    }

    // 302 리디렉션이면 Location으로 다시 POST
    if (response.status === 302) {
      const location = response.headers["location"];
      console.log("[POST→GAS] 302 redirect →", location);
      response = await axios.post(location, body, {
        timeout: 30000,
        headers: { "Content-Type": "application/json" },
      });
    }

    res.json(response.data);
  } catch (err) {
    console.error("GAS POST 오류:", err.message);
    res.status(502).json({ ok: false, error: "GAS 서버 오류: " + err.message });
  }
});

// ──────────────────────────────────────────────
//  ⑥ Anthropic AI API 프록시 (AI 피드백 기능용, 선택)
// ──────────────────────────────────────────────
app.post("/ai", async (req, res) => {
  if (!ANTHROPIC_KEY) {
    return res.status(501).json({ ok: false, error: "AI 기능은 ANTHROPIC_KEY 설정 후 사용 가능합니다." });
  }
  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      req.body,
      {
        timeout: 60000,
        headers: {
          "Content-Type"     : "application/json",
          "x-api-key"        : ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error("AI API 오류:", err.message);
    res.status(502).json({ ok: false, error: "AI 오류: " + err.message });
  }
});

// ──────────────────────────────────────────────
//  ⑦ 서버 시작
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║  OK골프 프록시 서버                  ║");
  console.log(`║  http://localhost:${PORT}              ║`);
  console.log("║  React(3000) ↔ GAS 중계 중           ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");
  if (!GAS_URL.includes("exec")) {
    console.warn("⚠️  GAS_URL이 설정되지 않았습니다.");
    console.warn("   server.js의 GAS_URL 또는 .env 파일을 확인하세요.");
  }
});