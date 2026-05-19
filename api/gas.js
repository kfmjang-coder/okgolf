const https = require("https");
const url = require("url");

const GAS_URL = process.env.GAS_URL;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!GAS_URL) return res.status(500).json({ ok: false, error: "GAS_URL 없음" });

  try {
    // GET/POST 모두 GAS에 GET으로 전송 (GAS는 GET이 가장 안정적)
    let params = {};
    if (req.method === "GET") {
      params = req.query || {};
    } else {
      params = typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});
    }

    const qs = new URLSearchParams(params).toString();
    const gasUrl = GAS_URL + (GAS_URL.includes("?") ? "&" : "?") + qs;

    console.log("[gas] GET →", gasUrl.slice(0, 120));

    const data = await new Promise((resolve, reject) => {
      https.get(gasUrl, (r) => {
        // GAS 302 리디렉션 자동 처리
        if (r.statusCode === 302 || r.statusCode === 301) {
          const loc = r.headers.location;
          https.get(loc, (r2) => {
            let body = "";
            r2.on("data", d => body += d);
            r2.on("end", () => resolve(body));
            r2.on("error", reject);
          }).on("error", reject);
          return;
        }
        let body = "";
        r.on("data", d => body += d);
        r.on("end", () => resolve(body));
        r.on("error", reject);
      }).on("error", reject);
    });

    const json = JSON.parse(data);
    return res.status(200).json(json);

  } catch (err) {
    console.error("[gas] 오류:", err.message);
    return res.status(502).json({ ok: false, error: err.message });
  }
};