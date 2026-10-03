'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Delete02Icon, UserGroupIcon, UserIcon } from '@hugeicons/core-free-icons'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAdminUser, canAccess } from '@/components/admin/AdminNav'

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
  const user = useAdminUser()
  const canEdit = canAccess(user, 'admin') // admin or super_admin can edit team
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
        setMembers(Array.isArray(data) ? data : [])
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
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-neutral-500 hover:text-ink transition-colors">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
            </Link>
            <span className="text-lg font-semibold text-ink">Team Members</span>
          </div>
          {canEdit && (
            <Link
              href="/admin/team/new"
              className="btn btn-md btn-brand"
            >
              Add Member
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {members.length === 0 ? (
          <div className="card p-12 text-center">
            <HugeiconsIcon icon={UserGroupIcon} className="w-12 h-12 mx-auto text-neutral-300 mb-4" strokeWidth={1.7} aria-hidden="true" />
            <p className="text-neutral-500 mb-4">No team members yet</p>
            {canEdit && (
              <Link
                href="/admin/team/new"
                className="btn btn-md btn-brand"
              >
                Add Your First Team Member
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <div
                key={member.id}
                className={`card overflow-hidden ${!member.is_active ? 'opacity-60' : ''}`}
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
                      <HugeiconsIcon icon={UserIcon} className="w-16 h-16 text-neutral-300" strokeWidth={1.7} aria-hidden="true" />
                    </div>
                  )}
                  {!member.is_active && (
                    <div className="absolute top-2 right-2 badge badge-warning">
                      Inactive
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-ink">{member.name}</h3>
                  <p className="text-sm text-brand mb-2">{member.role}</p>
                  {member.email && (
                    <p className="text-xs text-neutral-500">{member.email}</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">Order: {member.display_order}</p>
                </div>

                {/* Actions */}
                {canEdit ? (
                  <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/team/${member.id}`}
                        className="btn btn-sm btn-ghost text-brand"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => toggleActive(member)}
                        className="btn btn-sm btn-ghost"
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(member.id, member.name)}
                      disabled={deleting === member.id}
                      className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 border-t border-neutral-100">
                    <span className="text-xs text-neutral-400">View only</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
