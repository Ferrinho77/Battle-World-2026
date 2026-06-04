export default function AdminPanel({
  t,
  users,
  allDisplayMatches,
  realResults,
  adminMatchFilter,
  setAdminMatchFilter,
  syncLiveResults,
  recalculateLeagueData,
  formatMatchDateTime,
  trTeamLabel,
  renderRealResult,
  saveRealResult,
  selectableTopScorers,
  topScorerGoalsPlayer,
  setTopScorerGoalsPlayer,
  topScorerGoals,
  setTopScorerGoals,
  saveTopScorerGoals,
  confirmedTopScorer,
  finalTopScorer,
  setFinalTopScorer,
  saveFinalTopScorer,
}) {
  const adminDisplayMatches = [...allDisplayMatches]
    .sort((a, b) => new Date(a.kickoff || "2099-01-01") - new Date(b.kickoff || "2099-01-01"))
    .filter((match) => {
      const result = realResults[match.id];
      if (adminMatchFilter === "pending") return !result;
      if (adminMatchFilter === "live") return result && !result.finished;
      if (adminMatchFilter === "final") return result?.finished;
      return true;
    });

  return (
    <>
      <h2>🛠️ {t.admin}</h2>

      <div className="admin-dashboard-grid">
        <div className="admin-stat-card">
          <span>🔴 LIVE</span>
          <strong>{allDisplayMatches.filter((match) => realResults[match.id] && !realResults[match.id]?.finished).length}</strong>
        </div>
        <div className="admin-stat-card">
          <span>✅ FINAL</span>
          <strong>{allDisplayMatches.filter((match) => realResults[match.id]?.finished).length}</strong>
        </div>
        <div className="admin-stat-card">
          <span>🟡 DA INSERIRE</span>
          <strong>{allDisplayMatches.filter((match) => !realResults[match.id]).length}</strong>
        </div>
        <div className="admin-stat-card">
          <span>🏆 UTENTI</span>
          <strong>{users.length}</strong>
        </div>
      </div>

      <div className="admin-toolbar league-box admin-toolbar-sticky">
        <div>
          <label>{t.matchFilter || 'Filtro partite'}</label>
          <select value={adminMatchFilter} onChange={(event) => setAdminMatchFilter(event.target.value)}>
            <option value="all">{t.all || 'Tutte'}</option>
            <option value="pending">{t.toEnter || 'Da inserire'}</option>
            <option value="live">{t.live}</option>
            <option value="final">{t.finals || 'Finali'}</option>
          </select>
        </div>
        <button className="btn blue" onClick={() => syncLiveResults(false)}>🔄 Aggiorna dati Supabase</button>
        <button className="btn blue" onClick={recalculateLeagueData}>🔄 {t.recalculateRanking || 'Ricalcola classifica'}</button>
      </div>

      <div className="admin-section-title">
        <h3>{t.insertRealResults}</h3>
        <p className="bonus-help">Modalità locale: inserisci LIVE o FINAL manualmente. L’app aggiorna classifica, gironi e tabellone usando Supabase, senza API-Football a pagamento.</p>
      </div>

      <div className="admin-match-grid">
        {adminDisplayMatches.map((match) => {
          const result = realResults[match.id];
          const statusClass = result?.finished ? "admin-final" : result ? "admin-live" : "admin-pending";
          const statusLabel = result?.finished ? "✅ FINAL" : result ? "🔴 LIVE" : "🟡 PENDING";

          return (
            <div key={match.id} className={`match-box admin-match-card ${statusClass}`}>
              <div className="admin-match-head">
                <span>{statusLabel}</span>
                <small>📅 {formatMatchDateTime(match)}</small>
              </div>

              <strong>{trTeamLabel(match.home)} - {trTeamLabel(match.away)}</strong>
              {renderRealResult(match.id)}

              <div className="score-row">
                <input id={`rh-${match.id}`} type="number" min="0" max="20" placeholder={t.home} defaultValue={result?.home_score ?? ""} />
                <input id={`ra-${match.id}`} type="number" min="0" max="20" placeholder={t.away} defaultValue={result?.away_score ?? ""} />
              </div>

              <div className="admin-actions-row">
                <button className="btn blue" onClick={() => saveRealResult(match.id, document.getElementById(`rh-${match.id}`).value, document.getElementById(`ra-${match.id}`).value, false)}>{t.saveLiveResult}</button>
                <button className="btn green" onClick={() => saveRealResult(match.id, document.getElementById(`rh-${match.id}`).value, document.getElementById(`ra-${match.id}`).value, true)}>{t.confirmFinalResult}</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-two-columns">
        <div className="league-box">
          <h3>🔴 {t.topScorerRanking}</h3>
          <p className="bonus-help">{t.adminTopScorerInfo || 'Aggiorna i gol provvisori dei capocannonieri durante il torneo.'}</p>
          <select value={topScorerGoalsPlayer} onChange={(event) => setTopScorerGoalsPlayer(event.target.value)}>
            <option value="">{t.selectPlayer}</option>
            {selectableTopScorers.map((player) => <option key={player} value={player}>{player}</option>)}
          </select>
          <input type="number" min="0" max="30" placeholder={t.goals} value={topScorerGoals} onChange={(event) => setTopScorerGoals(event.target.value)} />
          <button className="btn blue" onClick={saveTopScorerGoals}>{t.saveTopScorerGoals}</button>
        </div>

        <div className="league-box">
          <h3>{t.finalTopScorer}</h3>
          <p>{t.confirmed}: {confirmedTopScorer || "-"}</p>
          <select value={finalTopScorer} onChange={(event) => setFinalTopScorer(event.target.value)}>
            <option value="">{t.selectPlayer}</option>
            {selectableTopScorers.map((player) => <option key={player} value={player}>{player}</option>)}
          </select>
          <button className="btn green" onClick={saveFinalTopScorer}>{t.confirmFinalResult}</button>
        </div>
      </div>
    </>
  );
}
