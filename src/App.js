// ============================================================
//  OK골프 레슨 예약 — App.js v1.5 (Hook Rules 완전 준수)
//  renderHome/renderBook 함수 내 useState 제거 → 독립 컴포넌트로 분리
// ============================================================
import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
//  API 유틸
// ─────────────────────────────────────────────
const BACKEND = "/api/gas";

async function apiGet(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BACKEND}?${qs}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "서버 오류");
  return json.data;
}

async function apiPost(body) {
  const res = await fetch(BACKEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "서버 오류");
  return json.data;
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 600;  // 800 → 600px (크기 축소)
        let w = img.width, h = img.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        if (h > max) { w = Math.round(w * max / h); h = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.6));  // 품질 0.7 → 0.6
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isImage(name) { return /\.(jpe?g|png|gif|webp)$/i.test(name || ""); }

function safeArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// ─────────────────────────────────────────────
//  스타일 상수
// ─────────────────────────────────────────────
const INP = {
  width: "100%", background: "#1a1e28", border: "1px solid #2d3347",
  borderRadius: 8, padding: "8px 10px", color: "#e2e8f0",
  fontSize: 12, outline: "none", boxSizing: "border-box",
};
const LBL = {
  fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
  textTransform: "uppercase", color: "#4b5675", marginBottom: 6,
};
const CARD_STYLE = {
  background: "#181c25", border: "1px solid #2d3347",
  borderRadius: 12, padding: "12px 14px",
};

// ─────────────────────────────────────────────
//  공통 컴포넌트
// ─────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "#1f2435", border: "1px solid #34d399", color: "#e2e8f0",
      padding: "10px 20px", borderRadius: 10, zIndex: 9999, fontSize: 13,
      boxShadow: "0 4px 20px rgba(0,0,0,.5)", maxWidth: 300, textAlign: "center",
    }}>{msg}</div>
  );
}

function Spinner() {
  return <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>⏳ 로딩중...</div>;
}

function Btn({ onClick, children, variant = "primary", style = {}, disabled = false }) {
  const variants = {
    primary:   { background: "#34d399", color: "#000" },
    secondary: { background: "#1a1e28", border: "1px solid #2d3347", color: "#e2e8f0" },
    danger:    { background: "rgba(248,113,113,.15)", border: "1px solid rgba(248,113,113,.3)", color: "#f87171" },
    warning:   { background: "rgba(251,191,36,.1)",  border: "1px solid rgba(251,191,36,.25)", color: "#fbbf24" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      border: "none", borderRadius: 8, padding: "10px 0", width: "100%",
      fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, ...variants[variant], ...style,
    }}>{children}</button>
  );
}

