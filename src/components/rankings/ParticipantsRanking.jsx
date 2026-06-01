function RankingAvatar({ row, size = "normal" }) {
  const cls = `avatar-badge avatar-${size} ranking-avatar`;
  if (row?.avatar_url) {
    return (
      <span className={cls}>
        <img src={row.avatar_url} alt={row.name || "avatar"} />
      </span>
    );
  }

  return (
    <span className={cls}>
      <span>{row?.avatar_icon || "⚽"}</span>
    </span>
  );
}

export default function ParticipantsRanking({
  t,
  lastLiveSync,
  liveSyncStatus,
  ranking,
}) {
  return (
    <>
      <h2>{t.participantsRanking}</h2>

      {lastLiveSync && (
        <p className="live-sync-info">
          🔄 {t.liveSyncActive || "Live sync"}: {lastLiveSync.toLocaleTimeString()}
          {liveSyncStatus ? `— ${liveSyncStatus}` : ""}
        </p>
      )}

      {ranking.length > 0 && (
        <div className="podium-ranking">
          {ranking.slice(0, 3).map((row, index) => (
            <div key={row.name} className={`podium-card podium-${index + 1}`}>
              <div className="podium-medal">
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
              </div>
              <div className="podium-avatar">
                <RankingAvatar row={row} size="large" />
              </div>
              <strong>{row.name}</strong>
              <span>{row.total} pt</span>
            </div>
          ))}
        </div>
      )}

      {ranking.length === 0 ? (
        <p>{t.noPointsYet}</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t.positionLabel}</th>
                <th>{t.participant || t.user}</th>
                <th>Tot</th>
                <th>RE</th>
                <th>SC</th>
                <th>PT</th>
                <th>PG</th>
                <th>CC</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row, index) => (
                <tr
                  key={row.name}
                  style={
                    index === 0
                      ? {
                          background: "rgba(245, 165, 36, 0.18)",
                          fontWeight: "bold",
                        }
                      : {}
                  }
                >
                  <td>
                    {index === 0
                      ? "🥇"
                      : index === 1
                        ? "🥈"
                        : index === 2
                          ? "🥉"
                          : index + 1}
                  </td>
                  <td>
                    <div className="ranking-player-cell">
                      <RankingAvatar row={row} />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{row.total}</strong>
                  </td>
                  <td>{row.exact}</td>
                  <td>{row.outcome}</td>
                  <td>{row.qualificationBonus}</td>
                  <td>{row.groupBonus}</td>
                  <td>{row.topScorerPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="league-box">
        <p>{t.rankingLegend}</p>
      </div>
    </>
  );
}
