import { NextRequest, NextResponse } from 'next/server'
import { hasRole, requireRole, serviceClient as db, type SessionUser } from '@/lib/auth'

const SETTING_KEY = 'content_planner_items'

type PlannerItem = {
  id: string
  title: string
  channel: string
  date: string
  time: string
  theme: string
  note: string
  imageUrl?: string
  imageName?: string
  assignedToId?: string
  assignedToName?: string
  assignedToEmail?: string
}

function staffOption(user: SessionUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

function cleanItem(item: Partial<PlannerItem>): PlannerItem {
  return {
    id: String(item.id || `plan-${Date.now()}`),
    title: String(item.title || 'Untitled content').slice(0, 160),
    channel: String(item.channel || 'Instagram').slice(0, 40),
    date: String(item.date || '').slice(0, 10),
    time: String(item.time || '09:00').slice(0, 5),
    theme: String(item.theme || 'General').slice(0, 120),
    note: String(item.note || '').slice(0, 2000),
    imageUrl: String(item.imageUrl || '').slice(0, 1000),
    imageName: String(item.imageName || '').slice(0, 160),
    assignedToId: String(item.assignedToId || '').slice(0, 80),
    assignedToName: String(item.assignedToName || '').slice(0, 120),
    assignedToEmail: String(item.assignedToEmail || '').slice(0, 254),
  }
}

async function loadItems(client: NonNullable<ReturnType<typeof db>>) {
  const { data, error } = await client
    .from('site_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle()

  if (error) throw error
  if (!data?.value) return []

  try {
    const parsed = JSON.parse(data.value)
    return Array.isArray(parsed) ? parsed.map(cleanItem) : []
  } catch {
    return []
  }
}

async function loadStaff(client: NonNullable<ReturnType<typeof db>>, user: SessionUser) {
  if (!hasRole(user, 'admin')) return [staffOption(user)]

  const { data, error } = await client
    .from('admin_users')
    .select('id, name, email, role, active')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) throw error
  const staff = (data || []).map(row => ({ id: row.id, name: row.name, email: row.email, role: row.role }))
  return user.id === 'env' ? [staffOption(user), ...staff] : staff
}

export async function GET() {
  const auth = await requireRole('staff')
  if (auth instanceof NextResponse) return auth
  const client = db()
  if (!client) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })

  try {
    const [items, staff] = await Promise.all([loadItems(client), loadStaff(client, auth)])
    const visibleItems = hasRole(auth, 'admin')
      ? items
      : items.filter(item => item.assignedToId === auth.id || item.assignedToEmail === auth.email)

    return NextResponse.json({ user: auth, staff, items: visibleItems, canManage: hasRole(auth, 'admin') })
  } catch (error) {
    console.error('Content planner load error:', error)
    return NextResponse.json({ error: 'Couldn’t load the content planner' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole('admin')
  if (auth instanceof NextResponse) return auth
  const client = db()
  if (!client) return NextResponse.json({ error: 'The database isn’t configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const items = Array.isArray(body?.items) ? body.items.map(cleanItem) : []

  const { error } = await client
    .from('site_settings')
    .upsert({ key: SETTING_KEY, value: JSON.stringify(items), updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) {
    console.error('Content planner save error:', error)
    return NextResponse.json({ error: 'Couldn’t save the content planner' }, { status: 500 })
  }

  return NextResponse.json({ items })
}
