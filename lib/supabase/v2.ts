import { createSupabaseServerClient } from "@/lib/supabase/server";

export type V2TeamSummary = {
  id: string;
  name: string;
  createdAt: string;
  playerCount: number;
  matchCount: number;
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
  opponent: string;
  matchDate: string;
  format: 7 | 9 | 11;
  periodCount: 2 | 3;
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

export type V2MatchDetail = {
  id: string;
  teamId: string;
  teamName: string;
  opponent: string;
  matchDate: string;
  format: 7 | 9 | 11;
  periodCount: 2 | 3;
  activePeriodNumber: number;
  players: V2Player[];
  periods: V2MatchPeriod[];
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
        matches(count)
      `
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    createdAt: team.created_at,
    playerCount: team.players?.[0]?.count ?? 0,
    matchCount: team.matches?.[0]?.count ?? 0,
  }));
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
          opponent,
          match_date,
          format,
          period_count,
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
        opponent: match.opponent,
        matchDate: match.match_date,
        format: match.format,
        periodCount: match.period_count,
        createdAt: match.created_at,
      }))
      .sort((a, b) => Number(new Date(b.matchDate)) - Number(new Date(a.matchDate))),
  };
}

export async function getV2MatchDetail(teamId: string, matchId: string): Promise<V2MatchDetail | null> {
  const supabase = await createSupabaseServerClient();

  const [{ data: team, error: teamError }, { data: match, error: matchError }, { data: history, error: historyError }] =
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
            opponent,
            match_date,
            format,
            period_count,
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
    ]);

  if (teamError || matchError || historyError) {
    const code = teamError?.code ?? matchError?.code ?? historyError?.code;
    if (code === "PGRST116") {
      return null;
    }

    throw new Error(teamError?.message ?? matchError?.message ?? historyError?.message ?? "Unable to load match.");
  }

  if (!team || !match) {
    return null;
  }

  return {
    id: match.id,
    teamId: match.team_id,
    teamName: team.name,
    opponent: match.opponent,
    matchDate: match.match_date,
    format: match.format,
    periodCount: match.period_count,
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
    history: (history ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      createdAt: item.created_at,
      userDisplayName:
        item.profiles && !Array.isArray(item.profiles) ? (item.profiles.display_name ?? null) : null,
    })),
  };
}
