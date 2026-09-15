import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { db } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';

const TIMER_DURATION = 15;

const TEAM_COLORS = [
  { color: '#ef4444', glow: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.5)', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.5)', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { color: '#10b981', glow: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.5)', gradient: 'linear-gradient(135deg, #10b981, #065f46)' },
  { color: '#a855f7', glow: 'rgba(168,85,247,0.4)', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.5)', gradient: 'linear-gradient(135deg, #a855f7, #6b21a8)' },
];

export default function PlayPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState(null);
  const [mySlot, setMySlot] = useState(null);
  const [myName, setMyName] = useState('');
  const [myIndex, setMyIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [myAnswer, setMyAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const prevStatusRef = useRef(null);

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
    });
    return () => unsub();
  }, [router]);

  // Timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (gameState?.status === 'question' && gameState?.currentQuestion?.startTime) {
      const startTime = gameState.currentQuestion.startTime;
      const tick = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimeLeft(Math.max(0, TIMER_DURATION - elapsed));
      };
      tick();
      timerRef.current = setInterval(tick, 200);
    }

    // Reset answer when new question starts
    if (gameState?.status === 'question' && prevStatusRef.current !== 'question') {
      setMyAnswer(null);
      setSubmitting(false);
    }
    prevStatusRef.current = gameState?.status;

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState?.status, gameState?.currentQuestion?.startTime]);

  const handleAnswer = async (letter) => {
    if (myAnswer || submitting || timeLeft <= 0 || !mySlot) return;

    const startTime = gameState?.currentQuestion?.startTime;
    const responseTime = startTime ? (Date.now() - startTime) / 1000 : 0;

    setMyAnswer(letter);
    setSubmitting(true);

    try {
      await set(ref(db, `quiz/answers/${mySlot}`), {
        answer: letter,
        timestamp: Date.now(),
        responseTime: Math.round(responseTime * 10) / 10,
      });
    } catch (err) {
      console.error(err);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
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
        <meta name="theme-color" content="#07090f" />
      </Head>
      <div className="grid-bg" />
      <div className="page team-play-page">
        {/* Header */}
        <div className="team-header" style={{ borderBottomColor: `${tc.color}33` }}>
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
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Thoát
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="team-play-body">
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
          {status === 'question' && cq && (
            <>
              {/* Mini timer */}
              <div className={`mini-timer ${timerClass}`}>
                ⏱ {Math.ceil(timeLeft)}s
              </div>

              {!mySubmittedAnswer && timeLeft > 0 && (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                    Câu {cq.number} — Chọn đáp án của bạn
                  </p>
                  <div className="answers-grid">
                    {ANSWER_OPTIONS.map(({ letter, cls }) => (
                      <button
                        key={letter}
                        className={`answer-btn ${cls}`}
                        onClick={() => handleAnswer(letter)}
                        disabled={!!myAnswer || submitting}
                      >
                        <div className="answer-btn-letter">{letter}</div>
                        <div className="answer-btn-text">{cq.questionData.options[letter]}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

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

              {!mySubmittedAnswer && timeLeft <= 0 && (
                <div className="answered-state">
                  <div className="answered-icon">⏰</div>
                  <h2 style={{ color: 'var(--text-secondary)' }}>Hết giờ!</h2>
                  <p style={{ color: 'rgba(255,255,255,0.3)' }}>Bạn không kịp trả lời câu này</p>
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
                  <div className="result-label" style={{ color: myRevealResult.correct ? '#34d399' : myRevealResult.answer ? '#f87171' : 'var(--text-secondary)' }}>
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
              <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
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
                      <span style={{ fontFamily: 'Exo 2, sans-serif', fontWeight: 800, width: '24px', color: ['#fbbf24','#9ca3af','#cd7f32','var(--text-secondary)'][idx] || 'var(--text-secondary)' }}>
                        {idx + 1}
                      </span>
                      <span style={{ color: tc2.color, fontWeight: 700, flex: 1 }}>{r.name}</span>
                      <span style={{ color: r.correct ? '#34d399' : '#f87171', fontFamily: 'Exo 2, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
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
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '320px' }}>
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
