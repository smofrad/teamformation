import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export type V2AdminTeamOption = {
  id: string;
  name: string;
};

export type V2AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  teamIds: string[];
};

export async function getV2AdminUsersData(): Promise<{
  teams: V2AdminTeamOption[];
  users: V2AdminUser[];
}> {
  const supabase = createSupabaseServiceRoleClient();
  const [{ data: teams, error: teamsError }, { data: profiles, error: profilesError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase.from("teams").select("id, name").order("name", { ascending: true }),
      supabase.from("profiles").select("id, email, display_name, is_admin").order("created_at", { ascending: true }),
      supabase.from("team_members").select("team_id, user_id"),
    ]);

  if (teamsError || profilesError || membershipsError) {
    throw new Error(teamsError?.message ?? profilesError?.message ?? membershipsError?.message ?? "Unable to load admin data.");
  }

  const teamIdsByUser = new Map<string, string[]>();
  for (const membership of memberships ?? []) {
    const current = teamIdsByUser.get(membership.user_id) ?? [];
    current.push(membership.team_id);
    teamIdsByUser.set(membership.user_id, current);
  }

  return {
    teams: (teams ?? []).map((team) => ({ id: team.id, name: team.name })),
    users: (profiles ?? []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      isAdmin: profile.is_admin,
      teamIds: teamIdsByUser.get(profile.id) ?? [],
    })),
  };
}
