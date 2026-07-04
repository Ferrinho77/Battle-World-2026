import { useMemo, useState } from "react";

const ROUND_FIXED_COUNTS = {
  r32: 32,
  sedicesimi: 32,
  round32: 32,
  "32": 32,

  r16: 16,
  ottavi: 16,
  round16: 16,
  "16": 16,

  qf: 8,
  quarti: 8,
  quarter: 8,
  quarterfinals: 8,

  sf: 4,
  semifinali: 4,
  semifinal: 4,
  semifinals: 4,

  final: 2,
  finale: 2,

  champion: 1,
  winner: 1,
  vincente: 1,
};

function getRoundFixedCount(round) {
  const key = String(round?.key || "").toLowerCase();
  const label = String(round?.label || "").toLowerCase();

  if (ROUND_FIXED_COUNTS[key]) return ROUND_FIXED_COUNTS[key];
  if (label.includes("sedices")) return 32;
  if (label.includes("ottav")) return 16;
  if (label.includes("quart")) return 8;
  if (label.includes("semif")) return 4;
  if (label.includes("final") && !label.includes("vinc")) return 2;
  if (label.includes("vinc")) return 1;

  return 0;
}

function getDefaultQualificationRound(qualificationRounds) {
  const rounds = qualificationRounds || [];
  return (
    rounds.find((r) => String(r.label || "").toLowerCase().includes("sedices"))?.key ||
    rounds.find((r) => getRoundFixedCount(r) === 32)?.key ||
    rounds[0]?.key ||
    ""
  );
}

