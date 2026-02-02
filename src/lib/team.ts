import { createClient } from '@/lib/supabase/server'
import { TeamMember } from './types'

// Transform database row to TeamMember type
function transformTeamMember(row: Record<string, unknown>): TeamMember {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as string,
    bio: row.bio as string | undefined,
    image: row.image as string | undefined,
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    linkedin: row.linkedin as string | undefined,
    twitter: row.twitter as string | undefined,
    displayOrder: row.display_order as number,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function getActiveTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }

  return (data || []).map(transformTeamMember)
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }

  return (data || []).map(transformTeamMember)
}
