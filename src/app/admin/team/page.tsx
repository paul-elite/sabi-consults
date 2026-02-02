'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface TeamMember {
  id: string
  name: string
  role: string
  bio: string | null
  image: string | null
  email: string | null
  display_order: number
  is_active: boolean
}

export default function AdminTeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        const authRes = await fetch('/api/auth')
        const authData = await authRes.json()
        if (!authData.authenticated) {
          router.push('/admin')
          return
        }

        const res = await fetch('/api/team')
        const data = await res.json()
        setMembers(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [router])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the team?`)) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMembers(members.filter(m => m.id !== id))
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(null)
    }
  }

  const toggleActive = async (member: TeamMember) => {
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...member,
          isActive: !member.is_active,
          displayOrder: member.display_order,
        }),
      })
      if (res.ok) {
        setMembers(members.map(m =>
          m.id === member.id ? { ...m, is_active: !m.is_active } : m
        ))
      }
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-xl font-semibold">Team Members</span>
          </div>
          <Link
            href="/admin/team/new"
            className="px-4 py-2 bg-[#0055CC] text-white text-sm font-medium hover:bg-[#0044aa] transition-colors"
          >
            Add Member
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {members.length === 0 ? (
          <div className="bg-white border border-neutral-200 p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-neutral-500 mb-4">No team members yet</p>
            <Link
              href="/admin/team/new"
              className="inline-flex px-6 py-3 bg-[#0055CC] text-white text-sm font-medium hover:bg-[#0044aa] transition-colors"
            >
              Add Your First Team Member
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <div
                key={member.id}
                className={`bg-white border border-neutral-200 overflow-hidden ${!member.is_active ? 'opacity-60' : ''}`}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {member.image ? (
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  {!member.is_active && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium">
                      Inactive
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-[#1a1a1a]">{member.name}</h3>
                  <p className="text-sm text-[#0055CC] mb-2">{member.role}</p>
                  {member.email && (
                    <p className="text-xs text-neutral-500">{member.email}</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">Order: {member.display_order}</p>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/team/${member.id}`}
                      className="px-3 py-1.5 text-sm text-[#0055CC] hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleActive(member)}
                      className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(member.id, member.name)}
                    disabled={deleting === member.id}
                    className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
