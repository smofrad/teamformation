export type MatchFormat = 7 | 9 | 11;

export type TeamPlayer = {
  id: string;
  name: string;
  shirtNumber: string;
};

export type MatchPlayerPosition = {
  playerId: string;
  x: number;
  y: number;
};

export type PeriodCount = 2 | 3;

export type MatchPeriod = {
  id: string;
  label: string;
  lineup: MatchPlayerPosition[];
  bench: string[];
  isCustomized: boolean;
};

export type MatchRecord = {
  id: string;
  name: string;
  format: MatchFormat;
  periodCount: PeriodCount;
  periods: MatchPeriod[];
  activePeriodId: string;
  createdAt: string;
};

export type TeamRecord = {
  id: string;
  name: string;
  players: TeamPlayer[];
  matches: MatchRecord[];
  activeMatchId: string | null;
};

export type AppState = {
  teams: TeamRecord[];
  activeTeamId: string | null;
};

type LegacyAppState = {
  teamPlayers?: TeamPlayer[];
  matches?: MatchRecord[];
  activeMatchId?: string | null;
};

export const STORAGE_KEY = "football-lineup-builder:v1";

export const DEFAULT_TEAM_PLAYERS: TeamPlayer[] = [
  { id: "player-alex", name: "Alex", shirtNumber: "1" },
  { id: "player-sam", name: "Sam", shirtNumber: "4" },
  { id: "player-jamie", name: "Jamie", shirtNumber: "6" },
  { id: "player-robin", name: "Robin", shirtNumber: "7" },
  { id: "player-taylor", name: "Taylor", shirtNumber: "8" },
  { id: "player-jordan", name: "Jordan", shirtNumber: "9" },
  { id: "player-casey", name: "Casey", shirtNumber: "10" },
  { id: "player-morgan", name: "Morgan", shirtNumber: "11" },
  { id: "player-riley", name: "Riley", shirtNumber: "14" },
  { id: "player-parker", name: "Parker", shirtNumber: "16" },
  { id: "player-drew", name: "Drew", shirtNumber: "18" },
  { id: "player-avery", name: "Avery", shirtNumber: "21" },
];

const DEFAULT_TEAM_ID = "team-1";

export const DEFAULT_STATE: AppState = {
  teams: [
    {
      id: DEFAULT_TEAM_ID,
      name: "My Team",
      players: DEFAULT_TEAM_PLAYERS,
      matches: [],
      activeMatchId: null,
    },
  ],
  activeTeamId: DEFAULT_TEAM_ID,
};

export function readStoredState(): AppState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(raw) as Partial<AppState> & LegacyAppState;
    if (Array.isArray(parsed.teams)) {
      const teams = parsed.teams.map((team, index) => sanitizeTeam(team as TeamRecord, index));
      const activeTeamId =
        typeof parsed.activeTeamId === "string" && teams.some((team) => team.id === parsed.activeTeamId)
          ? parsed.activeTeamId
          : teams[0]?.id ?? null;

      return {
        teams: teams.length > 0 ? teams : DEFAULT_STATE.teams,
        activeTeamId,
      };
    }

    return migrateLegacyState(parsed);
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeStoredState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function sanitizeTeam(team: TeamRecord, index = 0): TeamRecord {
  const players = Array.isArray(team.players) ? team.players : [];
  const matches = Array.isArray(team.matches) ? team.matches.map((match) => sanitizeMatch(match, players)) : [];
  const activeMatchId =
    typeof team.activeMatchId === "string" && matches.some((match) => match.id === team.activeMatchId)
      ? team.activeMatchId
      : matches[0]?.id ?? null;

  return {
    id: team.id || `team-${index + 1}`,
    name: team.name?.trim() || `Team ${index + 1}`,
    players,
    matches,
    activeMatchId,
  };
}

export function sanitizeMatch(match: MatchRecord, teamPlayers: TeamPlayer[]) {
  const periodCount = match.periodCount === 3 ? 3 : 2;
  const rawPeriods = Array.isArray(match.periods)
    ? match.periods
    : [
        {
          id: "period-1",
          label: "1st half",
          lineup: (match as MatchRecord & { lineup?: MatchPlayerPosition[] }).lineup ?? [],
          bench: (match as MatchRecord & { bench?: string[] }).bench ?? [],
        },
      ];
  const validPlayerIds = new Set(teamPlayers.map((player) => player.id));
  const normalizedPeriods = getPeriodTemplates(periodCount).map((template, index) => {
    const candidate = rawPeriods[index];
    const lineupSource = candidate?.lineup ?? rawPeriods[0]?.lineup ?? [];
    const benchSource = candidate?.bench ?? rawPeriods[0]?.bench ?? [];
    const dedupedLineup = lineupSource.filter(
      (item, lineupIndex, array) =>
        validPlayerIds.has(item.playerId) &&
        lineupIndex === array.findIndex((lineupCandidate) => lineupCandidate.playerId === item.playerId)
    );
    const cappedLineup = dedupedLineup.slice(0, match.format);
    const lineupIds = new Set(cappedLineup.map((item) => item.playerId));
    const overflowBenchIds = dedupedLineup.slice(match.format).map((item) => item.playerId);
    const dedupedBench = benchSource.filter(
      (playerId, benchIndex, array) =>
        validPlayerIds.has(playerId) && !lineupIds.has(playerId) && array.indexOf(playerId) === benchIndex
    );

    return {
      id: candidate?.id ?? template.id,
      label: template.label,
      lineup: cappedLineup,
      bench: [...dedupedBench, ...overflowBenchIds.filter((playerId) => !dedupedBench.includes(playerId))],
      isCustomized: typeof candidate?.isCustomized === "boolean" ? candidate.isCustomized : index === 0,
    };
  });

  const activePeriodId = normalizedPeriods.some((period) => period.id === match.activePeriodId)
    ? match.activePeriodId
    : normalizedPeriods[0]?.id ?? "period-1";

  return {
    ...match,
    periodCount,
    periods: normalizedPeriods,
    activePeriodId,
  };
}

export function getPeriodTemplates(periodCount: PeriodCount) {
  return periodCount === 3
    ? [
        { id: "period-1", label: "Period 1" },
        { id: "period-2", label: "Period 2" },
        { id: "period-3", label: "Period 3" },
      ]
    : [
        { id: "period-1", label: "1st half" },
        { id: "period-2", label: "2nd half" },
      ];
}

export function getActiveTeam(state: AppState) {
  return state.teams.find((team) => team.id === state.activeTeamId) ?? state.teams[0] ?? null;
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
}

function migrateLegacyState(parsed: LegacyAppState): AppState {
  const players = Array.isArray(parsed.teamPlayers) ? parsed.teamPlayers : DEFAULT_TEAM_PLAYERS;
  const matches = Array.isArray(parsed.matches) ? parsed.matches.map((match) => sanitizeMatch(match, players)) : [];
  const activeMatchId =
    typeof parsed.activeMatchId === "string" && matches.some((match) => match.id === parsed.activeMatchId)
      ? parsed.activeMatchId
      : matches[0]?.id ?? null;

  return {
    teams: [
      {
        id: DEFAULT_TEAM_ID,
        name: "My Team",
        players,
        matches,
        activeMatchId,
      },
    ],
    activeTeamId: DEFAULT_TEAM_ID,
  };
}
