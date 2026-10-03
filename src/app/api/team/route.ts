import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

// GET all team members
export async function GET() {
  try {
    const currentUser = await getSession()
    const supabase = await createAdminClient()

    // If authenticated, return all members; otherwise only active ones
    let query = supabase
      .from('team_members')
      .select('*')
      .order('display_order', { ascending: true })

    if (!currentUser) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}

// POST create new team member
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSession()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, role, bio, image, email, phone, linkedin, twitter, displayOrder, isActive } = body

    if (!name || !role) {
      return NextResponse.json(
        { error: 'Name and role are required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('team_members')
      .insert({
        name,
        role,
        bio: bio || null,
        image: image || null,
        email: email || null,
        phone: phone || null,
        linkedin: linkedin || null,
        twitter: twitter || null,
        display_order: displayOrder || 0,
        is_active: isActive !== false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating team member:', error)
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
  }
}
