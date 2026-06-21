export default function FinalBracket({
  t,
  knockoutRounds,
  knockoutMatches,
  realResults,
  formatMatchDateTime,
  trTeamLabel,
  trRoundName,
  renderRealResult,
}) {
  return (
    <>
      <h2>{t.finalBracket}</h2>
      <div className="tournament-bracket final-bracket-view">
        {knockoutRounds.map((round) => (
          <div key={round.round} className="tournament-round">
            <div className="round-title">{trRoundName(round.round)}</div>
            <div className="round-matches">
              {knockoutMatches
                .filter((match) => match.round === round.round)
                .map((match) => {
                  const real = realResults[match.id];
                  const isFinal = real?.finished;

                  return (
                    <div key={match.id} className={`bracket-card ${isFinal ? "final-card" : ""}`}>
                      <div className="bracket-card-head">
  <span>{match.code}</span>
  <small>📅 {formatMatchDateTime(match)}</small>
</div>

{(!match.home || !match.away) && (
  <div className="bracket-formula">
    {match.homeRaw} vs {match.awayRaw}
  </div>
)}

<div className="team-line">
  <span>{trTeamLabel(match.home)}</span>
  <strong>{real?.home_score ?? "-"}</strong>
</div>

<div className="team-line">
  <span>{trTeamLabel(match.away)}</span>
  <strong>{real?.away_score ?? "-"}</strong>
</div>                      <div className="bracket-status">{renderRealResult(match.id, true)}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
