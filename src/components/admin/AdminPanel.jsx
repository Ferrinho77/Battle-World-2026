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
players = [],
topScorerGoalsTeam,
setTopScorerGoalsTeam,
topScorerGoalsPlayer,
setTopScorerGoalsPlayer,
topScorerGoals,
setTopScorerGoals,
saveTopScorerGoals,  confirmedTopScorer,
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
  adminContent,
}) {
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");
   
 const normalizeTeamName = (value) =>
  String(value || "")
    .replace(/^[^\wÀ-ÿ]+/u, "")
    .trim();

const topScorerTeams = Array.from(
  new Set((players || []).map((p) => normalizeTeamName(p.team)).filter(Boolean))
).sort();

const filteredAdminTopScorers = (players || [])
  .filter((p) =>
    topScorerGoalsTeam
      ? normalizeTeamName(p.team) === normalizeTeamName(topScorerGoalsTeam)
      : true
  )
  .map((p) => p.label)
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b));
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

const saveAdminMatchResult = (match, phase) => {
  const home = getInputValue(`rh-${match.id}`);
  const away = getInputValue(`ra-${match.id}`);
  const minute = getInputValue(`rm-${match.id}`);

  const finished = phase === "FINAL";

  if (!isKnockoutMatch(match)) {
    saveRealResult(
      match.id,
      home,
      away,
      finished,
      null,
      null,
      minute,
      phase
    );
    return;
  };

  const qualifiedTeam = finished
  ? getKnockoutQualifiedValue(match)
  : (getInputValue(`rq-${match.id}`) || "");

const winType = getKnockoutWinType(match);

if (finished && !qualifiedTeam) {
  alert(
    t.selectQualifiedTeamBeforeConfirm ||
    "Seleziona la squadra qualificata prima di confermare il risultato finale."
  );
  return;
}

  saveRealResult(
    match.id,
    home,
    away,
    finished,
    qualifiedTeam,
    winType,
    minute,
    phase
  );
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
    { id: "dashboard", label: `📊 ${t.dashboard || "Dashboard"}` },
    { id: "results", label: `⚽ ${t.results || "Risultati"}` },
    { id: "qualifications", label: `🏆 ${t.qualifications || "Qualificazioni"}` },
    { id: "predictions", label: `🎯 ${t.predictions || "Pronostici"}` },
    { id: "system", label: `⚙️ ${t.system || "Sistema"}` },
    { id: "admin", label: `🔐 ${t.admin || "Admin"}` },
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
            <div className="admin-stat-card"><span>🟡 {t.toEnterUpper || "DA INSERIRE"}</span><strong>{allDisplayMatches.filter((match) => !realResults[match.id]).length}</strong></div>
            <div className="admin-stat-card"><span>🏆 {t.usersUpper || "UTENTI"}</span><strong>{users.length}</strong></div>
          </div>
          <div className="league-box"><h3>📊 {t.controlRoomDashboard || "Dashboard Control Room"}</h3><p className="bonus-help">{t.controlRoomDashboardHelp || "Usa le sottopagine per gestire risultati, qualificazioni e sistema."}</p></div>
        </>
      )}

      {activeAdminTab === "admin" && (
        <>
          {adminContent || (
            <div className="league-box">
              <h3>🔐 {t.admin || "Admin"}</h3>
              <p>Gestione admin non disponibile.</p>
            </div>
          )}
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
      <p className="bonus-help">{t.manualResultsModeHelp || "Modalità locale: inserisci LIVE o FINAL manualmente."}</p>
    </div>

    {adminMatchSections.map(([sectionName, sectionMatches]) => (
      <div key={sectionName} className="admin-round-section">
        <h3 className="admin-round-title">{sectionName}</h3>

        <div className="admin-match-grid">
          {sectionMatches.map((match) => {
            const result = realResults[match.id];
            const isFinal = !!result?.finished;
            const statusClass = isFinal ? "admin-final" : result ? "admin-live" : "admin-pending";
            const statusLabel = isFinal
              ? `✅ ${t.finalStatus || "FINAL"}`
              : result
                ? `🔴 ${t.liveStatus || "LIVE"}`
                : `🟡 ${t.pendingStatus || "PENDING"}`;

            return (
              <div key={match.id} className={`match-box admin-match-card ${statusClass}`}>
                <div className="admin-match-head">
                  <span>{statusLabel}</span>
                  <small>📅 {formatMatchDateTime(match)}</small>
                </div>

                <strong>{trTeamLabel(match.home)} - {trTeamLabel(match.away)}</strong>

                {renderRealResult(match.id)}

                {isKnockoutMatch(match) && (
                  <p className="bonus-help" style={{ marginTop: 8 }}>
                    {t.knockoutResultAdminHelp ||
                      "Risultato dopo i 90 minuti per i pronostici. La squadra qualificata serve per tabellone e bonus passaggio turno."}
                  </p>
                )}

                <div className="score-row">
                  <input
                    id={`rh-${match.id}`}
                    type="number"
                    min="0"
                    max="20"
                    placeholder={isKnockoutMatch(match) ? `${t.home} 90'` : t.home}
                    defaultValue={result?.home_score ?? ""}
                    disabled={isFinal}
                  />

                  <input
                    id={`ra-${match.id}`}
                    type="number"
                    min="0"
                    max="20"
                    placeholder={isKnockoutMatch(match) ? `${t.away} 90'` : t.away}
                    defaultValue={result?.away_score ?? ""}
                    disabled={isFinal}
                  />

                  <input
                    id={`rm-${match.id}`}
                    type="number"
                    min="0"
                    max="130"
                    placeholder="Min."
                    defaultValue={result?.minute ?? ""}
                    disabled={isFinal}
                  />
                </div>

                {isKnockoutMatch(match) && (
                  <div className="score-row">
                    <select id={`rq-${match.id}`} defaultValue={result?.qualified_team || ""} disabled={isFinal}>
                      <option value="">{t.qualifiedTeam || "Qualificata"}</option>
                      <option value={match.home}>{trTeamLabel(match.home)}</option>
                      <option value={match.away}>{trTeamLabel(match.away)}</option>
                    </select>

                    <select id={`rwt-${match.id}`} defaultValue={result?.win_type || "REGULAR"} disabled={isFinal}>
                      <option value="REGULAR">90'</option>
                      <option value="EXTRA_TIME">{t.extraTimeShort || "DTS"}</option>
                      <option value="PENALTIES">{t.penaltiesShort || "Rigori"}</option>
                    </select>
                  </div>
                )}

                {isFinal ? (
                  <div className="admin-actions-row">
                    <button className="btn green" disabled>
                      🔒 {t.confirmed || "Confermato"}
                    </button>
                  </div>
                ) : (
                  <div className="admin-actions-row" style={{ flexWrap: "wrap" }}>
                    <button className="btn blue" onClick={() => saveAdminMatchResult(match, "FIRST_HALF")}>
                      1° Tempo
                    </button>

                    <button className="btn blue" onClick={() => saveAdminMatchResult(match, "HALF_TIME")}>
                      Intervallo
                    </button>

                    <button className="btn blue" onClick={() => saveAdminMatchResult(match, "SECOND_HALF")}>
                      2° Tempo
                    </button>

                    <button className="btn green" onClick={() => saveAdminMatchResult(match, "FINAL")}>
                      Finale
                    </button>
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
          <h3>🏆 {t.qualificationsBracketAdmin || "Qualificazioni / Tabellone Admin"}</h3>
          <p className="bonus-help">{t.qualificationsBracketAdminHelp || "Qui puoi controllare il tabellone nello stesso ordine della fase finale. Le squadre vengono proposte automaticamente da classifica gironi, migliori terze e vincitori; se serve puoi correggere manualmente ogni slot."}</p>
          {Object.entries(knockoutByRound).map(([roundName, roundMatches]) => (
            <div key={roundName} className="admin-round-section">
              <h3 className="admin-round-title">{roundName}</h3>
              <div className="admin-match-grid">
                {roundMatches.map((match) => {
                  const override = knockoutOverrides[match.id];
                  return (
                    <div key={match.id} className="match-box admin-match-card">
                      <div className="admin-match-head"><span>{match.code}</span><small>{formatMatchDateTime(match)}</small></div>
                      <p className="bonus-help">{t.formula || "Formula"}: {match.homeRaw} vs {match.awayRaw}</p>
                      <p className="bonus-help">{t.automatic || "Automatico"}: {trTeamLabel(match.autoHome)} vs {trTeamLabel(match.autoAway)}</p>
                      {override && <p style={{ color: "#f5a524", fontWeight: "bold" }}>✏️ {t.manualOverrideActive || "Override manuale attivo"}</p>}
                      <div className="score-row">
                        <select id={`ko-home-${match.id}`} defaultValue={match.home || ""}>
                          <option value="">{t.homeTeam || "Squadra casa"}</option>
                          {teamOptions.map((team) => <option key={`${match.id}-h-${team}`} value={team}>{trTeamLabel(team)}</option>)}
                        </select>
                        <select id={`ko-away-${match.id}`} defaultValue={match.away || ""}>
                          <option value="">{t.awayTeam || "Squadra trasferta"}</option>
                          {teamOptions.map((team) => <option key={`${match.id}-a-${team}`} value={team}>{trTeamLabel(team)}</option>)}
                        </select>
                      </div>
                      <div className="admin-actions-row">
                        <button className="btn green" onClick={() => saveKnockoutOverride?.(match.id, getInputValue(`ko-home-${match.id}`), getInputValue(`ko-away-${match.id}`))}>💾 {t.saveChanges || "Salva modifica"}</button>
                        <button className="btn blue" onClick={() => clearKnockoutOverride?.(match.id)}>↩️ {t.automatic || "Automatico"}</button>
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
          <h3>🎯 {t.predictionLockControl || "Blocco manuale pronostici"}</h3>
          <p className="bonus-help">
            {t.currentStatus || "Stato attuale"}: <strong>{predictionLockModeControl}</strong>. {t.predictionLockControlHelp || "Usa questi comandi solo come controllo di sicurezza Admin: non modificano la configurazione della lega."}
          </p>
          <div className="admin-actions-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn blue" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("AUTO")}>
              ✅ {t.automaticSchedule || "Automatico calendario"}
            </button>
            <button type="button" className="btn danger" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("FORCE_LOCKED")}>
              🔒 {t.lockAllPredictions || "Blocca tutto"}
            </button>
            <button type="button" className="btn green" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("FORCE_UNLOCKED")}>
              🔓 {t.unlockAllPredictions || "Sblocca tutto"}
            </button>
            <button type="button" className="btn blue" disabled={predictionLockControlLoading} onClick={() => updatePredictionLockControl?.("TEST_STARTED")}>
              🧪 {t.simulateTournamentStarted || "Simula torneo iniziato"}
            </button>
          </div>
          <p className="bonus-help" style={{ marginTop: 10 }}>
            {t.predictionLockModesExplanation || "AUTO = segue date e impostazioni lega. FORCE_LOCKED = blocca ogni pronostico. FORCE_UNLOCKED = sblocca temporaneamente. TEST_STARTED = simula l'inizio torneo per testare Qualificate, Piazzamenti Gruppi e Golden Boot."}
          </p>
        </div>
      )}

      {activeAdminTab === "system" && (
        <>
          <div className="admin-toolbar league-box">
            <button className="btn blue" onClick={() => syncLiveResults(false)}>🔄 {t.refreshSupabaseData || "Aggiorna dati Supabase"}</button>
            <button className="btn blue" onClick={recalculateLeagueData}>🔄 {t.recalculateRanking || "Ricalcola classifica"}</button>
          </div>
          <div className="admin-two-columns">
            <div className="league-box">
              <h3>🔴 {t.topScorerRanking}</h3>
              <p className="bonus-help">{t.adminTopScorerInfo || "Aggiorna i gol provvisori dei capocannonieri durante il torneo."}</p>
              <select
  value={topScorerGoalsTeam}
  onChange={(event) => {
    setTopScorerGoalsTeam(event.target.value);
    setTopScorerGoalsPlayer("");
  }}
>
  <option value="">Tutte le squadre</option>
  {topScorerTeams.map((team) => (
    <option key={team} value={team}>{team}</option>
  ))}
</select>

<select
  value={topScorerGoalsPlayer}
  onChange={(event) => setTopScorerGoalsPlayer(event.target.value)}
>
  <option value="">{t.selectPlayer}</option>
  {filteredAdminTopScorers.map((player) => (
    <option key={player} value={player}>{player}</option>
  ))}
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
