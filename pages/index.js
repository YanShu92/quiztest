import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { db } from '@/lib/firebase';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';

const TEAM_COLORS = [
  { color: 'var(--team-1)', bg: 'var(--team-1-bg)', border: 'var(--team-1)', label: 'Đội 1', emoji: '🔴' },
  { color: 'var(--team-2)', bg: 'var(--team-2-bg)', border: 'var(--team-2)', label: 'Đội 2', emoji: '🔵' },
  { color: 'var(--team-3)', bg: 'var(--team-3-bg)', border: 'var(--team-3)', label: 'Đội 3', emoji: '🟢' },
  { color: 'var(--team-4)', bg: 'var(--team-4-bg)', border: 'var(--team-4)', label: 'Đội 4', emoji: '🟣' },
];

export default function LoginPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [teams, setTeams] = useState({ slot1: null, slot2: null, slot3: null, slot4: null });
  const [loading, setLoading] = useState(false);
  const [gameStatus, setGameStatus] = useState('lobby');

  useEffect(() => {
    // If already logged in, go to play
    const savedSlot = localStorage.getItem('quizSlot');
    const savedName = localStorage.getItem('quizTeamName');
    if (savedSlot && savedName) {
      router.replace('/play');
      return;
    }

    const gameRef = ref(db, 'quiz');
    const unsub = onValue(gameRef, (snap) => {
      const data = snap.val();
      if (data) {
        setTeams(data.teams || { slot1: null, slot2: null, slot3: null, slot4: null });
        setGameStatus(data.status || 'lobby');
      }
    });
    return () => unsub();
  }, [router]);

  const handleJoin = async () => {
    if (!teamName.trim() || selectedSlot === null) return;
    setLoading(true);

    const slotKey = `slot${selectedSlot + 1}`;
    const tc = TEAM_COLORS[selectedSlot];

    try {
      await set(ref(db, `quiz/teams/${slotKey}`), {
        name: teamName.trim(),
        score: 0,
        color: tc.color,
        emoji: tc.emoji,
        slot: selectedSlot,
      });

      // Ensure game root exists
      const statusRef = ref(db, 'quiz/status');
      onValue(statusRef, (snap) => {
        if (!snap.exists()) {
          set(ref(db, 'quiz/status'), 'lobby');
        }
      }, { onlyOnce: true });

      localStorage.setItem('quizSlot', slotKey);
      localStorage.setItem('quizTeamName', teamName.trim());
      localStorage.setItem('quizTeamIndex', selectedSlot);

      router.push('/play');
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const slotKeys = ['slot1', 'slot2', 'slot3', 'slot4'];

  return (
    <>
      <Head>
        <title>Quiz Trắc Nghiệm – Đăng nhập đội</title>
        <meta name="description" content="Đăng nhập vào game quiz trắc nghiệm 4 đội" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="grid-bg" />
      <div className="page login-page">
        <div className="login-card">
          <div className="login-logo">
            <h1>⚡ QUIZ BATTLE</h1>
            <p>Trắc nghiệm thời gian thực – 4 đội thi đấu</p>
          </div>

          <div className="input-group">
            <label>Tên đội của bạn</label>
            <input
              type="text"
              placeholder="Nhập tên đội..."
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <div className="slots-label">Chọn vị trí đội</div>
          <div className="slots-grid">
            {slotKeys.map((key, i) => {
              const tc = TEAM_COLORS[i];
              const occupied = teams[key];
              const isSelected = selectedSlot === i;
              return (
                <button
                  key={key}
                  className={`slot-btn ${occupied ? 'taken' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => !occupied && setSelectedSlot(i)}
                  disabled={!!occupied}
                  style={isSelected ? {
                    background: tc.bg,
                    borderColor: tc.color,
                    color: tc.color,
                  } : {}}
                >
                  <div className="slot-number" style={{ color: isSelected ? tc.color : '' }}>
                    {tc.emoji} {tc.label}
                  </div>
                  <div className="slot-name-preview">
                    {occupied ? `✅ ${occupied.name}` : 'Còn trống'}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="btn-primary"
            onClick={handleJoin}
            disabled={!teamName.trim() || selectedSlot === null || loading}
          >
            {loading ? 'Đang vào...' : '🚀 Vào Phòng Thi'}
          </button>

          <div className="host-link">
            <p>Quản trị viên? <a href="/host">→ Mở màn hình Host</a></p>
          </div>
        </div>
      </div>
    </>
  );
}
