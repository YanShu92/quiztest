import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { db } from '@/lib/firebase';
import { ref, onValue, runTransaction, set, get } from 'firebase/database';

import { useServerOffset } from '@/lib/useServerOffset';
import Scoreboard from '@/components/Scoreboard';

const TIMER_DURATION = 15;

const TEAM_COLORS = [
  { color: '#ef4444', glow: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.4)', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { color: '#2563eb', glow: 'rgba(37,99,235,0.4)', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.4)', gradient: 'linear-gradient(135deg, #2563eb, #1e40af)' },
  { color: '#059669', glow: 'rgba(5,150,105,0.4)', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.4)', gradient: 'linear-gradient(135deg, #059669, #065f46)' },
  { color: '#7c3aed', glow: 'rgba(124,58,237,0.4)', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.4)', gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
];

export default function PlayPage() {
  const router = useRouter();
  const offset = useServerOffset();
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState(null);
  const [mySlot, setMySlot] = useState(null);
  const [myName, setMyName] = useState('');
  const [myIndex, setMyIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [myAnswer, setMyAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const [connected, setConnected] = useState(false);
  useEffect(() => onValue(ref(db, '.info/connected'), snap => setConnected(snap.val() === true)), []);

  useEffect(() => {
    const slot = localStorage.getItem('quizSlot');
    const name = localStorage.getItem('quizTeamName');
    const idx = parseInt(localStorage.getItem('quizTeamIndex') || '0');

    if (!slot || !name) {
      router.replace('/');
      return;
    }

    setMySlot(slot);
    setMyName(name);
    setMyIndex(idx);

    const gameRef = ref(db, 'quiz');
    const unsub = onValue(gameRef, (snap) => {
      const data = snap.val() || {};
      setGameState(data);
    }, () => setError("Mất kết nối dữ liệu. Hãy kiểm tra mạng và tải lại trang."));
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (gameState?.status !== 'syncing' || !mySlot || offset === null) return;
    const roundId = gameState.currentQuestion?.roundId;
    if (!roundId || gameState.ready?.[mySlot] === roundId) return;
    let cancelled = false;
    const acknowledge = () => set(ref(db, `quiz/ready/${mySlot}`), roundId)
      .catch(() => { if (!cancelled) setError('Chưa xác nhận được câu hỏi. Đang thử lại…'); });
    acknowledge();
    const retry = setInterval(acknowledge, 2000);
    return () => { cancelled = true; clearInterval(retry); };
  }, [gameState?.status, gameState?.currentQuestion?.roundId, gameState?.ready?.[mySlot], mySlot, offset]);

  // Timer — only for display purposes
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (offset !== null && gameState?.status === 'question' && gameState?.currentQuestion?.startTime) {
      const startTime = gameState.currentQuestion.startTime;
      const tick = () => {
        const elapsed = (Date.now() + offset - startTime) / 1000;
        setTimeLeft(Math.max(0, TIMER_DURATION - elapsed));
      };
      tick();
      timerRef.current = setInterval(tick, 200);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState?.status, gameState?.currentQuestion?.startTime, offset]);

  // Reset my answer state when a new question starts (keyed on startTime)
  const questionStartTime = gameState?.currentQuestion?.startTime;
  useEffect(() => {
    if (questionStartTime) {
      setError('');
      setMyAnswer(null);
      setSubmitting(false);
    }
  }, [questionStartTime]);

  const handleAnswer = async (letter) => {
    if (offset === null || gameState?.status !== 'question' || mySubmittedAnswer || myAnswer || submitting || isActuallyTimedOut || !mySlot) return;

    const startTime = gameState?.currentQuestion?.startTime;
    const responseTime = startTime ? (Date.now() + offset - startTime) / 1000 : 0;

    setMyAnswer(letter);
    setSubmitting(true);

    try {
      await get(ref(db, 'quiz'));
      const result = await runTransaction(ref(db, 'quiz'), data => {
        if (!data || data.status !== 'question' || data.currentQuestion?.startTime !== startTime ||
            data.answers?.[mySlot] || Date.now() + offset >= startTime + TIMER_DURATION * 1000) return;
        return { ...data, answers: { ...data.answers, [mySlot]: {
          answer: letter, timestamp: Date.now() + offset,
          responseTime: Math.max(0, Math.round(responseTime * 10) / 10),
        } } };
      }, { applyLocally: false });
      if (!result.committed) setMyAnswer(null);
    } catch (err) {
      setMyAnswer(null);
      setError('Chưa gửi được đáp án. Hãy thử lại khi còn thời gian.');
    }
    setSubmitting(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('quizSlot');
    localStorage.removeItem('quizTeamName');
    localStorage.removeItem('quizTeamIndex');
    router.replace('/');
  };

  if (!gameState || !mySlot) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚡</div>
          <p>Đang kết nối...</p>
        </div>
      </div>
    );
  }

  const tc = TEAM_COLORS[myIndex] || TEAM_COLORS[0];
  const status = gameState.status || 'lobby';
  const myTeamData = gameState.teams?.[mySlot];
  const myScore = myTeamData?.score ?? 0;
  const answers = gameState.answers || {};
  const mySubmittedAnswer = answers[mySlot];
  const cq = gameState.currentQuestion;

  // Derived timeout — computed directly from Firebase startTime, not from timeLeft state
  const questionElapsed = questionStartTime ? (Date.now() + offset - questionStartTime) / 1000 : 0;
  const isActuallyTimedOut = offset !== null && status === 'question' && questionElapsed >= TIMER_DURATION;

  // Reveal info
  const history = gameState.history || {};
  const historyKeys = Object.keys(history);
  const lastResult = historyKeys.length > 0 ? history[historyKeys[historyKeys.length - 1]] : null;
  const myRevealResult = lastResult?.results?.find(r => r.slotKey === mySlot);

  const timerClass = timeLeft <= 5 ? 'danger' : timeLeft <= 8 ? 'warning' : '';

  const ANSWER_OPTIONS = [
    { letter: 'A', cls: 'a-btn' },
    { letter: 'B', cls: 'b-btn' },
    { letter: 'C', cls: 'c-btn' },
    { letter: 'D', cls: 'd-btn' },
  ];

  return (
    <>
      <Head>
        <title>Quiz Battle – {myName}</title>
        <meta name="description" content="Màn hình trả lời cho đội tham gia quiz" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#eff6ff" />
      </Head>
      <div className="grid-bg" />
      <div className="page team-play-page">
        {/* Header */}
        <div className="team-header" style={{ borderBottomColor: `${tc.color}25` }}>
          <div className="team-name-display" style={{ color: tc.color }}>
            {myTeamData?.emoji || '⚡'} {myName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="team-score-display">
              <div className="team-score-number" style={{ color: tc.color }}>{myScore}</div>
              <div className="team-score-label">&nbsp;điểm</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Thoát
            </button>
          </div>
        </div>

        <Scoreboard teams={gameState.teams || {}} />
        {/* Body */}
        <div className="team-play-body">
          {!connected && <p role="alert">Đang mất kết nối Firebase. Hãy kiểm tra mạng để nhận câu hỏi mới.</p>}
          {error && <p role="alert">{error}</p>}
          {/* LOBBY */}
          {status === 'lobby' && (
            <div className="waiting-state">
              <div className="waiting-icon">🎮</div>
              <h2>Phòng chờ</h2>
              <p>Game sắp bắt đầu, hãy chờ host khởi động...</p>
            </div>
          )}

          {/* PICKING */}
          {status === 'picking' && (
            <div className="waiting-state">
              <div className="waiting-icon">🎯</div>
              <h2>Chọn câu hỏi...</h2>
              <p>Host đang chọn câu hỏi tiếp theo</p>
            </div>
          )}

          {/* QUESTION ACTIVE */}
          {['syncing', 'question'].includes(status) && cq && (
            <>
              {/* Mini timer */}
              <div className={`mini-timer ${timerClass}`}>
                ⏱ {status === 'syncing' ? 'Đã nhận câu hỏi · Chờ các đội sẵn sàng' : `${Math.ceil(timeLeft)}s`}
              </div>

              {/* Not yet answered, not timed out */}
              {!mySubmittedAnswer && !isActuallyTimedOut && (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                    Câu {cq.number} — {cq.questionData.question}
                  </p>
                  <div className="answers-grid">
                    {ANSWER_OPTIONS.map(({ letter, cls }) => (
                      <button
                        key={letter}
                        className={`answer-btn ${cls}`}
                        onClick={() => handleAnswer(letter)}
                        disabled={!connected || status !== 'question' || offset === null || !!myAnswer || submitting}
                      >
                        <div className="answer-btn-letter">{letter}</div>
                        <div className="answer-btn-text">{cq.questionData.options[letter]}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Already submitted */}
              {mySubmittedAnswer && (
                <div className="answered-state">
                  <div className="answered-icon">✅</div>
                  <h2 style={{ color: tc.color }}>Đã chọn {mySubmittedAnswer.answer}</h2>
                  <div
                    className="answered-label"
                    style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color }}
                  >
                    {mySubmittedAnswer.responseTime.toFixed(1)}s
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Chờ các đội khác trả lời...
                  </p>
                </div>
              )}

              {/* Timed out without answering */}
              {!mySubmittedAnswer && isActuallyTimedOut && (
                <div className="answered-state">
                  <div className="answered-icon">⏰</div>
                  <h2 style={{ color: 'var(--text-secondary)' }}>Hết giờ!</h2>
                  <p style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Bạn không kịp trả lời câu này</p>
                </div>
              )}
            </>
          )}

          {/* REVEAL */}
          {status === 'reveal' && lastResult && (
            <div className="reveal-state">
              {myRevealResult ? (
                <div className={`result-banner ${myRevealResult.correct ? 'correct' : 'wrong'}`}>
                  <div className="result-icon">
                    {myRevealResult.correct ? '🎉' : myRevealResult.answer ? '❌' : '⏰'}
                  </div>
                  <div
                    className="result-label"
                    style={{
                      color: myRevealResult.correct ? '#059669' : myRevealResult.answer ? '#dc2626' : 'var(--text-secondary)',
                    }}
                  >
                    {myRevealResult.correct ? 'Chính xác!' : myRevealResult.answer ? 'Sai rồi!' : 'Hết giờ!'}
                  </div>
                  <div className={`result-points ${(myRevealResult.points || 0) === 0 ? 'zero' : ''}`}>
                    {(myRevealResult.points || 0) > 0 ? `+${myRevealResult.points} điểm` : '+0 điểm'}
                  </div>
                </div>
              ) : (
                <div className="result-banner timeout">
                  <div className="result-icon">⏰</div>
                  <div className="result-label" style={{ color: 'var(--text-secondary)' }}>Hết giờ</div>
                  <div className="result-points zero">+0 điểm</div>
                </div>
              )}

              <div className="correct-answer-display">
                Đáp án đúng: <span>{lastResult.correctAnswer}</span>
              </div>

              {/* Rank this round */}
              <div
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.06)',
                }}
              >
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  Thứ hạng vòng này
                </p>
                {(lastResult.results || []).map((r, idx) => {
                  const isMe = r.slotKey === mySlot;
                  const tc2 = TEAM_COLORS[r.slot] || TEAM_COLORS[0];
                  return (
                    <div
                      key={r.slotKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        background: isMe ? tc.bg : 'transparent',
                        border: isMe ? `1px solid ${tc.border}` : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontFamily: 'Exo 2, sans-serif', fontWeight: 800, width: '24px', color: ['#fbbf24','#94a3b8','#cd7f32','var(--text-secondary)'][idx] || 'var(--text-secondary)' }}>
                        {idx + 1}
                      </span>
                      <span style={{ color: tc2.color, fontWeight: 700, flex: 1 }}>{r.name}</span>
                      <span>{r.answer || 'Không trả lời'} · {r.responseTime != null ? `${r.responseTime.toFixed(1)}s` : '—'}</span>
                      <span style={{ color: r.correct ? '#059669' : '#dc2626', fontFamily: 'Exo 2, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
                        {r.points > 0 ? `+${r.points}` : '0'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                Chờ host chọn câu tiếp theo...
              </p>
            </div>
          )}

          {/* FINISHED */}
          {status === 'finished' && (
            <div className="waiting-state" style={{ gap: '20px' }}>
              <div className="waiting-icon">🏆</div>
              <h2 style={{ color: tc.color, fontSize: '2rem' }}>Game Kết Thúc!</h2>
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid var(--border-color)',
                  width: '100%',
                  maxWidth: '320px',
                  boxShadow: '0 4px 16px rgba(37,99,235,0.08)',
                }}
              >
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Kết quả của bạn
                </p>
                <div style={{ textAlign: 'center', fontFamily: 'Exo 2, sans-serif', fontSize: '3rem', fontWeight: 900, color: tc.color }}>
                  {myScore}
                </div>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4px' }}>điểm tổng cộng</div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                Xem bảng tổng kết trên màn hình chính!
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
