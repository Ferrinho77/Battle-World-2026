import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import logo from "./assets/Logo.png";
import "./App.css";
import LeagueShell from "./components/layout/LeagueShell";
import GroupPredictions from "./components/predictions/GroupPredictions";
import KnockoutPredictions from "./components/predictions/KnockoutPredictions";
import UsersPredictions from "./components/predictions/UsersPredictions";
import FinalBracket from "./components/bracket/FinalBracket";
import AdminPanel from "./components/admin/AdminPanel";
import LeagueHome from "./components/league/LeagueHome";
import ParticipantsRanking from "./components/rankings/ParticipantsRanking";
import LiveCenter from "./components/live/LiveCenter";
import { matches, groups, knockoutRounds, topScorers } from "./data";
import { translations } from "./translations";


const LIVE_REFRESH_MS = 10 * 60 * 1000;
const IDLE_REFRESH_MS = 60 * 60 * 1000;
const GLOBAL_CONTROL_ROOM_EMAIL = "fabioferrigno1@hotmail.com";

function getNextSyncDate(intervalMs) {
  return new Date(Date.now() + intervalMs);
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(() => window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery"));
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [username, setPlayername] = useState("");
  const [settingsPlayername, setSettingsPlayername] = useState("");
  const [avatarIcon, setAvatarIcon] = useState(localStorage.getItem("avatarIcon") || "⚽");
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("avatarUrl") || "");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedPredictionPlayer, setSelectedPredictionPlayer] = useState("__all__");
  const [adminMatchFilter, setAdminMatchFilter] = useState("all");
  const [lastLiveSync, setLastLiveSync] = useState(null);
  const [liveSyncStatus, setLiveSyncStatus] = useState("");
  const [liveSyncMode, setLiveSyncMode] = useState("idle");
  const [nextLiveSyncAt, setNextLiveSyncAt] = useState(null);
  const [nowTick, setNowTick] = useState(new Date());
  const [language, setLanguage] = useState(localStorage.getItem("lang") || "it");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setPlayer] = useState(null);
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [usersSubTab, setPlayersSubTab] = useState("match");
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);
  const [editingLeagueId, setEditingLeagueId] = useState(null);
  const [editingLeagueName, setEditingLeagueName] = useState("");
  const [missingLeagueSettingFields, setMissingLeagueSettingFields] = useState({});
  const [leagueSettings, setLeagueSettings] = useState({
    exact_score_points: 3,
    outcome_points: 1,
    top_scorer_points: 10,
    exact_score_mode: "standard",
    prediction_lock_mode: "match",
    qualification_bonus_mode: "round",
    qualification_fixed_points: 3,
    exact_easy_points: 3,
    exact_medium_points: 5,
    exact_hard_points: 8,
    enable_qualification_bonus: false,
    enable_group_positions_bonus: false,
    bonus_round32_points: 1,
    bonus_round16_points: 2,
    bonus_quarter_points: 4,
    bonus_semi_points: 6,
    bonus_final_points: 8,
    bonus_champion_points: 15,
    bonus_group_exact_points: 3,
  });
  const [globalAdminEmails, setGlobalAdminEmails] = useState([]);
  const [newGlobalAdminEmail, setNewGlobalAdminEmail] = useState("");
  const [globalAdminsLoading, setGlobalAdminsLoading] = useState(false);
  const [globalDashboardLoading, setGlobalDashboardLoading] = useState(false);
  const [globalDashboardStats, setGlobalDashboardStats] = useState({
    users: 0,
    leagues: 0,
    leagueMembers: 0,
    predictions: 0,
    topScorerPredictions: 0,
    bonusPredictions: 0,
    authorizedAdmins: 0,
    recentUsers: [],
    recentLeagues: [],
  });
  const [globalUsersLoading, setGlobalUsersLoading] = useState(false);
  const [globalUsersSearch, setGlobalUsersSearch] = useState("");
  const [globalUsers, setGlobalUsers] = useState([]);
  const [deleteUserLoadingId, setDeleteUserLoadingId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [predictions, setPredictions] = useState({});
  const [missingPredictionFields, setMissingPredictionFields] = useState({});
  const [validationMessage, setValidationMessage] = useState("");
  const [bonusPredictions, setBonusPredictions] = useState({});
  const [missingBonusFields, setMissingBonusFields] = useState({});
  const [allBonusPredictions, setAllBonusPredictions] = useState([]);
  const [allPredictions, setAllPredictions] = useState([]);
  const [realResults, setRealResults] = useState({});
  const [matchEvents, setMatchEvents] = useState({});
  const [selectedTopScorer, setSelectedTopScorer] = useState("");
  const [finalTopScorer, setFinalTopScorer] = useState("");
  const [topScorerGoalsPlayer, setTopScorerGoalsPlayer] = useState("");
  const [topScorerGoals, setTopScorerGoals] = useState("");
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [topScorerSearch, setTopScorerSearch] = useState("");
  const [allTopScorerPredictions, setAllTopScorerPredictions] = useState([]);
  const [leagueParticipants, setLeagueParticipants] = useState([]);
  const selectableTopScorers = Array.from(new Set([
    ...topScorers,
    ...players.map((p) => p.label),
  ])).sort((a, b) => a.localeCompare(b));
  const normalizedTopScorerSearch = normalizeSearchText(topScorerSearch);
  const filteredTopScorers = !normalizedTopScorerSearch
    ? selectableTopScorers
    : selectableTopScorers
        .filter((player) => normalizeSearchText(player).startsWith(normalizedTopScorerSearch))
        .concat(
          selectableTopScorers.filter((player) =>
            !normalizeSearchText(player).startsWith(normalizedTopScorerSearch) &&
            normalizeSearchText(player).includes(normalizedTopScorerSearch)
          )
        );
  const t = translations[language] || translations.it;
  const currentUserEmail = String(user?.email || "").trim().toLowerCase();
  const normalizedGlobalAdminEmails = globalAdminEmails.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  const isControlRoomOwner = currentUserEmail === GLOBAL_CONTROL_ROOM_EMAIL;
  const isGlobalAdminFromTable = normalizedGlobalAdminEmails.includes(currentUserEmail);
  const isGlobalControlRoomAdmin =
    isControlRoomOwner ||
    isGlobalAdminFromTable;

  function formatText(template, values = {}) {
    return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  useEffect(() => {
    setValidationMessage("");
    setMissingPredictionFields({});
    setMissingBonusFields({});
    setMissingLeagueSettingFields({});
  }, [activeTab]);


  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);
  const allTeams = groups.flatMap((group) => group.teams);
  const qualificationRounds = [
    { key: "round32", label: t.roundOf32, count: 32, pointsKey: "bonus_round32_points" },
    { key: "round16", label: t.roundOf16, count: 16, pointsKey: "bonus_round16_points" },
    { key: "quarter", label: t.quarterFinals, count: 8, pointsKey: "bonus_quarter_points" },
    { key: "semi", label: t.semiFinals, count: 4, pointsKey: "bonus_semi_points" },
    { key: "final", label: t.final, count: 2, pointsKey: "bonus_final_points" },
  ];

  function trRoundName(round) {
    const value = String(round || "").toLowerCase();
    if (value.includes("sedices") || value.includes("round32") || value.includes("32")) return t.roundOf32;
    if (value.includes("ottav") || value.includes("round16") || value.includes("16")) return t.roundOf16;
    if (value.includes("quart") || value.includes("quarter")) return t.quarterFinals;
    if (value.includes("semif") || value.includes("semi")) return t.semiFinals;
    if (value.includes("final")) return t.final;
    return round;
  }

  function trGroupName(groupName) {
    const text = String(groupName || "");
    const match = text.match(/([A-L])$/i);
    if (match) {
      const key = `group${match[1].toUpperCase()}`;
      return t[key] || formatText(t.groupLabel, { group: match[1].toUpperCase() });
    }
    return groupName;
  }

  function trDate(value) {
    return value === "Da definire" ? t.toBeDefined : value;
  }

  function formatMatchDateTime(match) {
    if (!match?.kickoff) return trDate(match?.date || "Da definire");
    const locale = language === "ro" ? "ro-RO" : language === "en" ? "en-GB" : "it-IT";
    const d = new Date(match.kickoff);
    if (Number.isNaN(d.getTime())) return trDate(match?.date || "Da definire");
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  function trTeamLabel(value) {
    let text = String(value || "");
    text = text.replace(/Migliore 3ª/g, t.bestThird);
    text = text.replace(/Vincente/g, t.winner);
    text = text.replace(/Perdente/g, t.loser);
    return text;
  }

  function renderResultStatus(matchId) {
    const result = realResults[matchId];
    if (result?.finished) {
      return <p style={{ color: "#18c964", fontWeight: "bold" }}>✅ {t.confirmed}</p>;
    }
    if (result) {
      return <p style={{ color: "#1d7fff", fontWeight: "bold" }}>🔵 {t.live}</p>;
    }
    return <p style={{ color: "#f5a524", fontWeight: "bold" }}>🟡 {t.pending}</p>;
  }

  function renderRealResult(matchId, compact = false) {
    const result = realResults[matchId];
    if (!result) return compact ? null : <p style={{ color: "#9fb1c8" }}>{t.realResult}: -</p>;
    const label = result.finished ? t.finalResult : t.liveResult;
    const status = result.finished ? `✅ ${t.confirmed}` : `🔵 ${t.live}`;
    const content = `${label}: ${result.home_score} - ${result.away_score} ${status}`;
    return compact
      ? <small style={{ display: "block", color: result.finished ? "#18c964" : "#58a6ff", marginTop: 4 }}>{content}</small>
      : <p style={{ color: result.finished ? "#18c964" : "#58a6ff", fontWeight: "bold" }}>{content}</p>;
  }

  function renderPlayersRealResultCell(matchId) {
    const result = realResults[matchId];
    if (!result) {
      return <td style={{ textAlign: "center", color: "#9fb1c8", fontWeight: "bold" }}>-</td>;
    }
    if (result.finished) {
      return (
        <td style={{ background: "#f4f6fb", color: "#0f172a", textAlign: "center", fontWeight: "bold" }}>
          <div>⚪ {t.finalResult}</div>
          <div>{result.home_score}-{result.away_score}</div>
        </td>
      );
    }
    return (
      <td style={{ background: "#7f1d1d", color: "white", textAlign: "center", fontWeight: "bold" }}>
        <div>🔴 {t.liveResult}</div>
        <div>{result.home_score}-{result.away_score}</div>
      </td>
    );
  }

  const topScorerPredictionPrefix = "topscorer::";
  const topScorerFinalPrefix = () => `topscorer-final-${selectedLeague?.id || "global"}::`;
  const topScorerGoalsPrefix = () => `topscorer-goals-${selectedLeague?.id || "global"}::`;
  const encodeTopScorer = (player) => encodeURIComponent(player || "");
  const decodeTopScorer = (value) => decodeURIComponent(String(value || ""));
  const isTopScorerPrediction = (matchId) => String(matchId || "").startsWith(topScorerPredictionPrefix);

  function getTopScorerFromMatchId(matchId) {
    return decodeTopScorer(String(matchId || "").replace(topScorerPredictionPrefix, ""));
  }

  function getTopScorerPredictions() {
    const map = {};

    // Sistema corretto: tabella dedicata top_scorer_predictions.
    // Non leggiamo più le vecchie righe in predictions, così non rimane fisso Messi/Wirtz.
    allTopScorerPredictions.forEach((p) => {
      const name = p.username || p.user_email || t.user;
      if (p.player) map[name] = p.player;
    });

    return map;
  }

  function getFinalTopScorer() {
    const prefix = topScorerFinalPrefix();
    const key = Object.keys(realResults).find((id) => String(id).startsWith(prefix));
    return key ? decodeTopScorer(key.replace(prefix, "")) : "";
  }

  function getTopScorerGoalsRanking() {
    const prefix = topScorerGoalsPrefix();
    return Object.entries(realResults)
      .filter(([id]) => String(id).startsWith(prefix))
      .map(([id, row]) => ({
        player: decodeTopScorer(String(id).replace(prefix, "")),
        goals: Number(row?.home_score || 0),
        finished: !!row?.finished,
      }))
      .filter((row) => row.player && row.goals >= 0)
      .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player));
  }

  function getCurrentTopScorer() {
    return getFinalTopScorer() || getTopScorerGoalsRanking()[0]?.player || "";
  }

  function renderTopScorerRankingBox() {
    const ranking = getTopScorerGoalsRanking().slice(0, 5);
    const finalScorer = getFinalTopScorer();
    const isTournamentFinal = !!finalScorer;

    return (
      <div className="league-box">
        <h3>🏆 {t.topScorerRanking}</h3>
        {finalScorer && <p style={{ color: "#18c964", fontWeight: "bold" }}>✅ {t.finalTopScorer}: {finalScorer}</p>}
        {ranking.length === 0 ? (
          <p>{t.noTopScorerData}</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t.positionLabel}</th>
                  <th>{t.player || t.selectPlayer}</th>
                  <th>{t.goals}</th>
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, index) => (
                  <tr key={row.player} style={index === 0 ? { background: "rgba(245, 165, 36, 0.16)", fontWeight: "bold" } : {}}>
                    <td>{index + 1}</td>
                    <td>{row.player}</td>
                    <td>{row.goals}</td>
                    <td style={{ color: isTournamentFinal ? "#f4f6fb" : "#ff4d4f", fontWeight: "bold" }}>
                      {isTournamentFinal ? `⚪ ${t.finalResult}` : `🔴 ${t.liveResult}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }



  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetMode(true);
      }

      if (session?.user) {
        setPlayer(session.user);
        loadProfile(session.user.id);
        loadLeagues(session.user.id);
        loadPredictions(session.user.id);
        loadAuthorizedAdmins();
      } else {
        setPlayer(null);
        setGlobalAdminEmails([]);
      }
    });

    checkPlayer();
    loadRealResults();
    loadPlayers();

    return () => authListener?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user && activeTab === "admin" && isControlRoomOwner) {
      loadGlobalDashboardStats();
      loadGlobalUsers();
    }
  }, [user, activeTab, isControlRoomOwner]);

  const hasLiveMatches = Object.values(realResults || {}).some((result) => result && !result.finished);

  // STEP 25C - Modalità gratuita 100% Supabase locale.
  // API-Football non viene più chiamata automaticamente: risultati e live si gestiscono dalla Control Room.
  useEffect(() => {
    if (!user) return;
    setLiveSyncMode(hasLiveMatches ? "live" : "idle");
    setNextLiveSyncAt(null);
    loadRealResults(true);
    loadMatchEvents(true);
    setLiveSyncStatus("Modalità Supabase locale: nessuna API a pagamento attiva");
  }, [user, selectedLeague?.id, hasLiveMatches]);

  async function loadPlayers() {
    setPlayersLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("id,name,team,flag,position,is_active,sort_order")
      .eq("is_active", true)
      .order("team", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error && Array.isArray(data) && data.length) {
      const formatted = data.map((player) => ({
        ...player,
        label: `${player.flag ? `${player.flag} ` : ""}${player.name}${player.team ? ` (${player.team})` : ""}`,
      }));
      setPlayers(formatted);
    } else {
      setPlayers([]);
    }
    setPlayersLoading(false);
  }

  function getRoundStartDate(roundName) {
    const allRoundMatches = buildKnockoutMatches().filter((m) => m.round === roundName && m.kickoff);
    const dates = allRoundMatches
      .map((m) => new Date(m.kickoff))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);
    return dates[0] || null;
  }

  function getPredictionLockDate(match) {
    if (leagueSettings.prediction_lock_mode === "tournament") return getTournamentStartDate();
    if (leagueSettings.prediction_lock_mode === "stage" || leagueSettings.prediction_lock_mode === "stage_round") {
      if (String(match?.id || "").startsWith("ko-")) return getRoundStartDate(match.round) || (match?.kickoff ? new Date(match.kickoff) : null);
      return getTournamentStartDate();
    }
    return match?.kickoff ? new Date(match.kickoff) : null;
  }

  
function formatLockDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPredictionLockText(match) {
    const date = getPredictionLockDate(match);
    const label = formatLockDate(date);
    if (leagueSettings.prediction_lock_mode === "tournament") return `Compilabile fino alla prima partita del torneo: ${label}`;
    if (leagueSettings.prediction_lock_mode === "stage" || leagueSettings.prediction_lock_mode === "stage_round") {
      if (String(match?.id || "").startsWith("ko-")) return `Compilabile fino alla prima partita del turno ${trRoundName(match.round)}: ${label}`;
      return `Compilabile fino alla prima partita del torneo: ${label}`;
    }
    return `${t.editableUntilMatchKickoff || "Compilabile fino al calcio d’inizio della partita:"} ${label}`;
  }

  function isPredictionLocked(match) {
    const lockDate = getPredictionLockDate(match);
    if (!lockDate) return false;
    return new Date() >= new Date(lockDate);
  }

  function getCurrentKnockoutRoundForValidation(matchList = []) {
    const knockoutOnly = matchList.filter((match) => String(match?.id || "").startsWith("ko-"));
    const upcoming = knockoutOnly
      .map((match) => ({ match, lockDate: getRoundStartDate(match.round) || (match.kickoff ? new Date(match.kickoff) : null) }))
      .filter((row) => row.lockDate && new Date(row.lockDate) > new Date())
      .sort((a, b) => new Date(a.lockDate) - new Date(b.lockDate));

    return upcoming[0]?.match?.round || null;
  }


  function getTournamentStartDate() {
    const validDates = matches
      .map((match) => new Date(match.kickoff))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);
    return validDates[0] || null;
  }

  function getCountdownParts(targetDate) {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const diffMs = target.getTime() - nowTick.getTime();
    if (Number.isNaN(target.getTime()) || diffMs <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { expired: false, days, hours, minutes, seconds };
  }

  function renderCountdownBox(parts) {
    if (!parts) return null;
    if (parts.expired) return <strong className="countdown-expired">🔒 {t.predictionsClosed || 'Pronostici chiusi'}</strong>;
    return (
      <div className="countdown-box">
        <span><strong>{parts.days}</strong><small>giorni</small></span>
        <span><strong>{String(parts.hours).padStart(2, "0")}</strong><small>ore</small></span>
        <span><strong>{String(parts.minutes).padStart(2, "0")}</strong><small>min</small></span>
        <span><strong>{String(parts.seconds).padStart(2, "0")}</strong><small>sec</small></span>
      </div>
    );
  }

  function isTournamentStarted() {
    const start = getTournamentStartDate();
    return !!start && new Date() >= start;
  }

  function formatTournamentStart() {
    const start = getTournamentStartDate();
    if (!start) return t.toBeDefined;
    const locale = language === "ro" ? "ro-RO" : language === "en" ? "en-GB" : "it-IT";
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(start);
  }

  function uniquePredictions() {
    const map = {};
    allPredictions.forEach((p) => {
      const key = `${p.user_id}_${p.match_id}`;
      map[key] = { ...p, username: p.username || p.user_email || "User" };
    });
    return Object.values(map);
  }

  function getLeagueParticipantRows() {
    return leagueParticipants.map((participant) => ({
      user_id: participant.user_id,
      name: participant.name || participant.email || `User ${String(participant.user_id || "").slice(0, 6)}`,
      email: participant.email || "",
      avatar_icon: participant.avatar_icon || "⚽",
      avatar_url: participant.avatar_url || "",
    }));
  }

  
  function getParticipantCompletionStatus(participant) {
    const byUserId = (row) => row.user_id === participant.user_id;
    const byNameOrEmail = (row) =>
      (row.username || row.user_email || "") === participant.name ||
      (row.username || row.user_email || "") === participant.email;

    const hasMatchPredictions = uniquePredictions().some((row) =>
      (byUserId(row) || byNameOrEmail(row)) &&
      row.home_score !== undefined && row.home_score !== "" &&
      row.away_score !== undefined && row.away_score !== ""
    );

    const hasGoldenBoot = allTopScorerPredictions.some((row) =>
      (byUserId(row) || byNameOrEmail(row)) && !!row.player
    );

    const hasQualified = allBonusPredictions.some((row) =>
      (byUserId(row) || byNameOrEmail(row)) && row.prediction_type === "qualification"
    );

    const hasGroupRanking = allBonusPredictions.some((row) =>
      (byUserId(row) || byNameOrEmail(row)) && row.prediction_type === "group_position"
    );

    return {
      hasMatchPredictions,
      hasGoldenBoot,
      hasQualified,
      hasGroupRanking,
    };
  }

  async function removeParticipantFromLeague(participant) {
    if (!selectedLeague || !participant?.user_id) return;

    if (selectedLeague.owner_id === participant.user_id) {
      setMessage(t.cannotRemoveOwner);
      return;
    }

    const ok = window.confirm(`${t.confirmRemoveParticipant}\n\n${participant.name || participant.email}`);
    if (!ok) return;

    await supabase.from("top_scorer_predictions").delete().eq("league_id", selectedLeague.id).eq("user_id", participant.user_id);
    await supabase.from("bonus_predictions").delete().eq("league_id", selectedLeague.id).eq("user_id", participant.user_id);
    await supabase.from("predictions").delete().eq("league_id", selectedLeague.id).eq("user_id", participant.user_id);

    const { error } = await supabase
      .from("league_members")
      .delete()
      .eq("league_id", selectedLeague.id)
      .eq("user_id", participant.user_id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadLeagueParticipants(selectedLeague.id);
    await loadAllPredictions(selectedLeague.id);
    await loadAllBonusPredictions(selectedLeague.id);
    await loadAllTopScorerPredictions(selectedLeague.id);
    setMessage(`${t.participantRemoved} ✅`);
  }

function getPlayersInLeague() {
    return Array.from(new Set([
      ...getLeagueParticipantRows().map((participant) => participant.name),
      ...uniquePredictions().map((p) => p.username || p.user_email || "User"),
      ...allBonusPredictions.map((p) => p.username || p.user_email || "User"),
      ...allTopScorerPredictions.map((p) => p.username || p.user_email || "User"),
    ].filter(Boolean)));
  }

  function getPredictionColor(prediction, real) {
    if (!real?.finished || !prediction) return "rgba(255,255,255,0.06)";
    const ph = prediction.home_score, pa = prediction.away_score;
    const rh = real.home_score, ra = real.away_score;
    if (ph === rh && pa === ra) return "#18c964";
    const predWinner = ph > pa ? "H" : ph < pa ? "A" : "D";
    const realWinner = rh > ra ? "H" : rh < ra ? "A" : "D";
    return predWinner === realWinner ? "#f5a524" : "rgba(255,255,255,0.08)";
  }


  function getExactScoreDifficulty(home, away) {
    const h = Number(home);
    const a = Number(away);
    const total = h + a;
    const diff = Math.abs(h - a);
    const easy = new Set(["0-0", "1-0", "0-1", "1-1", "2-0", "0-2", "2-1", "1-2"]);
    const medium = new Set(["2-2", "3-0", "0-3", "3-1", "1-3", "3-2", "2-3"]);
    const key = `${h}-${a}`;
    if (easy.has(key)) return "easy";
    if (medium.has(key)) return "medium";
    if (total >= 5 || h >= 4 || a >= 4 || diff >= 3) return "hard";
    return "medium";
  }

  function getExactScorePoints(home, away) {
    if (leagueSettings.exact_score_mode !== "bands") return Number(leagueSettings.exact_score_points || 0);
    const difficulty = getExactScoreDifficulty(home, away);
    if (difficulty === "easy") return Number(leagueSettings.exact_easy_points || 0);
    if (difficulty === "medium") return Number(leagueSettings.exact_medium_points || 0);
    return Number(leagueSettings.exact_hard_points || 0);
  }

  function calculatePoints(prediction, real) {
    if (!real) return 0;
    const ph = Number(prediction.home_score), pa = Number(prediction.away_score);
    const rh = Number(real.home_score), ra = Number(real.away_score);
    if (ph === rh && pa === ra) return getExactScorePoints(rh, ra);
    const predWinner = ph > pa ? "H" : ph < pa ? "A" : "D";
    const realWinner = rh > ra ? "H" : rh < ra ? "A" : "D";
    return predWinner === realWinner ? Number(leagueSettings.outcome_points || 0) : 0;
  }


  function getFinishedCountForGroup(groupName) {
    return matches.filter((m) => m.group === groupName && realResults[m.id]).length;
  }

  function getQualifiedTeam(seed) {
    const clean = String(seed).trim();
    const match = clean.match(/^([12])([A-L])$/);
    if (!match) return clean;
    const position = Number(match[1]) - 1;
    const groupName = `Gruppo ${match[2]}`;
    if (getFinishedCountForGroup(groupName) < 6) return clean;
    return getGroupStandings(groupName)[position]?.team || clean;
  }

  function getBestThirdTeams() {
    const thirds = [];
    groups.forEach((group) => {
      if (getFinishedCountForGroup(group.name) < 6) return;
      const third = getGroupStandings(group.name)[2];
      if (third) thirds.push(third);
    });
    return thirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }

  function getKnockoutKickoff(round, index) {
    const schedule = {
      "Sedicesimi": ["2026-06-28", "2026-06-28", "2026-06-29", "2026-06-29", "2026-06-30", "2026-06-30", "2026-07-01", "2026-07-01", "2026-07-02", "2026-07-02", "2026-07-03", "2026-07-03", "2026-07-03", "2026-07-03", "2026-07-03", "2026-07-03"],
      "Ottavi": ["2026-07-04", "2026-07-04", "2026-07-05", "2026-07-05", "2026-07-06", "2026-07-06", "2026-07-07", "2026-07-07"],
      "Quarti": ["2026-07-09", "2026-07-10", "2026-07-11", "2026-07-11"],
      "Semifinali": ["2026-07-14", "2026-07-15"],
      "Finale 3° posto": ["2026-07-18"],
      "Finale": ["2026-07-19"],
    };
    const date = schedule[round]?.[index];
    if (!date) return null;
    const hour = index % 2 === 0 ? "18:00:00" : "21:00:00";
    return `${date}T${hour}`;
  }

  function buildKnockoutMatches() {
    const prefixByRound = {
      Sedicesimi: "S",
      Ottavi: "O",
      Quarti: "Q",
      Semifinali: "SF",
      "Finale 3° posto": "F3",
      Finale: "F",
    };
    let thirdIndex = 0;
    const bestThirds = getBestThirdTeams();
    const codeMap = {};

    const resolveToken = (token) => {
      const clean = String(token).trim();
      if (clean.includes("Migliore 3ª")) {
        const team = bestThirds[thirdIndex]?.team || `Migliore 3ª ${thirdIndex + 1}`;
        thirdIndex += 1;
        return team;
      }

      const winner = clean.match(/^Vincente\s+(.+)$/i);
      if (winner) {
        const source = codeMap[winner[1].trim()];
        if (!source) return clean;
        const result = realResults[source.id];
        if (!result?.finished) return clean;
        if (Number(result.home_score) === Number(result.away_score)) return clean;
        return Number(result.home_score) > Number(result.away_score) ? source.home : source.away;
      }

      const loser = clean.match(/^Perdente\s+(.+)$/i);
      if (loser) {
        const source = codeMap[loser[1].trim()];
        if (!source) return clean;
        const result = realResults[source.id];
        if (!result?.finished) return clean;
        if (Number(result.home_score) === Number(result.away_score)) return clean;
        return Number(result.home_score) > Number(result.away_score) ? source.away : source.home;
      }

      return getQualifiedTeam(clean);
    };

    const list = [];
    knockoutRounds.forEach((round) => {
      const prefix = prefixByRound[round.round] || "K";
      round.matches.forEach((label, index) => {
        const [homeRaw, awayRaw] = label.split(" - ").map((x) => x.trim());
        const code = prefix === "F" ? "F" : prefix === "F3" ? "F3" : `${prefix}${index + 1}`;
        const item = {
          id: `ko-${code.toLowerCase()}`,
          code,
          round: round.round,
          group: round.round,
          date: null,
          kickoff: getKnockoutKickoff(round.round, index),
          homeRaw,
          awayRaw,
          home: resolveToken(homeRaw),
          away: resolveToken(awayRaw),
        };
        codeMap[code] = item;
        list.push(item);
      });
    });
    return list;
  }


  function getWinnerFromMatch(matchId) {
    const ko = buildKnockoutMatches().find((m) => m.id === matchId);
    const result = realResults[matchId];
    if (!ko || !result?.finished || Number(result.home_score) === Number(result.away_score)) return "";
    return Number(result.home_score) > Number(result.away_score) ? ko.home : ko.away;
  }

  function getLoserFromMatch(matchId) {
    const ko = buildKnockoutMatches().find((m) => m.id === matchId);
    const result = realResults[matchId];
    if (!ko || !result?.finished || Number(result.home_score) === Number(result.away_score)) return "";
    return Number(result.home_score) > Number(result.away_score) ? ko.away : ko.home;
  }

  function getActualQualificationTeams(key) {
    const knockoutMatches = buildKnockoutMatches();
    if (key === "round32") {
      const qualified = [];
      groups.forEach((group) => {
        if (getFinishedCountForGroup(group.name) >= 6) {
          qualified.push(...getGroupStandings(group.name).slice(0, 2).map((r) => r.team));
        }
      });
      qualified.push(...getBestThirdTeams().slice(0, 8).map((r) => r.team));
      return Array.from(new Set(qualified));
    }
    const roundMap = { round16: "Sedicesimi", quarter: "Ottavi", semi: "Quarti", final: "Semifinali" };
    const roundName = roundMap[key];
    if (!roundName) return [];
    return knockoutMatches
      .filter((m) => m.round === roundName)
      .map((m) => getWinnerFromMatch(m.id))
      .filter(Boolean);
  }

  function getActualChampion() {
    return getWinnerFromMatch("ko-f") || "";
  }

  function getBonusValue(type, key, source = bonusPredictions) {
    const row = source[`${type}::${key}`];
    if (!row) return type === "qualification" ? [] : type === "group_position" ? [] : "";
    return row;
  }

  function setBonusValue(type, key, value) {
    setBonusPredictions({ ...bonusPredictions, [`${type}::${key}`]: value });
  }

  function getBonusPredictionMapForPlayer(name) {
    const map = {};
    allBonusPredictions
      .filter((p) => (p.username || p.user_email || "User") === name)
      .forEach((p) => {
        const val = p.prediction_value;
        map[`${p.prediction_type}::${p.prediction_key}`] = Array.isArray(val) ? val : val?.teams || val?.positions || val?.team || val || [];
      });
    return map;
  }

  function getBonusPointsForPlayer(name) {
    const map = getBonusPredictionMapForPlayer(name);
    let qualificationPoints = 0;
    let groupPoints = 0;

    if (leagueSettings.enable_qualification_bonus) {
      qualificationRounds.forEach((round) => {
        const predicted = map[`qualification::${round.key}`] || [];
        const actual = getActualQualificationTeams(round.key);
        const roundPoints = leagueSettings.qualification_bonus_mode === "fixed" ? Number(leagueSettings.qualification_fixed_points || 0) : Number(leagueSettings[round.pointsKey] || 0);
        qualificationPoints += predicted.filter((team) => actual.includes(team)).length * roundPoints;
      });
      const champion = map[`qualification::champion`] || "";
      if (champion && champion === getActualChampion()) qualificationPoints += Number(leagueSettings.bonus_champion_points || 0);
    }

    if (leagueSettings.enable_group_positions_bonus) {
      groups.forEach((group) => {
        const predicted = map[`group_position::${group.name}`] || [];
        if (getFinishedCountForGroup(group.name) < 6) return;
        const actual = getGroupStandings(group.name).map((r) => r.team);
        predicted.forEach((team, index) => {
          if (!team) return;
          if (team === actual[index]) groupPoints += Number(leagueSettings.bonus_group_exact_points || 0);
        });
      });
    }

    return { qualificationPoints, groupPoints, totalBonus: qualificationPoints + groupPoints };
  }

  function getBonusCellColor(type, key, team, index = null) {
    if (!team) return "rgba(255,255,255,0.06)";
    if (type === "qualification") {
      if (key === "champion") return getActualChampion() && team === getActualChampion() ? "#18c964" : "rgba(255,255,255,0.06)";
      return getActualQualificationTeams(key).includes(team) ? "#18c964" : "rgba(255,255,255,0.06)";
    }
    if (type === "group_position") {
      if (getFinishedCountForGroup(key) < 6) return "rgba(255,255,255,0.06)";
      const actual = getGroupStandings(key).map((r) => r.team);
      return team === actual[index] ? "#18c964" : "rgba(255,255,255,0.06)";
    }
    return "rgba(255,255,255,0.06)";
  }

  function getQualificationSourceTeams(roundKey) {
    if (roundKey === "round32") return allTeams;
    const prevMap = { round16: "round32", quarter: "round16", semi: "quarter", final: "semi", champion: "final" };
    const prevKey = prevMap[roundKey];
    const prevValues = getBonusValue("qualification", prevKey) || [];
    return prevValues.filter(Boolean);
  }

  function getAvailableTeamsForSelection(currentList, currentIndex, sourceTeams = allTeams) {
    const selected = (currentList || []).filter((_, i) => i !== currentIndex).filter(Boolean);
    return sourceTeams.filter((team) => !selected.includes(team));
  }

  function getRanking() {
    const ranking = {};
    const topScorerPredictions = getTopScorerPredictions();
    const finalScorer = getFinalTopScorer();

    function ensureRankingRow(name, userId = "", avatarIcon = "⚽", avatarUrl = "") {
      const safeName = name || (userId ? `User ${String(userId).slice(0, 6)}` : t.user);
      if (!ranking[safeName]) {
        ranking[safeName] = {
          name: safeName,
          user_id: userId,
          avatar_icon: avatarIcon || "⚽",
          avatar_url: avatarUrl || "",
          matchPoints: 0,
          qualificationBonus: 0,
          groupBonus: 0,
          topScorerPoints: 0,
          total: 0,
          exact: 0,
          outcome: 0,
          topScorer: topScorerPredictions[safeName] || "",
        };
      } else {
        if (avatarUrl && !ranking[safeName].avatar_url) ranking[safeName].avatar_url = avatarUrl;
        if (avatarIcon && (!ranking[safeName].avatar_icon || ranking[safeName].avatar_icon === "⚽")) ranking[safeName].avatar_icon = avatarIcon;
      }
      return ranking[safeName];
    }

    getLeagueParticipantRows().forEach((participant) => {
      ensureRankingRow(participant.name, participant.user_id, participant.avatar_icon, participant.avatar_url);
    });

    uniquePredictions().forEach((p) => {
      if (isTopScorerPrediction(p.match_id)) return;
      const name = p.username || p.user_email || "User";
      const row = ensureRankingRow(name, p.user_id);
      const real = realResults[p.match_id];
      const points = calculatePoints(p, real);

      row.matchPoints += points;

      if (real && p) {
        const ph = p.home_score;
        const pa = p.away_score;
        const rh = real.home_score;
        const ra = real.away_score;

        if (ph === rh && pa === ra) {
          row.exact += 1;
        } else {
          const predWinner = ph > pa ? "H" : ph < pa ? "A" : "D";
          const realWinner = rh > ra ? "H" : rh < ra ? "A" : "D";
          if (predWinner === realWinner) row.outcome += 1;
        }
      }
    });

    Object.entries(topScorerPredictions).forEach(([name, player]) => {
      const row = ensureRankingRow(name);
      row.topScorer = player;
    });

    getPlayersInLeague().forEach((name) => {
      ensureRankingRow(name);
    });

    Object.values(ranking).forEach((row) => {
      const bonus = getBonusPointsForPlayer(row.name);
      row.qualificationBonus = bonus.qualificationPoints;
      row.groupBonus = bonus.groupPoints;
      row.topScorerPoints = finalScorer && row.topScorer === finalScorer ? Number(leagueSettings.top_scorer_points || 0) : 0;
      row.total = row.matchPoints + row.qualificationBonus + row.groupBonus + row.topScorerPoints;
    });

    return Object.values(ranking).sort((a, b) =>
      b.total - a.total ||
      b.matchPoints - a.matchPoints ||
      b.exact - a.exact ||
      b.outcome - a.outcome ||
      a.name.localeCompare(b.name)
    );
  }

  function getGroupStandings(groupName) {
    const group = groups.find((g) => g.name === groupName);
    if (!group) return [];
    const table = {};
    group.teams.forEach((team) => table[team] = { team, points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 });
    matches.filter((m) => m.group === groupName).forEach((match) => {
      const result = realResults[match.id];
      if (!result) return;
      const home = table[match.home], away = table[match.away];
      if (!home || !away) return;
      home.played++; away.played++;
      home.gf += result.home_score; home.ga += result.away_score;
      away.gf += result.away_score; away.ga += result.home_score;
      if (result.home_score > result.away_score) { home.won++; away.lost++; home.points += 3; }
      else if (result.home_score < result.away_score) { away.won++; home.lost++; away.points += 3; }
      else { home.drawn++; away.drawn++; home.points++; away.points++; }
    });
    Object.values(table).forEach((row) => row.gd = row.gf - row.ga);
    return Object.values(table).sort((a,b) => b.points-a.points || b.gd-a.gd || b.gf-a.gf);
  }

  async function saveProfile(userData, name) {
    await supabase.from("profiles").upsert({ id: userData.id, email: userData.email, username: name || userData.email.split("@")[0], language: language || "it" });
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) { setMessage(error.message); return; }
    if (data?.username) { setPlayername(data.username); setSettingsPlayername(data.username); }
    if (data?.avatar_icon) { setAvatarIcon(data.avatar_icon); localStorage.setItem("avatarIcon", data.avatar_icon); }
    if (data?.avatar_url) { setAvatarUrl(data.avatar_url); localStorage.setItem("avatarUrl", data.avatar_url); }
    const savedLang = localStorage.getItem("lang");
    const profileLang = data?.language;
    const nextLang = savedLang || profileLang || "it";
    setLanguage(nextLang);
    localStorage.setItem("lang", nextLang);
  }

  async function updateSettings() {
    localStorage.setItem("avatarIcon", avatarIcon);
    localStorage.setItem("avatarUrl", avatarUrl || "");
    const nameToSave = settingsPlayername || username || user.email.split("@")[0];
    const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email, username: nameToSave, language, avatar_icon: avatarIcon, avatar_url: avatarUrl || null });
    if (error) { setMessage(error.message); return; }
    await supabase.from("predictions").update({ username: nameToSave, user_email: user.email }).eq("user_id", user.id);
    setPlayername(nameToSave); setSettingsPlayername(nameToSave);
    if (selectedLeague) await loadAllPredictions(selectedLeague.id);
    setMessage(`${t.settingsSaved} ✅`);
  }

  async function uploadAvatarFile(event) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) { setMessage("Carica solo file PNG o JPG"); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage("Immagine troppo grande: massimo 2 MB"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true, contentType: file.type });
    if (error) { setMessage(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || "";
    setAvatarUrl(publicUrl);
    localStorage.setItem("avatarUrl", publicUrl);
    await supabase.from("profiles").upsert({ id: user.id, email: user.email, username: settingsPlayername || username || user.email.split("@")[0], language, avatar_icon: avatarIcon, avatar_url: publicUrl });
    setMessage("Avatar aggiornato ✅");
  }

  function clearAvatarImage() {
    setAvatarUrl("");
    localStorage.removeItem("avatarUrl");
  }

  function AvatarBadge({ size = "normal", clickable = false }) {
    const cls = `avatar-badge avatar-${size} ${clickable ? "avatar-clickable" : ""}`;
    const content = avatarUrl ? <img src={avatarUrl} alt="avatar" /> : <span>{avatarIcon}</span>;
    if (clickable) return <button type="button" className={cls} onClick={() => setShowAvatarPicker(true)}>{content}</button>;
    return <span className={cls}>{content}</span>;
  }

  async function updatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) { setMessage(t.fillPasswordFields); return; }
    if (newPassword.length < 6) { setMessage(t.passwordMinLength); return; }
    if (newPassword !== confirmPassword) { setMessage(t.passwordsDoNotMatch); return; }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (loginError) { setMessage(t.currentPasswordWrong); return; }
    const { error } = await supabase.auth.updatePlayer({ password: newPassword });
    if (error) { setMessage(error.message); return; }
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setMessage(`${t.passwordUpdated} ✅`);
  }

  async function loadLeagues(userId) {
    const { data: memberships } = await supabase.from("league_members").select("*").eq("user_id", userId);
    const leagueIds = memberships?.map((m) => m.league_id) || [];
    if (leagueIds.length === 0) { setLeagues([]); return; }
    const { data: leaguesData } = await supabase.from("leagues").select("*").in("id", leagueIds);
    setLeagues(leaguesData || []);
  }

  async function loadLeagueSettings(leagueId) {
    const { data } = await supabase.from("leagues").select("*").eq("id", leagueId).single();
    if (data) {
      setLeagueSettings({
        exact_score_points: data.exact_score_points ?? 3,
        outcome_points: data.outcome_points ?? 1,
        top_scorer_points: data.top_scorer_points ?? 10,
        enable_qualification_bonus: data.enable_qualification_bonus ?? false,
        enable_group_positions_bonus: data.enable_group_positions_bonus ?? false,
        exact_score_mode: data.exact_score_mode ?? "standard",
        prediction_lock_mode: data.prediction_lock_mode ?? "match",
        qualification_bonus_mode: data.qualification_bonus_mode ?? "round",
        qualification_fixed_points: data.qualification_fixed_points ?? 3,
        exact_easy_points: data.exact_easy_points ?? 3,
        exact_medium_points: data.exact_medium_points ?? 5,
        exact_hard_points: data.exact_hard_points ?? 8,
        bonus_round32_points: data.bonus_round32_points ?? 1,
        bonus_round16_points: data.bonus_round16_points ?? 2,
        bonus_quarter_points: data.bonus_quarter_points ?? 4,
        bonus_semi_points: data.bonus_semi_points ?? 6,
        bonus_final_points: data.bonus_final_points ?? 8,
        bonus_champion_points: data.bonus_champion_points ?? 15,
        bonus_group_exact_points: data.bonus_group_exact_points ?? 3,
      });
      setIsAdmin(data.owner_id === user.id);
    }
  }

  function validateLeagueSettings() {
    const missing = {};

    const required = [
      "outcome_points",
      "top_scorer_points",
      "prediction_lock_mode",
      "exact_score_mode",
    ];

    if (leagueSettings.exact_score_mode === "bands") {
      required.push("exact_easy_points", "exact_medium_points", "exact_hard_points");
    } else {
      required.push("exact_score_points");
    }

    if (leagueSettings.enable_qualification_bonus) {
      required.push("qualification_bonus_mode", "bonus_champion_points");

      if (leagueSettings.qualification_bonus_mode === "fixed") {
        required.push("qualification_fixed_points");
      } else {
        qualificationRounds.forEach((round) => required.push(round.pointsKey));
      }
    }

    if (leagueSettings.enable_group_positions_bonus) {
      required.push("bonus_group_exact_points");
    }

    required.forEach((key) => {
      const value = leagueSettings[key];
      if (value === undefined || value === null || value === "" || Number.isNaN(value)) {
        missing[key] = true;
      }
    });

    setMissingLeagueSettingFields(missing);
    const count = Object.keys(missing).length;

    if (count > 0) {
      const text = formatText(t.configIncomplete, { count });
      setMessage(text);
      setValidationMessage(text);
      setTimeout(() => {
        const first = document.querySelector(".missing-setting-field");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return false;
    }

    setValidationMessage("");
    return true;
  }

  function missingSettingClass(key) {
    return missingLeagueSettingFields[key] ? "missing-setting-field" : "";
  }

  async function saveLeagueSettings() {
    if (!validateLeagueSettings()) return;

    const settingsToSave = { ...leagueSettings };
    // Step 20E: le email Control Room non sono più una configurazione di lega.
    // Gli accessi globali si gestiscono solo dalla tabella authorized_admins.
    delete settingsToSave.control_room_allowed_emails;

    const { error } = await supabase.from("leagues").update(settingsToSave).eq("id", selectedLeague.id);
    if (error) { setMessage(error.message); return; }
    await loadLeagueSettings(selectedLeague.id);
    setMessage(`${t.leagueSettingsSaved} ✅`);
  }

  async function loadAuthorizedAdmins() {
    setGlobalAdminsLoading(true);
    const { data, error } = await supabase
      .from("authorized_admins")
      .select("email")
      .order("email", { ascending: true });

    setGlobalAdminsLoading(false);

    if (error) {
      console.warn("Authorized admins not available:", error.message);
      return;
    }

    setGlobalAdminEmails((data || []).map((row) => String(row.email || "").trim().toLowerCase()).filter(Boolean));
  }

  async function getTableCount(tableName) {
    const { count, error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.warn(`Global dashboard count error (${tableName}):`, error.message);
      return 0;
    }

    return count || 0;
  }

  async function loadGlobalDashboardStats() {
    if (!isControlRoomOwner) return;

    setGlobalDashboardLoading(true);

    const [usersCount, leaguesCount, membersCount, predictionsCount, topScorerCount, bonusCount, adminsCount] = await Promise.all([
      getTableCount("profiles"),
      getTableCount("leagues"),
      getTableCount("league_members"),
      getTableCount("predictions"),
      getTableCount("top_scorer_predictions"),
      getTableCount("bonus_predictions"),
      getTableCount("authorized_admins"),
    ]);

    const { data: recentUsers, error: recentUsersError } = await supabase
      .from("profiles")
      .select("id, username, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentLeagues, error: recentLeaguesError } = await supabase
      .from("leagues")
      .select("id, name, code, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentUsersError) console.warn("Recent users not available:", recentUsersError.message);
    if (recentLeaguesError) console.warn("Recent leagues not available:", recentLeaguesError.message);

    setGlobalDashboardStats({
      users: usersCount,
      leagues: leaguesCount,
      leagueMembers: membersCount,
      predictions: predictionsCount,
      topScorerPredictions: topScorerCount,
      bonusPredictions: bonusCount,
      authorizedAdmins: adminsCount,
      recentUsers: recentUsers || [],
      recentLeagues: recentLeagues || [],
    });

    setGlobalDashboardLoading(false);
  }

  function formatGlobalDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function isEmailGlobalAdmin(email) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return false;
    return cleanEmail === GLOBAL_CONTROL_ROOM_EMAIL || normalizedGlobalAdminEmails.includes(cleanEmail);
  }

  async function loadGlobalUsers(searchValue = globalUsersSearch) {
    if (!isControlRoomOwner) return;

    const cleanSearch = String(searchValue || "").trim();
    setGlobalUsersLoading(true);

    try {
      const pageSize = 1000;
      let page = 0;
      let profilesList = [];
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("profiles")
          .select("id, username, email, created_at")
          .order("created_at", { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize - 1);

        if (cleanSearch) {
          const safeSearch = cleanSearch.replace(/[%,()]/g, "");
          query = query.or(`username.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = data || [];
        profilesList = [...profilesList, ...rows];
        hasMore = rows.length === pageSize;
        page += 1;
      }

      const userIds = profilesList.map((profile) => profile.id).filter(Boolean);
      let membershipsByUser = {};

      if (userIds.length > 0) {
        const membershipRows = [];
        for (let i = 0; i < userIds.length; i += 200) {
          const chunk = userIds.slice(i, i + 200);
          const { data, error } = await supabase
            .from("league_members")
            .select("user_id, role, league_id")
            .in("user_id", chunk);

          if (error) {
            console.warn("Global users memberships not available:", error.message);
          } else {
            membershipRows.push(...(data || []));
          }
        }

        const leagueIds = [...new Set(membershipRows.map((item) => item.league_id).filter(Boolean))];
        const leaguesById = {};

        if (leagueIds.length > 0) {
          for (let i = 0; i < leagueIds.length; i += 200) {
            const chunk = leagueIds.slice(i, i + 200);
            const { data, error } = await supabase
              .from("leagues")
              .select("id, name, code")
              .in("id", chunk);

            if (error) {
              console.warn("Global users leagues not available:", error.message);
            } else {
              (data || []).forEach((league) => {
                leaguesById[league.id] = league;
              });
            }
          }
        }

        membershipsByUser = membershipRows.reduce((acc, item) => {
          const league = leaguesById[item.league_id];
          const leagueName = league?.name || item.league_id || "Lega";
          const leagueCode = league?.code ? ` (${league.code})` : "";
          const roleText = item.role ? ` - ${item.role}` : "";
          const label = `${leagueName}${leagueCode}${roleText}`;
          acc[item.user_id] = [...(acc[item.user_id] || []), label];
          return acc;
        }, {});
      }

      setGlobalUsers(profilesList.map((profile) => ({
        ...profile,
        email: String(profile.email || "").trim().toLowerCase(),
        memberships: membershipsByUser[profile.id] || [],
      })));
    } catch (error) {
      console.warn("Global users loading failed:", error.message);
      setMessage(error.message);
    } finally {
      setGlobalUsersLoading(false);
    }
  }

  async function authorizeProfileAsGlobalAdmin(email) {
    if (!isControlRoomOwner) {
      setMessage("Solo il Super Admin può autorizzare altri Global Admin.");
      return;
    }

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMessage("Email utente non valida.");
      return;
    }

    const { error } = await supabase
      .from("authorized_admins")
      .upsert({ email: cleanEmail }, { onConflict: "email" });

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAuthorizedAdmins();
    await loadGlobalDashboardStats();
    setMessage(`Global Admin autorizzato: ${cleanEmail} ✅`);
  }

  async function removeProfileGlobalAdmin(email) {
    if (!isControlRoomOwner) {
      setMessage("Solo il Super Admin può rimuovere Global Admin.");
      return;
    }

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (cleanEmail === GLOBAL_CONTROL_ROOM_EMAIL) {
      setMessage("Questa email è il proprietario principale e non può essere rimossa dall'app.");
      return;
    }

    await removeGlobalAdminEmail(cleanEmail);
    await loadGlobalDashboardStats();
  }

  async function deleteGlobalUserComplete(profile) {
    if (!isControlRoomOwner) {
      setMessage("Solo il Super Admin può cancellare utenti.");
      return;
    }

    const targetUserId = profile?.id;
    const targetEmail = String(profile?.email || "").trim().toLowerCase();

    if (!targetUserId || !targetEmail) {
      setMessage("Utente non valido.");
      return;
    }

    if (targetEmail === GLOBAL_CONTROL_ROOM_EMAIL || targetUserId === user?.id) {
      setMessage("Questo account è protetto e non può essere cancellato dall'app.");
      return;
    }

    const typedEmail = window.prompt(`Per cancellare definitivamente questo utente e tutti i suoi dati, riscrivi la sua email:

${targetEmail}`);
    if (String(typedEmail || "").trim().toLowerCase() !== targetEmail) {
      setMessage("Cancellazione annullata: email non confermata.");
      return;
    }

    setDeleteUserLoadingId(targetUserId);
    const { data, error } = await supabase.functions.invoke("delete-user-complete", {
      body: { user_id: targetUserId, email: targetEmail },
    });
    setDeleteUserLoadingId(null);

    if (error) {
      setMessage(error.message || "Errore durante la cancellazione utente.");
      return;
    }

    if (data?.error) {
      setMessage(data.error);
      return;
    }

    await loadAuthorizedAdmins();
    await loadGlobalDashboardStats();
    await loadGlobalUsers(globalUsersSearch);
    setMessage(`Utente cancellato definitivamente: ${targetEmail} ✅`);
  }

  async function addGlobalAdminEmail() {
    if (!isControlRoomOwner) {
      setMessage("Solo il Super Admin può autorizzare altri Global Admin.");
      return;
    }

    const cleanEmail = String(newGlobalAdminEmail || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMessage("Inserisci una email valida.");
      return;
    }

    const { error } = await supabase
      .from("authorized_admins")
      .upsert({ email: cleanEmail }, { onConflict: "email" });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewGlobalAdminEmail("");
    await loadAuthorizedAdmins();
    await loadGlobalDashboardStats();
    await loadGlobalUsers();
    setMessage(`Global Admin autorizzato: ${cleanEmail} ✅`);
  }

  async function removeGlobalAdminEmail(emailToRemove) {
    if (!isControlRoomOwner) {
      setMessage("Solo il Super Admin può rimuovere Global Admin.");
      return;
    }

    const cleanEmail = String(emailToRemove || "").trim().toLowerCase();
    if (!cleanEmail) return;

    if (cleanEmail === GLOBAL_CONTROL_ROOM_EMAIL) {
      setMessage("Questa email è il proprietario principale e non può essere rimossa dall'app.");
      return;
    }

    const ok = window.confirm(`Vuoi rimuovere ${cleanEmail} dagli Admin Globali?`);
    if (!ok) return;

    const { error } = await supabase
      .from("authorized_admins")
      .delete()
      .eq("email", cleanEmail);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAuthorizedAdmins();
    await loadGlobalDashboardStats();
    await loadGlobalUsers();
    setMessage(`Global Admin rimosso: ${cleanEmail} ✅`);
  }

  function openGlobalControlRoom() {
    setSelectedLeague({
      id: "GLOBAL_CONTROL_ROOM",
      name: "Global Control Room",
      code: "GLOBAL",
      owner_id: user?.id,
      __global: true,
    });
    setActiveTab("admin");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadPredictions(userId, leagueId = selectedLeague?.id) {
    let query = supabase.from("predictions").select("*").eq("user_id", userId);
    if (leagueId) query = query.eq("league_id", leagueId);
    const { data, error } = await query;
    if (error) { setMessage(error.message); return; }

    const formatted = {};
    data?.filter((p) => !isTopScorerPrediction(p.match_id)).forEach((p) => {
      formatted[p.match_id] = { home_score: p.home_score, away_score: p.away_score };
    });
    setPredictions(formatted);

    // Il capocannoniere viene caricato da loadTopScorerPrediction(),
    // così non resta più bloccato su vecchie scelte salvate nella tabella predictions.
  }

  async function loadAllPredictions(leagueId) {
    if (!leagueId) return;
    const { data } = await supabase.from("predictions").select("*").eq("league_id", leagueId);
    setAllPredictions(data || []);
  }

  async function loadLeagueParticipants(leagueId) {
    if (!leagueId) {
      setLeagueParticipants([]);
      return;
    }

    const { data: members, error } = await supabase
      .from("league_members")
      .select("user_id, role")
      .eq("league_id", leagueId);

    if (error || !members?.length) {
      setLeagueParticipants([]);
      return;
    }

    const ids = members.map((member) => member.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_icon, avatar_url")
      .in("id", ids);

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

    setLeagueParticipants(
      members.map((member) => {
        const profile = profileMap.get(member.user_id);
        return {
          user_id: member.user_id,
          role: member.role,
          name: profile?.username || profile?.email || `User ${String(member.user_id || "").slice(0, 6)}`,
          email: profile?.email || "",
          avatar_icon: profile?.avatar_icon || "⚽",
          avatar_url: profile?.avatar_url || "",
        };
      })
    );
  }

  async function loadTopScorerPrediction(userId, leagueId) {
    if (!userId || !leagueId) return;
    const { data, error } = await supabase
      .from("top_scorer_predictions")
      .select("player")
      .eq("user_id", userId)
      .eq("league_id", leagueId)
      .maybeSingle();

    if (!error && data?.player) {
      setSelectedTopScorer(data.player);
      return;
    }

    // Non usiamo più le vecchie righe in predictions: evitano duplicati e valori fissi.
    setSelectedTopScorer("");
  }

  async function loadAllTopScorerPredictions(leagueId) {
    if (!leagueId) return;
    const { data, error } = await supabase
      .from("top_scorer_predictions")
      .select("*")
      .eq("league_id", leagueId);

    if (!error) {
      setAllTopScorerPredictions(data || []);
      return;
    }

    // Se la tabella non esiste ancora, l'app resta funzionante usando il vecchio fallback.
    setAllTopScorerPredictions([]);
  }


  async function loadBonusPredictions(userId, leagueId) {
    if (!userId || !leagueId) return;
    const { data, error } = await supabase
      .from("bonus_predictions")
      .select("*")
      .eq("user_id", userId)
      .eq("league_id", leagueId);
    if (error) { setBonusPredictions({}); return; }
    const formatted = {};
    data?.forEach((row) => {
      const val = row.prediction_value;
      formatted[`${row.prediction_type}::${row.prediction_key}`] = Array.isArray(val) ? val : val?.teams || val?.positions || val?.team || val || [];
    });
    setBonusPredictions(formatted);
  }

  async function loadAllBonusPredictions(leagueId) {
    if (!leagueId) return;
    const { data, error } = await supabase.from("bonus_predictions").select("*").eq("league_id", leagueId);
    if (!error) setAllBonusPredictions(data || []);
  }

  async function syncLiveResults(silent = false, liveMode = hasLiveMatches) {
    // STEP 25C: il pulsante non chiama più API-Football.
    // Serve solo ad aggiornare i dati locali salvati in Supabase dalla Control Room.
    setLiveSyncMode(liveMode ? "live" : "idle");
    setNextLiveSyncAt(null);
    await loadRealResults(true);
    await loadMatchEvents(true);
    setLiveSyncStatus("Dati aggiornati da Supabase locale ✅");
    if (!silent) setMessage("Dati locali Supabase aggiornati ✅");
  }

  async function loadRealResults(silent = false) {
    const { data, error } = await supabase.from("real_results").select("*");
    if (error) {
      if (!silent) setMessage(error.message);
      return;
    }
    const formatted = {};
    data?.forEach((r) => formatted[r.match_id] = r);
    setRealResults(formatted);
    setLastLiveSync(new Date());
  }

  async function loadMatchEvents(silent = false) {
    const { data, error } = await supabase
      .from("match_events")
      .select("*")
      .order("elapsed", { ascending: true })
      .order("event_key", { ascending: true });

    if (error) {
      // Se la tabella non è ancora stata creata, l'app resta funzionante.
      if (!silent && !String(error.message || "").includes("match_events")) {
        setMessage(error.message);
      }
      setMatchEvents({});
      return;
    }

    const formatted = {};
    data?.forEach((event) => {
      if (!formatted[event.match_id]) formatted[event.match_id] = [];
      formatted[event.match_id].push(event);
    });
    setMatchEvents(formatted);
  }

  async function saveRealResult(matchId, home, away, finished = true) {
    if (home === "" || away === "") { setMessage(t.enterRealResult); return; }
    const homeScore = Number(home);
    const awayScore = Number(away);
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20) {
      setMessage(t.enterRealResult);
      return;
    }
    const { error } = await supabase.from("real_results").upsert(
      { match_id: matchId, home_score: homeScore, away_score: awayScore, finished },
      { onConflict: "match_id" }
    );
    if (error) { setMessage(error.message); return; }
    await loadRealResults();
    await loadMatchEvents(true);
    if (selectedLeague?.id && !selectedLeague?.__global) {
      await loadAllPredictions(selectedLeague.id);
      await loadAllBonusPredictions(selectedLeague.id);
      await loadAllTopScorerPredictions(selectedLeague.id);
    }
    setMessage(finished ? `${t.resultConfirmed} ✅` : `${t.liveResultSaved} 🔵`);
  }

  async function recalculateLeagueData() {
    await loadRealResults();
    await loadMatchEvents(true);
    if (selectedLeague?.id && !selectedLeague?.__global) {
      await loadAllPredictions(selectedLeague.id);
      await loadAllBonusPredictions(selectedLeague.id);
      await loadAllTopScorerPredictions(selectedLeague.id);
      await loadLeagueSettings(selectedLeague.id);
    }
    setMessage("Classifica ricalcolata ✅");
  }


  async function checkPlayer() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Session restore error:", error.message);
      return;
    }

    const currentUser = data.session?.user || null;
    if (currentUser) {
      setPlayer(currentUser);
      await loadProfile(currentUser.id);
      loadLeagues(currentUser.id);
      loadPredictions(currentUser.id);
      loadAuthorizedAdmins();
    } else {
      setPlayer(null);
    }
  }

  async function signUp() {
    if (!username) { setMessage(t.enterPlayername); return; }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setMessage(error.message); return; }
    if (data.user) await saveProfile(data.user, username);
    setMessage(`${t.registrationCompleted} ✅`);
  }

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); return; }
    setPlayer(data.user); await loadProfile(data.user.id); loadLeagues(data.user.id); loadPredictions(data.user.id);
    setMessage(`${t.loginCompleted} ⚽`);
  }

  async function resetPassword() {
    if (!email) { setMessage(t.enterEmailForReset || t.enterEmailForReset); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });
    if (error) { setMessage(error.message); return; }
    setMessage(t.passwordResetSent || "Email recupero password inviata ✅");
  }

  async function submitResetPassword() {
    if (!resetNewPassword || !resetConfirmPassword) { setMessage(t.fillPasswordFields || "Compila nuova password e conferma"); return; }
    if (resetNewPassword.length < 6) { setMessage(t.passwordMinLength || "La nuova password deve avere almeno 6 caratteri"); return; }
    if (resetNewPassword !== resetConfirmPassword) { setMessage(t.passwordsDoNotMatch || "Le nuove password non coincidono"); return; }
    const { error } = await supabase.auth.updatePlayer({ password: resetNewPassword });
    if (error) { setMessage(error.message); return; }
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetMode(false);
    window.history.replaceState({}, document.title, window.location.origin);
    await supabase.auth.signOut();
    setPlayer(null);
    setMessage(t.passwordUpdatedLoginAgain || "Password aggiornata ✅ Ora effettua il login con la nuova password.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setPlayer(null); setSelectedLeague(null); setLeagues([]); setLeagueParticipants([]); setPlayername(""); setSettingsPlayername("");
  }

  async function createLeague() {
    if (!leagueName) { setMessage(t.enterLeagueName); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { data, error } = await supabase.from("leagues").insert({ name: leagueName, code, owner_id: user.id, exact_score_points: 3, outcome_points: 1, top_scorer_points: 10, prediction_lock_mode: "match", qualification_bonus_mode: "round", qualification_fixed_points: 3, enable_qualification_bonus: false, enable_group_positions_bonus: false }).select().single();
    if (error) { setMessage(error.message); return; }
    await supabase.from("league_members").insert({ league_id: data.id, user_id: user.id, role: "admin" });
    setLeagueName(""); loadLeagues(user.id); setMessage(`${t.leagueCreated} ✅ ${t.code}: ${code}`);
  }

  async function joinLeague() {
    const { data: league, error } = await supabase.from("leagues").select("*").eq("code", joinCode).single();
    if (error || !league) { setMessage(t.codeNotFound); return; }
    await supabase.from("league_members").insert({ league_id: league.id, user_id: user.id, role: "member" });
    setJoinCode(""); loadLeagues(user.id); loadLeagueParticipants(league.id); setMessage(`${t.joinedLeague} ✅`);
  }


  async function renameLeague(leagueId) {
    if (!editingLeagueName.trim()) { setMessage(t.enterNewLeagueName); return; }
    const { error } = await supabase.from("leagues").update({ name: editingLeagueName.trim() }).eq("id", leagueId).eq("owner_id", user.id);
    if (error) { setMessage(error.message); return; }
    setEditingLeagueId(null); setEditingLeagueName("");
    await loadLeagues(user.id);
    setMessage(`${t.leagueNameUpdated} ✅`);
  }

  async function deleteLeague(league) {
    const isOwner = league.owner_id === user.id;
    const ok = window.confirm(isOwner ? `Sei sicuro di voler cancellare definitivamente la lega "${league.name}"?\nQuesta azione non può essere annullata.` : `${t.confirmLeaveLeague} "${league.name}"?`);
    if (!ok) return;

    if (isOwner) {
      await supabase.from("predictions").delete().eq("league_id", league.id);
      await supabase.from("league_members").delete().eq("league_id", league.id);
      const { error } = await supabase.from("leagues").delete().eq("id", league.id).eq("owner_id", user.id);
      if (error) { setMessage(error.message); return; }
      setMessage(`${t.leagueDeleted} ✅`);
    } else {
      const { error } = await supabase.from("league_members").delete().eq("league_id", league.id).eq("user_id", user.id);
      if (error) { setMessage(error.message); return; }
      setMessage(`${t.leftLeague} ✅`);
    }
    await loadLeagues(user.id);
  }

  function openLeague(league) {
    setSelectedLeague(league);
    setActiveTab("home");
    loadAllPredictions(league.id);
    loadLeagueParticipants(league.id);
    loadAllTopScorerPredictions(league.id);
    loadAllBonusPredictions(league.id);
    loadLeagueSettings(league.id);
    if (user?.id) {
      loadPredictions(user.id, league.id);
      loadTopScorerPrediction(user.id, league.id);
      loadBonusPredictions(user.id, league.id);
    }
  }

  function normalizeScoreInput(value) {
    if (value === "") return "";
    const n = Math.max(0, Math.min(20, Number(value)));
    return Number.isNaN(n) ? "" : n;
  }

  function updatePrediction(matchId, field, value) {
    setPredictions({ ...predictions, [matchId]: { ...predictions[matchId], [field]: normalizeScoreInput(value) } });
    setMissingPredictionFields((prev) => {
      const next = { ...prev };
      delete next[`${matchId}::${field}`];
      return next;
    });
  }

  function showValidationMessage(text) {
    setMessage(text);
    setValidationMessage(text);
    setTimeout(() => {
      const first = document.querySelector(".missing-prediction-field, .missing-bonus-field");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  function validateMatchPredictions(matchList = matches) {
    const mode = leagueSettings.prediction_lock_mode || "match";
    let validationList = matchList;

    const shouldRequireComplete =
      mode === "tournament" ||
      ((mode === "stage" || mode === "stage_round") && activeTab === "partite") ||
      (mode === "stage_round" && activeTab === "eliminazione");

    if (mode === "stage_round" && activeTab === "eliminazione") {
      const currentRound = getCurrentKnockoutRoundForValidation(matchList);
      validationList = currentRound
        ? matchList.filter((match) => match.round === currentRound)
        : [];
    }

    if (!shouldRequireComplete || validationList.length === 0) {
      setMissingPredictionFields({});
      setValidationMessage("");
      return true;
    }

    const missing = {};
    validationList.forEach((match) => {
      if (isPredictionLocked(match)) return;
      const p = predictions[match.id] || {};
      if (p.home_score === undefined || p.home_score === "") missing[`${match.id}::home_score`] = true;
      if (p.away_score === undefined || p.away_score === "") missing[`${match.id}::away_score`] = true;
    });

    setMissingPredictionFields(missing);
    const count = Object.keys(missing).length;

    if (count > 0) {
      const text = formatText(t.validationMissingResults, { count });
      setMessage(text);
      setValidationMessage(text);

      setTimeout(() => {
        const first = document.querySelector(".missing-prediction-field");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);

      return false;
    }

    setValidationMessage("");
    return true;
  }

  function missingPredictionClass(matchId, field) {
    return missingPredictionFields[`${matchId}::${field}`] ? "missing-prediction-field" : "";
  }

  function getExpectedBonusFieldsForTab() {
    const expected = [];
    if (activeTab === "passaggio-turno" && leagueSettings.enable_qualification_bonus) {
      qualificationRounds.forEach((round) => {
        for (let index = 0; index < round.count; index += 1) {
          expected.push({ type: "qualification", key: round.key, index });
        }
      });
      expected.push({ type: "qualification", key: "champion", index: "single" });
    }

    if (activeTab === "piazzamento-gironi" && leagueSettings.enable_group_positions_bonus) {
      groups.forEach((group) => {
        for (let index = 0; index < 4; index += 1) {
          expected.push({ type: "group_position", key: group.name, index });
        }
      });
    }

    return expected;
  }

  function validateBonusPredictions() {
    const expected = getExpectedBonusFieldsForTab();
    const missing = {};

    expected.forEach((field) => {
      const value = getBonusValue(field.type, field.key);
      const empty = field.index === "single"
        ? !value
        : !Array.isArray(value) || !value[field.index];

      if (empty) missing[`${field.type}::${field.key}::${field.index}`] = true;
    });

    setMissingBonusFields(missing);
    const count = Object.keys(missing).length;
    if (count > 0) {
      showValidationMessage(formatText(t.validationMissingFields, { count }));
      return false;
    }

    setValidationMessage("");
    return true;
  }

  function missingBonusClass(type, key, index = "single") {
    return missingBonusFields[`${type}::${key}::${index}`] ? "missing-bonus-field" : "";
  }

  function clearMatchPredictions(matchList) {
    if (!window.confirm(t.confirmClearPage)) return;
    const next = { ...predictions };
    matchList.forEach((match) => { if (!isPredictionLocked(match)) delete next[match.id]; });
    setPredictions(next);
    setMissingPredictionFields({});
    setValidationMessage("");
  }

  async function clearBonusSection(type) {
    if (isTournamentStarted()) { setMessage(`${t.predictionsLockedTournamentStarted} 🔒`); return; }
    if (!window.confirm(t.confirmClearPage)) return;
    const next = { ...bonusPredictions };
    Object.keys(next).forEach((key) => { if (key.startsWith(`${type}::`)) delete next[key]; });
    setBonusPredictions(next);
    setMissingBonusFields({});
    setValidationMessage("");

    if (selectedLeague?.id && !selectedLeague?.__global && user?.id) {
      const { error } = await supabase
        .from("bonus_predictions")
        .delete()
        .eq("user_id", user.id)
        .eq("league_id", selectedLeague.id)
        .eq("prediction_type", type);

      if (error) {
        setMessage(`${t.deleteError}: ${error.message}`);
        return;
      }

      await loadBonusPredictions(user.id, selectedLeague.id);
      await loadAllBonusPredictions(selectedLeague.id);
    }

    setMessage(`${t.predictionsDeleted} ✅`);
  }

  function clearTopScorerPredictionLocal() {
    if (isTournamentStarted()) { setMessage(t.topScorerPredictionLocked); return; }
    if (!window.confirm(t.confirmClearTopScorer || "Vuoi cancellare il pronostico capocannoniere?")) return;
    setSelectedTopScorer("");
  }

  async function saveAllPredictions(matchList = matches) {
    if (!validateMatchPredictions(matchList)) return;
    const rows = matchList.filter((match) => {
      const p = predictions[match.id];
      return p && p.home_score !== undefined && p.home_score !== "" && p.away_score !== undefined && p.away_score !== "" && !isPredictionLocked(match);
    }).map((match) => {
      const p = predictions[match.id];
      return { user_id: user.id, username: username || user.email.split("@")[0], user_email: user.email, league_id: selectedLeague.id, match_id: match.id, home_score: Number(p.home_score), away_score: Number(p.away_score), points: 0 };
    });
    if (rows.length === 0) { setMessage(t.enterAtLeastOnePrediction); return; }
    const { error } = await supabase.from("predictions").upsert(rows, { onConflict: "user_id,league_id,match_id" });
    if (error) { setMessage(error.message); return; }
    loadPredictions(user.id, selectedLeague.id); loadAllPredictions(selectedLeague.id); setMessage(`${t.predictionsSaved} ✅`);
  }


  async function saveBonusPredictions() {
    if (isTournamentStarted()) { setMessage(`${t.predictionsLockedTournamentStarted} 🔒`); return; }
    if (!selectedLeague?.id || selectedLeague?.__global || !user?.id) return;
    if ((activeTab === "passaggio-turno" || activeTab === "piazzamento-gironi") && !validateBonusPredictions()) return;
    const rows = [];
    Object.entries(bonusPredictions).forEach(([compoundKey, value]) => {
      const [prediction_type, prediction_key] = compoundKey.split("::");
      if (!prediction_type || !prediction_key) return;
      const cleanValue = Array.isArray(value) ? value.filter(Boolean) : value;
      if (Array.isArray(cleanValue) && cleanValue.length === 0) return;
      if (!Array.isArray(cleanValue) && !cleanValue) return;
      rows.push({
        user_id: user.id,
        league_id: selectedLeague.id,
        username: username || user.email.split("@")[0],
        user_email: user.email,
        prediction_type,
        prediction_key,
        prediction_value: cleanValue,
        updated_at: new Date().toISOString(),
      });
    });
    if (rows.length === 0) { setMessage(t.enterAtLeastOnePrediction); return; }
    const { error } = await supabase
      .from("bonus_predictions")
      .upsert(rows, { onConflict: "user_id,league_id,prediction_type,prediction_key" });
    if (error) { setMessage(`${error.message} - Esegui prima bonus_predictions_fixed.sql in Supabase.`); return; }
    await loadBonusPredictions(user.id, selectedLeague.id);
    await loadAllBonusPredictions(selectedLeague.id);
    setMessage(`${t.predictionsSaved} ✅`);
  }

  async function saveTopScorerPrediction() {
    if (isTournamentStarted()) { setMessage(t.topScorerPredictionLocked); return; }
    if (!selectedTopScorer) { setMessage(t.selectPlayerMessage); return; }
    if (!selectedLeague?.id || selectedLeague?.__global || !user?.id) { setMessage(t.selectPlayerMessage); return; }

    const payload = {
      user_id: user.id,
      league_id: selectedLeague.id,
      username: username || user.email.split("@")[0],
      user_email: user.email,
      player: selectedTopScorer,
      updated_at: new Date().toISOString(),
    };

    // Sistema corretto: una sola riga per utente e lega.
    // Questo elimina definitivamente il problema del valore fisso su Messi/Wirtz
    // e l'errore duplicate key della tabella predictions.
    const { error } = await supabase
      .from("top_scorer_predictions")
      .upsert(payload, { onConflict: "user_id,league_id" });

    if (error) {
      setMessage(`${error.message} - Esegui prima il file SQL top_scorer_predictions.sql in Supabase.`);
      return;
    }

    // Pulizia opzionale delle vecchie scelte salvate nel sistema precedente.
    await supabase
      .from("predictions")
      .delete()
      .eq("league_id", selectedLeague.id)
      .eq("user_id", user.id)
      .like("match_id", `${topScorerPredictionPrefix}%`);

    await loadTopScorerPrediction(user.id, selectedLeague.id);
    await loadAllTopScorerPredictions(selectedLeague.id);
    await loadAllPredictions(selectedLeague.id);
    setMessage(`${t.predictionsSaved} ✅`);
  }

  async function saveFinalTopScorer() {
    if (!finalTopScorer) { setMessage(t.selectPlayerMessage); return; }
    const prefix = topScorerFinalPrefix();
    await supabase.from("real_results").delete().like("match_id", `${prefix}%`);
    const { error } = await supabase.from("real_results").insert({
      match_id: `${prefix}${encodeTopScorer(finalTopScorer)}`,
      home_score: 0,
      away_score: 0,
      finished: true,
    });
    if (error) { setMessage(error.message); return; }
    await loadRealResults();
    await loadAllPredictions(selectedLeague.id);
    setMessage(`${t.resultConfirmed}: ${finalTopScorer} ✅`);
  }

  async function saveTopScorerGoals() {
    if (!topScorerGoalsPlayer) { setMessage(t.selectPlayerMessage); return; }
    if (topScorerGoals === "" || Number(topScorerGoals) < 0) { setMessage(t.enterRealResult); return; }
    const prefix = topScorerGoalsPrefix();
    const { error } = await supabase.from("real_results").upsert(
      {
        match_id: `${prefix}${encodeTopScorer(topScorerGoalsPlayer)}`,
        home_score: Number(topScorerGoals),
        away_score: 0,
        finished: false,
      },
      { onConflict: "match_id" }
    );
    if (error) { setMessage(error.message); return; }
    await loadRealResults();
    setMessage(`${t.liveResultSaved}: ${topScorerGoalsPlayer} (${topScorerGoals}) 🔵`);
  }

  if (resetMode) {
    return (
      <div className="page"><div className="card">
        <img src={logo} alt="logo" className="logo" />
        <h1 className="app-title small-title">{t.resetPasswordTitle || "Reset Password"}</h1>
        <p className="bonus-help">{t.resetPasswordHelp || t.resetPasswordHelp}</p>
        <input type="password" placeholder={t.newPassword} value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} />
        <input type="password" placeholder={t.confirmPassword} value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} />
        <button onClick={submitResetPassword} className="btn blue">{t.updatePassword}</button>
        <button type="button" onClick={() => { setResetMode(false); window.history.replaceState({}, document.title, window.location.origin); }} className="btn">{t.cancel}</button>
        <p>{message}</p>
      </div></div>
    );
  }

  if (!user) {
    return (
      <div className="page"><div className="card">
        <img src={logo} alt="logo" className="logo" />
        <h1 className="app-title login-title">{t.appTitle}</h1>
        <input placeholder={t.username} value={username} onChange={(e) => setPlayername(e.target.value)} />
        <input placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={signUp} className="btn green">{t.register}</button>
        <button onClick={signIn} className="btn blue">{t.login}</button>
        <button type="button" onClick={resetPassword} className="link-button">{t.forgotPassword || "Hai dimenticato la password?"}</button>
        <p>{message}</p>
      </div></div>
    );
  }


  function getCompletedUserCountFromRows(rows, predicate) {
    const names = new Set();
    rows.forEach((row) => {
      if (predicate(row)) names.add(row.username || row.user_email || "User");
    });
    return names.size;
  }

  function getLeagueDashboardStats(rankingRows = []) {
    const totalParticipants = getPlayersInLeague().length;

    const matchRows = uniquePredictions().filter((p) => !isTopScorerPrediction(p.match_id));
    const matchPredUsers = getCompletedUserCountFromRows(matchRows, (p) =>
      p.home_score !== undefined && p.home_score !== "" &&
      p.away_score !== undefined && p.away_score !== ""
    );

    const topScorerUsers = getCompletedUserCountFromRows(allTopScorerPredictions, (p) => !!p.player);

    const qualifiedUsers = getCompletedUserCountFromRows(allBonusPredictions, (p) =>
      p.prediction_type === "qualification"
    );

    const groupRankingUsers = getCompletedUserCountFromRows(allBonusPredictions, (p) =>
      p.prediction_type === "group_position"
    );

    return {
      totalParticipants,
      matchPredUsers,
      topScorerUsers,
      qualifiedUsers,
      groupRankingUsers,
      topFive: rankingRows.slice(0, 5),
    };
  }


  function countValues(values = []) {
    const counts = {};
    values.filter(Boolean).forEach((value) => {
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function getLeagueStatistics(rankingRows = []) {
    const totalParticipants = getPlayersInLeague().length;
    const participantRows = getLeagueParticipantRows();

    const completedAllCount = participantRows.filter((participant) => {
      const status = getParticipantCompletionStatus(participant);
      return status.hasMatchPredictions &&
        status.hasGoldenBoot &&
        (!leagueSettings.enable_qualification_bonus || status.hasQualified) &&
        (!leagueSettings.enable_group_positions_bonus || status.hasGroupRanking);
    }).length;

    const completionRate = totalParticipants ? Math.round((completedAllCount / totalParticipants) * 100) : 0;

    const topScorerChoices = countValues(
      allTopScorerPredictions.map((row) => row.player)
    );

    const championChoices = countValues(
      allBonusPredictions
        .filter((row) => row.prediction_type === "qualification" && row.prediction_key === "champion")
        .map((row) => {
          const val = row.prediction_value;
          return Array.isArray(val) ? val[0] : val?.team || val?.value || val;
        })
    );

    const qualifiedChoices = [];
    allBonusPredictions
      .filter((row) => row.prediction_type === "qualification" && row.prediction_key !== "champion")
      .forEach((row) => {
        const val = row.prediction_value;
        if (Array.isArray(val)) qualifiedChoices.push(...val);
        else if (Array.isArray(val?.teams)) qualifiedChoices.push(...val.teams);
      });

    const topQualifiedChoices = countValues(qualifiedChoices);

    const leader = rankingRows[0] || null;
    const exactLeader = [...rankingRows].sort((a, b) => (b.exact || 0) - (a.exact || 0))[0] || null;
    const qualificationLeader = [...rankingRows].sort((a, b) => (b.qualificationBonus || 0) - (a.qualificationBonus || 0))[0] || null;
    const groupLeader = [...rankingRows].sort((a, b) => (b.groupBonus || 0) - (a.groupBonus || 0))[0] || null;

    return {
      totalParticipants,
      completedAllCount,
      completionRate,
      topScorerChoices,
      championChoices,
      topQualifiedChoices,
      leader,
      exactLeader,
      qualificationLeader,
      groupLeader,
    };
  }

  function getNextDeadlineInfo(nextMatch, tournamentStart) {
    const mode = leagueSettings.prediction_lock_mode || "match";

    if (mode === "tournament") {
      return {
        title: t.firstTournamentMatch || "Prima partita del torneo",
        date: tournamentStart,
        description: t.lockModeTournament,
      };
    }

    if (mode === "stage" || mode === "stage_round") {
      const knockoutMatches = buildKnockoutMatches();
      const nextKnockoutRound = getCurrentKnockoutRoundForValidation(knockoutMatches);
      const nextKnockoutDate = nextKnockoutRound ? getRoundStartDate(nextKnockoutRound) : null;
      const tournamentDate = tournamentStart;

      if (tournamentDate && new Date() < new Date(tournamentDate)) {
        return {
          title: t.groupPredictions,
          date: tournamentDate,
          description: mode === "stage_round" ? t.lockModeStageRound : t.lockModeStage,
        };
      }

      if (nextKnockoutDate) {
        return {
          title: nextKnockoutRound ? trRoundName(nextKnockoutRound) : t.knockoutPredictions,
          date: nextKnockoutDate,
          description: t.knockoutPredictions,
        };
      }
    }

    return {
      title: nextMatch ? `${trTeamLabel(nextMatch.home)} - ${trTeamLabel(nextMatch.away)}` : t.noDeadline,
      date: nextMatch?.kickoff || null,
      description: t.lockModeMatch,
    };
  }

  function getSmartNotifications(knockoutMatches = [], nextDeadline = null) {
    const notifications = [];
    const allPredictionMatches = [...matches, ...knockoutMatches];

    const editableMatches = allPredictionMatches.filter((match) => !isPredictionLocked(match));
    const missingMatches = editableMatches.filter((match) => {
      const p = predictions[match.id] || {};
      return p.home_score === undefined || p.home_score === "" || p.away_score === undefined || p.away_score === "";
    });

    if (missingMatches.length > 0) {
      notifications.push({
        type: "warning",
        icon: "⚽",
        text: formatText(t.missingMatchPredictions, { count: missingMatches.length }),
        tab: "partite",
      });
    }

    if (!selectedTopScorer) {
      notifications.push({
        type: "warning",
        icon: "🥾",
        text: t.missingGoldenBoot,
        tab: "capocannoniere",
      });
    }

    if (leagueSettings.enable_qualification_bonus) {
      const expected = qualificationRounds.reduce((sum, round) => sum + round.count, 0) + 1;
      const completed = qualificationRounds.reduce((sum, round) => {
        const value = getBonusValue("qualification", round.key);
        return sum + (Array.isArray(value) ? value.filter(Boolean).length : 0);
      }, getBonusValue("qualification", "champion") ? 1 : 0);

      if (completed < expected) {
        notifications.push({
          type: "warning",
          icon: "✅",
          text: t.missingQualifiedPredictions,
          tab: "passaggio-turno",
        });
      }
    }

    if (leagueSettings.enable_group_positions_bonus) {
      const expected = groups.length * 4;
      const completed = groups.reduce((sum, group) => {
        const value = getBonusValue("group_position", group.name);
        return sum + (Array.isArray(value) ? value.filter(Boolean).length : 0);
      }, 0);

      if (completed < expected) {
        notifications.push({
          type: "warning",
          icon: "📊",
          text: t.missingGroupRankingPredictions,
          tab: "piazzamento-gironi",
        });
      }
    }

    if (nextDeadline?.date) {
      const diffMs = new Date(nextDeadline.date).getTime() - Date.now();
      if (!Number.isNaN(diffMs)) {
        if (diffMs <= 0) {
          notifications.push({
            type: "danger",
            icon: "🔒",
            text: t.deadlineExpired,
            tab: "partite",
          });
        } else if (diffMs <= 24 * 60 * 60 * 1000) {
          notifications.push({
            type: "danger",
            icon: "⏳",
            text: t.deadlineSoon,
            tab: "partite",
          });
        }
      }
    }

    return notifications;
  }



  if (selectedLeague) {
    const ranking = getRanking();
    const dashboardStats = getLeagueDashboardStats(ranking);
    const leagueStatistics = getLeagueStatistics(ranking);
    const users = getPlayersInLeague();
    const filteredPlayers = selectedPredictionPlayer === "__all__" ? users : users.filter((name) => name === selectedPredictionPlayer);
    const knockoutMatches = buildKnockoutMatches();
    const topScorerPredictions = getTopScorerPredictions();
    const confirmedTopScorer = getFinalTopScorer();
    const allDisplayMatches = [...matches, ...knockoutMatches];
    const adminDisplayMatches = [...allDisplayMatches]
      .sort((a, b) => new Date(a.kickoff || "2099-01-01") - new Date(b.kickoff || "2099-01-01"))
      .filter((m) => {
        const result = realResults[m.id];
        if (adminMatchFilter === "pending") return !result;
        if (adminMatchFilter === "live") return result && !result.finished;
        if (adminMatchFilter === "final") return result?.finished;
        return true;
      });
    const liveMatchesHome = allDisplayMatches.filter((m) => realResults[m.id] && !realResults[m.id]?.finished).slice(0, 5);
    const nextMatchesHome = allDisplayMatches
      .filter((m) => !realResults[m.id]?.finished && m.kickoff && new Date(m.kickoff) >= new Date())
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
      .slice(0, 5);
    const leaderPT = [...ranking].sort((a, b) => (b.qualificationBonus || 0) - (a.qualificationBonus || 0))[0];
    const leaderPG = [...ranking].sort((a, b) => (b.groupBonus || 0) - (a.groupBonus || 0))[0];
    const leaderRE = [...ranking].sort((a, b) => (b.exact || 0) - (a.exact || 0))[0];
    const nextMatch = nextMatchesHome[0];
    const tournamentStartDate = getTournamentStartDate();
    const countdownTargetMatch = leagueSettings.prediction_lock_mode === "tournament" ? null : nextMatch;
    const countdownTargetDate = leagueSettings.prediction_lock_mode === "tournament" ? tournamentStartDate : countdownTargetMatch?.kickoff;
    const countdownParts = getCountdownParts(countdownTargetDate);
    const nextDeadlineInfo = getNextDeadlineInfo(nextMatch, tournamentStartDate);
    const smartNotifications = getSmartNotifications(knockoutMatches, nextDeadlineInfo);
    const menuItems = [
      { key: "home", icon: "🏠", label: t.leagueHome || t.leagueHome || "Home" },
      { key: "live", icon: "🔴", label: "Live Match Center" },
      { key: "partite", icon: "📊", label: t.groupPredictions },
      { key: "eliminazione", icon: "🌍", label: t.knockoutPredictions },
      { key: "passaggio-turno", icon: "🎯", label: t.qualificationStage || "Passaggio turno" },
      { key: "piazzamento-gironi", icon: "📈", label: t.groupPlacement || "Piazzamenti Gruppi" },
      { key: "capocannoniere", icon: "🏆", label: t.topScorer },
      { key: "utenti", icon: "👥", label: t.usersPredictions },
      { key: "classifica", icon: "🥇", label: t.participantsRanking },
      { key: "statistiche", icon: "📈", label: t.leagueStatistics },
      { key: "gironi", icon: "📋", label: t.groupRanking },
      { key: "tabellone", icon: "🧩", label: t.bracket },
      ...(!selectedLeague?.__global ? [{ key: "settings", icon: "⚙️", label: t.settings }] : []),
      ...(isGlobalControlRoomAdmin ? [{ key: "admin", icon: "🛠️", label: "Global Control Room" }] : []),
      ...(!selectedLeague?.__global && isAdmin ? [{ key: "league-settings", icon: "🎛️", label: t.leagueSettings }, { key: "manage-participants", icon: "👤", label: t.manageParticipants }] : []),
      { key: "regole", icon: "📜", label: t.rules },
      { key: "punteggi", icon: "🏆", label: t.pointsSystem },
      { key: "istruzioni", icon: "🎮", label: t.gameInstructions },
    ];
    const activeMenuItem = menuItems.find((item) => item.key === activeTab) || menuItems[0];
    const showQuickActions = !selectedLeague?.__global && ["partite", "eliminazione", "passaggio-turno", "piazzamento-gironi", "capocannoniere"].includes(activeTab);
    const quickSave = () => {
      if (activeTab === "partite") return saveAllPredictions(matches);
      if (activeTab === "eliminazione") return saveAllPredictions(knockoutMatches);
      if (activeTab === "passaggio-turno" || activeTab === "piazzamento-gironi") return saveBonusPredictions();
      if (activeTab === "capocannoniere") return saveTopScorerPrediction();
    };
    const quickClear = () => {
      if (activeTab === "partite") return clearMatchPredictions(matches);
      if (activeTab === "eliminazione") return clearMatchPredictions(knockoutMatches);
      if (activeTab === "passaggio-turno") return clearBonusSection("qualification");
      if (activeTab === "piazzamento-gironi") return clearBonusSection("group_position");
      if (activeTab === "capocannoniere") return clearTopScorerPredictionLocal();
    };

    return (
      <LeagueShell
        logo={logo}
        selectedLeague={selectedLeague}
        t={t}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuItems={menuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeMenuItem={activeMenuItem}
        showQuickActions={showQuickActions}
        quickClear={quickClear}
        quickSave={quickSave}
        onBack={() => { setSelectedLeague(null); setActiveTab("home"); }}
      >

        {validationMessage && (
          <div className="global-validation-alert">
            ⚠️ {validationMessage}
          </div>
        )}

        {activeTab === "home" && <LeagueHome
          t={t}
          lastLiveSync={lastLiveSync}
          liveSyncStatus={liveSyncStatus}
          ranking={ranking}
          leaderRE={leaderRE}
          leaderPT={leaderPT}
          leaderPG={leaderPG}
          getCurrentTopScorer={getCurrentTopScorer}
          liveMatchesHome={liveMatchesHome}
          nextMatchesHome={nextMatchesHome}
          trTeamLabel={trTeamLabel}
          renderRealResult={renderRealResult}
          formatMatchDateTime={formatMatchDateTime}
          countdownTargetDate={countdownTargetDate}
          countdownTargetMatch={countdownTargetMatch}
          tournamentStartDate={tournamentStartDate}
          countdownParts={countdownParts}
          renderCountdownBox={renderCountdownBox}
          leagueSettings={leagueSettings}
          dashboardStats={dashboardStats}
          nextDeadlineInfo={nextDeadlineInfo}
          setActiveTab={setActiveTab}
          smartNotifications={smartNotifications}
        />}

        {activeTab === "live" && (
          <LiveCenter
            t={t}
            matches={allDisplayMatches}
            realResults={realResults}
            matchEvents={matchEvents}
            lastLiveSync={lastLiveSync}
            liveSyncStatus={liveSyncStatus}
            liveSyncMode={liveSyncMode}
            nextLiveSyncAt={nextLiveSyncAt}
            formatMatchDateTime={formatMatchDateTime}
            trTeamLabel={trTeamLabel}
            groups={groups}
            getGroupStandings={getGroupStandings}
          />
        )}

        
        {activeTab === "statistiche" && <>
          <h2>📈 {t.leagueStatistics}</h2>
          <div className="league-box stats-box">
            <p className="rules-intro">{t.leagueStatisticsIntro}</p>

            <h3>👥 {t.participationStats}</h3>
            <div className="stats-grid">
              <div className="stat-card-pro"><span>👥</span><strong>{leagueStatistics.totalParticipants}</strong><small>{t.totalParticipants}</small></div>
              <div className="stat-card-pro"><span>✅</span><strong>{leagueStatistics.completedAllCount}</strong><small>{t.usersCompletedAll}</small></div>
              <div className="stat-card-pro"><span>📊</span><strong>{leagueStatistics.completionRate}%</strong><small>{t.completionRate}</small></div>
            </div>

            <h3>🔥 {t.predictionStats}</h3>
            <div className="stats-grid">
              <div className="stat-card-pro big">
                <span>🏆</span>
                <strong>{leagueStatistics.championChoices[0]?.name || "-"}</strong>
                <small>{t.championMostPicked}</small>
                <em>{leagueStatistics.championChoices[0] ? formatText(t.pickedByUsers, { count: leagueStatistics.championChoices[0].count }) : t.noDataYet}</em>
              </div>
              <div className="stat-card-pro big">
                <span>🥾</span>
                <strong>{leagueStatistics.topScorerChoices[0]?.name || "-"}</strong>
                <small>{t.goldenBootMostPicked}</small>
                <em>{leagueStatistics.topScorerChoices[0] ? formatText(t.pickedByUsers, { count: leagueStatistics.topScorerChoices[0].count }) : t.noDataYet}</em>
              </div>
              <div className="stat-card-pro big">
                <span>🎯</span>
                <strong>{leagueStatistics.topQualifiedChoices[0]?.name || "-"}</strong>
                <small>{t.qualifiedMostPicked}</small>
                <em>{leagueStatistics.topQualifiedChoices[0] ? formatText(t.pickedByUsers, { count: leagueStatistics.topQualifiedChoices[0].count }) : t.noDataYet}</em>
              </div>
            </div>

            <h3>🥇 {t.rankingStats}</h3>
            <div className="stats-grid">
              <div className="stat-card-pro"><span>🥇</span><strong>{leagueStatistics.leader?.name || "-"}</strong><small>{t.currentLeader}</small></div>
              <div className="stat-card-pro"><span>🎯</span><strong>{leagueStatistics.exactLeader?.name || "-"}</strong><small>{t.exactLeader}</small></div>
              <div className="stat-card-pro"><span>✅</span><strong>{leagueStatistics.qualificationLeader?.name || "-"}</strong><small>{t.qualificationLeader}</small></div>
              <div className="stat-card-pro"><span>📊</span><strong>{leagueStatistics.groupLeader?.name || "-"}</strong><small>{t.groupLeader}</small></div>
            </div>

            <h3>📋 {t.topChoices}</h3>
            <div className="table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr><th>🥾 {t.goldenBootMostPicked}</th><th>{t.pointsValue || "Count"}</th></tr>
                </thead>
                <tbody>
                  {(leagueStatistics.topScorerChoices.slice(0, 10).length ? leagueStatistics.topScorerChoices.slice(0, 10) : [{ name: t.noDataYet, count: "-" }]).map((row) => (
                    <tr key={`gb-${row.name}`}><td>{row.name}</td><td>{row.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr><th>🏆 {t.championMostPicked}</th><th>{t.pointsValue || "Count"}</th></tr>
                </thead>
                <tbody>
                  {(leagueStatistics.championChoices.slice(0, 10).length ? leagueStatistics.championChoices.slice(0, 10) : [{ name: t.noDataYet, count: "-" }]).map((row) => (
                    <tr key={`champ-${row.name}`}><td>{row.name}</td><td>{row.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}

{activeTab === "regole" && <>
          <h2>📖 {t.rulesTitle}</h2>
          <div className="league-box rules-box smart-rules-box">
            <p className="rules-intro">{t.smartRulesIntro}</p>

            <h3>⚙️ {t.rulesCurrentSetup}</h3>
            <div className="smart-rules-grid">
              <div className="smart-rule-card">
                <strong>⚽ {t.matchPredictionsRulesTitle}</strong>
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

              <div className="smart-rule-card">
                <strong>🎯 {t.exactScore}</strong>
                <p>
                  {leagueSettings.exact_score_mode === "bands"
                    ? t.exactModeBandsRule
                    : t.exactModeStandardRule}
                </p>
              </div>

              <div className="smart-rule-card">
                <strong>✅ {t.qualifiedRulesTitle}</strong>
                <p>
                  {!leagueSettings.enable_qualification_bonus
                    ? t.qualificationInactiveRule
                    : leagueSettings.qualification_bonus_mode === "fixed"
                      ? t.qualificationActiveFixedRule
                      : t.qualificationActiveRoundRule}
                </p>
              </div>

              <div className="smart-rule-card">
                <strong>📊 {t.groupRankingRulesTitle}</strong>
                <p>
                  {leagueSettings.enable_group_positions_bonus
                    ? t.groupPlacementActiveRule
                    : t.groupPlacementInactiveRule}
                </p>
              </div>

              <div className="smart-rule-card">
                <strong>🥾 {t.goldenBootRulesTitle}</strong>
                <p>{t.goldenBootActiveRule}</p>
              </div>

              <div className="smart-rule-card">
                <strong>🏆 {t.rankingRulesTitle}</strong>
                <p>{t.rankingRulesTextFull}</p>
              </div>
            </div>

            <h3>🧮 {t.whatCounts}</h3>
            <ul className="smart-rules-list">
              <li>{t.correctOutcomePointsLabel}</li>
              <li>
                {leagueSettings.exact_score_mode === "bands"
                  ? `${t.exactEasyPointsLabel} / ${t.exactMediumPointsLabel} / ${t.exactHardPointsLabel}`
                  : t.exactStandardPointsLabel}
              </li>
              {leagueSettings.enable_qualification_bonus && <li>{t.qualificationStage}</li>}
              {leagueSettings.enable_group_positions_bonus && <li>{t.groupPlacement}</li>}
              <li>{t.goldenBootPointsLabel}</li>
            </ul>

            <p className="rules-intro">{t.goToPointsForValues}</p>
          </div>
        </>}

        {activeTab === "punteggi" && <>
          <h2>🏆 {t.pointsSystemTitle}</h2>
          <div className="league-box rules-box points-system-box">
            <p className="rules-intro">{t.pointsIntro}</p>

            <h3>⚽ {t.matchPointsCategory}</h3>
            <div className="points-table-wrap">
              <table className="points-system-table">
                <thead>
                  <tr>
                    <th>{t.pointsEvent}</th>
                    <th>{t.pointsValue}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t.correctOutcomePointsLabel}</td>
                    <td>{leagueSettings.outcome_points}</td>
                  </tr>
                  {leagueSettings.exact_score_mode === "bands" ? (
                    <>
                      <tr>
                        <td>{t.exactEasyPointsLabel}</td>
                        <td>{leagueSettings.exact_easy_points}</td>
                      </tr>
                      <tr>
                        <td>{t.exactMediumPointsLabel}</td>
                        <td>{leagueSettings.exact_medium_points}</td>
                      </tr>
                      <tr>
                        <td>{t.exactHardPointsLabel}</td>
                        <td>{leagueSettings.exact_hard_points}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td>{t.exactStandardPointsLabel}</td>
                      <td>{leagueSettings.exact_score_points}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3>✅ {t.qualificationPointsCategory}</h3>
            <div className="points-table-wrap">
              <table className="points-system-table">
                <thead>
                  <tr>
                    <th>{t.pointsEvent}</th>
                    <th>{t.pointsValue}</th>
                  </tr>
                </thead>
                <tbody>
                  {!leagueSettings.enable_qualification_bonus ? (
                    <tr>
                      <td>{t.qualificationStage}</td>
                      <td>{t.inactive}</td>
                    </tr>
                  ) : leagueSettings.qualification_bonus_mode === "fixed" ? (
                    <tr>
                      <td>{t.qualifiedFixedPointsLabel}</td>
                      <td>{leagueSettings.qualification_fixed_points}</td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td>{t.round32PointsLabel}</td>
                        <td>{leagueSettings.bonus_round32_points}</td>
                      </tr>
                      <tr>
                        <td>{t.round16PointsLabel}</td>
                        <td>{leagueSettings.bonus_round16_points}</td>
                      </tr>
                      <tr>
                        <td>{t.quarterPointsLabel}</td>
                        <td>{leagueSettings.bonus_quarter_points}</td>
                      </tr>
                      <tr>
                        <td>{t.semiPointsLabel}</td>
                        <td>{leagueSettings.bonus_semi_points}</td>
                      </tr>
                      <tr>
                        <td>{t.finalPointsLabel}</td>
                        <td>{leagueSettings.bonus_final_points}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>{t.championPointsLabel}</td>
                    <td>{leagueSettings.bonus_champion_points}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>📊 {t.groupPointsCategory}</h3>
            <div className="points-table-wrap">
              <table className="points-system-table">
                <thead>
                  <tr>
                    <th>{t.pointsEvent}</th>
                    <th>{t.pointsValue}</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueSettings.enable_group_positions_bonus ? (
                    <tr>
                      <td>{t.groupExactPointsLabel}</td>
                      <td>{leagueSettings.bonus_group_exact_points}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td>{t.groupPlacement}</td>
                      <td>{t.inactive}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3>🥾 {t.bonusPointsCategory}</h3>
            <div className="points-table-wrap">
              <table className="points-system-table">
                <thead>
                  <tr>
                    <th>{t.pointsEvent}</th>
                    <th>{t.pointsValue}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t.goldenBootPointsLabel}</td>
                    <td>{leagueSettings.top_scorer_points}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {activeTab === "settings" && <>
          <h2>{t.settings}</h2>
          <div className="league-box">
            <label>{t.username}</label>
            <input value={settingsPlayername} onChange={(e) => setSettingsPlayername(e.target.value)} />
            <label>{t.language}</label>
            <select value={language} onChange={(e) => { setLanguage(e.target.value); localStorage.setItem("lang", e.target.value); }}>
              <option value="it">Italiano</option><option value="en">English</option><option value="ro">Română</option>
            </select>
            <div className="settings-actions">
              <button className="btn green" onClick={updateSettings}>{t.saveSettings}</button>
              <button className="btn blue" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{t.backToTop || t.saveUp}</button>
            </div>
          </div>
          <div className="league-box">
            <h3>{t.updatePassword}</h3>
            <input type="password" placeholder={t.currentPassword} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <input type="password" placeholder={t.newPassword} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <input type="password" placeholder={t.confirmPassword} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button className="btn blue" onClick={updatePassword}>{t.updatePassword}</button>
          </div>
        </>}

        {activeTab === "manage-participants" && isAdmin && <>
          <h2>👤 {t.manageParticipants}</h2>
          <div className="league-box admin-users-box">
            <p className="rules-intro">{t.allLeagueMembersRanking || "Qui vedi tutti i partecipanti della lega."}</p>
            <div className="table-wrapper">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>{t.participant || t.user}</th>
                    <th>{t.participantEmail}</th>
                    <th>{t.participantRole}</th>
                    <th>{t.participantStatus}</th>
                    <th>{t.actions || ""}</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueParticipants.map((participant) => {
                    const status = getParticipantCompletionStatus(participant);
                    const isOwnerParticipant = selectedLeague?.owner_id === participant.user_id;

                    return (
                      <tr key={participant.user_id}>
                        <td>
                          <div className="ranking-player-cell">
                            <span className="avatar-badge avatar-normal ranking-avatar">
                              {participant.avatar_url ? <img src={participant.avatar_url} alt={participant.name} /> : <span>{participant.avatar_icon || "⚽"}</span>}
                            </span>
                            <strong>{participant.name}</strong>
                          </div>
                        </td>
                        <td>{participant.email || "-"}</td>
                        <td>
                          {isOwnerParticipant ? t.owner : participant.role === "admin" ? t.adminRole : t.member}
                        </td>
                        <td>
                          <div className="completion-tags">
                            <span className={status.hasMatchPredictions ? "ok" : "missing"}>{t.matchPredictionsShort}: {status.hasMatchPredictions ? t.completedStatus : t.missingStatus}</span>
                            <span className={status.hasGoldenBoot ? "ok" : "missing"}>{t.goldenBootShort}: {status.hasGoldenBoot ? t.completedStatus : t.missingStatus}</span>
                            {leagueSettings.enable_qualification_bonus && <span className={status.hasQualified ? "ok" : "missing"}>{t.qualifiedShort}: {status.hasQualified ? t.completedStatus : t.missingStatus}</span>}
                            {leagueSettings.enable_group_positions_bonus && <span className={status.hasGroupRanking ? "ok" : "missing"}>{t.groupRankingShort}: {status.hasGroupRanking ? t.completedStatus : t.missingStatus}</span>}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn danger"
                            disabled={isOwnerParticipant}
                            onClick={() => removeParticipantFromLeague(participant)}
                          >
                            {t.removeFromLeague}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {activeTab === "league-settings" && isAdmin && <>
          <h2>{t.leagueSettings}</h2>
          <div className="league-box live-api-box">
            <h3>🌐 {t.liveApiTitle}</h3>
            <p>{t.liveApiInfo}</p>
            <p><strong>{t.syncStatus}:</strong> {liveSyncStatus || t.waitingFirstSync}</p>
          </div>
          <div className="league-box">
            <h3>⚽ {t.matchPointsSettings}</h3>
            <div className="bonus-settings-grid">
              <label>{t.correctOutcome}<input min="0" max="20" type="number" className={missingSettingClass("outcome_points")} value={leagueSettings.outcome_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, outcome_points: Number(e.target.value) })} /></label>
              <label>{t.topScorerPoints}<input min="0" max="50" type="number" className={missingSettingClass("top_scorer_points")} value={leagueSettings.top_scorer_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, top_scorer_points: Number(e.target.value) })} /></label>
            </div>
            <label>{t.predictionLockMode}</label>
            <select className={missingSettingClass("prediction_lock_mode")} value={leagueSettings.prediction_lock_mode || "match"} onChange={(e) => setLeagueSettings({ ...leagueSettings, prediction_lock_mode: e.target.value })}>
              <option value="match">{t.lockModeMatch}</option>
              <option value="stage">{t.lockModeStage}</option>
              <option value="stage_round">{t.lockModeStageRound}</option>
              <option value="tournament">{t.lockModeTournament}</option>
            </select>
            <p className="bonus-help">{t.lockModeHelp}</p>
            <label>{t.exactScoreMode}</label>
            <select className={missingSettingClass("exact_score_mode")} value={leagueSettings.exact_score_mode || "standard"} onChange={(e) => setLeagueSettings({ ...leagueSettings, exact_score_mode: e.target.value })}>
              <option value="standard">{t.exactStandard}</option>
              <option value="bands">{t.exactBands}</option>
            </select>
            {leagueSettings.exact_score_mode === "bands" ? <div className="bonus-settings-grid">
              <label>{t.easy}<br/><small>{t.easyExamples}</small><input min="0" max="50" type="number" className={missingSettingClass("exact_easy_points")} value={leagueSettings.exact_easy_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, exact_easy_points: Number(e.target.value) })} /></label>
              <label>{t.medium}<br/><small>{t.mediumExamples}</small><input min="0" max="50" type="number" className={missingSettingClass("exact_medium_points")} value={leagueSettings.exact_medium_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, exact_medium_points: Number(e.target.value) })} /></label>
              <label>{t.hard}<br/><small>{t.hardExamples}</small><input min="0" max="50" type="number" className={missingSettingClass("exact_hard_points")} value={leagueSettings.exact_hard_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, exact_hard_points: Number(e.target.value) })} /></label>
            </div> : <div className="bonus-settings-grid"><label>{t.exactScorePoints}<input min="0" max="50" type="number" className={missingSettingClass("exact_score_points")} value={leagueSettings.exact_score_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, exact_score_points: Number(e.target.value) })} /></label></div>}
          </div>
          <div className="league-box">
            <h3>🏆 {t.optionalBonuses}</h3>
            <label className="switch-row"><input type="checkbox" checked={!!leagueSettings.enable_qualification_bonus} onChange={(e) => setLeagueSettings({ ...leagueSettings, enable_qualification_bonus: e.target.checked })} /> {t.enableQualification}</label>
            {leagueSettings.enable_qualification_bonus && <>
              <label>{t.qualificationBonusMode}</label>
              <select className={missingSettingClass("qualification_bonus_mode")} value={leagueSettings.qualification_bonus_mode || "round"} onChange={(e) => setLeagueSettings({ ...leagueSettings, qualification_bonus_mode: e.target.value })}>
                <option value="fixed">{t.fixedQualificationPoints}</option>
                <option value="round">{t.roundQualificationPoints}</option>
              </select>
              {leagueSettings.qualification_bonus_mode === "fixed" ? <div className="bonus-settings-grid">
                <label>{t.fixedPointsEachQualified}<input min="0" max="50" type="number" className={missingSettingClass("qualification_fixed_points")} value={leagueSettings.qualification_fixed_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, qualification_fixed_points: Number(e.target.value) })} /></label>
                <label>{t.worldChampion}<input min="0" max="100" type="number" className={missingSettingClass("bonus_champion_points")} value={leagueSettings.bonus_champion_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, bonus_champion_points: Number(e.target.value) })} /></label>
              </div> : <div className="bonus-settings-grid">
                {qualificationRounds.map((round) => <label key={round.key}>{round.label}<input min="0" max="50" type="number" className={missingSettingClass(round.pointsKey)} value={leagueSettings[round.pointsKey]} onChange={(e) => setLeagueSettings({ ...leagueSettings, [round.pointsKey]: Number(e.target.value) })} /></label>)}
                <label>{t.worldChampion}<input min="0" max="100" type="number" className={missingSettingClass("bonus_champion_points")} value={leagueSettings.bonus_champion_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, bonus_champion_points: Number(e.target.value) })} /></label>
              </div>}
            </>}
            <label className="switch-row"><input type="checkbox" checked={!!leagueSettings.enable_group_positions_bonus} onChange={(e) => setLeagueSettings({ ...leagueSettings, enable_group_positions_bonus: e.target.checked })} /> {t.enableGroupPlacement}</label>
            {leagueSettings.enable_group_positions_bonus && <div className="bonus-settings-grid"><label>{t.exactGroupPosition}<input min="0" max="50" type="number" className={missingSettingClass("bonus_group_exact_points")} value={leagueSettings.bonus_group_exact_points} onChange={(e) => setLeagueSettings({ ...leagueSettings, bonus_group_exact_points: Number(e.target.value) })} /></label></div>}
          </div>
          <button className="btn green" onClick={saveLeagueSettings}>{t.saveConfiguration || t.saveLeagueSettings}</button>
        </>}

        {activeTab === "partite" && <GroupPredictions
          t={t}
          matches={matches}
          predictions={predictions}
          isPredictionLocked={isPredictionLocked}
          formatMatchDateTime={formatMatchDateTime}
          trTeamLabel={trTeamLabel}
          getPredictionLockText={getPredictionLockText}
          renderRealResult={renderRealResult}
          renderResultStatus={renderResultStatus}
          updatePrediction={updatePrediction}
          missingPredictionClass={missingPredictionClass}
          saveAllPredictions={saveAllPredictions}
          clearMatchPredictions={clearMatchPredictions}
        />}

        {activeTab === "utenti" && <UsersPredictions
          t={t}
          usersSubTab={usersSubTab}
          setPlayersSubTab={setPlayersSubTab}
          selectedPredictionPlayer={selectedPredictionPlayer}
          setSelectedPredictionPlayer={setSelectedPredictionPlayer}
          users={users}
          filteredPlayers={filteredPlayers}
          confirmedTopScorer={confirmedTopScorer}
          getCurrentTopScorer={getCurrentTopScorer}
          topScorerPredictions={topScorerPredictions}
          matches={matches}
          knockoutMatches={knockoutMatches}
          trTeamLabel={trTeamLabel}
          formatMatchDateTime={formatMatchDateTime}
          renderPlayersRealResultCell={renderPlayersRealResultCell}
          uniquePredictions={uniquePredictions}
          realResults={realResults}
          calculatePoints={calculatePoints}
          getPredictionColor={getPredictionColor}
          leagueSettings={leagueSettings}
          qualificationRounds={qualificationRounds}
          getBonusPredictionMapForPlayer={getBonusPredictionMapForPlayer}
          getBonusCellColor={getBonusCellColor}
          groups={groups}
          trGroupName={trGroupName}
        />}

        {activeTab === "classifica" && (
          <ParticipantsRanking
            t={t}
            lastLiveSync={lastLiveSync}
            liveSyncStatus={liveSyncStatus}
            ranking={ranking}
            AvatarBadge={AvatarBadge}
          />
        )}

        {activeTab === "gironi" && <>
          <h2>{t.groupRanking}</h2>
          {lastLiveSync && <p className="live-sync-info">🔄 {t.liveGroupRanking || "Classifica gironi live"}: {lastLiveSync.toLocaleTimeString()} {liveSyncStatus ? `— ${liveSyncStatus}` : ""}</p>}
          {groups.map((group) => <div key={group.name} className="league-box group-table-box">
            <h3>{trGroupName(group.name)}</h3><div className="table-wrapper"><table>
              <thead><tr><th>{t.positionLabel}</th><th>{t.team}</th><th>{t.pts}</th><th>{t.played}</th><th>{t.won}</th><th>{t.drawn}</th><th>{t.lost}</th><th>{t.goalsFor}</th><th>{t.goalsAgainst}</th><th>{t.goalDiff}</th><th>{t.avgGoals}</th></tr></thead>
              <tbody>{getGroupStandings(group.name).map((row, index) => <tr key={row.team}><td>{index + 1}</td><td>{row.team}</td><td>{row.points}</td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.gf}</td><td>{row.ga}</td><td>{row.gd}</td><td>{row.played > 0 ? (row.gf / row.played).toFixed(2) : "0.00"}</td></tr>)}</tbody>
            </table></div></div>)}
        </>}

        {activeTab === "tabellone" && <FinalBracket
          t={t}
          knockoutRounds={knockoutRounds}
          knockoutMatches={knockoutMatches}
          realResults={realResults}
          formatMatchDateTime={formatMatchDateTime}
          trTeamLabel={trTeamLabel}
          trRoundName={trRoundName}
          renderRealResult={renderRealResult}
        />}

        {activeTab === "eliminazione" && <KnockoutPredictions
          t={t}
          knockoutRounds={knockoutRounds}
          knockoutMatches={knockoutMatches}
          predictions={predictions}
          isPredictionLocked={isPredictionLocked}
          formatMatchDateTime={formatMatchDateTime}
          trTeamLabel={trTeamLabel}
          trRoundName={trRoundName}
          getPredictionLockText={getPredictionLockText}
          renderRealResult={renderRealResult}
          renderResultStatus={renderResultStatus}
          updatePrediction={updatePrediction}
          missingPredictionClass={missingPredictionClass}
          saveAllPredictions={saveAllPredictions}
          clearMatchPredictions={clearMatchPredictions}
        />}


        {activeTab === "passaggio-turno" && <>
          <h2>{t.qualificationStage}</h2>
          <div className="league-box section-sticky-panel">
            <p style={{ color: isTournamentStarted() ? "#f5a524" : "#9fb1c8" }}>
              {isTournamentStarted() ? `🔒 ${t.predictionsLockedTournamentStarted}` : formatText(t.editableUntilTournamentStart, { date: formatTournamentStart() })}
            </p>
          </div>
          {!leagueSettings.enable_qualification_bonus && <div className="league-box"><p>{t.bonusNotActive}</p></div>}
          {leagueSettings.enable_qualification_bonus && qualificationRounds.map((round) => {
            const values = getBonusValue("qualification", round.key);
            return <div key={round.key} className="league-box bonus-section">
              <h3>{round.label} <small>({round.count} {t.teams} - {(leagueSettings.qualification_bonus_mode === "fixed" ? leagueSettings.qualification_fixed_points : leagueSettings[round.pointsKey])} {t.pointsEach})</small></h3>
              <div className="bonus-select-grid">
                {Array.from({ length: round.count }).map((_, index) => {
                  const sourceTeams = getQualificationSourceTeams(round.key);
                  return <select key={index} className={missingBonusClass("qualification", round.key, index)} disabled={isTournamentStarted() || (round.key !== "round32" && sourceTeams.length === 0)} value={values[index] || ""} onChange={(e) => {
                    const next = [...values]; next[index] = e.target.value; setBonusValue("qualification", round.key, next);
                  }}>
                    <option value="">{formatText(t.teamNumber, { number: index + 1 })}</option>
                    {getAvailableTeamsForSelection(values, index, sourceTeams).map((team) => <option key={team} value={team}>{team}</option>)}
                  </select>;
                })}
              </div>
            </div>;
          })}
          {leagueSettings.enable_qualification_bonus && <div className="league-box bonus-section">
            <h3>🏆 {t.worldChampion} <small>({leagueSettings.bonus_champion_points} pt)</small></h3>
            <select className={missingBonusClass("qualification", "champion")} disabled={isTournamentStarted()} value={getBonusValue("qualification", "champion") || ""} onChange={(e) => setBonusValue("qualification", "champion", e.target.value)}>
              <option value="">{t.selectWinner}</option>{getAvailableTeamsForSelection([], -1, getQualificationSourceTeams("champion")).map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
          </div>}
          <button disabled={isTournamentStarted()} className="btn green legacy-action" onClick={saveBonusPredictions}>{t.saveQualifiedTeams}</button>
          <button disabled={isTournamentStarted()} className="btn danger legacy-action" onClick={() => clearBonusSection("qualification")}>🗑 {t.clearAll}</button>
        </>}

        {activeTab === "piazzamento-gironi" && <>
          <h2>{t.groupPlacement}</h2>
          <div className="league-box section-sticky-panel">
            <p style={{ color: isTournamentStarted() ? "#f5a524" : "#9fb1c8" }}>
              {isTournamentStarted() ? `🔒 ${t.predictionsLockedTournamentStarted}` : formatText(t.editableUntilTournamentStart, { date: formatTournamentStart() })}
            </p>
          </div>
          {!leagueSettings.enable_group_positions_bonus && <div className="league-box"><p>{t.bonusNotActive}</p></div>}
          {leagueSettings.enable_group_positions_bonus && groups.map((group) => {
            const values = getBonusValue("group_position", group.name);
            return <div key={group.name} className="league-box bonus-section">
              <h3>{trGroupName(group.name)}</h3>
              <div className="bonus-select-grid compact">
                {[0, 1, 2, 3].map((index) => <label key={index}>{index + 1}° {t.positionLabel}
                  <select className={missingBonusClass("group_position", group.name, index)} disabled={isTournamentStarted()} value={values[index] || ""} onChange={(e) => { const next = [...values]; next[index] = e.target.value; setBonusValue("group_position", group.name, next); }}>
                    <option value="">{t.selectTeam}</option>{group.teams.filter((team) => !values.filter((_, i) => i !== index).includes(team)).map((team) => <option key={team} value={team}>{team}</option>)}
                  </select>
                </label>)}
              </div>
            </div>;
          })}
          <button disabled={isTournamentStarted()} className="btn green legacy-action" onClick={saveBonusPredictions}>{t.saveGroupRanking}</button>
          <button disabled={isTournamentStarted()} className="btn danger legacy-action" onClick={() => clearBonusSection("group_position")}>🗑 {t.clearAll}</button>
        </>}

        {activeTab === "capocannoniere" && <>
          <h2>{t.topScorer}</h2>
          <div className="league-box">
            <p style={{ color: isTournamentStarted() ? "#f5a524" : "#9fb1c8" }}>
              {isTournamentStarted()
                ? `🔒 ${t.topScorerPredictionLocked}`
                : `${t.topScorerPredictionCloses}: ${formatTournamentStart()}`}
            </p>
          </div>
          <div className="player-autocomplete">
            <input
              disabled={isTournamentStarted()}
              placeholder={t.searchPlayer}
              value={topScorerSearch}
              onChange={(e) => {
                setTopScorerSearch(e.target.value);
                setSelectedTopScorer("");
              }}
            />

            {topScorerSearch && !isTournamentStarted() && (
              <div className="player-suggestions">
                {filteredTopScorers.slice(0, 12).map((player) => (
                  <button
                    type="button"
                    key={player}
                    className={selectedTopScorer === player ? "active" : ""}
                    onClick={() => {
                      setSelectedTopScorer(player);
                      setTopScorerSearch(player);
                    }}
                  >
                    {player}
                  </button>
                ))}

                {filteredTopScorers.length === 0 && (
                  <div className="player-suggestion-empty">{t.noPlayersFound || "No players found"}</div>
                )}
              </div>
            )}

            {selectedTopScorer && (
              <div className="selected-player-chip">
                <span>{t.selectedPlayer || t.selectPlayer}</span>
                <strong>{selectedTopScorer}</strong>
              </div>
            )}

            <div className="player-full-list">
              <div className="player-full-list-title">📋 {t.fullPlayerList || "Lista completa giocatori"}</div>
              <div className="player-full-list-scroll">
                {(topScorerSearch ? filteredTopScorers : selectableTopScorers).map((player) => (
                  <button
                    type="button"
                    key={`full-${player}`}
                    className={selectedTopScorer === player ? "active" : ""}
                    disabled={isTournamentStarted()}
                    onClick={() => {
                      setSelectedTopScorer(player);
                      setTopScorerSearch(player);
                    }}
                  >
                    {player}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <small style={{ display: "block", color: "#9fb1c8", marginBottom: 10 }}>
            {playersLoading ? t.loadingPlayers : `${filteredTopScorers.length}/${selectableTopScorers.length} ${t.playersAvailable}`}
          </small>
          <button disabled={isTournamentStarted()} className="btn green legacy-action" onClick={saveTopScorerPrediction}>{t.saveTopScorer}</button>
          {renderTopScorerRankingBox()}
        </>}

        {activeTab === "istruzioni" && <>
          <h2>🎮 {t.gameInstructions}</h2>
          <div className="league-box instructions-box">
            <p className="rules-intro">{t.instructionsIntro}</p>
            <div className="instruction-step"><h3>1️⃣ {t.instructionJoinLeagueTitle}</h3><p>{t.instructionJoinLeagueText}</p></div>
            <div className="instruction-step"><h3>2️⃣ {t.matchPredictionsRulesTitle}</h3><p>{leagueSettings.prediction_lock_mode === "stage_round" ? t.lockModeStageRoundRule : leagueSettings.prediction_lock_mode === "stage" ? t.lockModeStageRule : leagueSettings.prediction_lock_mode === "tournament" ? t.lockModeTournamentRule : t.lockModeMatchRule}</p></div>
            {leagueSettings.enable_qualification_bonus && <div className="instruction-step"><h3>3️⃣ {t.qualifiedRulesTitle}</h3><p>{leagueSettings.qualification_bonus_mode === "fixed" ? t.qualificationActiveFixedRule : t.qualificationActiveRoundRule}</p></div>}
            {leagueSettings.enable_group_positions_bonus && <div className="instruction-step"><h3>4️⃣ {t.groupRankingRulesTitle}</h3><p>{t.groupPlacementActiveRule}</p></div>}
            <div className="instruction-step"><h3>🥾 {t.goldenBootRulesTitle}</h3><p>{t.goldenBootActiveRule}</p></div>
            <div className="instruction-step"><h3>🏆 {t.rankingRulesTitle}</h3><p>{t.rankingRulesTextFull}</p></div>
            <div className="instruction-actions"><button type="button" className="btn blue" onClick={() => setActiveTab("regole")}>📖 {t.rules}</button><button type="button" className="btn green" onClick={() => setActiveTab("punteggi")}>🏆 {t.pointsSystem}</button></div>
          </div>
        </>}

        {activeTab === "admin" && isGlobalControlRoomAdmin && (
          <div className="global-cr-mobile-fix">
            <style>{`
              @media (max-width: 700px) {
                .global-cr-mobile-fix { width: 100%; max-width: 100%; overflow-x: hidden; }
                .global-cr-mobile-fix .league-box { width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; }
                .global-cr-mobile-fix .global-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
                .global-cr-mobile-fix .global-stat-card { padding: 10px !important; min-width: 0; }
                .global-cr-mobile-fix .global-dashboard-lists { grid-template-columns: 1fr !important; }
                .global-cr-mobile-fix .admin-email-row { display: grid !important; grid-template-columns: 1fr !important; gap: 8px !important; }
                .global-cr-mobile-fix .admin-email-row input,
                .global-cr-mobile-fix .admin-email-row button,
                .global-cr-mobile-fix .btn { width: 100%; max-width: 100%; box-sizing: border-box; }
                .global-cr-mobile-fix .participants-table-wrap { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 8px; }
                .global-cr-mobile-fix .participants-table { min-width: 640px; width: max-content; }
                .global-cr-mobile-fix .global-users-table { min-width: 0 !important; width: 100% !important; }
                .global-cr-mobile-fix .global-users-table thead { display: none; }
                .global-cr-mobile-fix .global-users-table,
                .global-cr-mobile-fix .global-users-table tbody,
                .global-cr-mobile-fix .global-users-table tr,
                .global-cr-mobile-fix .global-users-table td { display: block; width: 100%; box-sizing: border-box; }
                .global-cr-mobile-fix .global-users-table tr { margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 10px; background: rgba(255,255,255,0.04); }
                .global-cr-mobile-fix .global-users-table td { border: 0 !important; padding: 6px 0 !important; overflow-wrap: anywhere; }
                .global-cr-mobile-fix .global-users-table td::before { content: attr(data-label); display: block; font-weight: 800; color: #9fb1c8; margin-bottom: 2px; }
                .global-cr-mobile-fix .global-users-table td:last-child > div { display: grid !important; grid-template-columns: 1fr !important; gap: 8px !important; }
              }
            `}</style>
            {isControlRoomOwner ? (
              <>
            <div className="league-box owner-only-control-room-box">
              <h2>📊 Global Control Room Dashboard</h2>
              <p className="bonus-help">
                Panoramica generale dell'app: utenti, leghe, pronostici e autorizzazioni globali.
              </p>
              <div className="global-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 14 }}>
                {[
                  ["👥 Utenti", globalDashboardStats.users],
                  ["🏆 Leghe", globalDashboardStats.leagues],
                  ["🤝 Membri Leghe", globalDashboardStats.leagueMembers],
                  ["🎯 Pronostici", globalDashboardStats.predictions],
                  ["🥾 Capocannoniere", globalDashboardStats.topScorerPredictions],
                  ["⭐ Bonus", globalDashboardStats.bonusPredictions],
                  ["🔐 Global Admin", globalDashboardStats.authorizedAdmins],
                ].map(([label, value]) => (
                  <div key={label} className="league-box global-stat-card" style={{ margin: 0, padding: 12 }}>
                    <div className="bonus-help">{label}</div>
                    <strong style={{ fontSize: 26 }}>{globalDashboardLoading ? "..." : value}</strong>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" className="btn blue" onClick={loadGlobalDashboardStats}>🔄 Aggiorna Dashboard</button>
                <button type="button" className="btn blue" onClick={loadAuthorizedAdmins}>🔄 Aggiorna Admin</button>
              </div>
              <div className="global-dashboard-lists" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 14 }}>
                <div className="participants-table-wrap">
                  <h3>🆕 Ultimi utenti</h3>
                  <table className="participants-table">
                    <thead><tr><th>Utente</th><th>Email</th><th>Data</th></tr></thead>
                    <tbody>
                      {globalDashboardStats.recentUsers.map((profile) => (
                        <tr key={profile.id}>
                          <td data-label="Username">{profile.username || "-"}</td>
                          <td>{profile.email || "-"}</td>
                          <td data-label="Registrazione">{formatGlobalDate(profile.created_at)}</td>
                        </tr>
                      ))}
                      {!globalDashboardLoading && globalDashboardStats.recentUsers.length === 0 && <tr><td colSpan="3">Nessun dato disponibile.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="participants-table-wrap">
                  <h3>🏆 Ultime leghe</h3>
                  <table className="participants-table">
                    <thead><tr><th>Lega</th><th>Codice</th><th>Data</th></tr></thead>
                    <tbody>
                      {globalDashboardStats.recentLeagues.map((league) => (
                        <tr key={league.id}>
                          <td>{league.name || "-"}</td>
                          <td>{league.code || "-"}</td>
                          <td>{formatGlobalDate(league.created_at)}</td>
                        </tr>
                      ))}
                      {!globalDashboardLoading && globalDashboardStats.recentLeagues.length === 0 && <tr><td colSpan="3">Nessun dato disponibile.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="league-box owner-only-control-room-box">
              <h2>👥 Global Users Management</h2>
              <p className="bonus-help">
                Cerca utenti registrati, controlla le leghe associate e gestisci lo stato Global Admin.
                Le autorizzazioni possono essere modificate solo dal Super Admin.
              </p>
              <div className="admin-email-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Cerca per email o username..."
                  value={globalUsersSearch}
                  onChange={(e) => setGlobalUsersSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") loadGlobalUsers(); }}
                  style={{ flex: "1 1 260px" }}
                />
                <button type="button" className="btn blue" onClick={() => loadGlobalUsers()}>🔍 Cerca</button>
                <button type="button" className="btn blue" onClick={() => { setGlobalUsersSearch(""); loadGlobalUsers(""); }}>🔄 Reset</button>
              </div>

              {!isControlRoomOwner && (
                <div className="global-validation-alert" style={{ marginTop: 10 }}>
                  🔒 Puoi consultare gli utenti, ma solo il Super Admin può autorizzare o rimuovere Global Admin.
                </div>
              )}

              <div className="participants-table-wrap" style={{ marginTop: 12 }}>
                <table className="participants-table global-users-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Leghe</th>
                      <th>Registrazione</th>
                      <th>Stato</th>
                      <th>Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalUsersLoading && <tr><td colSpan="6">Caricamento utenti...</td></tr>}
                    {!globalUsersLoading && globalUsers.map((profile) => {
                      const profileEmail = String(profile.email || "").trim().toLowerCase();
                      const profileIsGlobalAdmin = isEmailGlobalAdmin(profileEmail);
                      const isSuperAdminProfile = profileEmail === GLOBAL_CONTROL_ROOM_EMAIL;

                      return (
                        <tr key={profile.id}>
                          <td>{profile.username || "-"}</td>
                          <td data-label="Email">{profileEmail || "-"}</td>
                          <td data-label="Leghe">{profile.memberships.length > 0 ? profile.memberships.join(", ") : "Nessuna lega"}</td>
                          <td>{formatGlobalDate(profile.created_at)}</td>
                          <td data-label="Stato">{isSuperAdminProfile ? "👑 Super Admin" : profileIsGlobalAdmin ? "🔐 Global Admin" : "Utente"}</td>
                          <td data-label="Azione">
                            {isSuperAdminProfile ? (
                              <span className="bonus-help">Protetto</span>
                            ) : isControlRoomOwner ? (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {profileIsGlobalAdmin ? (
                                  <button type="button" className="btn danger" onClick={() => removeProfileGlobalAdmin(profileEmail)}>❌ Rimuovi Admin</button>
                                ) : (
                                  <button type="button" className="btn green" onClick={() => authorizeProfileAsGlobalAdmin(profileEmail)}>➕ Autorizza</button>
                                )}
                                <button
                                  type="button"
                                  className="btn danger"
                                  disabled={deleteUserLoadingId === profile.id}
                                  onClick={() => deleteGlobalUserComplete(profile)}
                                >
                                  {deleteUserLoadingId === profile.id ? "Cancellazione..." : "🗑️ Cancella utente"}
                                </button>
                              </div>
                            ) : (
                              <span className="bonus-help">Solo lettura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!globalUsersLoading && globalUsers.length === 0 && (
                      <tr><td colSpan="6">Nessun utente trovato.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="league-box owner-only-control-room-box">
              <h2>🌍 Global Control Room Admins</h2>
              <p className="bonus-help">
                I Global Admin possono entrare nella Control Room. Solo il Super Admin può aggiungere o rimuovere altri Global Admin.
              </p>
              {isControlRoomOwner ? (
                <div className="admin-email-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="email"
                    placeholder="email@esempio.com"
                    value={newGlobalAdminEmail}
                    onChange={(e) => setNewGlobalAdminEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addGlobalAdminEmail(); }}
                    style={{ flex: "1 1 260px" }}
                  />
                  <button type="button" className="btn green" onClick={addGlobalAdminEmail}>➕ Aggiungi Admin</button>
                </div>
              ) : (
                <div className="global-validation-alert">🔒 Sei Global Admin, ma non Super Admin: puoi usare la Control Room, ma non puoi autorizzare altri account.</div>
              )}
              <div className="participants-table-wrap" style={{ marginTop: 12 }}>
                <table className="participants-table global-users-table">
                  <thead>
                    <tr><th>Email autorizzata</th><th>Azione</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td data-label="Email autorizzata">{GLOBAL_CONTROL_ROOM_EMAIL} <strong>👑 Super Admin</strong></td>
                      <td data-label="Azione"><span className="bonus-help">Protetta</span></td>
                    </tr>
                    {globalAdminsLoading && <tr><td colSpan="2">Caricamento...</td></tr>}
                    {normalizedGlobalAdminEmails.filter((email) => email !== GLOBAL_CONTROL_ROOM_EMAIL).map((adminEmail) => (
                      <tr key={adminEmail}>
                        <td data-label="Email autorizzata">{adminEmail}</td>
                        <td data-label="Azione">{isControlRoomOwner ? <button type="button" className="btn danger" onClick={() => removeGlobalAdminEmail(adminEmail)}>❌ Rimuovi</button> : <span className="bonus-help">Solo lettura</span>}</td>
                      </tr>
                    ))}
                    {!globalAdminsLoading && normalizedGlobalAdminEmails.filter((email) => email !== GLOBAL_CONTROL_ROOM_EMAIL).length === 0 && (
                      <tr><td colSpan="2">Nessun altro Global Admin autorizzato.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            ) : (
              <div className="league-box owner-only-control-room-box">
                <h2>🔐 Global Control Room Operativa</h2>
                <p className="bonus-help">
                  Accesso limitato: puoi gestire solo partite, risultati, pronostici e classifiche.
                  Non puoi vedere utenti, email, leghe o autorizzare altri admin.
                </p>
              </div>
            )}

            <AdminPanel
            t={t}
            users={users}
            allDisplayMatches={allDisplayMatches}
            realResults={realResults}
            adminMatchFilter={adminMatchFilter}
            setAdminMatchFilter={setAdminMatchFilter}
            syncLiveResults={syncLiveResults}
            recalculateLeagueData={recalculateLeagueData}
            formatMatchDateTime={formatMatchDateTime}
            trTeamLabel={trTeamLabel}
            renderRealResult={renderRealResult}
            saveRealResult={saveRealResult}
            selectableTopScorers={selectableTopScorers}
            topScorerGoalsPlayer={topScorerGoalsPlayer}
            setTopScorerGoalsPlayer={setTopScorerGoalsPlayer}
            topScorerGoals={topScorerGoals}
            setTopScorerGoals={setTopScorerGoals}
            saveTopScorerGoals={saveTopScorerGoals}
            confirmedTopScorer={confirmedTopScorer}
            finalTopScorer={finalTopScorer}
            setFinalTopScorer={setFinalTopScorer}
            saveFinalTopScorer={saveFinalTopScorer}
          />
          </div>
        )}

        <p>{message}</p>
      </LeagueShell>
    );
  }

  return (
    <div className="page"><div className="card">
      <img src={logo} alt="logo" className="logo" />
      <h1 className="app-title dashboard-title">{t.appTitle}</h1><p className="avatar-user"><AvatarBadge size="large" clickable /> <span>{t.user}: {username}</span></p>
      <button onClick={() => setShowDashboardSettings(!showDashboardSettings)} className="btn blue">{t.settings}</button>
      {showDashboardSettings && <>
        <div className="league-box">
          <h3>{t.settings}</h3>
          <label>{t.username}</label>
          <input value={settingsPlayername} onChange={(e) => setSettingsPlayername(e.target.value)} />
          <label>{t.language}</label>
          <select value={language} onChange={(e) => { setLanguage(e.target.value); localStorage.setItem("lang", e.target.value); }}>
            <option value="it">Italiano</option><option value="en">English</option><option value="ro">Română</option>
          </select>
          <div className="settings-actions">
              <button className="btn green" onClick={updateSettings}>{t.saveSettings}</button>
              <button className="btn blue" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{t.backToTop || t.saveUp}</button>
            </div>
        </div>
        <div className="league-box">
          <h3>{t.updatePassword}</h3>
          <input type="password" placeholder={t.currentPassword} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <input type="password" placeholder={t.newPassword} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <input type="password" placeholder={t.confirmPassword} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button className="btn blue" onClick={updatePassword}>{t.updatePassword}</button>
        </div>
      </>}
      {showAvatarPicker && <div className="modal-backdrop">
        <div className="avatar-modal">
          <h3>Personalizza icona profilo</h3>
          <div className="avatar-preview"><AvatarBadge size="xl" /></div>
          <p className="bonus-help">Scegli un avatar oppure carica una foto PNG/JPG.</p>
          <div className="avatar-grid pretty">
            {["🦁","🐺","🦅","🐉","👑","🏆","⚽","🔥","⚡","🎯","🧤","🛡️"].map((icon) => <button type="button" key={icon} className={`avatar-option ${!avatarUrl && avatarIcon === icon ? "active" : ""}`} onClick={() => { setAvatarIcon(icon); clearAvatarImage(); }}>{icon}</button>)}
          </div>
          <label className="upload-avatar-label">📷 Carica foto PNG/JPG
            <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={uploadAvatarFile} />
          </label>
          {avatarUrl && <button type="button" className="btn danger" onClick={clearAvatarImage}>Rimuovi foto</button>}
          <div className="modal-actions">
            <button type="button" className="btn blue" onClick={() => setShowAvatarPicker(false)}>Chiudi</button>
            <button type="button" className="btn green" onClick={async () => { await updateSettings(); setShowAvatarPicker(false); }}>{t.saveAvatar || 'Salva avatar'}</button>
          </div>
        </div>
      </div>}
      <div className="dashboard-action-box">
        <h2>{t.createLeague}</h2>
        <input placeholder={t.leagueName} value={leagueName} onChange={(e) => setLeagueName(e.target.value)} />
        <button onClick={createLeague} className="btn green">{t.createLeague}</button>
      </div>
      <div className="dashboard-action-box">
        <h2>{t.joinLeague}</h2>
        <input placeholder={t.inviteCode} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
        <button onClick={joinLeague} className="btn blue">{t.joinLeague}</button>
      </div>
      {isGlobalControlRoomAdmin && (
        <div className="dashboard-action-box owner-only-control-room-box">
          <h2>🌍 Global Control Room</h2>
          <p className="bonus-help">Accesso globale: puoi gestire risultati live/finali e autorizzare nuove email Admin anche senza entrare in una lega.</p>
          <button type="button" onClick={openGlobalControlRoom} className="btn green">Apri Global Control Room</button>
        </div>
      )}
      <h2>{t.myLeagues}</h2>
      {leagues.map((league) => {
        const isOwner = league.owner_id === user.id;
        return <div key={league.id} className="league-box">
          {editingLeagueId === league.id ? <>
            <input value={editingLeagueName} onChange={(e) => setEditingLeagueName(e.target.value)} />
            <button className="btn green" onClick={() => renameLeague(league.id)}>{t.saveLeagueName}</button>
            <button className="btn" onClick={() => { setEditingLeagueId(null); setEditingLeagueName(""); }}>{t.cancel}</button>
          </> : <>
            <div onClick={() => openLeague(league)} style={{ cursor: "pointer" }}><strong>{league.name}</strong><p>{t.code}: {league.code}</p></div>
            {isOwner && <button className="btn blue" onClick={() => { setEditingLeagueId(league.id); setEditingLeagueName(league.name); }}>{t.changeName}</button>}
            <button className="btn" onClick={() => deleteLeague(league)}>{isOwner ? t.deleteLeague : t.leaveLeague}</button>
          </>}
        </div>;
      })}
      <button onClick={logout} className="btn">{t.logout}</button>
      <p>{message}</p>
    </div></div>
  );
}

export default App;

// Step21 - Global Control Room Dashboard + Super Admin only authorization