function localFormatText(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export default function UsersPredictions({
  t,
  usersSubTab,
  setPlayersSubTab,
  selectedPredictionPlayer,
  setSelectedPredictionPlayer,
  users,
  filteredPlayers,
  confirmedTopScorer,
  getCurrentTopScorer,
  topScorerPredictions,
  matches,
  knockoutMatches,
  trTeamLabel,
  formatMatchDateTime,
  renderPlayersRealResultCell,
  uniquePredictions,
  realResults,
  calculatePoints,
  getPredictionColor,
  leagueSettings,
  qualificationRounds,
  getBonusPredictionMapForPlayer,
  getBonusCellColor,
  groups,
  trGroupName,
}) {
  const [selectedQualificationRound, setSelectedQualificationRound] = useState(
    getDefaultQualificationRound(qualificationRounds)
  );

  const allMatches = [...matches, ...knockoutMatches];

  const selectedRound = useMemo(() => {
    const rounds = qualificationRounds || [];
    return rounds.find((r) => r.key === selectedQualificationRound) || rounds[0];
  }, [qualificationRounds, selectedQualificationRound]);

  const fixedRowCount = useMemo(() => {
    return getRoundFixedCount(selectedRound);
  }, [selectedRound]);

  const qualificationRows = useMemo(() => {
    const count = fixedRowCount || 0;
    return Array.from({ length: count }, (_, index) => index);
  }, [fixedRowCount]);

  return (
    <>
      <h2>{t.usersPredictions}</h2>

      <div className="subtabs subtabs-compact">
        <button
          className={usersSubTab === "match" ? "active" : ""}
          onClick={() => setPlayersSubTab("match")}
        >
          Match
        </button>
        <button
          className={usersSubTab === "pt" ? "active" : ""}
          onClick={() => setPlayersSubTab("pt")}
        >
          Qualif.
        </button>
        <button
          className={usersSubTab === "pg" ? "active" : ""}
          onClick={() => setPlayersSubTab("pg")}
        >
          Gruppi
        </button>
      </div>

      <div className="user-filter-box player-filter-box">
        <label>{t.viewUser}</label>
        <select
          value={selectedPredictionPlayer}
          onChange={(e) => setSelectedPredictionPlayer(e.target.value)}
        >
          <option value="__all__">{t.allUsers}</option>
          {users.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {usersSubTab === "match" && (
        <>
          <div className="grid-scroll users-mobile-table">
            <table className="predictions-grid users-predictions-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-head">{t.match}</th>
                  <th className="sticky-head">{t.realResult}</th>
                  {filteredPlayers.map((name) => (
                    <th key={name} className="sticky-head">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky-col"><strong>🏆 {t.topScorer}</strong></td>
                  <td style={{ textAlign: "center", fontWeight: "bold", color: confirmedTopScorer ? "#18c964" : "#58a6ff" }}>
                    <div>{getCurrentTopScorer() || "-"}</div>
                    {getCurrentTopScorer() && (
                      <small>{confirmedTopScorer ? `✅ ${t.finalTopScorer}` : `🔵 ${t.provisionalTopScorer}`}</small>
                    )}
                  </td>
                  {filteredPlayers.map((name) => (
                    <td key={name} style={{ textAlign: "center", fontWeight: "bold" }}>
                      {topScorerPredictions[name] || "-"}
                    </td>
                  ))}
                </tr>

                {allMatches.map((match) => (
                  <tr key={match.id}>
                    <td className="sticky-col">
                      <div>{trTeamLabel(match.home)} - {trTeamLabel(match.away)}</div>
                      <small style={{ display: "block", color: "#9fb1c8", marginTop: 4 }}>
                        📅 {formatMatchDateTime(match)}
                      </small>
                    </td>
                    {renderPlayersRealResultCell(match.id)}
                    {filteredPlayers.map((name) => {
                      const prediction = uniquePredictions().find((p) => p.match_id === match.id && p.username === name);
                      const real = realResults[match.id];
                      const points = prediction && real?.finished ? calculatePoints(prediction, real) : null;

                      return (
                        <td
                          key={name}
                          style={{
                            background: getPredictionColor(prediction, real),
                            fontWeight: "bold",
                            textAlign: "center",
                          }}
                        >
                          <div>{prediction ? `${prediction.home_score}-${prediction.away_score}` : "-"}</div>
                          {real && (
                            <small style={{ display: "block", marginTop: 4 }}>
                              {real.finished && points !== null ? `${t.points}: ${points}` : `🔵 ${t.live}`}
                            </small>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </>
      )}

      {usersSubTab === "pt" && leagueSettings.enable_qualification_bonus && (
        <div className="league-box center-prediction-section">
          <h3>✅ {t.qualifiedByUser}</h3>

          <div className="qualification-toolbar">
            <div>
              <label>{t.round}</label>
              <select
                value={selectedQualificationRound}
                onChange={(e) => setSelectedQualificationRound(e.target.value)}
              >
                {qualificationRounds.map((round) => (
                  <option key={round.key} value={round.key}>
                    {round.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="qualification-summary">
              <span>{t.comparisonView}</span>
              <strong>
                {localFormatText(t.roundTeamsCount, { round: selectedRound?.label || "-", count: fixedRowCount || 0 })}
              </strong>
            </div>
          </div>

          <div className="qualification-excel-scroll">
            <table className="qualification-excel-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-head round-label-head">{t.round}</th>
                  {filteredPlayers.map((name) => (
                    <th className="sticky-head" key={name}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qualificationRows.map((index) => (
                  <tr key={`${selectedRound?.key}-${index}`}>
                    <td className="sticky-col round-name-cell plain-round-cell">
                      {selectedRound?.label || "-"}
                    </td>
                    {filteredPlayers.map((name) => {
                      const map = getBonusPredictionMapForPlayer(name);
                      const team = (map[`qualification::${selectedRound.key}`] || [])[index];

                      return (
                        <td key={name}>
                          {team ? (
                            <div
                              className="mini-chip"
                              style={{ background: getBonusCellColor("qualification", selectedRound.key, team) }}
                            >
                              {team}
                            </div>
                          ) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr>
                  <td className="sticky-col round-name-cell plain-round-cell">
                    🏆 Vincitore
                  </td>

                  {filteredPlayers.map((name) => {
                    const map = getBonusPredictionMapForPlayer(name);
                    const champion = map["qualification::champion"];

                    return (
                      <td key={name}>
                        {champion ? (
                          <div
                            className="mini-chip"
                            style={{
                              background: getBonusCellColor("qualification", "champion", champion),
                            }}
                          >
                            {champion}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {usersSubTab === "pg" && leagueSettings.enable_group_positions_bonus && (
        <div className="league-box center-prediction-section">
          <h3>📊 {t.groupsByUser}</h3>

          <div className="desktop-users-table grid-scroll users-mobile-table">
            <table className="predictions-grid pg-vertical-grid users-predictions-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-head group-pos-head">{t.groupPositionHeader}</th>
                  {filteredPlayers.map((name) => (
                    <th className="sticky-head" key={name}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.flatMap((g) =>
                  [0, 1, 2, 3].map((idx) => (
                    <tr key={`${g.name}-${idx}`}>
                      <td className="sticky-col group-pos-cell">
                        <strong>{trGroupName(g.name)}</strong>
                        <small>{idx + 1}°</small>
                      </td>
                      {filteredPlayers.map((name) => {
                        const map = getBonusPredictionMapForPlayer(name);
                        const team = (map[`group_position::${g.name}`] || [])[idx];

                        return (
                          <td key={name} style={{ textAlign: "center" }}>
                            {team ? (
                              <div
                                className="mini-chip"
                                style={{ background: getBonusCellColor("group_position", g.name, team, idx) }}
                              >
                                {team}
                              </div>
                            ) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-groups-user-cards">
            {filteredPlayers.map((name) => {
              const map = getBonusPredictionMapForPlayer(name);

              return (
                <div className="mobile-group-user-card" key={name}>
                  <div className="mobile-group-user-head">
                    <span>{t.user}</span>
                    <strong>{name}</strong>
                  </div>

                  {groups.map((g) => (
                    <div className="mobile-group-box" key={g.name}>
                      <h4>{trGroupName(g.name)}</h4>
                      {[0, 1, 2, 3].map((idx) => {
                        const team = (map[`group_position::${g.name}`] || [])[idx];

                        return (
                          <div className="mobile-group-position-row" key={`${g.name}-${idx}`}>
                            <span>{idx + 1}°</span>
                            {team ? (
                              <strong
                                className="mini-chip"
                                style={{ background: getBonusCellColor("group_position", g.name, team, idx) }}
                              >
                                {team}
                              </strong>
                            ) : (
                              <strong>-</strong>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
