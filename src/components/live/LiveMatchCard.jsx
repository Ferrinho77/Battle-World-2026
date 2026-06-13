import MatchEvents from "./MatchEvents";
import MatchTimeline from "./MatchTimeline";

function getLiveMinute(match, result) {
  if (!result) return null;
  if (result.finished) return "FT";

  const kickoff = new Date(match.kickoff || Date.now());
  const diffMinutes = Math.floor((Date.now() - kickoff.getTime()) / 60000);

  if (Number.isNaN(diffMinutes) || diffMinutes < 0) return "PRE";
  if (diffMinutes <= 45) return `${Math.max(1, diffMinutes)}'`;
  if (diffMinutes <= 60) return "HT";
  if (diffMinutes <= 105) return `${Math.min(90, diffMinutes - 15)}'`;
  return "90+";
}

export default function LiveMatchCard({
  t,
  match,
  result,
  getLiveMinute,
  events = [],
  formatMatchDateTime,
  trTeamLabel,
  compact = false,
}) {
  const isLive = result && !result.finished;
  const isFinal = result?.finished;
  const minute = result ? getLiveMinute(result) : null;

  return (
    <div className={`live-match-pro-card ${isLive ? "is-live" : ""} ${isFinal ? "is-final" : ""}`}>
      <div className="live-match-top">
        <span>{match.group || match.round || "Match"}</span>
        <small>{formatMatchDateTime(match)}</small>
      </div>

      <div className="live-score-board">
        <div className="live-team">
          <strong>{trTeamLabel(match.home)}</strong>
        </div>

        <div className="live-score">
          {result ? (
            <>
              <strong>{result.home_score}</strong>
              <span>-</span>
              <strong>{result.away_score}</strong>
            </>
          ) : (
            <span className="live-vs">VS</span>
          )}
        </div>

        <div className="live-team right">
          <strong>{trTeamLabel(match.away)}</strong>
        </div>
      </div>

      <div className="live-status-row">
        {isLive && <span className="live-pill pulse">🔴 LIVE {minute}</span>}
        {isFinal && <span className="live-pill final">✅ FINALE</span>}
        {!result && <span className="live-pill scheduled">🕒 PROGRAMMATA</span>}
      </div>

      {!compact && (
        <>
          <MatchTimeline match={match} result={result} minute={minute} />
          <MatchEvents t={t} match={match} result={result} events={events} trTeamLabel={trTeamLabel} />
        </>
      )}
    </div>
  );
}
