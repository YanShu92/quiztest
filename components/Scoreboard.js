export default function Scoreboard({ teams }) {
  const ranked = Object.entries(teams).filter(([, team]) => team?.name)
    .sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
  if (!ranked.length) return null;
  return <section className="live-scoreboard" aria-label="Bảng điểm các đội">
    <h2>Bảng điểm các đội</h2>
    <div className="live-scoreboard-list">{ranked.map(([key, team], index) =>
      <div className="live-scoreboard-team" key={key}>
        <span className="scoreboard-rank">{index + 1}</span>
        <span className="scoreboard-team-name">{team.name}</span>
        <strong>{team.score || 0} <small>điểm</small></strong>
      </div>
    )}</div>
  </section>;
}
