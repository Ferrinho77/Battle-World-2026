import { useState } from "react";

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
  allTeams = [],
  knockoutMatches = [],
  knockoutOverrides = {},
  saveKnockoutOverride,
  clearKnockoutOverride,
  predictionLockModeControl = "AUTO",
  predictionLockControlLoading = false,
  updatePredictionLockControl,
  userAdminContent,
}) {
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");

  const roundOrder = {
    group: 0,
    Sedicesimi: 1,
    Ottavi: 2,
    Quarti: 3,
    Semifinali: 4,
    "Finale 3° posto": 5,
    Finale: 6,
  };

  const getMatchRoundKey = (match) => (match.round ? match.round : "group");
  const isKnockoutMatch = (match) => !!match.round;
  const getInputValue = (id) => document.getElementById(id)?.value ?? "";

  const getKnockoutQualifiedValue = (match) => {
    const selected = getInputValue(`rq-${match.id}`);
    if (selected) return selected;
    const homeScore = Number(getInputValue(`rh-${match.id}`));
    const awayScore = Number(getInputValue(`ra-${match.id}`));
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
      if (homeScore > awayScore) return match.home;
      if (awayScore > homeScore) return match.away;
    }
    return "";
  };

  const getKnockoutWinType = (match) => {
    const homeScore = Number(getInputValue(`rh-${match.id}`));
    const awayScore = Number(getInputValue(`ra-${match.id}`));
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore) && homeScore !== awayScore) return "REGULAR";
    return getInputValue(`rwt-${match.id}`) || "EXTRA_TIME";
  };

  const saveAdminMatchResult = (match, finished) => {
    const home = getInputValue(`rh-${match.id}`);
    const away = getInputValue(`ra-${match.id}`);

    if (!isKnockoutMatch(match)) {
      saveRealResult(match.id, home, away, finished);
      return;
    }

    const qualifiedTeam = finished ? getKnockoutQualifiedValue(match) : (getInputValue(`rq-${match.id}`) || "");
    const winType = getKnockoutWinType(match);

    if (finished && !qualifiedTeam) {
      alert("Seleziona la squadra qualificata prima di confermare il risultato finale.");
      return;
    }

    saveRealResult(match.id, home, away, finished, qualifiedTeam, winType);
  };

  const adminDisplayMatches = [...allDisplayMatches]
    .sort((a, b) => {
      const roundDiff = (roundOrder[getMatchRoundKey(a)] ?? 99) - (roundOrder[getMatchRoundKey(b)] ?? 99);
      if (roundDiff !== 0) return roundDiff;
      const groupDiff = String(a.group || "").localeCompare(String(b.group || ""));
      if (groupDiff !== 0) return groupDiff;
      return new Date(a.kickoff || "2099-01-01") - new Date(b.kickoff || "2099-01-01");
    })
    .filter((match) => {
      const result = realResults[match.id];
      if (adminMatchFilter === "pending") return !result;
      if (adminMatchFilter === "live") return result && !result.finished;
      if (adminMatchFilter === "final") return result?.finished;
      return true;
    });

  const groupedAdminMatches = adminDisplayMatches.reduce((acc, match) => {
    const key = match.round ? match.round : match.group || "Fase a gironi";
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  const adminMatchSections = Object.entries(groupedAdminMatches).sort((a, b) => {
    const ar = a[1][0]?.round || "group";
    const br = b[1][0]?.round || "group";
    const diff = (roundOrder[ar] ?? 99) - (roundOrder[br] ?? 99);
    if (diff !== 0) return diff;
    return String(a[0]).localeCompare(String(b[0]));
  });

  const knockoutByRound = knockoutMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const adminTabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "results", label: "⚽ Risultati" },
    { id: "qualifications", label: "🏆 Qualificazioni" },
    { id: "predictions", label: "🎯 Pronostici" },
    { id: "users", label: "👥 Utenti / Admin" },
    { id: "system", label: "⚙️ Sistema" },
  ];

  const teamOptions = Array.from(new Set([...(allTeams || []), ...(knockoutMatches || []).flatMap((m) => [m.home, m.away, m.autoHome, m.autoAway])].filter(Boolean)));

  return (
    <>
      <h2>🛠️ {t.admin}</h2>

      <div className="admin-tab-bar" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {adminTabs.map((tab) => (
          <button key={tab.id} type="button" className={`btn ${activeAdminTab === tab.id ? "green" : "blue"}`} onClick={() => setActiveAdminTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeAdminTab === "dashboard" && (
        <>
          <div className="admin-dashboard-grid">
            <div className="admin-stat-card"><span>🔴 LIVE</span><strong>{allDisplayMatches.filter((match) => realResults[match.id] && !realResults[match.id]?.finished).length}</strong></div>
            <div className="admin-stat-card"><span>✅ FINAL</span><strong>{allDisplayMatches.filter((match) => realResults[match.id]?.finished).length}</strong></div>
            <div className="admin-stat-card"><span>🟡 DA INSERIRE</span><strong>{allDisplayMatches.filter((match) => !realResults[match.id]).length}</strong></div>
            <div className="admin-stat-card"><span>🏆 UTENTI</span><strong>{users.length}</strong></div>
          </div>
          <div className="league-box"><h3>📊 Dashboard Control Room</h3><p className="bonus-help">Usa le sottopagine per gestire risultati, qualificazioni e sistema.</p></div>
        </>
      )}

      {activeAdminTab === "results" && (
        <>
          <div className="admin-toolbar league-box admin-toolbar-sticky">
            <div>
              <label>{t.matchFilter || "Filtro partite"}</label>
              <select value={adminMatchFilter} onChange={(event) => setAdminMatchFilter(event.target.value)}>
                <option value="all">{t.all || "Tutte"}</option>
                <option value="pending">{t.toEnter || "Da inserire"}</option>
                <option value="live">{t.live}</option>
                <option value="final">{t.finals || "Finali"}</option>
              </select>
            </div>
          </div>

          <div className="admin-section-title">
            <h3>{t.insertRealResults}</h3>
            <p className="bonus-help">Modalità locale: inserisci LIVE o FINAL manualmente.</p>
          </div>

          {adminMatchSections.map(([sectionName, sectionMatches]) => (
            <div key={sectionName} className="admin-round-section">
              <h3 className="admin-round-title">{sectionName}</h3>
              <div className="admin-match-grid">
                {sectionMatches.map((match) => {
                  const result = realResults[match.id];
                  const isFinal = !!result?.finished;
                  const statusClass = isFinal ? "admin-final" : result ? "admin-live" : "admin-pending";
                  const statusLabel = isFinal ? "✅ FINAL" : result ? "🔴 LIVE" : "🟡 PENDING";

                  return (
                    <div key={match.id} className={`match-box admin-match-card ${statusClass}`}>
                      <div className="admin-match-head"><span>{statusLabel}</span><small>📅 {formatMatchDateTime(match)}</small></div>
                      <strong>{trTeamLabel(match.home)} - {trTeamLabel(match.away)}</strong>
                      {renderRealResult(match.id)}
                      {isKnockoutMatch(match) && <p className="bonus-help" style={{ marginTop: 8 }}>Risultato dopo i 90 minuti per i pronostici. La squadra qualificata serve per tabellone e bonus passaggio turno.</p>}
                      <div className="score-row">
                        <input id={`rh-${match.id}`} type="number" min="0" max="20" placeholder={isKnockoutMatch(match) ? `${t.home} 90'` : t.home} defaultValue={result?.home_score ?? ""} disabled={isFinal} />
                        <input id={`ra-${match.id}`} type="number" min="0" max="20" placeholder={isKnockoutMatch(match) ? `${t.away} 90'` : t.away} defaultValue={result?.away_score ?? ""} disabled={isFinal} />
                      </div>
                      {isKnockoutMatch(match) && (
                        <div className="score-row">
                          <select id={`rq-${match.id}`} defaultValue={result?.qualified_team || ""} disabled={isFinal}>
                            <option value="">Qualificata</option>
                            <option value={match.home}>{trTeamLabel(match.home)}</option>
                            <option value={match.away}>{trTeamLabel(match.away)}</option>
                          </select>
                          <select id={`rwt-${match.id}`} defaultValue={result?.win_type || "REGULAR"} disabled={isFinal}>
                            <option value="REGULAR">90'</option>
                            <option value="EXTRA_TIME">DTS</option>
                            <option value="PENALTIES">Rigori</option>
                          </select>
                        </div>
                      )}
                      {isFinal ? (
                        <div className="admin-actions-row"><button className="btn green" disabled>🔒 {t.confirmed || "Confermato"}</button></div>
                      ) : (
                        <div className="admin-actions-row">
                          <button className="btn blue" onClick={() => saveAdminMatchResult(match, false)}>{t.saveLiveResult}</button>
                          <button className="btn green" onClick={() => saveAdminMatchResult(match, true)}>{t.confirmFinalResult}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {activeAdminTab === "qualifications" && (
        <div className="league-box">
          <h3>🏆 Qualificazioni / Tabellone Admin</h3>
          <p className="bonus-help">Qui puoi controllare il tabellone nello stesso ordine della fase finale. Le squadre vengono proposte automaticamente da classifica gironi, migliori terze e vincitori; se serve puoi correggere manualmente ogni slot.</p>
          {Object.entries(knockoutByRound).map(([roundName, roundMatches]) => (
            <div key={roundName} className="admin-round-section">
              <h3 className="admin-round-title">{roundName}</h3>
              <div className="admin-match-grid">
                {roundMatches.map((match) => {
                  const override = knockoutOverrides[match.id];
                  return (
                    <div key={match.id} className="match-box admin-match-card">
                      <div className="admin-match-head"><span>{match.code}</span><small>{formatMatchDateTime(match)}</small></div>
                      <p className="bonus-help">Formula: {match.homeRaw} vs {match.awayRaw}</p>
                      <p className="bonus-help">Automatico: {trTeamLabel(match.autoHome)} vs {trTeamLabel(match.autoAway)}</p>
                      {override && <p style={{ color: "#f5a524", fontWeight: "bold" }}>✏️ Override manuale attivo</p>}
                      <div className="score-row">
                        <select id={`ko-home-${match.id}`} defaultValue={match.home || ""}>
                          <option value="">Squadra casa</option>
                          {teamOptions.map((team) => <option key={`${match.id}-h-${team}`} value={team}>{trTeamLabel(team)}</option>)}
                        </select>
                        <select id={`ko-away-${match.id}`} defaultValue={match.away || ""}>
                          <option value="">Squadra trasferta</option>
                          {teamOptions.map((team) => <option key={`${match.id}-a-${team}`} value={team}>{trTeamLabel(team)}</option>)}
                        </select>
                      </div>
                      <div className="admin-actions-row">
                        <button className="btn green" onClick={() => saveKnockoutOverride?.(match.id, getInputValue(`ko-home-${match.id}`), getInputValue(`ko-away-${match.id}`))}>💾 Salva modifica</button>
                        <button className="btn blue" onClick={() => clearKnockoutOverride?.(match.id)}>↩️ Automatico</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeAdminTab === "predictions" && (
        <div className="league-box">
          <h3>🎯 Blocco manuale pronostici</h3>
          <p className="bonus-help">
            Stato attuale: <strong>{predictionLockModeControl}</strong>. Usa questi comandi solo come controllo di sicurezza Admin: non modificano la configurazione della lega.
          </p>
          <div className="admin-actions-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn blue" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("AUTO")}>
              ✅ Automatico calendario
            </button>
            <button type="button" className="btn danger" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("FORCE_LOCKED")}>
              🔒 Blocca tutto
            </button>
            <button type="button" className="btn green" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("FORCE_UNLOCKED")}>
              🔓 Sblocca tutto
            </button>
            <button type="button" className="btn blue" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("TEST_STARTED")}>
              🧪 Simula torneo iniziato
            </button>
          </div>
          <p className="bonus-help" style={{ marginTop: 10 }}>
            AUTO = segue date e impostazioni lega. FORCE_LOCKED = blocca ogni pronostico. FORCE_UNLOCKED = sblocca temporaneamente. TEST_STARTED = simula l'inizio torneo per testare Qualificate, Piazzamenti Gruppi e Golden Boot.
          </p>
        </div>
      )}

      {activeAdminTab === "users" && (
        <>
          {userAdminContent || (
            <div className="league-box">
              <h3>👥 Utenti / Admin</h3>
              <p className="bonus-help">Gestione utenti e autorizzazioni admin non disponibile.</p>
            </div>
          )}
        </>
      )}

      {activeAdminTab === "system" && (
        <>
          <div className="admin-toolbar league-box">
            <button className="btn blue" onClick={() => syncLiveResults(false)}>🔄 Aggiorna dati Supabase</button>
            <button className="btn blue" onClick={recalculateLeagueData}>🔄 {t.recalculateRanking || "Ricalcola classifica"}</button>
          </div>
          <div className="admin-two-columns">
            <div className="league-box">
              <h3>🔴 {t.topScorerRanking}</h3>
              <p className="bonus-help">{t.adminTopScorerInfo || "Aggiorna i gol provvisori dei capocannonieri durante il torneo."}</p>
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
      )}
    </>
  );
}
