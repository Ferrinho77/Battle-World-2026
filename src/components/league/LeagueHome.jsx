export default function LeagueHome({
  t,
  lastLiveSync,
  liveSyncStatus,
  ranking,
  leaderRE,
  leaderPT,
  leaderPG,
  getCurrentTopScorer,
  liveMatchesHome,
  nextMatchesHome,
  trTeamLabel,
  renderRealResult,
  formatMatchDateTime,
  countdownTargetDate,
  countdownTargetMatch,
  tournamentStartDate,
  countdownParts,
  renderCountdownBox,
  leagueSettings,
  dashboardStats,
  nextDeadlineInfo,
  setActiveTab,
}) {
  const totalParticipants = dashboardStats?.totalParticipants || ranking.length || 0;

  function ratioText(done) {
    return `${done || 0}/${totalParticipants || 0}`;
  }

  function percent(done) {
    if (!totalParticipants) return 0;
    return Math.min(100, Math.round(((done || 0) / totalParticipants) * 100));
  }

  function StatCard({ icon, label, value, done }) {
    return (
      <div className="league-stat-card">
        <div className="league-stat-icon">{icon}</div>
        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
        {typeof done === "number" && (
          <div className="mini-progress">
            <i style={{ width: `${percent(done)}%` }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <h2>🏠 {t.leagueHome || "Home"}</h2>

      {lastLiveSync && (
        <p className="live-sync-info">
          🔄 {t.lastUpdate || "Ultimo aggiornamento"}: {lastLiveSync.toLocaleTimeString()} {liveSyncStatus ? `— ${liveSyncStatus}` : ""}
        </p>
      )}

      <div className="dashboard-hero-pro">
        <div>
          <h3>🏆 {t.leagueOverview}</h3>
          <p>{t.quickStatusHelp}</p>
          <div className="dashboard-actions-pro">
            <button type="button" className="btn green" onClick={() => setActiveTab?.("partite")}>{t.openPredictions}</button>
            <button type="button" className="btn blue" onClick={() => setActiveTab?.("classifica")}>{t.openRanking}</button>
          </div>
        </div>

        <div className="deadline-card-pro">
          <span>⏳ {t.nextDeadline}</span>
          <strong>{nextDeadlineInfo?.title || t.noDeadline}</strong>
          <small>
            {nextDeadlineInfo?.date
              ? new Date(nextDeadlineInfo.date).toLocaleString()
              : t.noDeadline}
          </small>
          {nextDeadlineInfo?.date && renderCountdownBox(countdownParts)}
        </div>
      </div>

      <div className="league-status-grid">
        <StatCard icon="👥" label={t.participants} value={totalParticipants} />
        <StatCard icon="⚽" label={t.matchPredictionsCompleted} value={ratioText(dashboardStats?.matchPredUsers)} done={dashboardStats?.matchPredUsers || 0} />
        <StatCard icon="🥾" label={t.goldenBootCompleted} value={ratioText(dashboardStats?.topScorerUsers)} done={dashboardStats?.topScorerUsers || 0} />
        {leagueSettings.enable_qualification_bonus && (
          <StatCard icon="✅" label={t.qualifiedCompleted} value={ratioText(dashboardStats?.qualifiedUsers)} done={dashboardStats?.qualifiedUsers || 0} />
        )}
        {leagueSettings.enable_group_positions_bonus && (
          <StatCard icon="📊" label={t.groupRankingCompleted} value={ratioText(dashboardStats?.groupRankingUsers)} done={dashboardStats?.groupRankingUsers || 0} />
        )}
      </div>

      <div className="home-hero-grid">
        <div className="home-panel podium-panel">
          <h3>🥇 {t.topFiveRanking}</h3>
          {(dashboardStats?.topFive || []).length === 0 ? (
            <p>{t.noPointsYet}</p>
          ) : (
            <div className="top-five-list">
              {dashboardStats.topFive.map((row, index) => (
                <div key={row.name} className="top-five-row">
                  <span>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</span>
                  <strong>{row.name}</strong>
                  <em>{row.total || 0} pt</em>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="home-panel">
          <h3>⚡ Leader</h3>
          <p><strong>RE:</strong> {leaderRE?.name || "-"} {leaderRE ? `(${leaderRE.exact})` : ""}</p>
          <p><strong>PT:</strong> {leaderPT?.name || "-"} {leaderPT ? `(${leaderPT.qualificationBonus})` : ""}</p>
          <p><strong>PG:</strong> {leaderPG?.name || "-"} {leaderPG ? `(${leaderPG.groupBonus})` : ""}</p>
          <p><strong>CC:</strong> {getCurrentTopScorer() || "-"}</p>
        </div>
      </div>

      <div className="home-hero-grid">
        <div className="home-panel">
          <h3>🔴 LIVE</h3>
          {liveMatchesHome.length === 0 ? (
            <p>{t.noLiveMatches}</p>
          ) : (
            liveMatchesHome.map((m) => (
              <div key={m.id} className="home-match-card live-card">
                <strong>{trTeamLabel(m.home)} - {trTeamLabel(m.away)}</strong>
                {renderRealResult(m.id)}
              </div>
            ))
          )}
        </div>

        <div className="home-panel">
          <h3>⏳ {t.nextMatches}</h3>
          {nextMatchesHome.length === 0 ? (
            <p>{t.toBeDefined}</p>
          ) : (
            nextMatchesHome.map((m) => (
              <div key={m.id} className="home-match-card">
                <strong>{trTeamLabel(m.home)} - {trTeamLabel(m.away)}</strong>
                <small>📅 {formatMatchDateTime(m)}</small>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="home-panel quick-rules-panel">
        <h3>📜 {t.rules}</h3>
        <p><strong>RE</strong> = {t.exactScore}; <strong>SC</strong> = {t.correctOutcome}; <strong>PT</strong> = {t.qualificationBonus || t.qualificationStage}; <strong>PG</strong> = {t.groupPlacementBonus || t.groupPlacement}; <strong>CC</strong> = {t.topScorer}.</p>
        <p>
          {leagueSettings.prediction_lock_mode === "tournament"
            ? t.lockModeTournamentRule
            : leagueSettings.prediction_lock_mode === "stage_round"
              ? t.lockModeStageRoundRule
              : leagueSettings.prediction_lock_mode === "stage"
                ? t.lockModeStageRule
                : t.lockModeMatchRule}
        </p>
      </div>
    </>
  );
}
