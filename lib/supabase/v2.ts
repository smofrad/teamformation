import { createSupabaseServerClient } from "@/lib/supabase/server";

export type V2TeamSummary = {
  id: string;
  name: string;
  createdAt: string;
  playerCount: number;
  matchCount: number;
  latestMatchId: string | null;
};

export type V2Player = {
  id: string;
  name: string;
  shirtNumber: string;
  createdAt: string;
};

export type V2TeamDetail = {
  id: string;
  name: string;
  createdAt: string;
  players: V2Player[];
  matches: V2MatchSummary[];
};

export type V2MatchSummary = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  format: 7 | 9 | 11;
  periodCount: 2 | 3;
  periodLengthMinutes: number;
  createdAt: string;
};

export type V2PeriodPlayer = {
  playerId: string;
  zone: "pitch" | "bench";
  x: number | null;
  y: number | null;
};

export type V2MatchPeriod = {
  id: string;
  periodNumber: number;
  label: string;
  isCustomized: boolean;
  players: V2PeriodPlayer[];
};

export type V2MatchHistoryItem = {
  id: string;
  action: string;
  createdAt: string;
  userDisplayName: string | null;
};

export type V2MatchGoal = {
  id: string;
  periodNumber: number;
  teamSide: "home" | "away";
  scorerName: string;
  minute: number;
};

export type V2MatchDetail = {
  id: string;
  teamId: string;
  teamName: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  format: 7 | 9 | 11;
  periodCount: 2 | 3;
  periodLengthMinutes: number;
  activePeriodNumber: number;
  players: V2Player[];
  periods: V2MatchPeriod[];
  goals: V2MatchGoal[];
  history: V2MatchHistoryItem[];
};

export async function getV2TeamsForCurrentUser(): Promise<V2TeamSummary[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("teams")
    .select(
      `
        id,
        name,
        created_at,
        players(count),
        matches(
          id,
          match_date,
          created_at
        )
      `
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((team) => {
    const sortedMatches = [...(team.matches ?? [])].sort(
      (a, b) => Number(new Date(b.match_date ?? b.created_at)) - Number(new Date(a.match_date ?? a.created_at))
    );

    return {
      id: team.id,
      name: team.name,
      createdAt: team.created_at,
      playerCount: team.players?.[0]?.count ?? 0,
      matchCount: team.matches?.length ?? 0,
      latestMatchId: sortedMatches[0]?.id ?? null,
    };
  });
}

export async function getV2TeamDetail(teamId: string): Promise<V2TeamDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("teams")
    .select(
      `
        id,
        name,
        created_at,
        players (
          id,
          name,
          shirt_number,
          created_at
        ),
        matches (
          id,
          home_team,
          away_team,
          match_date,
          format,
          period_count,
          period_length_minutes,
          created_at
        )
      `
    )
    .eq("id", teamId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    players: (data.players ?? [])
      .map((player) => ({
        id: player.id,
        name: player.name,
        shirtNumber: player.shirt_number,
        createdAt: player.created_at,
      }))
      .sort((a, b) => Number(a.shirtNumber) - Number(b.shirtNumber) || a.name.localeCompare(b.name)),
    matches: (data.matches ?? [])
      .map((match) => ({
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        matchDate: match.match_date,
        format: match.format,
        periodCount: match.period_count,
        periodLengthMinutes: match.period_length_minutes,
        createdAt: match.created_at,
      }))
      .sort((a, b) => Number(new Date(b.matchDate)) - Number(new Date(a.matchDate))),
  };
}

export async function getV2MatchDetail(teamId: string, matchId: string): Promise<V2MatchDetail | null> {
  const supabase = await createSupabaseServerClient();

  const [{ data: team, error: teamError }, { data: match, error: matchError }, { data: history, error: historyError }, { data: goals, error: goalsError }] =
    await Promise.all([
      supabase
        .from("teams")
        .select(
          `
            id,
            name,
            players (
              id,
              name,
              shirt_number,
              created_at
            )
          `
        )
        .eq("id", teamId)
        .single(),
      supabase
        .from("matches")
        .select(
          `
            id,
            team_id,
            home_team,
            away_team,
            match_date,
            format,
            period_count,
            period_length_minutes,
            active_period_number,
            match_periods (
              id,
              period_number,
              label,
              is_customized,
              period_players (
                player_id,
                zone,
                x,
                y
              )
            )
          `
        )
        .eq("id", matchId)
        .eq("team_id", teamId)
        .single(),
      supabase
        .from("match_history")
        .select(
          `
            id,
            action,
            created_at,
            profiles:user_id (
              display_name
            )
          `
        )
        .eq("match_id", matchId)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("match_goals")
        .select(
          `
            id,
            period_number,
            team_side,
            scorer_name,
            minute
          `
        )
        .eq("match_id", matchId)
        .eq("team_id", teamId)
        .order("minute", { ascending: true }),
    ]);

  if (teamError || matchError || historyError || goalsError) {
    const code = teamError?.code ?? matchError?.code ?? historyError?.code ?? goalsError?.code;
    if (code === "PGRST116") {
      return null;
    }

    throw new Error(teamError?.message ?? matchError?.message ?? historyError?.message ?? goalsError?.message ?? "Unable to load match.");
  }

  if (!team || !match) {
    return null;
  }

  return {
    id: match.id,
    teamId: match.team_id,
    teamName: team.name,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    matchDate: match.match_date,
    format: match.format,
    periodCount: match.period_count,
    periodLengthMinutes: match.period_length_minutes,
    activePeriodNumber: match.active_period_number,
    players: (team.players ?? [])
      .map((player) => ({
        id: player.id,
        name: player.name,
        shirtNumber: player.shirt_number,
        createdAt: player.created_at,
      }))
      .sort((a, b) => Number(a.shirtNumber) - Number(b.shirtNumber) || a.name.localeCompare(b.name)),
    periods: (match.match_periods ?? [])
      .map((period) => ({
        id: period.id,
        periodNumber: period.period_number,
        label: period.label,
        isCustomized: period.is_customized,
        players: (period.period_players ?? []).map((item) => ({
          playerId: item.player_id,
          zone: item.zone,
          x: item.x,
          y: item.y,
        })),
      }))
      .sort((a, b) => a.periodNumber - b.periodNumber),
    goals: (goals ?? []).map((goal) => ({
      id: goal.id,
      periodNumber: goal.period_number,
      teamSide: goal.team_side,
      scorerName: goal.scorer_name,
      minute: goal.minute,
    })),
    history: (history ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      createdAt: item.created_at,
      userDisplayName:
        item.profiles && !Array.isArray(item.profiles) ? (item.profiles.display_name ?? null) : null,
    })),
  };
}