// ─────────────────────────────────────────────
//  프로 카드
// ─────────────────────────────────────────────
function ProCard({ pro, selected, onClick, onDetail }) {
  const awards = safeArr(pro.awards);
  const types  = safeArr(pro.lessonTypes);
  const color  = pro.color || "#34d399";
  return (
    <div onClick={onClick} style={{
      background: selected ? color + "12" : "#181c25",
      border: `1.5px solid ${selected ? color : "#2d3347"}`,
      borderRadius: 12, padding: 12, cursor: "pointer", marginBottom: 8,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{
          width: 54, height: 54, borderRadius: "50%",
          background: "#1f2435", border: `2px solid ${selected ? color : "#2d3347"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, flexShrink: 0, overflow: "hidden",
        }}>
          {pro.image
            ? <img src={pro.image} alt={pro.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : pro.icon || "🏌️"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 900 }}>{pro.name}</span>
            <span style={{
              fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 700,
              background: color + "22", color, border: `1px solid ${color}44`,
            }}>{pro.title}</span>
          </div>
          {pro.avgRating && (
            <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 3 }}>
              ⭐ {pro.avgRating} <span style={{ color: "#4b5675" }}>({pro.reviewCount})</span>
            </div>
          )}
          <div style={{ marginBottom: 4 }}>
            {types.slice(0, 4).map((t, i) => (
              <span key={i} style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700,
                background: "#94a3b822", color: "#94a3b8", border: "1px solid #94a3b844",
                marginRight: 3, marginBottom: 2, display: "inline-block",
              }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4, marginBottom: 4 }}>{pro.intro}</div>
          {awards[0] && (
            <div style={{ fontSize: 10, color: "#fbbf24" }}>
              🏆 {awards[0].title} {awards[0].rank} ({awards[0].year})
            </div>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", marginTop: 6 }}>
        <span onClick={e => { e.stopPropagation(); onDetail(pro); }}
          style={{ fontSize: 11, color: "#34d399", cursor: "pointer" }}>
          상세보기 →
        </span>
      </div>
    </div>
  );
}

function ProDetailModal({ pro, onClose, onSelect }) {
  if (!pro) return null;
  const awards = safeArr(pro.awards);
  const career = safeArr(pro.career);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#12151c", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto",
        border: "1px solid #2d3347", padding: 20,
      }}>
        <div style={{
          background: "linear-gradient(135deg,rgba(52,211,153,.13),rgba(56,189,248,.07))",
          border: "1px solid rgba(52,211,153,.2)", borderRadius: 12,
          padding: 14, display: "flex", gap: 12, alignItems: "center", marginBottom: 14,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#1f2435", border: `2px solid ${pro.color || "#34d399"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, overflow: "hidden",
          }}>
            {pro.image
              ? <img src={pro.image} alt={pro.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : pro.icon || "🏌️"}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{pro.name}</div>
            <div style={{ fontSize: 11, color: pro.color || "#34d399", marginTop: 2 }}>{pro.title}</div>
            {pro.avgRating && <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>⭐ {pro.avgRating}점</div>}
          </div>
        </div>
        {pro.detail && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...LBL, marginBottom: 5 }}>소개</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{pro.detail}</div>
          </div>
        )}
        {career.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...LBL, marginBottom: 5 }}>경력</div>
            {career.map((c, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${i === 0 ? "#34d399" : "#2d3347"}`, paddingLeft: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: "#fbbf24", fontFamily: "monospace" }}>{c.year}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.desc}</div>
              </div>
            ))}
          </div>
        )}
        {awards.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...LBL, marginBottom: 5 }}>수상 이력</div>
            {awards.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #1f2435" }}>
                <span style={{ fontSize: 18 }}>{medals[i] || "🏅"}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{a.title}</div>
                  <div style={{ fontSize: 10, color: "#4b5675" }}>{a.year} · {a.rank}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Btn onClick={() => { onSelect(pro); onClose(); }}>이 프로로 예약하기 →</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  홈 화면 (독립 컴포넌트 — Hook 규칙 준수)
// ─────────────────────────────────────────────
function HomeScreen({ coaches, selPro, setSelPro, setTab, setBookStep, setDetailPro }) {
  const [pinned, setPinned] = useState([]);

  useEffect(() => {
    apiGet({ action: "getPinnedPosts" }).then(setPinned).catch(() => {});
  }, []);

  return (
    <div style={{ padding: "12px 14px" }}>
      {pinned[0] && (
        <div style={{
          background: "linear-gradient(135deg,rgba(52,211,153,.13),rgba(56,189,248,.07))",
          border: "1px solid rgba(52,211,153,.28)", borderRadius: 12,
          padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer",
        }}>
          <span style={{ fontSize: 18 }}>📢</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>📌 {pinned[0].제목}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{String(pinned[0].내용 || "").slice(0, 40)}...</div>
          </div>
        </div>
      )}
      <div style={LBL}>레슨 프로 선택</div>
      {coaches.map(pro => (
        <ProCard key={pro.id} pro={pro}
          selected={selPro?.id === pro.id}
          onClick={() => { setSelPro(pro); setTab("book"); setBookStep(1); }}
          onDetail={setDetailPro}
        />
      ))}
      <Btn onClick={() => setTab("book")} style={{ marginTop: 8 }}>📅 레슨 예약하기</Btn>
    </div>
  );
}

// ─────────────────────────────────────────────
//  예약 화면 — STEP 1(프로+레슨) / STEP 2(날짜+시간 한화면) / STEP 3(정보입력)
// ─────────────────────────────────────────────
function BookScreen({ coaches, selPro, setSelPro, setDetailPro, showToast, setTab }) {
  const [step, setStep]             = useState(1);
  const [lessonType, setLessonType] = useState("개인30분");
  const [selDate, setSelDate]       = useState("");
  const [selSlot, setSelSlot]       = useState("");
  const [slots, setSlots]           = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bName, setBName]           = useState("");
  const [bPhone, setBPhone]         = useState("");
  const [bNote, setBNote]           = useState("");
  const [bPeople, setBPeople]       = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [allLessons, setAllLessons] = useState([]);  // DB 레슨 종류

  // 컴포넌트 마운트 시 레슨 종류 로드
  useEffect(() => {
    apiGet({ action:"getLessons" })
      .then(data => {
        if (data && data.length > 0) {
          setAllLessons(data);
          setLessonType(data[0]["레슨명"]); // 첫 번째 레슨을 기본값으로
        }
      })
      .catch(() => {
        // 로드 실패 시 하드코딩 폴백
        const fallback = [
          { "레슨ID":"F1","레슨명":"개인30분","소요시간(분)":30,"색상":"#34d399" },
          { "레슨ID":"F2","레슨명":"개인1시간","소요시간(분)":60,"색상":"#38bdf8" },
          { "레슨ID":"F3","레슨명":"그룹1시간","소요시간(분)":60,"색상":"#a78bfa" },
          { "레슨ID":"F4","레슨명":"체험30분","소요시간(분)":30,"색상":"#fbbf24"  },
          { "레슨ID":"F5","레슨명":"주니어45분","소요시간(분)":45,"색상":"#f87171"},
        ];
        setAllLessons(fallback);
      });
  }, []);

  // 선택된 프로가 담당하는 레슨 종류만 필터
  const LESSON_TYPES_RAW = selPro
    ? allLessons.filter(l => {
        const proTypes = selPro.lessonTypes || [];
        return proTypes.length === 0 || proTypes.includes(l["레슨명"]);
      })
    : allLessons;

  const DOW_KR = ["일", "월", "화", "수", "목", "금", "토"];
  const dateList = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  // 날짜 선택 시 슬롯 자동 로드
  useEffect(() => {
    if (!selPro || !selDate) return;
    setSelSlot(""); // 날짜 바뀌면 선택 시간 초기화
    setSlotsLoading(true);
    apiGet({ action: "getSlots", coachId: selPro.id, date: selDate })
      .then(setSlots)
      .catch(e => showToast(e.message))
      .finally(() => setSlotsLoading(false));
  }, [selPro, selDate]);

  const doBook = async () => {
    if (!selPro || !selDate || !selSlot || !bName || !bPhone) {
      showToast("모든 항목을 입력해주세요."); return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost({
        action: "book", coachId: selPro.id, lessonType,
        date: selDate, startTime: selSlot,
        name: bName, phone: bPhone, people: bPeople, note: bNote,
      });
      showToast(`✅ 예약 완료! 부스 ${res.boothNo}번 (${selSlot}~${res.endTime})`);
      setTab("home");
      setStep(1); setSelDate(""); setSelSlot(""); setBName(""); setBPhone(""); setBNote("");
    } catch (e) { showToast("❌ " + e.message); }
    finally { setSubmitting(false); }
  };

  // 진행 단계: 프로 / 날짜+시간 / 정보입력 (3단계로 축소)
  const STEP_LABELS = ["프로 선택", "날짜·시간", "정보 입력"];

  return (
    <div style={{ padding: "12px 14px" }}>

      {/* 진행 표시 — 3단계 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {STEP_LABELS.map((s, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", fontSize: 10, padding: "5px 0", borderRadius: 6,
            fontWeight: step === i + 1 ? 700 : 400,
            background: step === i + 1 ? "#34d399" : step > i + 1 ? "rgba(52,211,153,.2)" : "#1a1e28",
            color: step === i + 1 ? "#000" : step > i + 1 ? "#34d399" : "#4b5675",
          }}>{s}</div>
        ))}
      </div>

      {/* ══ STEP 1 — 프로 + 레슨종류 ══ */}
      {step === 1 && (
        <div>
          <div style={LBL}>① 레슨 프로 선택</div>
          {coaches.map(pro => (
            <ProCard key={pro.id} pro={pro}
              selected={selPro?.id === pro.id}
              onClick={() => setSelPro(pro)}
              onDetail={setDetailPro}
            />
          ))}
          <div style={{ ...LBL, marginTop: 8 }}>② 레슨 종류</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {(LESSON_TYPES_RAW.length > 0 ? LESSON_TYPES_RAW : allLessons).map(l => {
              const name  = l["레슨명"];
              const color = l["색상"] || "#34d399";
              const isSel = lessonType === name;
              return (
                <button key={l["레슨ID"]} onClick={() => setLessonType(name)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                  fontWeight: isSel ? 700 : 400,
                  background: isSel ? color : "#1a1e28",
                  color: isSel ? "#000" : "#94a3b8",
                  border: isSel ? "none" : `1px solid ${color}44`,
                }}>
                  {name}
                  {l["소요시간(분)"] && <span style={{ fontSize:9, opacity:.7, marginLeft:4 }}>{l["소요시간(분)"]}분</span>}
                </button>
              );
            })}
          </div>
          <Btn onClick={() => setStep(2)} disabled={!selPro}>다음 → 날짜·시간 선택</Btn>
        </div>
      )}

      {/* ══ STEP 2 — 날짜 + 시간 (한 화면) ══ */}
      {step === 2 && (
        <div>
          {/* 선택된 프로 요약 */}
          <div style={{ ...CARD_STYLE, display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{selPro?.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{selPro?.name}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{lessonType}</div>
            </div>
            <button onClick={() => { setStep(1); setSelDate(""); setSelSlot(""); setSlots([]); }}
              style={{ fontSize: 10, color: "#34d399", background: "none", border: "none", cursor: "pointer" }}>
              변경
            </button>
          </div>

          {/* 날짜 선택 */}
          <div style={LBL}>📅 날짜 선택</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 14 }}>
            {dateList.map(d => {
              const dow = new Date(d).getDay();
              const isOff = dow === 1; // 월요일 휴무
              const isSelected = selDate === d;
              return (
                <div key={d} onClick={() => !isOff && setSelDate(d)} style={{
                  flexShrink: 0, width: 48, textAlign: "center", padding: "7px 0",
                  borderRadius: 10, fontSize: 11, cursor: isOff ? "not-allowed" : "pointer",
                  opacity: isOff ? 0.3 : 1, transition: "all .13s",
                  background: isSelected ? "#34d399" : "#1a1e28",
                  color: isSelected ? "#000" : "#e2e8f0",
                  border: isSelected ? "none" : `1px solid ${dow === 0 || dow === 6 ? "rgba(251,191,36,.3)" : "#2d3347"}`,
                  boxShadow: isSelected ? "0 2px 8px rgba(52,211,153,.35)" : "none",
                }}>
                  <div style={{ fontSize: 8, marginBottom: 2, color: isSelected ? "rgba(0,0,0,.55)" : (dow === 0 || dow === 6 ? "#fbbf24" : "#4b5675") }}>
                    {d.slice(5, 7)}/{d.slice(8, 10)}
                  </div>
                  <div style={{ fontWeight: isSelected ? 900 : 500, fontSize: 13 }}>{DOW_KR[dow]}</div>
                  {isOff && <div style={{ fontSize: 7, color: "#f87171", marginTop: 2 }}>휴무</div>}
                </div>
              );
            })}
          </div>

          {/* 시간 선택 — 날짜 선택 즉시 아래에 표시 */}
          {selDate ? (
            <div>
              {/* 헤더 + 범례 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ ...LBL, marginBottom: 0 }}>
                  ⏰ {selDate.slice(5).replace("-", "/")} ({DOW_KR[new Date(selDate).getDay()]}) 시간 선택
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 8.5 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:"#34d399", display:"inline-block" }}/>
                    <span style={{ color:"#34d399" }}>예약가능</span>
                  </span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:"rgba(56,189,248,.5)", display:"inline-block" }}/>
                    <span style={{ color:"#38bdf8" }}>예약됨</span>
                  </span>
                  <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:"rgba(248,113,113,.5)", display:"inline-block" }}/>
                    <span style={{ color:"#f87171" }}>차단</span>
                  </span>
                </div>
              </div>

              {slotsLoading ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 12 }}>
                  ⏳ 시간 불러오는 중...
                </div>
              ) : slots.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#4b5675", fontSize: 12 }}>
                  이 날짜에 예약 가능한 시간이 없습니다.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 16 }}>
                  {slots.map(s => {
                    const isSelected = selSlot === s.time;
                    const isBooked   = !s.available && !s.blocked;   // 예약됨
                    const isBlocked  = s.blocked;                     // 운영 차단

                    // ── 상태별 스타일 정의
                    let bg, border, color, cursor, label, subLabel;

                    if (isSelected) {
                      bg = "#34d399"; border = "#34d399"; color = "#000"; cursor = "pointer";
                      label = s.time; subLabel = "선택됨 ✓";
                    } else if (isBooked) {
                      bg = "rgba(56,189,248,.12)"; border = "rgba(56,189,248,.35)"; color = "#38bdf8"; cursor = "not-allowed";
                      label = s.time; subLabel = "예약됨";
                    } else if (isBlocked) {
                      bg = "rgba(248,113,113,.1)"; border = "rgba(248,113,113,.3)"; color = "#f87171"; cursor = "not-allowed";
                      label = s.time; subLabel = s.blockReason ? s.blockReason.slice(0,4) : "차단";
                    } else {
                      // 예약 가능
                      bg = "rgba(52,211,153,.06)"; border = "rgba(52,211,153,.4)"; color = "#34d399"; cursor = "pointer";
                      label = s.time; subLabel = null;
                    }

                    return (
                      <div key={s.time}
                        onClick={() => {
                          if (!s.available) return; // 예약됨·차단은 클릭 불가
                          setSelSlot(isSelected ? "" : s.time);
                        }}
                        title={isBooked ? "이미 예약된 시간입니다" : isBlocked ? (s.blockReason || "운영 차단") : ""}
                        style={{
                          borderRadius: 9,
                          padding: "9px 4px 7px",
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: isSelected ? 900 : isBooked ? 500 : 400,
                          cursor,
                          transition: "all .13s",
                          border: `1.5px solid ${border}`,
                          background: bg,
                          color,
                          boxShadow: isSelected ? "0 2px 10px rgba(52,211,153,.35)" : "none",
                          position: "relative",
                          userSelect: "none",
                        }}>
                        {/* 예약됨 대각선 줄 */}
                        {isBooked && (
                          <div style={{
                            position: "absolute", inset: 0, borderRadius: 8, overflow: "hidden",
                            pointerEvents: "none",
                          }}>
                            <div style={{
                              position: "absolute", top: "50%", left: "-10%",
                              width: "120%", height: 1,
                              background: "rgba(56,189,248,.35)",
                              transform: "rotate(-20deg)",
                            }}/>
                          </div>
                        )}
                        <div style={{ fontFamily: "monospace", letterSpacing: .5 }}>{label}</div>
                        <div style={{
                          fontSize: 8,
                          marginTop: 3,
                          color: isSelected ? "rgba(0,0,0,.65)"
                               : isBooked   ? "#38bdf8"
                               : isBlocked  ? "#f87171"
                               : "transparent",
                          fontWeight: 700,
                        }}>
                          {subLabel || "ㅤ"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 선택 확인 바 + 다음 버튼 */}
              {selSlot && (
                <div style={{
                  background: "linear-gradient(135deg,rgba(52,211,153,.13),rgba(56,189,248,.06))",
                  border: "1px solid rgba(52,211,153,.3)", borderRadius: 10,
                  padding: "10px 14px", marginBottom: 12,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {selDate.slice(5).replace("-", "/")} ({DOW_KR[new Date(selDate).getDay()]}) {selSlot}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{selPro?.name} · {lessonType}</div>
                  </div>
                  <button onClick={() => setSelSlot("")}
                    style={{ marginLeft: "auto", fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>
                    ✕ 취소
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: "center", padding: "24px 0",
              color: "#4b5675", fontSize: 12, lineHeight: 1.8,
              border: "1px dashed #2d3347", borderRadius: 10,
            }}>
              📅 위에서 날짜를 선택하면<br />예약 가능한 시간이 표시됩니다
            </div>
          )}

          {/* 하단 버튼 */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => { setStep(1); setSelDate(""); setSelSlot(""); setSlots([]); }} style={{ flex: 1 }}>
              ← 이전
            </Btn>
            <Btn onClick={() => setStep(3)} disabled={!selDate || !selSlot} style={{ flex: 2 }}>
              다음 → 정보 입력
            </Btn>
          </div>
        </div>
      )}

      {/* ══ STEP 3 — 정보 입력 ══ */}
      {step === 3 && (
        <div>
          {/* 예약 요약 카드 */}
          <div style={{
            background: "linear-gradient(135deg,rgba(52,211,153,.11),rgba(56,189,248,.05))",
            border: "1px solid rgba(52,211,153,.25)", borderRadius: 12,
            padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700, marginBottom: 6 }}>📋 예약 정보 확인</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#4b5675" }}>프로</span>
                <span style={{ fontWeight: 700 }}>{selPro?.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#4b5675" }}>레슨 종류</span>
                <span style={{ fontWeight: 700 }}>{lessonType}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#4b5675" }}>날짜</span>
                <span style={{ fontWeight: 700 }}>{selDate} ({DOW_KR[new Date(selDate).getDay()]})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#4b5675" }}>시간</span>
                <span style={{ fontWeight: 700, color: "#34d399" }}>{selSlot}</span>
              </div>
            </div>
            <button onClick={() => setStep(2)} style={{ fontSize: 10, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
              ← 날짜·시간 변경
            </button>
          </div>

          {/* 수강생 정보 */}
          <div style={LBL}>수강생 정보</div>
          <input placeholder="이름" value={bName} onChange={e => setBName(e.target.value)} style={{ ...INP, marginBottom: 6 }} />
          <input placeholder="연락처 (010-0000-0000)" value={bPhone} onChange={e => setBPhone(e.target.value)} style={{ ...INP, marginBottom: 6 }} />
          <input placeholder="요청사항 (선택, 100자)" maxLength={100} value={bNote} onChange={e => setBNote(e.target.value)} style={{ ...INP, marginBottom: 8 }} />

          {lessonType.includes("그룹") && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>인원 수</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setBPeople(n)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700,
                    background: bPeople === n ? "#34d399" : "#1a1e28",
                    color: bPeople === n ? "#000" : "#94a3b8",
                    border: bPeople === n ? "none" : "1px solid #2d3347",
                  }}>{n}명</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>← 이전</Btn>
            <Btn onClick={doBook} disabled={submitting} style={{ flex: 2 }}>
              {submitting ? "예약 중..." : "✅ 예약 확정"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  마이페이지 (독립 컴포넌트)
// ─────────────────────────────────────────────
function MyScreen({ showToast }) {
  const [rawPhone, setRawPhone]     = useState("");
  const [authPhone, setAuthPhone]   = useState("");
  const [myTab, setMyTab]           = useState("booking");
  const [pendingRatings, setPendingRatings] = useState([]);
  const [ratingTarget, setRatingTarget]     = useState(null);

  // 미평가 레슨 폴링 — 30초마다 자동 확인 (출석완료 즉시 감지용)
  const checkPending = useCallback(async (phone) => {
    if (!phone) return;
    try {
      const pending = await apiGet({ action: "getMyPendingRatings", phone });
      if (pending && pending.length > 0) {
        setPendingRatings(pending);
        // 아직 팝업 안 열었으면 자동으로 첫 번째 팝업 표시
        setRatingTarget(prev => prev ? prev : pending[0]);
      } else {
        setPendingRatings([]);
      }
    } catch(e) {}
  }, []);

  // 로그인 후 즉시 + 30초마다 폴링
  useEffect(() => {
    if (!authPhone) return;
    checkPending(authPhone);
    const t = setInterval(() => checkPending(authPhone), 30000);
    return () => clearInterval(t);
  }, [authPhone, checkPending]);

  const MY_TABS = [
    { id: "booking", label: "📋 예약"   },
    { id: "pass",    label: "🎫 이용권" },
    { id: "log",     label: "📝 일지"   },
    { id: "swing",   label: "🎥 스윙"   },
    { id: "setting", label: "⚙️ 설정"   },
  ];

  if (!authPhone) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>내 정보 확인</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
          연락처를 입력하면<br />수강권·예약·레슨기록을 확인할 수 있습니다.
        </div>
        <input placeholder="010-0000-0000" value={rawPhone}
          onChange={e => setRawPhone(e.target.value)}
          onKeyDown={e => e.key === "Enter" && rawPhone.length >= 10 && setAuthPhone(rawPhone)}
          style={{ ...INP, marginBottom: 10, textAlign: "center" }}
        />
        <Btn onClick={async () => {
          if (rawPhone.length < 10) { showToast("연락처를 올바르게 입력해주세요."); return; }
          setAuthPhone(rawPhone); // checkPending은 authPhone 변경 useEffect에서 자동 실행
        }}>
          확인
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 14px" }}>
      {/* 별점 팝업 */}
      {ratingTarget && (
        <RatingPopup
          target={ratingTarget}
          phone={authPhone}
          onSubmit={async (star, comment) => {
            try {
              await apiPost({ action:"submitRating", bookingId:ratingTarget.bookingId, phone:authPhone, star, comment });
              showToast("⭐ 별점 감사합니다!");
              setRatingTarget(null);
              setPendingRatings(prev => prev.filter(p => p.bookingId !== ratingTarget.bookingId));
            } catch(e) { showToast("❌ " + e.message); }
          }}
          onClose={() => setRatingTarget(null)}
        />
      )}
      {/* 미평가 레슨 알림 배너 */}
      {pendingRatings.length > 0 && !ratingTarget && (
        <div onClick={() => setRatingTarget(pendingRatings[0])}
          style={{
            background:"linear-gradient(135deg,rgba(251,191,36,.12),rgba(245,158,11,.06))",
            border:"1px solid rgba(251,191,36,.35)", borderRadius:10,
            padding:"10px 14px", marginBottom:10, cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
          }}>
          <span style={{ fontSize:22 }}>⭐</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>레슨 평가를 남겨주세요!</div>
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>
              {pendingRatings[0].coachName} · {pendingRatings[0].lessonDate} {pendingRatings[0].lessonType}
            </div>
          </div>
          <div style={{ fontSize:11, color:"#fbbf24", fontWeight:700 }}>평가하기 →</div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>📱 {authPhone}</div>
        <button onClick={() => { setAuthPhone(""); setRawPhone(""); }}
          style={{ fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>
          로그아웃
        </button>
      </div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
        {MY_TABS.map(t => (
          <button key={t.id} onClick={() => setMyTab(t.id)} style={{
            flexShrink: 0, padding: "5px 10px", borderRadius: 20, fontSize: 10, cursor: "pointer",
            fontWeight: myTab === t.id ? 700 : 400,
            background: myTab === t.id ? "#34d399" : "#1a1e28",
            color: myTab === t.id ? "#000" : "#94a3b8",
            border: myTab === t.id ? "none" : "1px solid #2d3347",
          }}>{t.label}</button>
        ))}
      </div>
      {myTab === "pass"    && <MyPassTab    phone={authPhone} />}
      {myTab === "booking" && <MyBookingTab phone={authPhone} showToast={showToast} />}
      {myTab === "log"     && <MyLogTab     phone={authPhone} />}
      {myTab === "swing"   && <MySwingTab   phone={authPhone} />}
      {myTab === "setting" && <MySettingTab phone={authPhone} showToast={showToast} />}
    </div>
  );
}

// ─────────────────────────────────────────────
//  별점 팝업 컴포넌트
// ─────────────────────────────────────────────
function RatingPopup({ target, phone, onSubmit, onClose }) {
  const [star, setStar]       = useState(0);
  const [hover, setHover]     = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const LABELS = ["", "별로예요", "그저 그래요", "괜찮아요", "좋았어요", "최고예요!"];
  const COLORS = ["", "#f87171", "#fbbf24", "#fbbf24", "#34d399", "#34d399"];

  const doSubmit = async () => {
    if (!star) { return; }
    setSubmitting(true);
    try {
      await onSubmit(star, comment);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.8)",
      zIndex:2000, display:"flex", alignItems:"flex-end", justifyContent:"center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"#12151c", borderRadius:"20px 20px 0 0",
        width:"100%", maxWidth:480, padding:24,
        border:"1px solid #2d3347",
      }}>
        {/* 헤더 */}
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:32, marginBottom:6 }}>⭐</div>
          <div style={{ fontSize:15, fontWeight:900, marginBottom:4 }}>레슨 어떠셨나요?</div>
          <div style={{ fontSize:11, color:"#94a3b8" }}>
            {target.coachName} · {target.lessonDate} · {target.lessonType}
          </div>
        </div>

        {/* 별점 선택 */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:6 }}>
          {[1,2,3,4,5].map(s => (
            <div key={s}
              onClick={() => setStar(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              style={{
                fontSize:36, cursor:"pointer",
                transition:"transform .1s",
                transform: (hover||star) >= s ? "scale(1.15)" : "scale(1)",
                filter: (hover||star) >= s ? "none" : "grayscale(1) opacity(.3)",
              }}>⭐</div>
          ))}
        </div>

        {/* 별점 레이블 */}
        <div style={{
          textAlign:"center", fontSize:13, fontWeight:700,
          height:20, marginBottom:16,
          color: COLORS[hover||star] || "#4b5675",
          transition:"color .15s",
        }}>
          {LABELS[hover||star] || "별점을 선택해주세요"}
        </div>

        {/* 한 줄 코멘트 */}
        <div style={{ marginBottom:16 }}>
          <textarea
            placeholder="한 줄 코멘트 (선택, 최대 100자)"
            maxLength={100}
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            style={{
              ...INP, resize:"none", fontSize:12,
              lineHeight:1.6,
            }}
          />
          <div style={{ textAlign:"right", fontSize:9, color:"#4b5675", marginTop:2 }}>
            {comment.length}/100
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{
            flex:1, padding:"10px 0", borderRadius:9, fontSize:12, cursor:"pointer",
            background:"#1a1e28", border:"1px solid #2d3347", color:"#94a3b8",
            fontFamily:"'Noto Sans KR', sans-serif",
          }}>나중에</button>
          <button onClick={doSubmit} disabled={!star || submitting} style={{
            flex:2, padding:"10px 0", borderRadius:9, fontSize:13, fontWeight:700,
            cursor: !star || submitting ? "not-allowed" : "pointer",
            background: star ? "#34d399" : "#2d3347",
            color: star ? "#000" : "#4b5675",
            border:"none", transition:"all .15s",
            fontFamily:"'Noto Sans KR', sans-serif",
            opacity: submitting ? .6 : 1,
          }}>
            {submitting ? "제출 중..." : star ? `${star}점으로 평가하기` : "별점을 선택해주세요"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MyPassTab({ phone }) {
  const [passes, setPasses]   = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiGet({ action: "getMyPasses", phone }).then(setPasses).catch(() => {}).finally(() => setLoading(false));
  }, [phone]);
  if (loading) return <Spinner />;
  if (!passes.length) return <div style={{ color: "#4b5675", textAlign: "center", padding: 24, fontSize: 12 }}>보유 수강권이 없습니다.</div>;
  return passes.map(p => (
    <div key={p.수강권ID} style={{
      background: "linear-gradient(135deg,rgba(52,211,153,.11),rgba(56,189,248,.05))",
      border: "1px solid rgba(52,211,153,.22)", borderRadius: 12, padding: 12, marginBottom: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", marginBottom: 4 }}>🎫 {p.수강권종류}</div>
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 2 }}>
        {p.잔여횟수} <span style={{ fontSize: 12, color: "#94a3b8" }}>/ {p.총횟수}회</span>
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8" }}>만료 {p.만료일}</div>
      <div style={{ height: 3, background: "#1f2435", borderRadius: 2, marginTop: 8 }}>
        <div style={{ height: 3, background: "#34d399", borderRadius: 2, width: `${Math.min(100, (Number(p.잔여횟수) / Number(p.총횟수)) * 100)}%` }} />
      </div>
    </div>
  ));
}

function MyBookingTab({ phone, showToast }) {
  const [viewMode, setViewMode]   = useState("calendar");   // "calendar" | "list" | "repeat"
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [calYear, setCalYear]     = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]   = useState(new Date().getMonth());
  const [selDate, setSelDate]     = useState("");
  const [listType, setListType]   = useState("upcoming");
  const [repeats, setRepeats]     = useState([]);
  const [repeatLoading, setRepeatLoading] = useState(false);

  // 전체 예약 로드 (달력뷰는 전체 필요)
  useEffect(() => {
    setLoading(true);
    apiGet({ action: "getMyBookings", phone, type: "all" })
      .then(rows => setBookings(rows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [phone]);

  const cancel = async (id, name) => {
    if (!window.confirm("예약을 취소하시겠습니까?")) return;
    try {
      await apiPost({ action: "cancel", bookingId: id, name, phone });
      showToast("✅ 예약이 취소되었습니다.");
      // 재로드
      setLoading(true);
      apiGet({ action: "getMyBookings", phone, type: "all" })
        .then(rows => setBookings(rows || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch (e) { showToast("❌ " + e.message); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const DOW_KR = ["일", "월", "화", "수", "목", "금", "토"];

  // ── 날짜별 예약 맵 생성
  const bookingMap = {};
  bookings.forEach(b => {
    const d = String(b.날짜 || "").slice(0, 10);
    if (!d) return;
    if (!bookingMap[d]) bookingMap[d] = [];
    bookingMap[d].push(b);
  });

  // ── 달력 계산
  const firstDay  = new Date(calYear, calMonth, 1).getDay();   // 1일의 요일
  const lastDate  = new Date(calYear, calMonth + 1, 0).getDate(); // 마지막 일
  const calCells  = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= lastDate; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);

  const fmtDate = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // 선택 날짜의 예약 목록
  const selBookings = selDate ? (bookingMap[selDate] || []) : [];

  // 상태별 색상
  const statusColor = { "예약": "#34d399", "완료": "#38bdf8", "취소": "#4b5675", "노쇼": "#f87171" };

  // ── 리스트뷰용 필터
  const listBookings = bookings
    .filter(b => {
      const d = String(b.날짜 || "").slice(0, 10);
      if (listType === "upcoming") return d >= today && b.상태 === "예약";
      return d < today || b.상태 !== "예약";
    })
    .sort((a, b) => {
      const da = String(a.날짜).slice(0, 10);
      const db = String(b.날짜).slice(0, 10);
      return listType === "upcoming" ? da.localeCompare(db) : db.localeCompare(da);
    });

  return (
    <div>
      {/* 뷰 모드 전환 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { id: "calendar", label: "📅 달력" },
          { id: "list",     label: "📋 목록" },
          { id: "repeat",   label: "🔁 반복" },
        ].map(v => (
          <button key={v.id} onClick={() => {
            setViewMode(v.id); setSelDate("");
            if (v.id === "repeat" && repeats.length === 0) {
              setRepeatLoading(true);
              apiGet({ action:"getMyRepeats", phone })
                .then(r => setRepeats(r||[]))
                .catch(()=>{})
                .finally(()=>setRepeatLoading(false));
            }
          }} style={{
            flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, cursor: "pointer",
            fontWeight: viewMode === v.id ? 700 : 400,
            background: viewMode === v.id ? "#34d399" : "#1a1e28",
            color: viewMode === v.id ? "#000" : "#94a3b8",
            border: viewMode === v.id ? "none" : "1px solid #2d3347",
          }}>{v.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* ══ 달력 뷰 ══ */}
          {viewMode === "calendar" && (
            <div>
              {/* 월 네비게이션 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button onClick={() => {
                  if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
                  else setCalMonth(m => m - 1);
                  setSelDate("");
                }} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer", padding: "0 8px" }}>‹</button>
                <div style={{ fontSize: 14, fontWeight: 900 }}>
                  {calYear}년 {calMonth + 1}월
                </div>
                <button onClick={() => {
                  if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
                  else setCalMonth(m => m + 1);
                  setSelDate("");
                }} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer", padding: "0 8px" }}>›</button>
              </div>

              {/* 요일 헤더 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
                {DOW_KR.map((d, i) => (
                  <div key={d} style={{
                    textAlign: "center", fontSize: 10, fontWeight: 700, padding: "4px 0",
                    color: i === 0 ? "#f87171" : i === 6 ? "#38bdf8" : "#4b5675",
                  }}>{d}</div>
                ))}
              </div>

              {/* 날짜 셀 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                {calCells.map((day, idx) => {
                  if (!day) return <div key={`e${idx}`} />;
                  const dateStr  = fmtDate(calYear, calMonth, day);
                  const dayBk    = bookingMap[dateStr] || [];
                  const isToday  = dateStr === today;
                  const isSel    = dateStr === selDate;
                  const dow      = (firstDay + day - 1) % 7;
                  const hasBook  = dayBk.length > 0;
                  const allDone  = hasBook && dayBk.every(b => b.상태 !== "예약");

                  return (
                    <div key={dateStr} onClick={() => setSelDate(isSel ? "" : dateStr)}
                      style={{
                        borderRadius: 8, padding: "6px 2px", textAlign: "center",
                        cursor: "pointer", minHeight: 46, position: "relative",
                        background: isSel ? "#34d399" : isToday ? "rgba(52,211,153,.12)" : "transparent",
                        border: `1px solid ${isSel ? "#34d399" : isToday ? "rgba(52,211,153,.4)" : "#2d3347"}`,
                        transition: "all .12s",
                      }}>
                      <div style={{
                        fontSize: 12, fontWeight: isToday || isSel ? 900 : 400,
                        color: isSel ? "#000" : dow === 0 ? "#f87171" : dow === 6 ? "#38bdf8" : "#e2e8f0",
                      }}>{day}</div>
                      {/* 예약 도트 */}
                      {hasBook && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3, flexWrap: "wrap" }}>
                          {dayBk.slice(0, 3).map((b, i) => (
                            <div key={i} style={{
                              width: 5, height: 5, borderRadius: "50%",
                              background: isSel ? "rgba(0,0,0,.4)" : (statusColor[b.상태] || "#94a3b8"),
                            }}/>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 범례 */}
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {Object.entries(statusColor).map(([s, c]) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#94a3b8" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                    {s}
                  </div>
                ))}
              </div>

              {/* 선택된 날짜 예약 목록 */}
              {selDate && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", marginBottom: 8 }}>
                    📅 {selDate.slice(5).replace("-", "/")} ({DOW_KR[new Date(selDate).getDay()]}) 예약
                  </div>
                  {selBookings.length === 0 ? (
                    <div style={{ color: "#4b5675", fontSize: 12, textAlign: "center", padding: "16px 0" }}>
                      이 날 예약이 없습니다.
                    </div>
                  ) : selBookings.map(b => (
                    <BookingCard key={b.예약ID} booking={b}
                      onCancel={() => cancel(b.예약ID, b.수강생명)}
                      canCancel={String(b.날짜).slice(0,10) >= today && b.상태 === "예약"}
                      statusColor={statusColor}
                    />
                  ))}
                </div>
              )}

              {/* 이달 요약 */}
              {!selDate && (() => {
                const monthStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}`;
                const monthBk  = bookings.filter(b => String(b.날짜).slice(0,7) === monthStr);
                const upcoming = monthBk.filter(b => b.상태 === "예약").length;
                const done     = monthBk.filter(b => b.상태 === "완료").length;
                if (monthBk.length === 0) return (
                  <div style={{ textAlign: "center", color: "#4b5675", fontSize: 12, padding: "20px 0", marginTop: 12 }}>
                    이 달 예약 내역이 없습니다.
                  </div>
                );
                return (
                  <div style={{ marginTop: 14, background: "#181c25", border: "1px solid #2d3347", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#4b5675", marginBottom: 8 }}>{calYear}년 {calMonth+1}월 요약</div>
                    <div style={{ display: "flex", gap: 14 }}>
                      <div><div style={{ fontSize: 18, fontWeight: 900, color: "#34d399" }}>{upcoming}</div><div style={{ fontSize: 9, color: "#94a3b8" }}>예약</div></div>
                      <div><div style={{ fontSize: 18, fontWeight: 900, color: "#38bdf8" }}>{done}</div><div style={{ fontSize: 9, color: "#94a3b8" }}>완료</div></div>
                      <div><div style={{ fontSize: 18, fontWeight: 900, color: "#94a3b8" }}>{monthBk.length}</div><div style={{ fontSize: 9, color: "#94a3b8" }}>전체</div></div>
                    </div>
                    <div style={{ fontSize: 10, color: "#4b5675", marginTop: 8 }}>날짜를 탭하면 해당일 예약을 확인합니다.</div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ══ 목록 뷰 ══ */}
          {viewMode === "list" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[
                  { id: "upcoming", label: "다가오는 예약" },
                  { id: "past",     label: "지난 예약" },
                ].map(t => (
                  <button key={t.id} onClick={() => setListType(t.id)} style={{
                    flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, cursor: "pointer",
                    fontWeight: listType === t.id ? 700 : 400,
                    background: listType === t.id ? "#1f2435" : "#1a1e28",
                    color: listType === t.id ? "#34d399" : "#94a3b8",
                    border: `1px solid ${listType === t.id ? "#34d399" : "#2d3347"}`,
                  }}>{t.label}</button>
                ))}
              </div>
              {listBookings.length === 0 ? (
                <div style={{ color: "#4b5675", textAlign: "center", fontSize: 12, padding: 24 }}>예약이 없습니다.</div>
              ) : listBookings.map(b => (
                <BookingCard key={b.예약ID} booking={b}
                  onCancel={() => cancel(b.예약ID, b.수강생명)}
                  canCancel={listType === "upcoming" && b.상태 === "예약"}
                  statusColor={statusColor}
                />
              ))}
            </div>
          )}
          {/* ══ 반복 예약 뷰 ══ */}
          {viewMode === "repeat" && (
            <RepeatBookingTab
              phone={phone}
              repeats={repeats}
              loading={repeatLoading}
              showToast={showToast}
              onRefresh={() => {
                // 달력·목록 예약 새로고침
                setLoading(true);
                apiGet({ action:"getMyBookings", phone, type:"all" })
                  .then(rows => setBookings(rows||[]))
                  .catch(()=>{})
                  .finally(()=>setLoading(false));
                // 반복예약 목록도 새로고침
                setRepeatLoading(true);
                apiGet({ action:"getMyRepeats", phone })
                  .then(r => setRepeats(r||[]))
                  .catch(()=>{})
                  .finally(()=>setRepeatLoading(false));
              }}
              onCancel={async (repeatId) => {
                try {
                  await apiPost({ action:"cancelRepeat", repeatId, phone });
                  showToast("✅ 반복 예약이 취소되었습니다.");
                  setRepeatLoading(true);
                  apiGet({ action:"getMyRepeats", phone })
                    .then(r => setRepeats(r||[]))
                    .catch(()=>{})
                    .finally(()=>setRepeatLoading(false));
                  // 달력·목록도 새로고침
                  setLoading(true);
                  apiGet({ action:"getMyBookings", phone, type:"all" })
                    .then(rows => setBookings(rows||[]))
                    .catch(()=>{})
                    .finally(()=>setLoading(false));
                } catch(e) { showToast("❌ " + e.message); }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── 예약 카드 (달력·목록 공용)
function BookingCard({ booking: b, onCancel, canCancel, statusColor }) {
  const sc = statusColor[b.상태] || "#94a3b8";
  const dateStr = String(b.날짜 || "").slice(0, 10);
  const DOW_KR  = ["일","월","화","수","목","금","토"];
  const dow     = dateStr ? DOW_KR[new Date(dateStr).getDay()] : "";
  return (
    <div style={{
      background: "#181c25", borderRadius: 10, padding: "10px 12px", marginBottom: 8,
      border: `1px solid ${sc}33`,
      borderLeft: `3px solid ${sc}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 700,
              background: sc + "22", color: sc,
            }}>{b.상태}</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{b.프로명}</span>
          </div>
          <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600, marginBottom: 2 }}>
            {b.레슨종류}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            📅 {dateStr} ({dow}) · ⏰ {String(b.시작시간 || "").slice(0,5)}
          </div>
          {b.요청사항 && (
            <div style={{ fontSize: 10, color: "#4b5675", marginTop: 3 }}>💬 {b.요청사항}</div>
          )}
        </div>
        {canCancel && (
          <button onClick={onCancel} style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 10, cursor: "pointer", flexShrink: 0,
            background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.3)", color: "#f87171",
          }}>취소</button>
        )}
      </div>
    </div>
  );
}

// ── 반복 예약 탭 컴포넌트
function RepeatBookingTab({ phone, repeats, loading, showToast, onCancel, onRefresh }) {
  const [showForm, setShowForm]   = useState(false);
  const [coaches, setCoaches]     = useState([]);
  const [submitting, setSubmitting] = useState(false);
  // 등록 폼 state
  const [selCoach, setSelCoach]   = useState("");
  const [selLesson, setSelLesson] = useState("개인30분");
  const [selDow, setSelDow]       = useState(1); // 0=일~6=토
  const [selTime, setSelTime]     = useState("10:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [myName, setMyName]       = useState("");
  const [myPhone, setMyPhone]     = useState(phone || "");
  const [cycle, setCycle]         = useState("매주"); // "매주" | "격주"

  const DOW_KR     = ["일","월","화","수","목","금","토"];
  const LESSON_TYPES = ["개인30분","개인1시간","그룹1시간","체험30분","주니어45분"];
  // 20분 단위 시간 목록 (06:00 ~ 21:40)
  const TIMES = ["06:00","06:20","06:40","07:00","07:20","07:40","08:00","08:20","08:40","09:00","09:20","09:40","10:00","10:20","10:40","11:00","11:20","11:40","12:00","12:20","12:40","13:00","13:20","13:40","14:00","14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40","17:00","17:20","17:40","18:00","18:20","18:40","19:00","19:20","19:40","20:00","20:20","20:40","21:00","21:20","21:40"];

  // 폼 열 때 프로 목록 로드
  const openForm = async () => {
    setShowForm(true);
    if (coaches.length === 0) {
      try {
        const c = await apiGet({ action:"getCoaches" });
        setCoaches(c||[]);
        if (c && c.length > 0) setSelCoach(c[0].id);
      } catch(e) {}
    }
  };

  // 반복 예약 등록
  const submit = async () => {
    if (!selCoach || !startDate || !myName || !myPhone) {
      showToast("프로·시작일·이름·연락처는 필수입니다."); return;
    }
    if (endDate && startDate >= endDate) { showToast("종료일은 시작일보다 이후여야 합니다."); return; }
    setSubmitting(true);
    try {
      const res = await apiPost({
        action: "createRepeat",
        coachId: selCoach,
        lessonType: selLesson,
        dow: selDow,
        startTime: selTime,
        startDate,
        endDate: endDate || "",   // 비워두면 수강권 만료일 자동 적용
        name: myName,
        phone: myPhone,
        cycle,
      });
      const immediateCount = (res?.immediate || []).length;
      showToast(`✅ 반복 예약 등록 완료!${immediateCount > 0 ? " 이번 주 예약도 즉시 생성됐습니다." : ""}`);
      setShowForm(false);
      if (onRefresh) onRefresh(); // 달력·목록 새로고침
    } catch(e) { showToast("❌ " + e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      {/* 등록 버튼 */}
      <button onClick={showForm ? () => setShowForm(false) : openForm} style={{
        width:"100%", padding:"9px 0", borderRadius:9, fontSize:12, fontWeight:700,
        cursor:"pointer", marginBottom:14,
        background: showForm ? "#1a1e28" : "rgba(52,211,153,.15)",
        border: showForm ? "1px solid #2d3347" : "1px solid rgba(52,211,153,.3)",
        color: showForm ? "#94a3b8" : "#34d399",
      }}>
        {showForm ? "✕ 닫기" : "🔁 반복 예약 등록"}
      </button>

      {/* 등록 폼 */}
      {showForm && (
        <div style={{
          background:"#181c25", border:"1px solid rgba(52,211,153,.2)",
          borderRadius:12, padding:14, marginBottom:14,
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#34d399", marginBottom:12 }}>
            🔁 반복 예약 설정
          </div>

          {/* 이름·연락처 */}
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>이름 *</div>
              <input value={myName} onChange={e=>setMyName(e.target.value)}
                placeholder="이름" style={{ ...INP, fontSize:11 }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>연락처 *</div>
              <input value={myPhone} onChange={e=>setMyPhone(e.target.value)}
                placeholder="010-0000-0000" style={{ ...INP, fontSize:11 }} />
            </div>
          </div>

          {/* 프로 선택 */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>프로 선택 *</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {coaches.map(c => (
                <button key={c.id} onClick={() => setSelCoach(c.id)} style={{
                  padding:"5px 10px", borderRadius:6, fontSize:10, cursor:"pointer",
                  fontWeight: selCoach===c.id ? 700 : 400,
                  background: selCoach===c.id ? (c.color||"#34d399") : "#1a1e28",
                  color: selCoach===c.id ? "#000" : "#94a3b8",
                  border: selCoach===c.id ? "none" : "1px solid #2d3347",
                }}>{c.name}</button>
              ))}
            </div>
          </div>

          {/* 레슨 종류 */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>레슨 종류 *</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {LESSON_TYPES.map(t => (
                <button key={t} onClick={() => setSelLesson(t)} style={{
                  padding:"4px 8px", borderRadius:5, fontSize:10, cursor:"pointer",
                  fontWeight: selLesson===t ? 700 : 400,
                  background: selLesson===t ? "#34d399" : "#1a1e28",
                  color: selLesson===t ? "#000" : "#94a3b8",
                  border: selLesson===t ? "none" : "1px solid #2d3347",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* 주기 선택 */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>반복 주기 *</div>
            <div style={{ display:"flex", gap:6 }}>
              {["매주","격주"].map(c => (
                <button key={c} onClick={() => setCycle(c)} style={{
                  flex:1, padding:"8px 0", borderRadius:7, fontSize:12, cursor:"pointer",
                  fontWeight: cycle===c ? 700 : 400,
                  background: cycle===c ? "#34d399" : "#1a1e28",
                  color: cycle===c ? "#000" : "#94a3b8",
                  border: cycle===c ? "none" : "1px solid #2d3347",
                }}>{c === "매주" ? "🔁 매주" : "🔂 격주"}</button>
              ))}
            </div>
            {cycle === "격주" && (
              <div style={{ fontSize:9, color:"#4b5675", marginTop:4, padding:"5px 8px",
                background:"rgba(56,189,248,.06)", border:"1px solid rgba(56,189,248,.15)", borderRadius:6 }}>
                💡 격주: 2주마다 한 번 자동 예약
              </div>
            )}
          </div>

          {/* 요일 선택 */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>{cycle} 반복 요일 *</div>
            <div style={{ display:"flex", gap:4 }}>
              {DOW_KR.map((d,i) => (
                <button key={i} onClick={() => setSelDow(i)} style={{
                  flex:1, padding:"6px 0", borderRadius:6, fontSize:11, cursor:"pointer",
                  fontWeight: selDow===i ? 700 : 400,
                  background: selDow===i ? "#34d399" : "#1a1e28",
                  color: selDow===i ? "#000" : i===0?"#f87171":i===6?"#38bdf8":"#94a3b8",
                  border: selDow===i ? "none" : "1px solid #2d3347",
                }}>{d}</button>
              ))}
            </div>
          </div>

          {/* 시간 선택 */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>시작 시간 *</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:3 }}>
              {TIMES.map(t => (
                <button key={t} onClick={() => setSelTime(t)} style={{
                  padding:"5px 2px", borderRadius:5, fontSize:10, cursor:"pointer", textAlign:"center",
                  fontWeight: selTime===t ? 700 : 400,
                  background: selTime===t ? "#34d399" : "#1a1e28",
                  color: selTime===t ? "#000" : "#94a3b8",
                  border: selTime===t ? "none" : "1px solid #2d3347",
                  fontFamily:"monospace",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* 시작일 ~ 종료일 */}
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>시작일 *</div>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{ ...INP, fontSize:11 }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>종료일 (선택)</div>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                placeholder="수강권 만료일 자동 적용"
                style={{ ...INP, fontSize:11 }} />
            </div>
          </div>
          <div style={{ fontSize:9, color:"#4b5675", marginBottom:12, padding:"5px 8px",
            background:"rgba(52,211,153,.05)", border:"1px solid rgba(52,211,153,.12)", borderRadius:6 }}>
            💡 종료일 미입력 시 수강권 만료일까지 자동 적용 · 수강권 소진 시 자동 종료
          </div>

          {/* 요약 미리보기 */}
          {selCoach && startDate && endDate && (
            <div style={{
              background:"rgba(52,211,153,.07)", border:"1px solid rgba(52,211,153,.2)",
              borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:11,
            }}>
              <div style={{ color:"#34d399", fontWeight:700, marginBottom:4 }}>📋 설정 요약</div>
              <div style={{ color:"#94a3b8", lineHeight:1.8 }}>
                <b style={{color:"#38bdf8"}}>{cycle}</b> <b style={{color:"#e2e8f0"}}>{DOW_KR[selDow]}요일 {selTime}</b><br/>
                {coaches.find(c=>c.id===selCoach)?.name} · {selLesson}<br/>
                {startDate} ~ {endDate}
              </div>
            </div>
          )}

          <button onClick={submit} disabled={submitting} style={{
            width:"100%", padding:"10px 0", borderRadius:9, fontSize:13, fontWeight:700,
            cursor: submitting ? "not-allowed" : "pointer",
            background:"#34d399", border:"none", color:"#000",
            opacity: submitting ? .6 : 1,
            fontFamily:"'Noto Sans KR', sans-serif",
          }}>{submitting ? "등록 중..." : "✅ 반복 예약 등록"}</button>
        </div>
      )}

      {/* 반복 예약 목록 */}
      {loading ? <Spinner /> : repeats.length === 0 ? (
        <div style={{ textAlign:"center", color:"#4b5675", fontSize:12, padding:"30px 0" }}>
          등록된 반복 예약이 없습니다.<br/>
          <span style={{ fontSize:11, color:"#2d3347" }}>위 버튼으로 등록해보세요.</span>
        </div>
      ) : repeats.map(r => (
        <div key={r["반복ID"]} style={{
          background:"#181c25", border:"1px solid #2d3347",
          borderLeft:"3px solid #34d399",
          borderRadius:10, padding:"11px 13px", marginBottom:8,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <div style={{ fontSize:24 }}>🔁</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:3 }}>
              {r["프로명"]} · {r["레슨종류"]}
            </div>
            <div style={{ fontSize:11, color:"#34d399", fontWeight:700, marginBottom:2 }}>
              {r["주기"]||"매주"} {r["요일명"]}요일 {String(r["시작시간"]||"").slice(0,5)}
            </div>
            <div style={{ fontSize:10, color:"#4b5675" }}>
              {String(r["시작일"]||"").slice(0,10)} ~ {String(r["종료일"]||"").slice(0,10)}
            </div>
            {r["마지막생성일"] && (
              <div style={{ fontSize:9, color:"#2d3347", marginTop:2 }}>
                마지막 생성: {String(r["마지막생성일"]).slice(0,10)}
              </div>
            )}
          </div>
          <button onClick={() => {
            if (window.confirm("반복 예약을 취소할까요?")) onCancel(r["반복ID"]);
          }} style={{
            padding:"5px 10px", borderRadius:6, fontSize:10, cursor:"pointer", flexShrink:0,
            background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.3)", color:"#f87171",
          }}>취소</button>
        </div>
      ))}
    </div>
  );
}

function MyLogTab({ phone }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiGet({ action: "getMyLessonLog", phone }).then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, [phone]);
  if (loading) return <Spinner />;
  if (!logs.length) return <div style={{ color: "#4b5675", textAlign: "center", fontSize: 12, padding: 20 }}>레슨 일지가 없습니다.</div>;
  return logs.map((l, i) => (
    <div key={l.일지ID || i} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399", marginTop: 3 }} />
        {i < logs.length - 1 && <div style={{ width: 1, flex: 1, background: "#2d3347", margin: "3px 0" }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "#4b5675", fontFamily: "monospace" }}>{l.레슨날짜} · {l.회차번호}회차</div>
        <div style={{ fontSize: 12, fontWeight: 700, margin: "2px 0" }}>{l.프로명} · {l.레슨종류}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "4px 0" }}>
          {safeArr(l.진도태그).map((t, j) => (
            <span key={j} style={{
              fontSize: 9, padding: "1px 6px", borderRadius: 4,
              background: "rgba(56,189,248,.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,.2)",
            }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{l.코멘트}</div>
      </div>
    </div>
  ));
}

function MySwingTab({ phone }) {
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiGet({ action: "getMySwingArchive", phone }).then(setArchive).catch(() => {}).finally(() => setLoading(false));
  }, [phone]);
  if (loading) return <Spinner />;
  if (!archive.length) return (
    <div style={{ color: "#4b5675", fontSize: 12, textAlign: "center", padding: 20, lineHeight: 1.8 }}>
      스윙 영상이 없습니다.<br />
      <span style={{ color: "#34d399" }}>게시판 → 스윙분석에서 영상을 올려보세요!</span>
    </div>
  );
  return (
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", padding: "8px 10px", background: "#181c25", borderRadius: 8, marginBottom: 12 }}>
        🎥 내 스윙 영상과 프로 피드백이 자동 수집됩니다.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {archive.map((item, i) => (
          <div key={i} style={{ background: "#181c25", border: "1px solid #2d3347", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: 64, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ fontSize: 22 }}>▶️</span>
              <div style={{ position: "absolute", bottom: 4, left: 6, fontSize: 9, color: "rgba(255,255,255,.6)", background: "rgba(0,0,0,.4)", padding: "1px 4px", borderRadius: 3 }}>
                {item.post?.작성일시?.slice(0, 10)}
              </div>
            </div>
            <div style={{ padding: "6px 8px" }}>
              {item.proFeedback?.[0] && <div style={{ fontSize: 9, color: "#34d399", marginBottom: 2 }}>🏌️ {item.proFeedback[0].작성자}</div>}
              <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>
                {item.proFeedback?.[0]?.내용?.slice(0, 40) || "피드백 대기 중..."}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MySettingTab({ phone, showToast }) {
  const [notif, setNotif] = useState({ booking: true, remind: true, pass: true, comment: true, reply: true });
  const SETTINGS = [
    { key: "booking", label: "예약 확정 / 취소",    sub: "카카오 알림톡" },
    { key: "remind",  label: "레슨 리마인더 (D-1)", sub: "카카오 알림톡" },
    { key: "comment", label: "프로 댓글 / 피드백",  sub: "PWA 푸시" },
    { key: "pass",    label: "수강권 만료 임박",     sub: "카카오 알림톡" },
    { key: "reply",   label: "대댓글 알림",          sub: "PWA 푸시" },
  ];
  const save = async () => {
    try {
      await apiPost({ action: "updateNotifSetting", phone, settings: JSON.stringify(notif) });
      showToast("✅ 알림 설정이 저장되었습니다.");
    } catch (e) { showToast("❌ " + e.message); }
  };
  return (
    <div>
      <div style={{ ...LBL, marginBottom: 10 }}>알림 설정</div>
      {SETTINGS.map(s => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#181c25", borderRadius: 8, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: "#4b5675" }}>{s.sub}</div>
          </div>
          <div onClick={() => setNotif(p => ({ ...p, [s.key]: !p[s.key] }))}
            style={{ width: 38, height: 20, borderRadius: 10, cursor: "pointer", background: notif[s.key] ? "#34d399" : "#2d3347", position: "relative", transition: "background .2s" }}>
            <div style={{ position: "absolute", top: 3, left: notif[s.key] ? 20 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
          </div>
        </div>
      ))}
      <Btn onClick={save} style={{ marginTop: 10 }}>저장</Btn>
      <div style={{ ...LBL, marginTop: 16, marginBottom: 10 }}>고객센터</div>
      {[
        { icon: "📞", label: "전화 연결 (010-0000-0000)", fn: () => window.open("tel:010-0000-0000") },
        { icon: "💬", label: "카카오톡 채널 상담",        fn: () => alert("카카오채널 준비 중") },
        { icon: "❓", label: "자주 묻는 질문 (FAQ)",      fn: () => alert("FAQ 준비 중") },
      ].map((item, i) => (
        <div key={i} onClick={item.fn} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#181c25", borderRadius: 8, marginBottom: 6, cursor: "pointer" }}>
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <span style={{ fontSize: 12 }}>{item.label}</span>
          <span style={{ marginLeft: "auto", color: "#4b5675" }}>›</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  게시판 (독립 컴포넌트)
// ─────────────────────────────────────────────
function WriteForm({ coaches, adminPw, onSubmit, onCancel }) {
  const [category, setCategory] = useState("자유게시판");
  const [title, setTitle]       = useState("");
  const [content, setContent]   = useState("");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [proTag, setProTag]     = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [isAnon, setIsAnon]     = useState(false);
  const [imgUrls, setImgUrls]   = useState([""]); // Google Drive URL 입력
  const [loading, setLoading]   = useState(false);
  const [inputPw, setInputPw]   = useState(""); // 공지사항 작성 시 비밀번호

  // Drive URL → 직접 표시 가능한 URL로 변환
  const convertDriveUrl = (u) => {
    if (!u) return "";
    const m1 = u.match(/\/file\/d\/([^/]+)/);
    if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    const m2 = u.match(/[?&]id=([^&]+)/);
    if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    return u;
  };

  // 유효한 이미지 URL만 attachments로 변환
  const getAttachments = () => {
    return imgUrls
      .map(u => u.trim())
      .filter(u => u.length > 0)
      .map(u => ({ type: "url", data: convertDriveUrl(u), name: "이미지" }));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !name.trim() || !phone.trim()) { alert("제목, 이름, 연락처를 입력해주세요."); return; }
    // 공지사항: 이미 로그인된 adminPw 또는 직접 입력한 비밀번호로 확인
    const effectivePw = adminPw || inputPw;
    if (category === "공지사항" && effectivePw !== "golf2026!") {
      alert("공지사항은 관리자 비밀번호가 필요합니다.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ category, title, content, name, phone, proTag, isSecret, isAnon, attachments: JSON.stringify(getAttachments()), password: effectivePw || "" });
    } finally { setLoading(false); }
  };

  const CATS = ["공지사항", "자유게시판", "스윙분석/질문방"];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
            fontWeight: category === c ? 700 : 400,
            background: category === c ? "#34d399" : "#1a1e28",
            color: category === c ? "#000" : "#94a3b8",
            border: category === c ? "none" : "1px solid #2d3347",
          }}>{c}</button>
        ))}
      </div>
      {/* 공지사항 선택 시 비밀번호 입력 (미로그인 상태일 때) */}
      {category === "공지사항" && !adminPw && (
        <div style={{
          marginBottom: 10, padding: "10px 12px",
          background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.25)",
          borderRadius: 9,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>
            🔒 관리자 전용 카테고리
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>
            공지사항 작성은 관리자 비밀번호가 필요합니다.
          </div>
          <input
            type="password"
            placeholder="관리자 비밀번호 입력"
            value={inputPw}
            onChange={e => setInputPw(e.target.value)}
            style={{ ...INP, fontSize: 11 }}
          />
        </div>
      )}
      {/* 공지사항 + 이미 로그인된 상태 */}
      {category === "공지사항" && adminPw && (
        <div style={{
          marginBottom: 10, padding: "8px 12px",
          background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.2)",
          borderRadius: 9, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>✅</span>
          <div style={{ fontSize: 11, color: "#34d399" }}>관리자로 로그인됨 — 공지사항 작성 가능</div>
        </div>
      )}

      {category === "스윙분석/질문방" && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#4b5675", marginBottom: 4 }}>프로 태그 *</div>
          <div style={{ display: "flex", gap: 6 }}>
            {coaches.map(c => (
              <button key={c.id} onClick={() => setProTag(c.id)} style={{
                flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, cursor: "pointer",
                fontWeight: proTag === c.id ? 700 : 400,
                background: proTag === c.id ? "rgba(52,211,153,.15)" : "#1a1e28",
                color: proTag === c.id ? "#34d399" : "#94a3b8",
                border: proTag === c.id ? "1px solid #34d399" : "1px solid #2d3347",
              }}>{c.icon} {c.name}</button>
            ))}
          </div>
        </div>
      )}
      <input placeholder="제목 (50자)" maxLength={50} value={title} onChange={e => setTitle(e.target.value)} style={{ ...INP, marginBottom: 6 }} />
      <textarea placeholder="내용 (1000자)" maxLength={1000} value={content} onChange={e => setContent(e.target.value)} rows={5} style={{ ...INP, resize: "vertical", marginBottom: 6 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input placeholder="이름" value={name} onChange={e => setName(e.target.value)} style={{ ...INP, flex: 1 }} />
        <input placeholder="연락처" value={phone} onChange={e => setPhone(e.target.value)} style={{ ...INP, flex: 1 }} />
      </div>
      {/* 이미지 URL 첨부 (Google Drive) */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#4b5675", marginBottom: 6, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span>📎 이미지 첨부 (Google Drive URL)</span>
          {imgUrls.length < 3 && (
            <button onClick={() => setImgUrls(p => [...p, ""])}
              style={{ fontSize: 10, color: "#38bdf8", background:"none", border:"none", cursor:"pointer" }}>
              + 추가
            </button>
          )}
        </div>
        {imgUrls.map((u, i) => (
          <div key={i} style={{ display:"flex", gap:4, marginBottom:4, alignItems:"center" }}>
            <input
              placeholder="https://drive.google.com/file/d/..."
              value={u}
              onChange={e => setImgUrls(p => p.map((v, j) => j===i ? e.target.value : v))}
              style={{ ...INP, flex:1, fontSize:10 }}
            />
            {imgUrls.length > 1 && (
              <button onClick={() => setImgUrls(p => p.filter((_,j) => j!==i))}
                style={{ fontSize:12, color:"#f87171", background:"none", border:"none", cursor:"pointer" }}>✕</button>
            )}
          </div>
        ))}
        {imgUrls.some(u=>u.trim()) && (
          <div style={{ fontSize:9, color:"#4b5675", marginTop:4, padding:"4px 8px", background:"rgba(56,189,248,.05)", borderRadius:5, border:"1px solid rgba(56,189,248,.12)" }}>
            💡 Drive → 파일 우클릭 → 공유 → "링크가 있는 모든 사용자" → 링크 복사
          </div>
        )}
      </div>
      {category === "스윙분석/질문방" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 10px", background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={isSecret} onChange={e => setIsSecret(e.target.checked)} />
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>🔒 비밀글로 등록</div><div style={{ fontSize: 10, color: "#4b5675" }}>나, 프로, 관리자만 열람 가능</div></div>
        </label>
      )}
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "6px 10px", background: "#1a1e28", borderRadius: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
        <span style={{ fontSize: 12, color: "#94a3b8" }}>🕵️ 이름 숨기기</span>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onCancel} variant="secondary" style={{ flex: 1 }}>취소</Btn>
        <Btn onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>{loading ? "등록 중..." : "✅ 등록"}</Btn>
      </div>
    </div>
  );
}

function CommentSection({ postId, phone, coaches, adminPw }) {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState("");
  const [name, setName]         = useState("");
  const [myPhone, setMyPhone]   = useState(phone || "");
  const [replyTo, setReplyTo]   = useState(null);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(() => {
    apiGet({ action: "getComments", postId, phone: myPhone }).then(setComments).catch(() => {});
  }, [postId, myPhone]);

  useEffect(() => { load(); }, [load]);

  const submit = async (parentId) => {
    if (!text.trim() || !name.trim() || !myPhone.trim()) { alert("이름, 연락처, 내용을 입력해주세요."); return; }
    setLoading(true);
    try {
      await apiPost({ action: "createComment", postId, parentCommentId: parentId || "", content: text, name, phone: myPhone, isAdmin: adminPw === "golf2026!" });
      setText(""); setReplyTo(null); load();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleLike = async (commentId) => {
    if (!myPhone) { alert("좋아요를 누르려면 연락처를 입력해주세요."); return; }
    try { await apiPost({ action: "toggleLike", targetType: "comment", targetId: commentId, phone: myPhone }); load(); }
    catch (e) { alert(e.message); }
  };

  const renderCmt = (c, depth = 0) => (
    <div key={c.댓글ID} style={{ marginLeft: depth * 14, marginBottom: 8 }}>
      <div style={{ borderLeft: `2px solid ${c.관리자여부 ? "#34d399" : depth ? "#38bdf8" : "#2d3347"}`, borderRadius: "0 8px 8px 0", padding: "7px 10px", background: c.관리자여부 ? "rgba(52,211,153,.05)" : "#181c25" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>{c.작성자}</span>
          {c.관리자여부 && <span style={{ fontSize: 9, background: "#34d399", color: "#000", padding: "1px 5px", borderRadius: 3, fontWeight: 900 }}>프로</span>}
          <span style={{ fontSize: 9, color: "#4b5675", marginLeft: "auto" }}>{c.작성일시?.slice(5, 16)}</span>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{c.내용}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={() => handleLike(c.댓글ID)} style={{ fontSize: 10, background: "none", border: "none", color: c.likedByMe ? "#38bdf8" : "#4b5675", cursor: "pointer" }}>👍 {c.좋아요수 || 0}</button>
          {depth === 0 && <button onClick={() => setReplyTo(replyTo === c.댓글ID ? null : c.댓글ID)} style={{ fontSize: 10, background: "none", border: "none", color: "#4b5675", cursor: "pointer" }}>↩️ 답글</button>}
        </div>
      </div>
      {replyTo === c.댓글ID && (
        <div style={{ marginLeft: 14, marginTop: 4, padding: 10, background: "#1a1e28", borderRadius: 8 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="답글..." rows={2} style={{ ...INP, resize: "none", marginBottom: 6 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="이름" value={name} onChange={e => setName(e.target.value)} style={{ ...INP, flex: 1 }} />
            <input placeholder="연락처" value={myPhone} onChange={e => setMyPhone(e.target.value)} style={{ ...INP, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Btn variant="secondary" onClick={() => setReplyTo(null)} style={{ flex: 1, padding: "6px 0", fontSize: 11 }}>취소</Btn>
            <Btn onClick={() => submit(c.댓글ID)} disabled={loading} style={{ flex: 2, padding: "6px 0", fontSize: 11 }}>{loading ? "등록 중..." : "등록"}</Btn>
          </div>
        </div>
      )}
      {c.replies?.map(r => renderCmt(r, 1))}
    </div>
  );

  return (
    <div>
      <div style={{ ...LBL, marginBottom: 10 }}>댓글 {comments.reduce((a, c) => a + 1 + (c.replies?.length || 0), 0)}개</div>
      {comments.map(c => renderCmt(c))}
      {!replyTo && (
        <div style={{ marginTop: 10, padding: 10, background: "#1a1e28", borderRadius: 10 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="댓글을 입력하세요..." maxLength={300} rows={2} style={{ ...INP, resize: "none", marginBottom: 6 }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input placeholder="이름" value={name} onChange={e => setName(e.target.value)} style={{ ...INP, flex: 1 }} />
            <input placeholder="연락처" value={myPhone} onChange={e => setMyPhone(e.target.value)} style={{ ...INP, flex: 1 }} />
          </div>
          <Btn onClick={() => submit(null)} disabled={loading} style={{ padding: "8px 0", fontSize: 11 }}>{loading ? "등록 중..." : "댓글 등록"}</Btn>
        </div>
      )}
    </div>
  );
}

function PostDetail({ post, phone, coaches, adminPw, onBack, showToast }) {
  const [full, setFull]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    apiGet({ action: "getPost", postId: post.게시글ID, phone, password: adminPw })
      .then(setFull)
      .catch(e => { if (e.message.includes("권한")) setNoAccess(true); else showToast(e.message); })
      .finally(() => setLoading(false));
  }, [post.게시글ID]);

  const handleLike = async () => {
    if (!phone) { showToast("좋아요를 누르려면 연락처가 필요합니다."); return; }
    try {
      const res = await apiPost({ action: "toggleLike", targetType: "post", targetId: post.게시글ID, phone });
      showToast(res.liked ? "👍 좋아요!" : "좋아요 취소");
    } catch (e) { showToast(e.message); }
  };

  if (noAccess) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 38, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>열람 권한이 없습니다</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>작성자 본인과 프로·관리자만 볼 수 있습니다.</div>
      <Btn onClick={onBack} variant="secondary">← 목록으로</Btn>
    </div>
  );

  const data = full || post;
  const attachments = safeArr(data.첨부파일);

  return (
    <div style={{ padding: "12px 14px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#34d399", fontSize: 12, cursor: "pointer", marginBottom: 10 }}>← 게시판</button>
      {loading ? <Spinner /> : (
        <>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>{data.제목}</div>
          <div style={{ fontSize: 10, color: "#4b5675", marginBottom: 12 }}>
            {data.익명여부 ? "익명" : data.작성자} · {data.작성일시?.slice(0, 16)} · 조회 {data.조회수}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, marginBottom: 14 }}>{data.내용}</div>
          {attachments.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
              {attachments.map((f, i) => (
                isImage(f.name)
                  ? <img key={i} src={f.data} alt={f.name} style={{ width: "100%", borderRadius: 8, cursor: "pointer" }} onClick={() => window.open(f.data)} />
                  : <a key={i} href={f.data} download={f.name} style={{ padding: "8px 10px", background: "#1a1e28", borderRadius: 8, fontSize: 11, color: "#38bdf8", textDecoration: "none", display: "block" }}>📎 {f.name}</a>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <button onClick={handleLike} style={{ background: "none", border: "none", color: full?.likedByMe ? "#38bdf8" : "#4b5675", fontSize: 13, cursor: "pointer" }}>
              👍 {data.좋아요수 || 0} {full?.likedByMe ? "(내가 좋아요)" : ""}
            </button>
          </div>
          <div style={{ borderTop: "1px solid #1f2435", paddingTop: 12 }}>
            <CommentSection postId={post.게시글ID} phone={phone} coaches={coaches} adminPw={adminPw} />
          </div>
        </>
      )}
    </div>
  );
}

function BoardScreen({ coaches, myPhone, adminPw, showToast }) {
  const [cat, setCat]         = useState("전체");
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [selPost, setSelPost] = useState(null);
  const [writing, setWriting] = useState(false);

  const CAT_COLOR = { "공지사항": "#f87171", "자유게시판": "#38bdf8", "스윙분석/질문방": "#fbbf24" };

  const load = useCallback(() => {
    setLoading(true);
    apiGet({ action: "getPosts", category: cat, phone: myPhone, page: 1 })
      .then(d => setPosts(d.posts || []))
      .catch(e => showToast(e.message))
      .finally(() => setLoading(false));
  }, [cat, myPhone]);

  useEffect(() => { load(); }, [load]);

  if (selPost) return <PostDetail post={selPost} phone={myPhone} coaches={coaches} adminPw={adminPw} onBack={() => { setSelPost(null); load(); }} showToast={showToast} />;
  if (writing) return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 14 }}>✏️ 글쓰기</div>
      <WriteForm coaches={coaches} adminPw={adminPw} onCancel={() => setWriting(false)}
        onSubmit={async p => { await apiPost({ action: "createPost", ...p }); showToast("✅ 등록 완료"); setWriting(false); load(); }} />
    </div>
  );

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>게시판</div>
        <button onClick={() => setWriting(true)} style={{ padding: "5px 12px", borderRadius: 8, background: "#34d399", color: "#000", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏️ 글쓰기</button>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }}>
        {["전체", "공지사항", "자유게시판", "스윙분석/질문방"].map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            flexShrink: 0, padding: "4px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
            fontWeight: cat === c ? 700 : 400, background: cat === c ? "#34d399" : "#1a1e28",
            color: cat === c ? "#000" : "#94a3b8", border: cat === c ? "none" : "1px solid #2d3347",
          }}>{c}</button>
        ))}
      </div>
      {loading ? <Spinner /> : posts.map(p => (
        <div key={p.게시글ID} onClick={() => setSelPost(p)} style={{
          background: p.상단고정 ? "rgba(251,191,36,.03)" : "#181c25",
          border: `1px solid ${p.상단고정 ? "rgba(251,191,36,.4)" : "#2d3347"}`,
          borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, background: (CAT_COLOR[p.카테고리] || "#94a3b8") + "22", color: CAT_COLOR[p.카테고리] || "#94a3b8", border: `1px solid ${(CAT_COLOR[p.카테고리] || "#94a3b8")}44` }}>{p.카테고리}</span>
            {p.상단고정 && <span style={{ fontSize: 9, color: "#fbbf24" }}>📌</span>}
            {p._isSecret && <span style={{ fontSize: 9, color: "#fbbf24" }}>🔒</span>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{p.제목}</div>
          {p.내용 && !p._isSecret && <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5, marginBottom: 5 }}>{String(p.내용).slice(0, 60)}{p.내용.length > 60 ? "..." : ""}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#4b5675" }}>{p.익명여부 ? "익명" : p.작성자} · {p.작성일시?.slice(5, 10)}</span>
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <span style={{ fontSize: 10, color: p.likedByMe ? "#38bdf8" : "#4b5675" }}>👍 {p.좋아요수 || 0}</span>
              <span style={{ fontSize: 10, color: "#4b5675" }}>💬 {p.commentCount || 0}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  관리자 (독립 컴포넌트)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  관리자 — PC 타임라인 뷰 + 모바일 뷰 통합
// ─────────────────────────────────────────────

// 화면 너비 훅
function useIsPC() {
  const [isPC, setIsPC] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const fn = () => setIsPC(window.innerWidth >= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isPC;
}

// 타임라인 날짜 유틸
function tl_pad(n) { return String(n).padStart(2, "0"); }
function tl_todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${tl_pad(d.getMonth()+1)}-${tl_pad(d.getDate())}`;
}
function tl_addDays(s, n) {
  const d = new Date(s); d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${tl_pad(d.getMonth()+1)}-${tl_pad(d.getDate())}`;
}
function tl_fmtKR(s) {
  const d = new Date(s);
  const DOW = ["일","월","화","수","목","금","토"];
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}
function tl_calcEnd(start, lessonType) {
  const [h,m] = start.split(":").map(Number);
  let dur = 30;
  if ((lessonType||"").includes("1시간")) dur = 60;
  else if ((lessonType||"").includes("45")) dur = 45;
  const total = h*60+m+dur;
  return `${tl_pad(Math.floor(total/60))}:${tl_pad(total%60)}`;
}

// PC 타임라인 컴포넌트
function AdminTimeline({ coaches, adminPw, showToast }) {
  const SLOT_H  = 32;  // 20분 단위 슬롯 높이
  const COL_W   = 200;
  const TIME_W  = 56;
  const START_H = 9;
  const END_H   = 22;
  const TOTAL   = (END_H - START_H) * 3;  // 20분 단위: 시간당 3슬롯

  const [selDate, setSelDate]   = useState(tl_todayStr());
  const [bookings, setBookings] = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [selSlot, setSelSlot]   = useState(null);  // { coach, time, booking }
  const [panelTab, setPanelTab] = useState("detail");
  const [nowTop, setNowTop]     = useState(null);
  // 대행 예약 폼 상태
  const [bkName, setBkName]   = useState("");
  const [bkPhone, setBkPhone] = useState("");
  const [bkLesson, setBkLesson] = useState("개인30분");
  const [bkNote, setBkNote]   = useState("");
  const [bkSubmitting, setBkSubmitting] = useState(false);

  const LESSON_TYPES = ["개인30분","개인1시간","그룹1시간","체험30분","주니어45분"];

  // 데이터 로드
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bkData, statsData] = await Promise.all([
        apiGet({ action:"getBookings", date:selDate }),
        apiPost({ action:"getConsoleStats", password:adminPw, date:selDate }),
      ]);
      setBookings(bkData || []);
      setStats(statsData);
    } catch(e) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [selDate, adminPw]);

  useEffect(() => { load(); }, [load]);

  // 현재시간 라인
  useEffect(() => {
    const calc = () => {
      if (selDate !== tl_todayStr()) { setNowTop(null); return; }
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      if (h < START_H || h >= END_H) { setNowTop(null); return; }
      setNowTop(((h - START_H) * 60 + m) / 20 * SLOT_H);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [selDate]);

  // 슬롯 클릭
  const onSlotClick = (coach, time, booking) => {
    setSelSlot({ coach, time, booking });
    setPanelTab(booking ? "detail" : "book");
    setBkName(""); setBkPhone(""); setBkLesson("개인30분"); setBkNote("");
  };

  // 출석 처리
  const doAttend = async (status) => {
    if (!selSlot?.booking) return;
    try {
      await apiPost({ action:"checkAttend", bookingId:selSlot.booking["예약ID"], status, password:adminPw });
      showToast(`✅ ${status} 처리 완료`);
      setSelSlot(null);
      load();
    } catch(e) { showToast("❌ " + e.message); }
  };

  // 예약 취소
  const doCancel = async () => {
    if (!selSlot?.booking) return;
    if (!window.confirm(`${selSlot.booking["수강생명"]}님의 예약을 취소할까요?`)) return;
    try {
      await apiPost({ action:"adminCancel", bookingId:selSlot.booking["예약ID"], reason:"관리자 취소", password:adminPw });
      showToast("✅ 예약 취소 완료");
      setSelSlot(null);
      load();
    } catch(e) { showToast("❌ " + e.message); }
  };

  // 대행 예약
  const doBook = async () => {
    if (!bkName || !bkPhone) { showToast("이름과 연락처를 입력해주세요."); return; }
    setBkSubmitting(true);
    try {
      const res = await apiPost({
        action:"book", coachId:selSlot.coach.id,
        lessonType:bkLesson, date:selDate,
        startTime:selSlot.time,
        name:bkName, phone:bkPhone, note:bkNote,
      });
      showToast(`✅ 예약 완료! 부스 ${res.boothNo}번`);
      setSelSlot(null);
      load();
    } catch(e) { showToast("❌ " + e.message); }
    finally { setBkSubmitting(false); }
  };

  // 슬롯 높이 계산
  const timeToTop = (hhmm) => {
    const [h,m] = hhmm.split(":").map(Number);
    return ((h - START_H) * 60 + m) / 20 * SLOT_H;
  };
  const durSlots = (lessonType) => {
    if ((lessonType||"").includes("1시간")) return 3;   // 60분 = 3슬롯
    if ((lessonType||"").includes("45"))   return 2.25; // 45분 = 2.25슬롯
    return 1.5; // 30분 = 1.5슬롯
  };

  const statusColor = { "예약":"#34d399","완료":"#38bdf8","노쇼":"#f87171","취소":"#4b5675" };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 120px)", overflow:"hidden", margin:"0 -14px" }}>
      {/* 타임라인 영역 */}
      <div style={{ flex:1, overflow:"auto", position:"relative" }}>
        {/* 날짜 네비 + 통계 */}
        <div style={{
          position:"sticky", top:0, zIndex:50,
          background:"#0d0f14", borderBottom:"2px solid #1f2435",
          display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
        }}>
          <button onClick={() => setSelDate(d => tl_addDays(d,-1))}
            style={{ background:"none", border:"none", color:"#94a3b8", fontSize:18, cursor:"pointer" }}>‹</button>
          <div style={{ fontWeight:700, fontSize:13, minWidth:160, textAlign:"center" }}>{tl_fmtKR(selDate)}</div>
          <button onClick={() => setSelDate(d => tl_addDays(d,1))}
            style={{ background:"none", border:"none", color:"#94a3b8", fontSize:18, cursor:"pointer" }}>›</button>
          <button onClick={() => setSelDate(tl_todayStr())}
            style={{ fontSize:10, padding:"3px 8px", borderRadius:5, background:"#1a1e28", border:"1px solid #2d3347", color:"#94a3b8", cursor:"pointer" }}>오늘</button>
          <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
            {[
              {label:"예약", val:stats?.totalBookings??"-", color:"#34d399"},
              {label:"완료", val:stats?.doneBookings??"-",  color:"#38bdf8"},
              {label:"노쇼", val:stats?.noShowBookings??"-",color:"#f87171"},
            ].map(s => (
              <div key={s.label} style={{ background:"#181c25", border:"1px solid #2d3347", borderRadius:7, padding:"4px 10px", textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:900, color:s.color, fontFamily:"monospace" }}>{s.val}</div>
                <div style={{ fontSize:9, color:"#4b5675" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={load} style={{ background:"none", border:"1px solid #2d3347", borderRadius:6, color:"#94a3b8", fontSize:13, padding:"4px 8px", cursor:"pointer" }}>🔄</button>
          {loading && <div style={{ fontSize:10, color:"#34d399" }}>⏳</div>}
        </div>

        {/* 프로 헤더 + 타임라인 */}
        <div style={{ display:"flex", minWidth:"fit-content" }}>
          {/* 시간 축 */}
          <div style={{ width:TIME_W, flexShrink:0, borderRight:"1px solid #1f2435", position:"sticky", left:0, zIndex:40, background:"#0d0f14" }}>
            {/* 헤더 빈칸 */}
            <div style={{ height:48, borderBottom:"2px solid #1f2435" }} />
            {/* 시간 눈금 */}
            {Array.from({length:TOTAL}, (_,i) => {
              const totalMin2 = START_H * 60 + i * 20;
              const h = Math.floor(totalMin2 / 60);
              const m = totalMin2 % 60;
              const isHour = m === 0;
              return (
                <div key={i} style={{
                  height:SLOT_H, borderBottom:`1px solid ${isHour?"#1f2435":"#0f111a"}`,
                  display:"flex", alignItems:"flex-start", padding:"2px 6px 0",
                  fontFamily:"monospace", fontSize:9,
                  color: isHour ? "#4b5675" : "transparent",
                }}>{`${tl_pad(h)}:00`}</div>
              );
            })}
          </div>

          {/* 프로 컬럼들 */}
          {coaches.map(coach => {
            const coachBk = bookings.filter(b => b["프로ID"] === coach.id);
            const activeCnt = coachBk.filter(b => b["상태"]==="예약").length;
            return (
              <div key={coach.id} style={{ width:COL_W, flexShrink:0, borderRight:"1px solid #1f2435", position:"relative" }}>
                {/* 프로 헤더 */}
                <div style={{
                  height:48, borderBottom:`2px solid ${coach.color||"#34d399"}`,
                  display:"flex", alignItems:"center", gap:8, padding:"0 10px",
                  background:"#0d0f14", position:"sticky", top:48, zIndex:30,
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:"50%", flexShrink:0,
                    background:"#1f2435", border:`1.5px solid ${coach.color||"#34d399"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14, overflow:"hidden",
                  }}>
                    {coach.image ? <img src={coach.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : coach.icon||"🏌️"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700}}>{coach.name}</div>
                    <div style={{fontSize:9,color:"#4b5675"}}>{coach.title}</div>
                  </div>
                  <div style={{
                    fontSize:9, padding:"2px 6px", borderRadius:4, fontWeight:700,
                    background:`${coach.color||"#34d399"}22`, color:coach.color||"#34d399",
                  }}>{activeCnt}건</div>
                </div>

                {/* 슬롯 셀 */}
                <div style={{ position:"relative" }}>
                  {Array.from({length:TOTAL}, (_,i) => {
                    const totalMin = START_H * 60 + i * 20;
                    const h = Math.floor(totalMin / 60);
                    const m = totalMin % 60;
                    const time = `${tl_pad(h)}:${tl_pad(m)}`;
                    return (
                      <div key={time} onClick={() => onSlotClick(coach, time, null)}
                        style={{
                          height:SLOT_H, borderBottom:`1px solid ${m==="00"?"#1f2435":"#0f111a"}`,
                          cursor:"pointer", position:"relative", transition:"background .1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.02)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}
                      >
                        <div style={{
                          position:"absolute", inset:0, display:"flex",
                          alignItems:"center", justifyContent:"center",
                          opacity:0, fontSize:18, color:"#2d3347",
                          transition:"opacity .15s",
                        }}
                          onMouseEnter={e => e.currentTarget.style.opacity=1}
                          onMouseLeave={e => e.currentTarget.style.opacity=0}
                        >＋</div>
                      </div>
                    );
                  })}

                  {/* 예약 블록 */}
                  {coachBk.map(b => {
                    const rawTime = String(b["시작시간"]||"").slice(0,5);
                    if (!rawTime || rawTime < `${tl_pad(START_H)}:00`) return null;
                    const dur   = durSlots(b["레슨종류"]);
                    const top   = timeToTop(rawTime);
                    const ht    = dur * SLOT_H - 4;
                    const sc    = statusColor[b["상태"]] || "#94a3b8";
                    const isDone = b["상태"] !== "예약";
                    return (
                      <div key={b["예약ID"]}
                        onClick={e => { e.stopPropagation(); onSlotClick(coach, rawTime, b); }}
                        style={{
                          position:"absolute", left:3, right:3,
                          top:top+2, height:ht,
                          borderRadius:7, padding:"5px 8px",
                          background:`${sc}18`,
                          border:`1px solid ${sc}55`,
                          cursor:"pointer", zIndex:10,
                          opacity: isDone ? .65 : 1,
                          transition:"all .15s",
                          overflow:"hidden",
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform="translateX(2px)"}
                        onMouseLeave={e => e.currentTarget.style.transform="translateX(0)"}
                      >
                        <div style={{fontSize:8,color:"#4b5675",fontFamily:"monospace",marginBottom:2}}>
                          {rawTime}~{tl_calcEnd(rawTime,b["레슨종류"])}
                        </div>
                        <div style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {b["수강생명"]}
                        </div>
                        {ht > 36 && <div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>{b["레슨종류"]}</div>}
                        <div style={{
                          position:"absolute", top:4, right:5,
                          fontSize:8, padding:"1px 4px", borderRadius:3, fontWeight:700,
                          background:`${sc}33`, color:sc,
                        }}>{b["상태"]}</div>
                      </div>
                    );
                  })}

                  {/* 현재시간 라인 */}
                  {nowTop !== null && (
                    <div style={{
                      position:"absolute", left:0, right:0, top:nowTop,
                      height:2, background:"#f87171", zIndex:20, pointerEvents:"none",
                    }}>
                      <div style={{
                        position:"absolute", left:-4, top:-4,
                        width:10, height:10, borderRadius:"50%", background:"#f87171",
                      }}/>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 사이드 패널 */}
      {selSlot && (
        <div style={{
          width:280, flexShrink:0,
          background:"#0d0f14", borderLeft:"1px solid #1f2435",
          display:"flex", flexDirection:"column", overflow:"hidden",
        }}>
          {/* 패널 헤더 */}
          <div style={{ padding:"12px 14px", borderBottom:"1px solid #1f2435", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:13, fontWeight:700 }}>
              {selSlot.booking ? "📋 예약 상세" : "➕ 대행 예약"}
            </div>
            <button onClick={() => setSelSlot(null)}
              style={{ background:"none", border:"none", color:"#4b5675", fontSize:16, cursor:"pointer" }}>✕</button>
          </div>

          {/* 탭 (예약 있을 때만) */}
          {selSlot.booking && (
            <div style={{ display:"flex", gap:4, padding:"8px 14px", borderBottom:"1px solid #1f2435" }}>
              {["detail","book"].map(t => (
                <button key={t} onClick={() => setPanelTab(t)} style={{
                  flex:1, padding:"5px 0", borderRadius:7, fontSize:10, cursor:"pointer",
                  fontWeight: panelTab===t ? 700 : 400,
                  background: panelTab===t ? "#34d399" : "#1a1e28",
                  color: panelTab===t ? "#000" : "#94a3b8",
                  border: panelTab===t ? "none" : "1px solid #2d3347",
                }}>{t==="detail" ? "📋 상세" : "➕ 예약"}</button>
              ))}
            </div>
          )}

          {/* 패널 바디 */}
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>

            {/* 슬롯 정보 */}
            <div style={{ background:"#181c25", border:"1px solid #2d3347", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:"#4b5675", marginBottom:6, textTransform:"uppercase" }}>슬롯 정보</div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                <span style={{ color:"#4b5675" }}>프로</span><span style={{ fontWeight:700 }}>{selSlot.coach.name}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                <span style={{ color:"#4b5675" }}>날짜</span><span>{selDate}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                <span style={{ color:"#4b5675" }}>시간</span>
                <span style={{ fontWeight:700, color:"#34d399", fontFamily:"monospace" }}>{selSlot.time}</span>
              </div>
            </div>

            {/* 예약 상세 탭 */}
            {(!selSlot.booking || panelTab==="detail") && selSlot.booking && (
              <div>
                <div style={{ background:"#181c25", border:"1px solid #2d3347", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:"#4b5675", marginBottom:6, textTransform:"uppercase" }}>수강생</div>
                  {[
                    ["이름",   selSlot.booking["수강생명"]],
                    ["연락처", selSlot.booking["연락처"]],
                    ["레슨",   selSlot.booking["레슨종류"]],
                    ["부스",   (selSlot.booking["부스번호"]||"-")+"번"],
                    ["상태",   selSlot.booking["상태"]],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                      <span style={{ color:"#4b5675" }}>{k}</span>
                      <span style={{ fontWeight:600, color: k==="상태" ? (statusColor[v]||"#94a3b8") : "#e2e8f0" }}>{v}</span>
                    </div>
                  ))}
                  {selSlot.booking["요청사항"] && (
                    <div style={{ fontSize:10, color:"#94a3b8", marginTop:6, paddingTop:6, borderTop:"1px solid #1f2435" }}>
                      💬 {selSlot.booking["요청사항"]}
                    </div>
                  )}
                </div>

                {/* 출석 버튼 */}
                {selSlot.booking["상태"]==="예약" && (
                  <div>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:"#4b5675", marginBottom:8, textTransform:"uppercase" }}>출석 처리</div>
                    {[
                      ["출석완료","#34d399","✅"],
                      ["지각출석","#fbbf24","⏰"],
                      ["노쇼",    "#f87171","🚫"],
                    ].map(([s,c,ic]) => (
                      <button key={s} onClick={() => doAttend(s)} style={{
                        width:"100%", border:`1px solid ${c}44`,
                        background:`${c}18`, color:c, borderRadius:7,
                        padding:"8px 0", fontSize:11, fontWeight:700,
                        cursor:"pointer", marginBottom:5,
                        fontFamily:"'Noto Sans KR', sans-serif",
                        transition:"all .15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background=c; e.currentTarget.style.color="#000"; }}
                        onMouseLeave={e => { e.currentTarget.style.background=`${c}18`; e.currentTarget.style.color=c; }}
                      >{ic} {s}</button>
                    ))}
                    <div style={{ height:8 }}/>
                    <button onClick={doCancel} style={{
                      width:"100%", border:"1px solid rgba(248,113,113,.3)",
                      background:"rgba(248,113,113,.1)", color:"#f87171", borderRadius:7,
                      padding:"7px 0", fontSize:10, cursor:"pointer",
                      fontFamily:"'Noto Sans KR', sans-serif",
                    }}>❌ 예약 취소</button>
                  </div>
                )}
              </div>
            )}

            {/* 대행 예약 탭 */}
            {(!selSlot.booking || panelTab==="book") && (
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:"#4b5675", marginBottom:10, textTransform:"uppercase" }}>수강생 정보</div>
                {[
                  { label:"이름 *",  val:bkName,   set:setBkName,   ph:"이름",              type:"text" },
                  { label:"연락처 *",val:bkPhone,  set:setBkPhone,  ph:"010-0000-0000",     type:"tel"  },
                  { label:"요청사항",val:bkNote,   set:setBkNote,   ph:"요청사항 (선택)",   type:"text" },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>{f.label}</div>
                    <input value={f.val} onChange={e => f.set(e.target.value)}
                      placeholder={f.ph} type={f.type}
                      style={{ ...INP, fontSize:11 }} />
                  </div>
                ))}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>레슨 종류 *</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {LESSON_TYPES.map(t => (
                      <button key={t} onClick={() => setBkLesson(t)} style={{
                        padding:"4px 8px", borderRadius:5, fontSize:10, cursor:"pointer",
                        fontWeight: bkLesson===t ? 700 : 400,
                        background: bkLesson===t ? "#34d399" : "#1a1e28",
                        color: bkLesson===t ? "#000" : "#94a3b8",
                        border: bkLesson===t ? "none" : "1px solid #2d3347",
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                <button onClick={doBook} disabled={bkSubmitting} style={{
                  width:"100%", background:"#34d399", border:"none",
                  borderRadius:8, color:"#000", fontSize:12, fontWeight:700,
                  padding:"9px 0", cursor:bkSubmitting?"not-allowed":"pointer",
                  opacity:bkSubmitting?.6:1,
                  fontFamily:"'Noto Sans KR', sans-serif",
                }}>{bkSubmitting ? "예약 중..." : "✅ 대행 예약 완료"}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminScreen({ coaches, setCoaches, showToast, onLogin }) {
  const [pw, setPw]             = useState("");
  const [adminPw, setAdminPw]   = useState("");
  const [adminTab, setAdminTab] = useState("dash"); // 항상 dash로 시작
  const [stats, setStats]       = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [attend, setAttend]     = useState([]);
  const [proList, setProList]   = useState([]);
  const [reports, setReports]   = useState([]);
  const [loadError, setLoadError] = useState("");
  const isPC = useIsPC();

  const loadData = useCallback(async (password, tab) => {
    const usePw  = password || adminPw;
    const useTab = tab     || adminTab;
    if (!usePw) return;
    setLoadError("");
    try {
      if (useTab === "dash" || useTab === "timeline") {
        setStatsLoading(true);
        setStats(null);
        const s = await apiPost({ action: "getConsoleStats", password: usePw });
        setStats(s);
        setStatsLoading(false);
      }
      if (useTab === "attend") {
        const l = await apiPost({ action: "getAttendance", password: usePw });
        setAttend(l || []);
      }
      if (useTab === "pro") {
        const l = await apiPost({ action: "getAllCoaches", password: usePw });
        setProList(l || []);
      }
      if (useTab === "report") {
        const l = await apiPost({ action: "getReports", password: usePw });
        setReports(l || []);
      }
      // students 탭은 AdminStudentTab 내부에서 자체 로드
    } catch (e) {
      setStatsLoading(false);
      setLoadError(e.message);
      showToast("❌ " + e.message);
    }
  }, [adminPw, adminTab]);

  useEffect(() => {
    if (adminPw) loadData(adminPw, adminTab);
  }, [adminTab, adminPw]);

  // PC 전환 시 자동으로 타임라인 탭
  useEffect(() => {
    if (isPC && adminPw) setAdminTab("timeline");   // PC 감지 시 타임라인으로
    if (!isPC && adminTab === "timeline") setAdminTab("dash"); // 모바일 감지 시 현황으로
  }, [isPC]);

  const handleLogin = async () => {
    if (!pw) { showToast("비밀번호를 입력하세요."); return; }
    try {
      setStatsLoading(true);
      setLoadError("");
      const s = await apiPost({ action: "getConsoleStats", password: pw });
      setAdminPw(pw);
      setStats(s);
      setStatsLoading(false);
      setAdminTab(window.innerWidth >= 768 ? "timeline" : "dash"); // PC면 타임라인, 모바일이면 현황
      if (onLogin) onLogin(pw); // 전역 adminPw 공유 (게시판 공지사항 작성용)
    } catch (e) {
      setStatsLoading(false);
      showToast("❌ " + e.message);
    }
  };

  if (!adminPw) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>관리자 로그인</div>
      <input type="password" placeholder="관리자 비밀번호" value={pw}
        onChange={e => setPw(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleLogin()}
        style={{ ...INP, marginBottom: 10, textAlign: "center" }} />
      <Btn onClick={handleLogin} disabled={statsLoading}>
        {statsLoading ? "확인 중..." : "로그인"}
      </Btn>
    </div>
  );

  // PC: 타임라인 탭 포함
  const TABS = isPC
    ? [
        { id:"timeline", label:"📅 타임라인" },
        { id:"dash",     label:"📊 현황"     },
        { id:"attend",   label:"✅ 출석"     },
        { id:"students", label:"👥 수강생"   },
        { id:"pro",      label:"🏌️ 프로"    },
        { id:"lessons",  label:"📚 레슨종류" },
        { id:"block",    label:"🚫 차단"     },
        { id:"report",   label:"🚨 신고"     },
      ]
    : [
        { id:"dash",     label:"📊 현황" },
        { id:"attend",   label:"✅ 출석" },
        { id:"students", label:"👥 수강생"},
        { id:"pro",      label:"🏌️ 프로"},
        { id:"lessons",  label:"📚 레슨" },
        { id:"block",    label:"🚫 차단" },
        { id:"report",   label:"🚨 신고" },
      ];

  return (
    <div style={{ padding: adminTab === "timeline" ? "12px 14px 0" : "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>
          ⚙️ 관리자
          {isPC && <span style={{ fontSize:10, color:"#34d399", marginLeft:8, padding:"2px 6px", border:"1px solid rgba(52,211,153,.3)", borderRadius:4 }}>PC 모드</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => loadData(adminPw, adminTab)}
            style={{ fontSize: 11, background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>🔄</button>
          <button onClick={() => { setAdminPw(""); setPw(""); setStats(null); if(onLogin) onLogin(""); }}
            style={{ fontSize: 11, background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>로그아웃</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: adminTab === "timeline" ? 0 : 14, overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setAdminTab(t.id)} style={{
            flexShrink:0, padding: "6px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer",
            fontWeight: adminTab === t.id ? 700 : 400,
            background: adminTab === t.id ? "#34d399" : "#1a1e28",
            color: adminTab === t.id ? "#000" : "#94a3b8",
            border: adminTab === t.id ? "none" : "1px solid #2d3347",
          }}>{t.label}</button>
        ))}
      </div>

      {adminTab === "timeline" && <AdminTimeline coaches={coaches} adminPw={adminPw} showToast={showToast} />}
      {adminTab === "dash"     && <AdminDash stats={stats} loading={statsLoading} error={loadError} onRetry={() => loadData(adminPw, "dash")} />}
      {adminTab === "attend"   && <AdminAttendTab list={attend} adminPw={adminPw} showToast={showToast} onDone={() => loadData(adminPw, "attend")} />}
      {adminTab === "pro"      && <AdminProTab list={proList} adminPw={adminPw} showToast={showToast} onDone={() => loadData(adminPw, "pro")} setCoaches={setCoaches} />}
      {adminTab === "report"   && <AdminReportTab list={reports} adminPw={adminPw} showToast={showToast} onDone={() => loadData(adminPw, "report")} />}
      {adminTab === "students" && <AdminStudentTab adminPw={adminPw} showToast={showToast} />}
      {adminTab === "lessons"  && <AdminLessonTab adminPw={adminPw} showToast={showToast} />}
      {adminTab === "block"    && <AdminBlockTab coaches={coaches} adminPw={adminPw} showToast={showToast} />}
    </div>
  );
}

function AdminDash({ stats, loading, error, onRetry }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>⏳ 데이터 불러오는 중...</div>
      <div style={{ fontSize: 11, color: "#4b5675" }}>GAS 서버 응답을 기다리는 중입니다.</div>
    </div>
  );
  if (error) return (
    <div style={{ textAlign: "center", padding: 30 }}>
      <div style={{ fontSize: 13, color: "#f87171", marginBottom: 8 }}>❌ 로딩 실패</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>{error}</div>
      <Btn onClick={onRetry} style={{ maxWidth: 160, margin: "0 auto" }}>🔄 다시 시도</Btn>
    </div>
  );
  if (!stats) return (
    <div style={{ textAlign: "center", padding: 30 }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>데이터가 없습니다.</div>
      <Btn onClick={onRetry} style={{ maxWidth: 160, margin: "0 auto" }}>🔄 불러오기</Btn>
    </div>
  );

  const cards = [
    { label: "금일 예약", value: stats.totalBookings  ?? 0, color: "#34d399" },
    { label: "출석 완료", value: stats.doneBookings   ?? 0, color: "#38bdf8" },
    { label: "신규 가입", value: stats.newStudents    ?? 0, color: "#a78bfa" },
    { label: "금일 매출", value: (stats.todayRevenue  || 0).toLocaleString() + "원", color: "#fbbf24" },
  ];
  return (
    <div>
      <div style={{ fontSize: 10, color: "#4b5675", marginBottom: 8, textAlign: "right" }}>
        {stats.date || "오늘"} 기준
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {cards.map(c => (
          <div key={c.label} style={CARD_STYLE}>
            <div style={{ fontSize: 22, fontWeight: 900, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>
      {stats.pendingReports > 0 && (
        <div style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", borderRadius: 10, padding: 10, fontSize: 12, color: "#f87171" }}>
          🔴 미처리 신고 {stats.pendingReports}건
        </div>
      )}
    </div>
  );
}

function AdminAttendTab({ list, adminPw, showToast, onDone }) {
  const doAttend = async (bookingId, status) => {
    try { await apiPost({ action: "checkAttend", bookingId, status, password: adminPw }); showToast(`✅ ${status} 처리`); onDone(); }
    catch (e) { showToast("❌ " + e.message); }
  };
  if (!list.length) return <div style={{ color: "#4b5675", textAlign: "center", fontSize: 12, padding: 20 }}>오늘 예약이 없습니다.</div>;
  return list.map(b => (
    <div key={b.예약ID} style={{ ...CARD_STYLE, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{b.수강생명}</div>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>{b.프로명} · {b.시작시간} · {b.레슨종류}</div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {[["출석완료", "#34d399", "✅"], ["지각출석", "#fbbf24", "⏰"], ["노쇼", "#f87171", "🚫"]].map(([s, c, ic]) => (
          <button key={s} onClick={() => doAttend(b.예약ID, s)} style={{ padding: "3px 7px", borderRadius: 5, border: `1px solid ${c}44`, background: `${c}22`, color: c, fontSize: 9, cursor: "pointer" }}>{ic}</button>
        ))}
      </div>
    </div>
  ));
}

function AdminProTab({ list, adminPw, showToast, onDone, setCoaches }) {
  const [showForm, setShowForm] = useState(false);
  const [editPro, setEditPro]   = useState(null);
  const [allLessons, setAllLessons] = useState([]); // DB 레슨 종류 목록
  const [form, setForm]         = useState({
    name: "", title: "대표 프로", intro: "", icon: "🏌️",
    color: "#34d399", profileImg: "",
    startHour: 9, endHour: 22,
    lessonTypes: [], // 담당 레슨 종류 (레슨명 배열)
  });
  const [imgPreview, setImgPreview] = useState("");
  const [saving, setSaving]         = useState(false);

  // 레슨 종류 목록 로드
  useEffect(() => {
    apiGet({ action:"getLessons" }).then(d => setAllLessons(d||[])).catch(()=>{});
  }, []);

  // 레슨 선택 토글
  const toggleLesson = (lessonName) => {
    setForm(p => ({
      ...p,
      lessonTypes: p.lessonTypes.includes(lessonName)
        ? p.lessonTypes.filter(t => t !== lessonName)
        : [...p.lessonTypes, lessonName],
    }));
  };

  // 폼 초기화
  const resetForm = () => {
    setForm({ name: "", title: "대표 프로", intro: "", icon: "🏌️", color: "#34d399", profileImg: "", startHour: 9, endHour: 22, lessonTypes: [] });
    setImgPreview(""); setEditPro(null); setShowForm(false);
  };

  // Google Drive URL → 직접 표시 가능한 URL로 변환
  function convertDriveUrl(url) {
    if (!url) return "";
    // https://drive.google.com/file/d/FILE_ID/view 형태
    const m1 = url.match(/\/file\/d\/([^/]+)/);
    if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    // https://drive.google.com/open?id=FILE_ID 형태
    const m2 = url.match(/[?&]id=([^&]+)/);
    if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    // 이미 변환된 URL 또는 일반 URL
    return url;
  }

  // URL 입력 시 미리보기 업데이트
  const handleImgUrl = (url) => {
    const converted = convertDriveUrl(url.trim());
    setImgPreview(converted);
    setForm(p => ({ ...p, profileImg: converted }));
  };

  // 수정 버튼 클릭
  const startEdit = (pro) => {
    setEditPro(pro);
    setForm({
      name: pro.name, title: pro.title,
      intro: pro.intro || "", icon: pro.icon || "🏌️",
      color: pro.color || "#34d399", profileImg: pro.image || "",
      startHour: pro.startHour || 9,
      endHour:   pro.endHour   || 22,
      lessonTypes: pro.lessonTypes || [],
    });
    setImgPreview(pro.image || "");
    setShowForm(true);
  };

  // 등록 or 수정 저장
  const save = async () => {
    if (!form.name) { showToast("이름을 입력해주세요."); return; }
    setSaving(true);
    try {
      if (editPro) {
        // 수정
        await apiPost({
          action: "updateCoach", coachId: editPro.id,
          ...form, profileImg: form.profileImg,
          startHour: form.startHour,
          endHour:   form.endHour,
          lessonTypes: JSON.stringify(form.lessonTypes),
          password: adminPw,
        });
        showToast("✅ 프로 정보가 수정되었습니다.");
      } else {
        // 신규 등록
        await apiPost({
          action: "createCoach", ...form,
          lessonTypes: JSON.stringify(
            form.lessonTypes.length > 0
              ? form.lessonTypes
              : allLessons.map(l => l["레슨명"]) // 선택 안 하면 전체 배정
          ),
          password: adminPw,
        });
        showToast("✅ 프로가 등록되었습니다.");
      }
      resetForm();
      const updated = await apiGet({ action: "getCoaches" });
      setCoaches(updated);
      onDone();
    } catch (e) { showToast("❌ " + e.message); }
    finally { setSaving(false); }
  };

  const deactivate = async (id, name) => {
    if (!window.confirm(`${name}을(를) 비활성화할까요?`)) return;
    try { await apiPost({ action: "deactivateCoach", coachId: id, password: adminPw }); showToast("비활성화 완료"); onDone(); }
    catch (e) { showToast("❌ " + e.message); }
  };
  const reactivate = async (id) => {
    try { await apiPost({ action: "reactivateCoach", coachId: id, password: adminPw }); showToast("✅ 복구 완료"); onDone(); }
    catch (e) { showToast("❌ " + e.message); }
  };

  return (
    <div>
      <Btn onClick={() => { if (showForm && !editPro) resetForm(); else { resetForm(); setShowForm(true); } }}
        style={{ marginBottom: 10 }}>
        {showForm ? "✕ 닫기" : "+ 새 프로 등록"}
      </Btn>

      {/* 등록 / 수정 폼 */}
      {showForm && (
        <div style={{ ...CARD_STYLE, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "#34d399" }}>
            {editPro ? `✏️ ${editPro.name} 수정` : "➕ 새 프로 등록"}
          </div>

          {/* 프로필 사진 — Google Drive URL 입력 */}
          <div style={{ marginBottom: 14 }}>
            {/* 미리보기 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
                background: "#1f2435", border: `2px solid ${form.color || "#34d399"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", fontSize: 28,
              }}>
                {imgPreview
                  ? <img src={imgPreview} alt="preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={() => { setImgPreview(""); showToast("❌ 이미지를 불러올 수 없습니다. URL을 확인해주세요."); }}
                    />
                  : form.icon || "🏌️"
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>프로필 사진</div>
                <div style={{ fontSize: 10, color: "#4b5675", lineHeight: 1.6 }}>
                  Google Drive에 사진을 올린 후<br/>공유 링크를 아래에 붙여넣으세요
                </div>
              </div>
            </div>

            {/* URL 입력창 */}
            <input
              placeholder="Google Drive 공유 URL 붙여넣기"
              value={form.profileImg}
              onChange={e => handleImgUrl(e.target.value)}
              style={{ ...INP, marginBottom: 4, fontSize: 11 }}
            />
            {form.profileImg && (
              <button onClick={() => { setImgPreview(""); setForm(p => ({ ...p, profileImg: "" })); }}
                style={{ fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>
                ✕ URL 제거
              </button>
            )}

            {/* Google Drive 사용법 안내 */}
            <div style={{
              marginTop: 8, padding: "8px 10px",
              background: "rgba(56,189,248,.06)", border: "1px solid rgba(56,189,248,.15)",
              borderRadius: 8, fontSize: 10, color: "#94a3b8", lineHeight: 1.7,
            }}>
              📌 <span style={{ color: "#38bdf8", fontWeight: 700 }}>Google Drive 사용법</span><br/>
              1. drive.google.com 접속<br/>
              2. 사진 파일 우클릭 → 공유<br/>
              3. <span style={{ color: "#fbbf24" }}>링크가 있는 모든 사용자</span> 로 변경<br/>
              4. 링크 복사 → 위 입력창에 붙여넣기
            </div>
          </div>

          {/* 텍스트 입력 */}
          {[
            { k: "name",  ph: "이름 *",       type: "text" },
            { k: "title", ph: "직함",          type: "text" },
            { k: "intro", ph: "한 줄 소개",    type: "text" },
            { k: "icon",  ph: "아이콘 이모지", type: "text" },
          ].map(f => (
            <input key={f.k} placeholder={f.ph} value={form[f.k]}
              onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
              style={{ ...INP, marginBottom: 6 }} />
          ))}

          {/* 레슨 운영 시간 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5675", marginBottom: 8, letterSpacing:.5 }}>
              ⏰ 레슨 운영 시간
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#4b5675", marginBottom: 3 }}>시작</div>
                <select value={form.startHour}
                  onChange={e => setForm(p => ({ ...p, startHour: Number(e.target.value) }))}
                  style={{ ...INP, fontSize: 12 }}>
                  {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>
                  ))}
                </select>
              </div>
              <div style={{ color: "#4b5675", paddingTop: 14 }}>~</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#4b5675", marginBottom: 3 }}>종료</div>
                <select value={form.endHour}
                  onChange={e => setForm(p => ({ ...p, endHour: Number(e.target.value) }))}
                  style={{ ...INP, fontSize: 12 }}>
                  {Array.from({ length: 16 }, (_, i) => i + 8).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ fontSize: 9, color: "#4b5675", marginTop: 4 }}>
              20분 단위 슬롯 생성 기준 시간
            </div>
          </div>

          {/* 담당 레슨 종류 선택 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5675", marginBottom: 4, letterSpacing:.5 }}>
              📚 담당 레슨 종류 <span style={{ color:"#2d3347", fontWeight:400 }}>(미선택 시 전체 담당)</span>
            </div>
            {allLessons.length === 0 ? (
              <div style={{ fontSize:10, color:"#4b5675" }}>레슨 종류를 먼저 등록해주세요.</div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {allLessons.map(l => {
                  const isSel = form.lessonTypes.includes(l["레슨명"]);
                  const color = l["색상"] || "#34d399";
                  return (
                    <button key={l["레슨ID"]} type="button"
                      onClick={() => toggleLesson(l["레슨명"])}
                      style={{
                        padding:"5px 10px", borderRadius:6, fontSize:11, cursor:"pointer",
                        fontWeight: isSel ? 700 : 400,
                        background: isSel ? color : "#1a1e28",
                        color: isSel ? "#000" : "#94a3b8",
                        border: isSel ? "none" : `1px solid ${color}44`,
                        transition:"all .12s",
                      }}>
                      {isSel ? "✓ " : ""}{l["레슨명"]}
                      <span style={{ fontSize:8, opacity:.7, marginLeft:3 }}>{l["소요시간(분)"]}분</span>
                    </button>
                  );
                })}
              </div>
            )}
            {form.lessonTypes.length > 0 && (
              <div style={{ fontSize:9, color:"#34d399", marginTop:5 }}>
                ✓ {form.lessonTypes.join(" · ")} 담당
              </div>
            )}
          </div>

          {/* 테마 색상 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>테마 색상</div>
            <input type="color" value={form.color}
              onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
              style={{ width: 40, height: 30, borderRadius: 6, border: "none", cursor: "pointer", background: "none" }} />
            <div style={{ fontSize: 11, color: form.color, fontWeight: 700 }}>{form.color}</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={resetForm} style={{ flex: 1 }}>취소</Btn>
            <Btn onClick={save} disabled={saving} style={{ flex: 2 }}>
              {saving ? "저장 중..." : editPro ? "✅ 수정 완료" : "✅ 등록"}
            </Btn>
          </div>
        </div>
      )}

      {/* 프로 목록 */}
      {list.map(p => (
        <div key={p.id} style={{
          ...CARD_STYLE, display: "flex", alignItems: "center",
          gap: 10, marginBottom: 8,
          borderColor: p.status === "active" ? "#2d3347" : "rgba(248,113,113,.3)",
        }}>
          {/* 프로필 사진 또는 아이콘 */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: "#1f2435", border: `2px solid ${p.color || "#34d399"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", fontSize: 20,
          }}>
            {p.image
              ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : p.icon || "🏌️"
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 10, color: p.status === "active" ? "#94a3b8" : "#f87171" }}>
              {p.title} · {p.status === "active" ? "활성" : "비활성"}
            </div>
            {(p.lessonTypes||[]).length > 0 && (
              <div style={{ fontSize:9, color:"#4b5675", marginTop:2 }}>
                {p.lessonTypes.slice(0,3).join(" · ")}{p.lessonTypes.length > 3 ? " ..." : ""}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {/* 수정 버튼 */}
            <button onClick={() => startEdit(p)} style={{
              padding: "3px 8px", borderRadius: 5, fontSize: 9, cursor: "pointer",
              border: "1px solid rgba(56,189,248,.3)", background: "rgba(56,189,248,.1)", color: "#38bdf8",
            }}>수정</button>
            {/* 활성/비활성 버튼 */}
            {p.status === "active"
              ? <button onClick={() => deactivate(p.id, p.name)} style={{
                  padding: "3px 8px", borderRadius: 5, fontSize: 9, cursor: "pointer",
                  border: "1px solid rgba(251,191,36,.3)", background: "rgba(251,191,36,.1)", color: "#fbbf24",
                }}>비활성</button>
              : <button onClick={() => reactivate(p.id)} style={{
                  padding: "3px 8px", borderRadius: 5, fontSize: 9, cursor: "pointer",
                  border: "1px solid rgba(52,211,153,.3)", background: "rgba(52,211,153,.1)", color: "#34d399",
                }}>복구</button>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  👥 수강생 관리 탭 (검색 + 상세 + 수강권 발급)
// ─────────────────────────────────────────────
function AdminStudentTab({ adminPw, showToast }) {
  const [keyword, setKeyword]     = useState("");
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [selStudent, setSelStudent] = useState(null); // 선택된 수강생
  const [detail, setDetail]       = useState(null);   // 상세 데이터
  const [detailLoading, setDetailLoading] = useState(false);
  const [showIssue, setShowIssue] = useState(false);  // 수강권 발급 폼
  // 수강권 발급 폼 상태
  const [issueType, setIssueType]   = useState("10회권");
  const [issuePrice, setIssuePrice] = useState("");
  const [issueMethod, setIssueMethod] = useState("현금");
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  const PASS_TYPES = ["10회권","20회권","30회권","월정액(주2회)","월정액(주3회)"];
  const PAY_METHODS = ["현금","카드","계좌이체","카카오페이"];
  const PASS_PRICE  = { "10회권":450000,"20회권":800000,"30회권":1100000,"월정액(주2회)":320000,"월정액(주3회)":450000 };

  // 검색
  const search = useCallback(async () => {
    setLoading(true);
    setSelStudent(null);
    setDetail(null);
    try {
      const data = await apiPost({ action:"getStudents", keyword: keyword.trim(), password:adminPw });
      setStudents(data || []);
    } catch(e) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [keyword, adminPw]);

  // 초기 전체 목록 로드
  useEffect(() => { search(); }, []);

  // 수강생 상세 조회
  const loadDetail = async (student) => {
    setSelStudent(student);
    setDetail(null);
    setShowIssue(false);
    setDetailLoading(true);
    try {
      const data = await apiPost({ action:"getStudentDetail", studentId:student.id, password:adminPw });
      setDetail(data);
    } catch(e) { showToast("❌ " + e.message); }
    finally { setDetailLoading(false); }
  };

  // 수강권 발급
  const issuePass = async () => {
    if (!selStudent) return;
    setIssueSubmitting(true);
    try {
      await apiPost({
        action:"issuePass", studentId:selStudent.id,
        passType:issueType,
        paidAmount: issuePrice || PASS_PRICE[issueType],
        payMethod:issueMethod,
        password:adminPw,
      });
      showToast("✅ 수강권 발급 완료");
      setShowIssue(false);
      await loadDetail(selStudent); // 상세 새로고침
    } catch(e) { showToast("❌ " + e.message); }
    finally { setIssueSubmitting(false); }
  };

  const statusColor = { "예약":"#34d399","완료":"#38bdf8","노쇼":"#f87171","취소":"#4b5675" };

  return (
    <div style={{ display:"flex", gap:12, height:"calc(100vh - 160px)", overflow:"hidden" }}>

      {/* 왼쪽: 수강생 목록 */}
      <div style={{ width:260, flexShrink:0, display:"flex", flexDirection:"column", gap:8 }}>
        {/* 검색창 */}
        <div style={{ display:"flex", gap:6 }}>
          <input
            placeholder="이름 또는 연락처 검색"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            style={{ ...INP, flex:1, fontSize:11 }}
          />
          <button onClick={search} style={{
            padding:"0 12px", borderRadius:8, background:"#34d399",
            color:"#000", border:"none", fontWeight:700, fontSize:11, cursor:"pointer",
          }}>검색</button>
        </div>

        {/* 수강생 수 */}
        <div style={{ fontSize:10, color:"#4b5675" }}>
          총 {students.length}명
        </div>

        {/* 목록 */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading ? <Spinner /> : students.length === 0
            ? <div style={{ color:"#4b5675", fontSize:12, textAlign:"center", padding:20 }}>수강생이 없습니다.</div>
            : students.map(s => (
              <div key={s.id} onClick={() => loadDetail(s)} style={{
                padding:"9px 11px", borderRadius:9, marginBottom:5, cursor:"pointer",
                background: selStudent?.id === s.id ? "rgba(52,211,153,.1)" : "#181c25",
                border:`1px solid ${selStudent?.id === s.id ? "#34d399" : "#2d3347"}`,
                transition:"all .12s",
              }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:700 }}>{s.name}</span>
                  {s.passCount > 0 && (
                    <span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:"rgba(52,211,153,.15)", color:"#34d399", border:"1px solid rgba(52,211,153,.3)" }}>
                      수강권 {s.passCount}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:10, color:"#4b5675", fontFamily:"monospace" }}>{s.phone}</div>
                <div style={{ fontSize:9, color:"#4b5675", marginTop:2 }}>{s.grade} · {String(s.joinedAt||"").slice(0,10)} 등록</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* 오른쪽: 수강생 상세 */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {!selStudent ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#4b5675", fontSize:13 }}>
            왼쪽에서 수강생을 선택하세요
          </div>
        ) : detailLoading ? <Spinner /> : detail ? (
          <div>
            {/* 수강생 헤더 */}
            <div style={{
              background:"linear-gradient(135deg,rgba(52,211,153,.1),rgba(56,189,248,.05))",
              border:"1px solid rgba(52,211,153,.2)", borderRadius:12,
              padding:"14px 16px", marginBottom:14,
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <div>
                <div style={{ fontSize:16, fontWeight:900, marginBottom:4 }}>{detail.student["이름"]}</div>
                <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"monospace" }}>{detail.student["연락처"]}</div>
                <div style={{ fontSize:10, color:"#4b5675", marginTop:2 }}>
                  {detail.student["회원등급"]} · {String(detail.student["등록일시"]||"").slice(0,10)} 등록
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:22, fontWeight:900, color:"#34d399" }}>{detail.passes?.filter(p=>p["상태"]==="활성").length || 0}</div>
                <div style={{ fontSize:10, color:"#4b5675" }}>활성 수강권</div>
              </div>
            </div>

            {/* 수강권 섹션 */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#4b5675", letterSpacing:.8, textTransform:"uppercase" }}>🎫 수강권</div>
                <button onClick={() => setShowIssue(!showIssue)} style={{
                  fontSize:10, padding:"4px 10px", borderRadius:6, cursor:"pointer",
                  background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontWeight:700,
                }}>+ 수강권 발급</button>
              </div>

              {/* 수강권 발급 폼 */}
              {showIssue && (
                <div style={{ background:"#181c25", border:"1px solid rgba(52,211,153,.25)", borderRadius:10, padding:12, marginBottom:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#34d399", marginBottom:10 }}>새 수강권 발급</div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>수강권 종류</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {PASS_TYPES.map(t => (
                        <button key={t} onClick={() => { setIssueType(t); setIssuePrice(String(PASS_PRICE[t])); }} style={{
                          padding:"4px 8px", borderRadius:5, fontSize:10, cursor:"pointer",
                          fontWeight: issueType===t ? 700 : 400,
                          background: issueType===t ? "#34d399" : "#1a1e28",
                          color: issueType===t ? "#000" : "#94a3b8",
                          border: issueType===t ? "none" : "1px solid #2d3347",
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>결제금액</div>
                      <input value={issuePrice} onChange={e=>setIssuePrice(e.target.value)}
                        placeholder={String(PASS_PRICE[issueType])}
                        style={{ ...INP, fontSize:11 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>결제방법</div>
                      <select value={issueMethod} onChange={e=>setIssueMethod(e.target.value)}
                        style={{ ...INP, fontSize:11 }}>
                        {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => setShowIssue(false)} style={{
                      flex:1, padding:"7px 0", borderRadius:7, fontSize:11, cursor:"pointer",
                      background:"#1a1e28", border:"1px solid #2d3347", color:"#94a3b8",
                    }}>취소</button>
                    <button onClick={issuePass} disabled={issueSubmitting} style={{
                      flex:2, padding:"7px 0", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer",
                      background:"#34d399", border:"none", color:"#000",
                      opacity: issueSubmitting ? .6 : 1,
                    }}>{issueSubmitting ? "발급 중..." : "✅ 발급 완료"}</button>
                  </div>
                </div>
              )}

              {/* 보유 수강권 목록 */}
              {(detail.passes||[]).length === 0
                ? <div style={{ color:"#4b5675", fontSize:11, padding:"10px 0" }}>보유 수강권 없음</div>
                : (detail.passes||[]).map(p => (
                  <div key={p["수강권ID"]} style={{
                    background: p["상태"]==="활성" ? "rgba(52,211,153,.06)" : "transparent",
                    border:`1px solid ${p["상태"]==="활성" ? "rgba(52,211,153,.2)" : "#2d3347"}`,
                    borderRadius:8, padding:"9px 12px", marginBottom:6,
                    display:"flex", alignItems:"center", gap:10,
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:700, marginBottom:2 }}>
                        {p["수강권종류"]}
                        <span style={{ fontSize:9, marginLeft:6, padding:"1px 5px", borderRadius:3,
                          background: p["상태"]==="활성" ? "rgba(52,211,153,.15)" : "rgba(148,163,184,.1)",
                          color: p["상태"]==="활성" ? "#34d399" : "#4b5675",
                        }}>{p["상태"]}</span>
                      </div>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>만료 {String(p["만료일"]||"").slice(0,10)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:18, fontWeight:900, color:"#34d399", fontFamily:"monospace" }}>
                        {p["잔여횟수"]}
                      </div>
                      <div style={{ fontSize:9, color:"#4b5675" }}>/ {p["총횟수"]}회</div>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* 예약 이력 */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#4b5675", letterSpacing:.8, textTransform:"uppercase", marginBottom:8 }}>
                📋 예약 이력 (최근 {(detail.bookings||[]).length}건)
              </div>
              {(detail.bookings||[]).length === 0
                ? <div style={{ color:"#4b5675", fontSize:11 }}>예약 이력 없음</div>
                : (detail.bookings||[]).slice().reverse().slice(0,10).map(b => {
                  const sc = statusColor[b["상태"]] || "#4b5675";
                  return (
                    <div key={b["예약ID"]} style={{
                      display:"flex", alignItems:"center", gap:8,
                      padding:"7px 10px", borderRadius:7, marginBottom:4,
                      background:"#181c25", border:`1px solid #2d3347`,
                      borderLeft:`3px solid ${sc}`,
                    }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:600 }}>{b["프로명"]} · {b["레슨종류"]}</div>
                        <div style={{ fontSize:10, color:"#4b5675", fontFamily:"monospace" }}>
                          {String(b["날짜"]||"").slice(0,10)} {String(b["시작시간"]||"").slice(0,5)}
                        </div>
                      </div>
                      <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, fontWeight:700,
                        background:`${sc}22`, color:sc }}>
                        {b["상태"]}
                      </span>
                    </div>
                  );
                })
              }
            </div>

            {/* 레슨 일지 */}
            {(detail.lessonLogs||[]).length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"#4b5675", letterSpacing:.8, textTransform:"uppercase", marginBottom:8 }}>
                  📝 레슨 일지 ({(detail.lessonLogs||[]).length}회차)
                </div>
                {(detail.lessonLogs||[]).slice(0,5).map((l,i) => (
                  <div key={l["일지ID"]||i} style={{
                    padding:"8px 10px", borderRadius:7, marginBottom:4,
                    background:"#181c25", border:"1px solid #2d3347",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"#38bdf8" }}>{l["회차번호"]}회차</span>
                      <span style={{ fontSize:9, color:"#4b5675" }}>{String(l["레슨날짜"]||"").slice(0,10)}</span>
                    </div>
                    {l["코멘트"] && <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.5 }}>{l["코멘트"]}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  🚫 차단 관리 탭
//  특정 날짜·시간 또는 매주 요일·시간 반복 차단
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  📚 레슨 종류 관리 탭
// ─────────────────────────────────────────────
function AdminLessonTab({ adminPw, showToast }) {
  const [lessons, setLessons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editLesson, setEditLesson] = useState(null); // null=신규, obj=수정
  const [showForm, setShowForm] = useState(false);

  // 폼 상태
  const [fName, setFName]       = useState("");
  const [fDur, setFDur]         = useState("60");
  const [fPrice, setFPrice]     = useState("");
  const [fColor, setFColor]     = useState("#34d399");
  const [fDesc, setFDesc]       = useState("");
  const [fOrder, setFOrder]     = useState("99");
  const [submitting, setSubmitting] = useState(false);

  const COLORS = ["#34d399","#38bdf8","#a78bfa","#fbbf24","#f87171","#fb923c","#e879f9"];
  const DURATIONS = [
    { val:"20", label:"20분" }, { val:"30", label:"30분" },
    { val:"40", label:"40분" }, { val:"45", label:"45분" },
    { val:"60", label:"1시간"}, { val:"80", label:"1시간20분"},
    { val:"90", label:"1시간30분"},
  ];

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet({ action:"getLessons" });
      setLessons(data || []);
    } catch(e) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditLesson(null);
    setFName(""); setFDur("60"); setFPrice(""); setFColor("#34d399");
    setFDesc(""); setFOrder(String((lessons.length + 1) * 10));
    setShowForm(true);
  };

  const openEdit = (l) => {
    setEditLesson(l);
    setFName(l["레슨명"]);
    setFDur(String(l["소요시간(분)"] || 60));
    setFPrice(String(l["가격"] || ""));
    setFColor(l["색상"] || "#34d399");
    setFDesc(l["설명"] || "");
    setFOrder(String(l["정렬순서"] || 99));
    setShowForm(true);
  };

  const save = async () => {
    if (!fName.trim()) { showToast("레슨명을 입력해주세요."); return; }
    if (!fDur)         { showToast("소요시간을 선택해주세요."); return; }
    setSubmitting(true);
    try {
      if (editLesson) {
        await apiPost({
          action:"updateLesson", lessonId:editLesson["레슨ID"],
          name:fName, duration:fDur, price:fPrice,
          color:fColor, desc:fDesc, sortOrder:fOrder,
          password:adminPw,
        });
        showToast("✅ 레슨 종류 수정 완료");
      } else {
        await apiPost({
          action:"createLesson",
          name:fName, duration:fDur, price:fPrice,
          color:fColor, desc:fDesc, sortOrder:fOrder,
          password:adminPw,
        });
        showToast("✅ 레슨 종류 추가 완료");
      }
      setShowForm(false);
      load();
    } catch(e) { showToast("❌ " + e.message); }
    finally { setSubmitting(false); }
  };

  const del = async (lessonId, name) => {
    if (!window.confirm(`"${name}" 레슨 종류를 삭제할까요?
기존 예약 데이터에는 영향 없습니다.`)) return;
    try {
      await apiPost({ action:"deleteLesson", lessonId, password:adminPw });
      showToast("✅ 삭제 완료");
      load();
    } catch(e) { showToast("❌ " + e.message); }
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ fontSize:12, color:"#4b5675" }}>총 {lessons.length}개 레슨 종류</div>
        <button onClick={openNew} style={{
          padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer",
          background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399",
        }}>+ 레슨 추가</button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div style={{
          background:"#181c25", border:"1px solid rgba(52,211,153,.2)",
          borderRadius:12, padding:14, marginBottom:14,
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#34d399", marginBottom:12 }}>
            {editLesson ? `✏️ "${editLesson["레슨명"]}" 수정` : "➕ 새 레슨 종류 추가"}
          </div>

          {/* 레슨명 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>레슨명 *</div>
            <input value={fName} onChange={e=>setFName(e.target.value)}
              placeholder="예: 개인30분, 그룹레슨, VIP 코칭..."
              style={{ ...INP, fontSize:12 }} />
          </div>

          {/* 소요시간 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>소요시간 *</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {DURATIONS.map(d => (
                <button key={d.val} onClick={() => setFDur(d.val)} style={{
                  padding:"5px 10px", borderRadius:6, fontSize:11, cursor:"pointer",
                  fontWeight: fDur===d.val ? 700 : 400,
                  background: fDur===d.val ? "#34d399" : "#1a1e28",
                  color: fDur===d.val ? "#000" : "#94a3b8",
                  border: fDur===d.val ? "none" : "1px solid #2d3347",
                }}>{d.label}</button>
              ))}
              {/* 직접 입력 */}
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <input value={!DURATIONS.find(d=>d.val===fDur) ? fDur : ""}
                  onChange={e=>setFDur(e.target.value)}
                  placeholder="직접입력(분)"
                  style={{ ...INP, width:80, fontSize:10 }} />
              </div>
            </div>
          </div>

          {/* 가격 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>가격 (원, 선택)</div>
            <input value={fPrice} onChange={e=>setFPrice(e.target.value)}
              placeholder="예: 30000"
              type="number"
              style={{ ...INP, fontSize:12 }} />
          </div>

          {/* 설명 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>설명 (선택)</div>
            <input value={fDesc} onChange={e=>setFDesc(e.target.value)}
              placeholder="예: 1:1 개인 레슨 30분"
              style={{ ...INP, fontSize:12 }} />
          </div>

          {/* 색상 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>색상 태그</div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setFColor(c)} style={{
                  width:24, height:24, borderRadius:"50%", background:c, cursor:"pointer",
                  border: fColor===c ? "3px solid #fff" : "2px solid transparent",
                  transition:"transform .1s",
                  transform: fColor===c ? "scale(1.2)" : "scale(1)",
                }}/>
              ))}
              <input type="color" value={fColor} onChange={e=>setFColor(e.target.value)}
                style={{ width:28, height:28, borderRadius:4, border:"none", cursor:"pointer", background:"none" }} />
              <span style={{ fontSize:10, color:"#4b5675" }}>{fColor}</span>
            </div>
          </div>

          {/* 정렬순서 */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:3 }}>정렬 순서</div>
            <input value={fOrder} onChange={e=>setFOrder(e.target.value)}
              type="number" placeholder="숫자가 작을수록 앞에 표시"
              style={{ ...INP, fontSize:12 }} />
          </div>

          {/* 미리보기 */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
            background:fColor+"15", border:`1px solid ${fColor}44`,
            borderRadius:8, marginBottom:12,
          }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:fColor, flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:fColor }}>{fName||"레슨명"}</div>
              <div style={{ fontSize:10, color:"#94a3b8" }}>
                {DURATIONS.find(d=>d.val===fDur)?.label || fDur+"분"}
                {fPrice ? ` · ${Number(fPrice).toLocaleString()}원` : ""}
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setShowForm(false)} style={{
              flex:1, padding:"8px 0", borderRadius:8, fontSize:11, cursor:"pointer",
              background:"#1a1e28", border:"1px solid #2d3347", color:"#94a3b8",
            }}>취소</button>
            <button onClick={save} disabled={submitting} style={{
              flex:2, padding:"8px 0", borderRadius:8, fontSize:12, fontWeight:700,
              cursor: submitting ? "not-allowed" : "pointer",
              background:"#34d399", border:"none", color:"#000",
              opacity: submitting ? .6 : 1,
              fontFamily:"'Noto Sans KR', sans-serif",
            }}>{submitting ? "저장 중..." : editLesson ? "✅ 수정 완료" : "✅ 추가"}</button>
          </div>
        </div>
      )}

      {/* 레슨 목록 */}
      {loading ? <Spinner /> : lessons.length === 0 ? (
        <div style={{ textAlign:"center", color:"#4b5675", fontSize:12, padding:"24px 0" }}>
          레슨 종류가 없습니다.<br/>
          <span style={{ fontSize:11, color:"#2d3347" }}>위 버튼으로 추가해보세요.</span>
        </div>
      ) : lessons.map(l => (
        <div key={l["레슨ID"]} style={{
          background:"#181c25", borderRadius:10, padding:"11px 13px", marginBottom:8,
          border:`1px solid ${l["색상"]||"#34d399"}33`,
          borderLeft:`3px solid ${l["색상"]||"#34d399"}`,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <div style={{
            width:10, height:10, borderRadius:"50%",
            background:l["색상"]||"#34d399", flexShrink:0,
          }}/>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
              <span style={{ fontSize:12, fontWeight:700 }}>{l["레슨명"]}</span>
              <span style={{
                fontSize:9, padding:"1px 6px", borderRadius:3,
                background:(l["색상"]||"#34d399")+"22", color:l["색상"]||"#34d399", fontWeight:700,
              }}>
                {l["소요시간(분)"]}분
              </span>
            </div>
            <div style={{ fontSize:10, color:"#4b5675" }}>
              {l["가격"] ? Number(l["가격"]).toLocaleString()+"원" : "가격 미설정"}
              {l["설명"] ? ` · ${l["설명"]}` : ""}
            </div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={() => openEdit(l)} style={{
              padding:"4px 8px", borderRadius:5, fontSize:9, cursor:"pointer",
              border:"1px solid rgba(56,189,248,.3)", background:"rgba(56,189,248,.1)", color:"#38bdf8",
            }}>수정</button>
            <button onClick={() => del(l["레슨ID"], l["레슨명"])} style={{
              padding:"4px 8px", borderRadius:5, fontSize:9, cursor:"pointer",
              border:"1px solid rgba(248,113,113,.3)", background:"rgba(248,113,113,.1)", color:"#f87171",
            }}>삭제</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminBlockTab({ coaches, adminPw, showToast }) {
  const DOW_KR = ["일","월","화","수","목","금","토"];

  // 20분 단위 시간 목록
  const TIMES = [];
  for (let m = 6*60; m < 23*60; m += 20) {
    TIMES.push(String(Math.floor(m/60)).padStart(2,"0") + ":" + String(m%60).padStart(2,"0"));
  }

  const [selCoach, setSelCoach]   = useState(coaches[0]?.id || "");
  const [blocks, setBlocks]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);

  // 폼 상태
  const [blockType, setBlockType] = useState("날짜");    // "날짜" | "요일"
  const [selDate, setSelDate]     = useState("");        // 특정 날짜
  const [selDow, setSelDow]       = useState(1);         // 요일 (0=일~6=토)
  const [fromTime, setFromTime]   = useState("09:00");
  const [toTime, setToTime]       = useState("12:00");
  const [reason, setReason]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 차단 목록 로드
  const loadBlocks = useCallback(async () => {
    if (!selCoach) return;
    setLoading(true);
    try {
      const data = await apiGet({ action:"getBlocksByCoach", coachId:selCoach });
      setBlocks(data || []);
    } catch(e) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [selCoach]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  // 차단 시간 목록 생성 (from~to 20분 단위)
  const buildTimeList = (from, to) => {
    const list = [];
    const [fh, fm] = from.split(":").map(Number);
    const [th, tm] = to.split(":").map(Number);
    let cur = fh * 60 + fm;
    const end = th * 60 + tm;
    while (cur <= end) {
      list.push(String(Math.floor(cur/60)).padStart(2,"0") + ":" + String(cur%60).padStart(2,"0"));
      cur += 20;
    }
    return list;
  };

  // 차단 등록
  const addBlock = async () => {
    if (blockType === "날짜" && !selDate) { showToast("날짜를 선택해주세요."); return; }
    if (!fromTime || !toTime) { showToast("시간을 선택해주세요."); return; }
    if (fromTime > toTime) { showToast("시작 시간이 종료 시간보다 늦습니다."); return; }

    setSubmitting(true);
    try {
      const times = buildTimeList(fromTime, toTime);
      if (blockType === "날짜") {
        await apiPost({
          action: "addBlock",
          coachId: selCoach,
          type: "날짜",
          range: selDate,
          hours: JSON.stringify(times),
          reason: reason || "차단",
          password: adminPw,
        });
      } else {
        // 요일 반복 차단
        await apiPost({
          action: "addBlock",
          coachId: selCoach,
          type: "요일",
          range: String(selDow),
          hours: JSON.stringify(times),
          reason: reason || `매주 ${DOW_KR[selDow]}요일 차단`,
          password: adminPw,
        });
      }
      showToast("✅ 차단 등록 완료");
      setShowForm(false);
      setReason("");
      loadBlocks();
    } catch(e) { showToast("❌ " + e.message); }
    finally { setSubmitting(false); }
  };

  // 차단 해제
  const removeBlock = async (blockId) => {
    if (!window.confirm("차단을 해제할까요?")) return;
    try {
      await apiPost({ action:"removeBlock", blockId, password:adminPw });
      showToast("✅ 차단 해제 완료");
      loadBlocks();
    } catch(e) { showToast("❌ " + e.message); }
  };

  return (
    <div>
      {/* 프로 선택 */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {coaches.filter(c=>c.status==="active").map(c => (
          <button key={c.id} onClick={() => setSelCoach(c.id)} style={{
            padding:"6px 12px", borderRadius:7, fontSize:11, cursor:"pointer",
            fontWeight: selCoach===c.id ? 700 : 400,
            background: selCoach===c.id ? (c.color||"#34d399") : "#1a1e28",
            color: selCoach===c.id ? "#000" : "#94a3b8",
            border: selCoach===c.id ? "none" : "1px solid #2d3347",
          }}>{c.icon||"🏌️"} {c.name}</button>
        ))}
      </div>

      {/* 차단 등록 버튼 */}
      <button onClick={() => setShowForm(!showForm)} style={{
        width:"100%", padding:"9px 0", borderRadius:9, fontSize:12, fontWeight:700,
        cursor:"pointer", marginBottom:12,
        background: showForm ? "#1a1e28" : "rgba(248,113,113,.15)",
        border: showForm ? "1px solid #2d3347" : "1px solid rgba(248,113,113,.3)",
        color: showForm ? "#94a3b8" : "#f87171",
      }}>{showForm ? "✕ 닫기" : "🚫 차단 추가"}</button>

      {/* 차단 등록 폼 */}
      {showForm && (
        <div style={{
          background:"#181c25", border:"1px solid rgba(248,113,113,.2)",
          borderRadius:12, padding:14, marginBottom:14,
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#f87171", marginBottom:12 }}>차단 설정</div>

          {/* 차단 유형 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>차단 유형</div>
            <div style={{ display:"flex", gap:6 }}>
              {[
                { id:"날짜", label:"📅 특정 날짜", desc:"하루만" },
                { id:"요일", label:"🔁 요일 반복", desc:"매주 반복" },
              ].map(t => (
                <button key={t.id} onClick={() => setBlockType(t.id)} style={{
                  flex:1, padding:"8px 6px", borderRadius:8, fontSize:11, cursor:"pointer",
                  fontWeight: blockType===t.id ? 700 : 400,
                  background: blockType===t.id ? "rgba(248,113,113,.2)" : "#1a1e28",
                  color: blockType===t.id ? "#f87171" : "#94a3b8",
                  border: `1px solid ${blockType===t.id ? "rgba(248,113,113,.4)" : "#2d3347"}`,
                }}>
                  <div>{t.label}</div>
                  <div style={{ fontSize:9, opacity:.7, marginTop:2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 또는 요일 선택 */}
          {blockType === "날짜" ? (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>차단 날짜 *</div>
              <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}
                style={{ ...INP, fontSize:12 }} />
            </div>
          ) : (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>반복 요일 *</div>
              <div style={{ display:"flex", gap:4 }}>
                {DOW_KR.map((d,i) => (
                  <button key={i} onClick={() => setSelDow(i)} style={{
                    flex:1, padding:"7px 0", borderRadius:6, fontSize:11, cursor:"pointer",
                    fontWeight: selDow===i ? 700 : 400,
                    background: selDow===i ? "#f87171" : "#1a1e28",
                    color: selDow===i ? "#fff" : i===0?"#f87171":i===6?"#38bdf8":"#94a3b8",
                    border: selDow===i ? "none" : "1px solid #2d3347",
                  }}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {/* 시간 범위 */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>차단 시간 범위 *</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <select value={fromTime} onChange={e=>setFromTime(e.target.value)}
                style={{ ...INP, flex:1, fontSize:11 }}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ color:"#4b5675", fontSize:12 }}>~</span>
              <select value={toTime} onChange={e=>setToTime(e.target.value)}
                style={{ ...INP, flex:1, fontSize:11 }}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ fontSize:9, color:"#4b5675", marginTop:4 }}>
              {buildTimeList(fromTime, toTime).length}개 슬롯 차단 ({fromTime}~{toTime})
            </div>
          </div>

          {/* 사유 */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:"#4b5675", marginBottom:4 }}>사유 (선택)</div>
            <input value={reason} onChange={e=>setReason(e.target.value)}
              placeholder="예: 점심시간, 개인 일정, 휴무..."
              style={{ ...INP, fontSize:11 }} />
          </div>

          {/* 미리보기 요약 */}
          <div style={{
            background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.15)",
            borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:11,
          }}>
            <div style={{ color:"#f87171", fontWeight:700, marginBottom:4 }}>🚫 차단 요약</div>
            <div style={{ color:"#94a3b8", lineHeight:1.8 }}>
              {coaches.find(c=>c.id===selCoach)?.name}<br/>
              {blockType==="날짜"
                ? `📅 ${selDate || "날짜 선택 필요"}`
                : `🔁 매주 ${DOW_KR[selDow]}요일`
              } · {fromTime} ~ {toTime}<br/>
              {reason && `사유: ${reason}`}
            </div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setShowForm(false)} style={{
              flex:1, padding:"8px 0", borderRadius:8, fontSize:11, cursor:"pointer",
              background:"#1a1e28", border:"1px solid #2d3347", color:"#94a3b8",
            }}>취소</button>
            <button onClick={addBlock} disabled={submitting} style={{
              flex:2, padding:"8px 0", borderRadius:8, fontSize:12, fontWeight:700,
              cursor: submitting ? "not-allowed" : "pointer",
              background:"rgba(248,113,113,.85)", border:"none", color:"#fff",
              opacity: submitting ? .6 : 1,
              fontFamily:"'Noto Sans KR', sans-serif",
            }}>{submitting ? "등록 중..." : "🚫 차단 등록"}</button>
          </div>
        </div>
      )}

      {/* 차단 목록 */}
      {loading ? <Spinner /> : blocks.length === 0 ? (
        <div style={{ textAlign:"center", color:"#4b5675", fontSize:12, padding:"24px 0" }}>
          등록된 차단이 없습니다.
        </div>
      ) : (
        <div>
          <div style={{ fontSize:10, color:"#4b5675", marginBottom:8 }}>
            활성 차단 {blocks.length}건
          </div>
          {blocks.map(b => {
            const times = (() => { try { return JSON.parse(b["시간목록"]||"[]"); } catch { return []; } })();
            const isRepeat = b["유형"] === "요일";
            return (
              <div key={b["차단ID"]} style={{
                background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.2)",
                borderLeft:"3px solid #f87171",
                borderRadius:10, padding:"10px 12px", marginBottom:8,
                display:"flex", alignItems:"flex-start", gap:10,
              }}>
                <span style={{ fontSize:20, marginTop:2 }}>{isRepeat ? "🔁" : "📅"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                    <span style={{
                      fontSize:9, padding:"1px 6px", borderRadius:3, fontWeight:700,
                      background: isRepeat ? "rgba(56,189,248,.2)" : "rgba(248,113,113,.2)",
                      color: isRepeat ? "#38bdf8" : "#f87171",
                    }}>{isRepeat ? "요일 반복" : "특정 날짜"}</span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, marginBottom:2 }}>
                    {isRepeat
                      ? `매주 ${DOW_KR[Number(b["날짜범위또는요일"])]}요일`
                      : b["날짜범위또는요일"]
                    }
                  </div>
                  <div style={{ fontSize:11, color:"#94a3b8" }}>
                    {times.length > 0
                      ? `⏰ ${times[0]} ~ ${times[times.length-1]}`
                      : "전체 시간"
                    } · {times.length}슬롯
                  </div>
                  {b["사유"] && (
                    <div style={{ fontSize:10, color:"#4b5675", marginTop:2 }}>💬 {b["사유"]}</div>
                  )}
                  <div style={{ fontSize:9, color:"#2d3347", marginTop:3 }}>
                    {String(b["등록일시"]||"").slice(0,10)} 등록
                  </div>
                </div>
                <button onClick={() => removeBlock(b["차단ID"])} style={{
                  padding:"4px 10px", borderRadius:6, fontSize:10, cursor:"pointer", flexShrink:0,
                  background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.3)", color:"#f87171",
                }}>해제</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminReportTab({ list, adminPw, showToast, onDone }) {
  const blind = async (type, id) => {
    try { await apiPost({ action: "blindContent", targetType: type, targetId: id, password: adminPw }); showToast("✅ 블라인드 완료"); onDone(); }
    catch (e) { showToast("❌ " + e.message); }
  };
  const dismiss = async (id) => {
    try { await apiPost({ action: "dismissReport", reportId: id, password: adminPw }); showToast("기각 처리"); onDone(); }
    catch (e) { showToast("❌ " + e.message); }
  };
  if (!list.length) return <div style={{ color: "#4b5675", textAlign: "center", fontSize: 12, padding: 20 }}>접수된 신고가 없습니다. ✅</div>;
  return list.map(r => (
    <div key={r.신고ID} style={{ background: "rgba(248,113,113,.05)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", marginBottom: 3 }}>{r.대상타입 === "post" ? "📝 게시글" : "💬 댓글"} 신고</div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>사유: {r.신고사유} · {r.신고일시?.slice(0, 10)}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => blind(r.대상타입, r.대상ID)} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(248,113,113,.2)", border: "1px solid rgba(248,113,113,.3)", color: "#f87171", fontSize: 10, cursor: "pointer" }}>🚫 블라인드</button>
        <button onClick={() => dismiss(r.신고ID)} style={{ padding: "4px 10px", borderRadius: 6, background: "#1a1e28", border: "1px solid #2d3347", color: "#94a3b8", fontSize: 10, cursor: "pointer" }}>기각</button>
      </div>
    </div>
  ));
}

// ─────────────────────────────────────────────
//  메인 App — Hook은 이 함수 최상위에서만 호출
// ─────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState("home");
  const [toast, setToast]         = useState("");
  const [coaches, setCoaches]     = useState([]);
  const [selPro, setSelPro]       = useState(null);
  const [bookStep, setBookStep]   = useState(1);
  const [detailPro, setDetailPro] = useState(null);
  const [globalAdminPw, setGlobalAdminPw] = useState(""); // 관리자 로그인 시 공유

  const showToast = useCallback(msg => setToast(msg), []);

  useEffect(() => {
    apiGet({ action: "getCoaches" })
      .then(setCoaches)
      .catch(() => showToast("⚠️ 프로 목록 로딩 실패. GAS URL을 확인하세요."));
  }, []);

  const TABS = [
    { id: "home",  label: "홈",    icon: "🏠" },
    { id: "book",  label: "예약",  icon: "📅" },
    { id: "my",    label: "마이",  icon: "👤" },
    { id: "board", label: "게시판",icon: "📌" },
    { id: "admin", label: "관리자",icon: "⚙️" },
  ];

  return (
    <div style={{
      background: "#08090d", color: "#e2e8f0", minHeight: "100vh",
      fontFamily: "'Noto Sans KR', sans-serif", maxWidth: 480, margin: "0 auto",
      display: "flex", flexDirection: "column",
    }}>
      {/* 앱바 */}
      <div style={{
        background: "#0d0f14", borderBottom: "1px solid #1f2435",
        padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: 17, fontWeight: 900 }}>⛳ OK골프 레슨</div>
        <span style={{ fontSize: 18 }}>🔔</span>
      </div>

      {/* 화면 */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 62 }}>
        {tab === "home"  && <HomeScreen  coaches={coaches} selPro={selPro} setSelPro={setSelPro} setTab={setTab} setBookStep={setBookStep} setDetailPro={setDetailPro} />}
        {tab === "book"  && <BookScreen  coaches={coaches} selPro={selPro} setSelPro={setSelPro} setDetailPro={setDetailPro} showToast={showToast} setTab={setTab} />}
        {tab === "my"    && <MyScreen    showToast={showToast} />}
        {tab === "board" && <BoardScreen coaches={coaches} myPhone="" adminPw={globalAdminPw} showToast={showToast} />}
        {tab === "admin" && <AdminScreen coaches={coaches} setCoaches={setCoaches} showToast={showToast} onLogin={setGlobalAdminPw} />}
      </div>

      {/* 탭바 */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "rgba(13,15,20,.97)",
        borderTop: "1px solid #1f2435", display: "flex", zIndex: 100,
      }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 2, padding: "8px 0", cursor: "pointer",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 9, color: tab === t.id ? "#34d399" : "#4b5675", fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* 프로 상세 모달 */}
      <ProDetailModal pro={detailPro} onClose={() => setDetailPro(null)}
        onSelect={pro => { setSelPro(pro); setTab("book"); setBookStep(1); }} />

      <Toast msg={toast} onClose={() => setToast("")} />
    </div>
  );
}