import { useEffect, useState, useRef, useCallback } from "react";
import Head from "next/head";
import { db } from "@/lib/firebase";
import {
  ref,
  onValue,
  set,
  update,
  runTransaction,
  serverTimestamp,
  get,
} from "firebase/database";
import questions from "@/lib/questions";
import { roundReady } from "@/lib/roundReady";
import { shuffleQuiz } from "@/lib/shuffleQuiz";

import { useServerOffset } from "@/lib/useServerOffset";
import Scoreboard from "@/components/Scoreboard";

const TIMER_DURATION = 15;

const TEAM_COLORS = [
  {
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.5)",
  },
  {
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.35)",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.5)",
  },
  {
    color: "#10b981",
    glow: "rgba(16,185,129,0.35)",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.5)",
  },
  {
    color: "#a855f7",
    glow: "rgba(168,85,247,0.35)",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.5)",
  },
];

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: ["#fbbf24", "#ef4444", "#3b82f6", "#10b981", "#a855f7", "#f472b6"][
      i % 6
    ],
    delay: `${Math.random() * 4}s`,
    duration: `${3 + Math.random() * 3}s`,
    size: `${6 + Math.random() * 8}px`,
  }));
  return (
    <div className="confetti">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

export default function HostPage() {
  const offset = useServerOffset();
  const [resultsOpen, setResultsOpen] = useState(false);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [revealTriggered, setRevealTriggered] = useState(false);
  const timerRef = useRef(null);
  const revealRef = useRef(false);

  const [connected, setConnected] = useState(false);
  useEffect(() => onValue(ref(db, '.info/connected'), snap => setConnected(snap.val() === true)), []);

  // Listen to full game state
  useEffect(() => {
    const gameRef = ref(db, "quiz");
    const unsub = onValue(gameRef, (snap) => {
      const data = snap.val() || {};
      setGameState(data);
    }, () => setError("Mất kết nối dữ liệu. Vui lòng kiểm tra mạng và tải lại."));
    return () => unsub();
  }, []);

  useEffect(() => {
    setResultsOpen(gameState?.status === "reveal");
  }, [gameState?.status, gameState?.currentQuestion?.roundId]);

  useEffect(() => {
    if (gameState?.status !== "syncing") return;
    const cq = gameState.currentQuestion;
    if (!roundReady(gameState, cq.roundId)) return;
    runTransaction(ref(db, "quiz"), data => {
      if (!roundReady(data, cq.roundId)) return;
      return { ...data, status: "question", currentQuestion: { ...data.currentQuestion, startTime: serverTimestamp() } };
    }, { applyLocally: false }).catch(() => setError("Không thể bắt đầu thời gian. Kiểm tra kết nối và tải lại host."));
  }, [gameState]);

  // Timer logic
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    revealRef.current = false;
    setRevealTriggered(false);

    if (
      offset !== null &&
      gameState?.status === "question" &&
      gameState?.currentQuestion?.startTime
    ) {
      const startTime = gameState.currentQuestion.startTime;

      const tick = () => {
        const elapsed = (Date.now() + offset - startTime) / 1000;
        const remaining = Math.max(0, TIMER_DURATION - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0 && !revealRef.current) {
          revealRef.current = true;
          setRevealTriggered(true);
          triggerReveal(startTime).catch(() => {
            setError("Không thể lưu kết quả. Đang thử lại…");
            revealRef.current = false;
          });
        }
      };

      tick();
      timerRef.current = setInterval(tick, 200);
    } else if (gameState?.status === "reveal") {
      setTimeLeft(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.status, gameState?.currentQuestion?.startTime, offset]);

  const triggerReveal = useCallback(async (startTime) => {
    await get(ref(db, "quiz"));
    await runTransaction(
      ref(db, "quiz"),
      (data) => {
        if (
          !data ||
          data.status !== "question" ||
          data.currentQuestion?.startTime !== startTime
        )
          return;
        const cq = data.currentQuestion;
        const answers = data.answers || {};
        const teams = Object.fromEntries(
          Object.entries(data.teams || {}).map(([key, team]) => [
            key,
            team ? { ...team } : null,
          ]),
        );
        const correctAnswer = cq.questionData.answer;

        // Build results
        const teamResults = Object.entries(teams)
          .filter(([, t]) => t !== null)
          .map(([slotKey, team]) => {
            const ans = answers[slotKey];
            const isCorrect = !!ans && ans.answer === correctAnswer;
            return {
              slotKey,
              name: team.name,
              slot: team.slot,
              answer: ans ? ans.answer : null,
              responseTime: ans ? ans.responseTime : null,
              correct: isCorrect,
            };
          })
          .sort((a, b) => {
            if (a.correct && !b.correct) return -1;
            if (!a.correct && b.correct) return 1;
            if (a.correct && b.correct)
              return (a.responseTime ?? 99) - (b.responseTime ?? 99);
            return 0;
          });

        // Assign points
        let correctRank = 0;
        const pointMap = [10, 9, 8, 7];

        teamResults.forEach((r) => {
          let pts = 0;
          if (r.correct) {
            pts = pointMap[correctRank] || 7;
            correctRank++;
          }
          r.points = pts;

          // Update team score
          const currentScore = teams[r.slotKey]?.score || 0;
          teams[r.slotKey].score = currentScore + pts;
        });

        // Save question history
        const historyIndex = data.history
          ? Object.keys(data.history).length
          : 0;
        const result = {
          number: cq.number,
          question: cq.questionData.question,
          correctAnswer,
          results: teamResults,
        };

        return {
          ...data,
          teams,
          history: { ...data.history, [historyIndex]: result },
          usedQuestions: { ...data.usedQuestions, [cq.number]: true },
          status: "reveal",
        };
      },
      { applyLocally: false },
    );
    setError("");
  }, []);

  const handleSelectQuestion = async (qNumber) => {
    if (
      selecting ||
      gameState?.status !== "picking" ||
      gameState?.usedQuestions?.[qNumber]
    )
      return;
    setSelecting(true);
    setError("");
    try {
      const roundId = crypto.randomUUID();
      await get(ref(db, "quiz"));
      const selection = await runTransaction(
        ref(db, "quiz"),
        (data) => {
          if (
            !data ||
            data.status !== "picking" ||
            data.usedQuestions?.[qNumber]
          )
            return;
          return {
            ...data,
            status: "syncing",
            ready: null,
            currentQuestion: {
              number: qNumber,
              questionData: (data.questionDeck || questions)[qNumber - 1],
              roundId,
            },
            answers: null,
          };
        },
        { applyLocally: false },
      );
      if (!selection.committed) setError("Câu hỏi chưa được mở. Vui lòng thử lại.");
    } catch {
      setError("Không thể mở câu hỏi. Vui lòng thử lại.");
    } finally {
      setSelecting(false);
    }
  };

  const handleNextQuestion = async () => {
    const usedCount = gameState?.usedQuestions
      ? Object.keys(gameState.usedQuestions).length
      : 0;
    if (usedCount >= 10) {
      await update(ref(db, "quiz"), { status: "finished", questionDeck: shuffleQuiz(questions) });
    } else {
      await update(ref(db, "quiz"), {
        status: "picking",
        currentQuestion: null,
        answers: null,
      });
    }
  };

  const handleStartGame = async () => {
    await update(ref(db, "quiz"), {
      status: "picking",
      questionDeck: gameState.questionDeck || shuffleQuiz(questions),
      teams: Object.fromEntries(Object.entries(gameState.teams || {}).filter(([, t]) => t).map(([k, t]) => [k, { ...t, score: 0 }])),
      ready: null,
      usedQuestions: null,
      history: null,
      currentQuestion: null,
      answers: null,
    });
  };

  const handleResetGame = async () => {
    if (!confirm("Bạn có chắc muốn reset game? Tất cả điểm số sẽ bị xóa!"))
      return;
    await set(ref(db, "quiz"), {
      status: "lobby",
      teams: { slot1: null, slot2: null, slot3: null, slot4: null },
      usedQuestions: null,
      history: null,
      currentQuestion: null,
      answers: null,
    });
  };

  if (!gameState) {
    return (
      <div
        className="page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚡</div>
          <p>Đang kết nối...</p>
        </div>
      </div>
    );
  }

  const status = gameState.status || "lobby";
  const teams = gameState.teams || {};
  const usedQuestions = gameState.usedQuestions || {};
  const answers = gameState.answers || {};
  const cq = gameState.currentQuestion;
  const history = gameState.history || {};

  const teamList = ["slot1", "slot2", "slot3", "slot4"]
    .map((k) => ({ key: k, ...(teams[k] || null) }))
    .filter((t) => t.name);

  const answeredCount = Object.values(answers).filter(Boolean).length;

  // Timer display
  const timerPct = (timeLeft / TIMER_DURATION) * 100;
  const timerClass = timeLeft <= 5 ? "danger" : timeLeft <= 8 ? "warning" : "";

  // Scoreboard chips
  const scoreChips = teamList.map((t) => {
    const tc = TEAM_COLORS[t.slot] || TEAM_COLORS[0];
    return (
      <div
        key={t.key}
        className="score-chip"
        style={{ background: tc.bg, borderColor: tc.border, color: tc.color }}
      >
        <span>{t.name}</span>
        <span
          style={{
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 900,
            fontSize: "1.1rem",
          }}
        >
          {t.score ?? 0}
        </span>
      </div>
    );
  });

  // Reveal data
  let revealData = null;
  if (status === "reveal" && history) {
    const keys = Object.keys(history);
    revealData = history[keys[keys.length - 1]];
  }

  return (
    <>
      <Head>
        <title>Phần thi trắc nghiệm-host</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="grid-bg" />
      <div className="page host-page">
        {/* Header */}
        <div className="host-header">
          <div className="host-title">⚡ PHẦN THI TRẮC NGHIỆM</div>
          
          <button
            onClick={handleResetGame}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            🔄 Reset
          </button>
        </div>

        {!connected && <p role="alert">Đang mất kết nối Firebase. Câu hỏi sẽ chờ các đội kết nối lại trước khi bắt đầu.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="host-layout">
        <aside className="host-sidebar"><Scoreboard teams={teams} /></aside>
        <main className="host-main">
        {/* LOBBY */}
        {status === "lobby" && (
          <div className="waiting-screen">
            <div className="waiting-title">⚡ QUIZ BATTLE</div>
            <p className="waiting-subtitle">Chờ các đội tham gia...</p>
            <div className="lobby-teams">
              {["slot1", "slot2", "slot3", "slot4"].map((key, i) => {
                const tc = TEAM_COLORS[i];
                const team = teams[key];
                return (
                  <div
                    key={key}
                    className="lobby-team-card"
                    style={{
                      borderColor: team ? tc.color : "rgba(255,255,255,0.08)",
                      background: team ? tc.bg : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      className="slot-dot"
                      style={{
                        color: team ? tc.color : "rgba(255,255,255,0.2)",
                      }}
                    />
                    <div className="team-info">
                      <div
                        className="team-n"
                        style={{
                          color: team ? tc.color : "var(--text-secondary)",
                        }}
                      >
                        {team ? team.name : `Đội ${i + 1}`}
                      </div>
                      <div className="team-st">
                        {team ? (
                          <>
                            <span className="pulse-dot" /> Đã vào
                          </>
                        ) : (
                          "Chờ tham gia..."
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="start-btn-wrapper">
              <button
                className="start-btn"
                onClick={handleStartGame}
                disabled={teamList.length < 1}
              >
                🚀 Bắt đầu Game
              </button>
              {teamList.length < 2 && (
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                  }}
                >
                  Cần ít nhất 2 đội để bắt đầu
                </p>
              )}
            </div>
          </div>
        )}

        {/* PICKING */}
        {status === "picking" && (
          <div className="question-grid-section">
            <h2>🎯 Chọn câu hỏi</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "-20px" }}>
              Đã trả lời: {Object.keys(usedQuestions).length}/10 câu
            </p>
            <div className="q-grid">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const used = !!usedQuestions[n];
                return (
                  <button
                    type="button"
                    disabled={used || selecting}
                    aria-label={`Câu ${n}${used ? ": đã trả lời" : ""}`}
                    key={n}
                    className={`q-box ${used ? "used" : ""}`}
                    onClick={() => !used && handleSelectQuestion(n)}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* QUESTION ACTIVE */}
        {["syncing", "question", "reveal"].includes(status) && cq && (
          <div className="question-card-section">
            {/* Timer */}
            <div className="timer-section">
              <div className={`timer-display ${timerClass}`}>
                {status === "syncing" ? "Đang đồng bộ…" : status === "reveal" ? "Hết giờ" : `${Math.ceil(timeLeft)}s`}
              </div>
              <div className="timer-bar-track">
                <div
                  className={`timer-bar-fill ${timerClass}`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
            </div>

            {status === "syncing" && <p role="status">Chờ các đội nhận câu hỏi: {teamList.filter(t => gameState.ready?.[t.key] === cq.roundId).length}/{teamList.length}. Nếu chờ lâu, hãy kiểm tra mạng hoặc tải lại màn hình đội.</p>}
            {status === "reveal" && <div className="host-round-actions"><button className="next-btn" onClick={() => setResultsOpen(true)}>Xem kết quả câu này</button><button className="next-btn" onClick={handleNextQuestion}>{Object.keys(usedQuestions).length >= 10 ? "Xem kết quả cuối" : "Câu tiếp theo"}</button></div>}
            {/* Answer status */}
            <div className="answer-status">
              {["slot1", "slot2", "slot3", "slot4"].map((key, i) => {
                const team = teams[key];
                if (!team) return null;
                const answered = !!answers[key];
                const tc = TEAM_COLORS[i];
                return (
                  <div
                    key={key}
                    className={`answer-chip ${answered ? "answered" : "waiting"}`}
                    style={
                      answered
                        ? {
                            background: tc.bg,
                            borderColor: tc.border,
                            color: tc.color,
                          }
                        : {}
                    }
                  >
                    {answered ? "✓" : "⏳"} {team.name}
                  </div>
                );
              })}
            </div>

            {/* Question card */}
            <div className="question-card">
              <div className="question-number-badge">
                📋 Câu {cq.number} / 10 &nbsp;·&nbsp; {cq.questionData.category}
              </div>
              <div className="question-text">{cq.questionData.question}</div>
              <div className="options-grid">
                {["A", "B", "C", "D"].map((letter) => (
                  <div key={letter} className="option-item">
                    <div className="option-letter">{letter}</div>
                    <span>{cq.questionData.options[letter]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REVEAL */}
        {status === "reveal" && revealData && cq && resultsOpen && (
          <div className="results-overlay" onClick={() => setResultsOpen(false)}><div className="reveal-section results-dialog" role="dialog" aria-modal="true" aria-label="Kết quả câu hỏi" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setResultsOpen(false); }}>
            <button autoFocus className="results-close" onClick={() => setResultsOpen(false)}>Đóng ✕</button>
            <div className="reveal-title">
              🏁 Kết Quả Câu {cq?.number ?? ""}
            </div>

            <div
              className="question-card"
              style={{ padding: "24px", maxWidth: "800px" }}
            >
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  marginBottom: "8px",
                }}
              >
                Câu hỏi:
              </p>
              <p
                style={{
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  marginBottom: "16px",
                }}
              >
                {revealData.question}
              </p>
              <div className="options-grid">
                {["A", "B", "C", "D"].map((letter) => (
                  <div
                    key={letter}
                    className={`option-item ${letter === revealData.correctAnswer ? "correct" : "wrong-highlighted"}`}
                  >
                    <div className="option-letter">{letter}</div>
                    <span>
                      {cq?.questionData?.options?.[letter] ??
                        questions.find(
                          (q) => q.question === revealData.question,
                        )?.options?.[letter]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-correct-answer">
              ✅ Đáp án đúng:{" "}
              <strong style={{ marginLeft: 8 }}>
                {revealData.correctAnswer} –{" "}
                {cq?.questionData?.options?.[revealData.correctAnswer]}
              </strong>
            </div>

            {/* Results table */}
            <table className="results-table">
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Đội</th>
                  <th>Đáp án</th>
                  <th>Thời gian</th>
                  <th>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {(revealData.results || []).map((r, idx) => {
                  const tc = TEAM_COLORS[r.slot] || TEAM_COLORS[0];
                  const rankClasses = [
                    "rank-1",
                    "rank-2",
                    "rank-3",
                    "rank-other",
                  ];
                  const rankClass = idx < 3 ? rankClasses[idx] : "rank-other";
                  return (
                    <tr
                      key={r.slotKey}
                      className="results-row"
                      style={{ animationDelay: `${idx * 0.12}s` }}
                    >
                      <td>
                        <div className={`rank-badge ${rankClass}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: tc.color, fontWeight: 700 }}>
                          {r.name}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: r.correct
                              ? "rgba(16,185,129,0.15)"
                              : r.answer
                                ? "rgba(239,68,68,0.1)"
                                : "rgba(255,255,255,0.04)",
                            color: r.correct
                              ? "#34d399"
                              : r.answer
                                ? "#f87171"
                                : "var(--text-secondary)",
                            fontWeight: 700,
                            fontFamily: "Exo 2, sans-serif",
                          }}
                        >
                          {r.answer || "Không trả lời"}
                        </span>
                      </td>
                      <td
                        style={{
                          color: "var(--text-secondary)",
                          fontFamily: "Exo 2, sans-serif",
                        }}
                      >
                        {r.responseTime != null
                          ? `${r.responseTime.toFixed(1)}s`
                          : "—"}
                      </td>
                      <td>
                        <div
                          className={`points-badge ${r.points > 0 ? "correct-points" : "zero-points"}`}
                        >
                          {r.points > 0 ? `+${r.points}` : "0"} điểm
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button className="next-btn" onClick={handleNextQuestion}>
              {Object.keys(usedQuestions).length >= 10
                ? "🏆 Xem Kết Quả Cuối"
                : "➡️ Câu Tiếp Theo"}
            </button>
          </div></div>
        )}

        {/* FINISHED – PODIUM */}
        {status === "finished" && (
          <>
            <Confetti />
            <div className="podium-section">
              <div className="podium-title">🏆 KẾT QUẢ CHUNG CUỘC 🏆</div>
              <PodiumDisplay teams={teamList} />
            </div>
          </>
        )}
        </main></div>
      </div>
    </>
  );
}

function PodiumDisplay({ teams }) {
  const sorted = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0));
  const getEmoji = (rank) => ["🥇", "🥈", "🥉", "🏅"][rank] || "🏅";

  // Arrange: 2nd, 1st, 3rd, 4th
  const arrangement = [];
  if (sorted[1]) arrangement.push({ ...sorted[1], rank: 1 });
  if (sorted[0]) arrangement.push({ ...sorted[0], rank: 0 });
  if (sorted[2]) arrangement.push({ ...sorted[2], rank: 2 });
  if (sorted[3]) arrangement.push({ ...sorted[3], rank: 3 });

  const blockHeights = ["120px", "160px", "90px", "64px"];
  const rankClasses = ["rank-2", "rank-1", "rank-3", "rank-4"];

  return (
    <div style={{ width: "100%", maxWidth: "800px" }}>
      <div className="podium-stage">
        {arrangement.map((team, i) => {
          const tc = TEAM_COLORS[team.slot] || TEAM_COLORS[0];
          return (
            <div key={team.key} className="podium-slot">
              <div className="podium-avatar">{getEmoji(team.rank)}</div>
              <div className="podium-team-name" style={{ color: tc.color }}>
                {team.name}
              </div>
              <div className="podium-score" style={{ color: tc.color }}>
                {team.score || 0} điểm
              </div>
              <div
                className={`podium-block ${rankClasses[i]}`}
                style={{ height: blockHeights[i] }}
              >
                {team.rank + 1}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "32px" }}>
        <button
          className="next-btn"
          onClick={async () => {
            await set(ref(db, "quiz/status"), "lobby");
          }}
        >
          🔄 Chơi Lại
        </button>
      </div>
    </div>
  );
}
