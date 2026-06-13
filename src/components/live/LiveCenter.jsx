import LiveMatchCard from "./LiveMatchCard";
import LiveStandings from "./LiveStandings";

export default function LiveCenter({
  t,
  matches,
  realResults,
  matchEvents,
  lastLiveSync,
  liveSyncStatus,
  liveSyncMode,
  nextLiveSyncAt,
  formatMatchDateTime,
  trTeamLabel,
  groups,
  getGroupStandings,
  getLiveMinute,
}) {
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.kickoff || "2099-01-01") - new Date(b.kickoff || "2099-01-01")
  );

  const liveMatches = sortedMatches.filter((match) => {
    const result = realResults[match.id];
    return result && !result.finished;
  });

  const finishedMatches = sortedMatches.filter((match) => realResults[match.id]?.finished).slice(-6);
  const nextMatches = sortedMatches
    .filter((match) => !realResults[match.id] && new Date(match.kickoff || "2099-01-01") >= new Date())
    .slice(0, 6);

  const focusMatches = liveMatches.length > 0 ? liveMatches : nextMatches;

  return (
    <>
      <h2>🔴 {t.liveMatchCenter}</h2>

      <div className="live-center-hero">
        <div>
          <h3>{t.liveMatchCenter}</h3>
          <p>{t.liveApiInfo}</p>
        </div>
        <div className="live-center-sync">
          <strong>{liveMatches.length}</strong>
          <span>{liveSyncMode === "live" ? "Sync 10 min" : "Sync 1H"}</span>
          {lastLiveSync && (
            <small>
              🔄 {t.lastUpdate}: {lastLiveSync.toLocaleTimeString()}
              {liveSyncStatus ? ` — ${liveSyncStatus}` : ""}
            </small>
          )}
          {nextLiveSyncAt && (
            <small>⏭️ {t.nextMatches}: {nextLiveSyncAt.toLocaleTimeString()}</small>
          )}
        </div>
      </div>

      <div className="live-kpi-grid">
        <div className="live-kpi-card">
          <strong>{liveMatches.length}</strong>
          <span>{t.liveMatches}</span>
        </div>
        <div className="live-kpi-card">
          <strong>{finishedMatches.length}</strong>
          <span>{t.recentFinals}</span>
        </div>
        <div className="live-kpi-card">
          <strong>{nextMatches.length}</strong>
          <span>{t.nextMatches}</span>
        </div>
      </div>

      <div className="live-center-grid">
        <section className="live-panel">
          <h3>{liveMatches.length > 0 ? t.liveMatches : t.nextMatches}</h3>

          {focusMatches.length === 0 ? (
            <div className="live-empty-card">
              <strong>{t.noLiveMatches}</strong>
              <p>{t.liveEmptyInfo}</p>
            </div>
          ) : (
            <div className="live-match-list">
              {focusMatches.map((match) => (
                <LiveMatchCard
                  t={t}
                  key={match.id}
                  match={match}
                  result={realResults[match.id]}
                  getLiveMinute={getLiveMinute}
                  events={matchEvents?.[match.id] || []}
                  formatMatchDateTime={formatMatchDateTime}
                  trTeamLabel={trTeamLabel}
                />
              ))}
            </div>
          )}
        </section>

        <section className="live-panel">
          <h3>{t.latestResults}</h3>

          {finishedMatches.length === 0 ? (
            <div className="live-empty-card">
              <strong>{t.noFinalResults}</strong>
              <p>{t.finalResultsInfo}</p>
            </div>
          ) : (
            <div className="live-match-list compact">
              {finishedMatches.map((match) => (
                <LiveMatchCard
                  t={t}
                  key={match.id}
                  match={match}
                  result={realResults[match.id]}
                  getLiveMinute={getLiveMinute}
                  events={matchEvents?.[match.id] || []}
                  formatMatchDateTime={formatMatchDateTime}
                  trTeamLabel={trTeamLabel}
                  compact
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <LiveStandings
        groups={groups}
        getGroupStandings={getGroupStandings}
        trTeamLabel={trTeamLabel}
        t={t}
      />
    </>
  );
}
