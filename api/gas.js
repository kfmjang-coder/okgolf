// api/gas.js — Vercel Serverless Function
const axios = require("axios");

const GAS_URL = process.env.GAS_URL;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!GAS_URL) {
    return res.status(500).json({ ok: false, error: "GAS_URL 환경변수 없음" });
  }

  try {
    // GET/POST 모두 GAS에는 POST로 전송
    const body = req.method === "GET"
      ? JSON.stringify(req.query)
      : (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    console.log("[gas.js] body:", body.slice(0, 120));

    let response;

    // 1차 POST
    try {
      response = await axios.post(GAS_URL, body, {
        timeout: 30000,
        maxRedirects: 0,
        headers: { "Content-Type": "application/json" },
        validateStatus: (s) => s < 400 || s === 302,
      });
    } catch (e) {
      if (e.response && e.response.status === 302) {
        response = e.response;
      } else {
        throw e;
      }
    }

    // 302이면 Location으로 다시 POST
    if (response.status === 302) {
      const location = response.headers["location"];
      response = await axios.post(location, body, {
        timeout: 30000,
        headers: { "Content-Type": "application/json" },
      });
    }

    return res.status(200).json(response.data);

  } catch (err) {
    console.error("[gas.js] 오류:", err.message);
    return res.status(502).json({ ok: false, error: err.message });
  }
};