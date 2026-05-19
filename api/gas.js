// ============================================================
//  api/gas.js — Vercel Serverless Function
//  server.js 대체 · React → 이 파일 → Google Apps Script
// ============================================================
const axios = require("axios");

const GAS_URL = process.env.GAS_URL; // Vercel 환경변수에서 읽음

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: "GAS_URL 환경변수가 설정되지 않았습니다." });
  }

  try {
    let response;

    // ── GET 요청
    if (req.method === "GET") {
      response = await axios.get(GAS_URL, {
        params: req.query,
        timeout: 30000,
      });

    // ── POST 요청 (GAS 302 리디렉션 처리 필수)
    } else if (req.method === "POST") {
      const body = typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

      // 1차: maxRedirects:0 으로 POST — 302 응답 수신
      try {
        response = await axios.post(GAS_URL, body, {
          timeout: 30000,
          maxRedirects: 0,
          headers: { "Content-Type": "application/json" },
          validateStatus: s => s < 400 || s === 302,
        });
      } catch (e) {
        if (e.response?.status === 302) {
          response = e.response;
        } else {
          throw e;
        }
      }

      // 302면 Location URL로 다시 POST (body 유지)
      if (response.status === 302) {
        const location = response.headers["location"];
        response = await axios.post(location, body, {
          timeout: 30000,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    return res.status(200).json(response.data);

  } catch (err) {
    console.error("GAS 오류:", err.message);
    return res.status(502).json({ ok: false, error: err.message });
  }
}