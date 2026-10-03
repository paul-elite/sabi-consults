
import { HugeiconsIcon } from '@hugeicons/react'
import { Linkedin01Icon, Mail01Icon, NewTwitterIcon, UserIcon } from '@hugeicons/core-free-icons'
import Image from 'next/image'
import Link from 'next/link'
import { getActiveTeamMembers } from '@/lib/team'

export default async function TeamSection() {
  const teamMembers = await getActiveTeamMembers()

  if (teamMembers.length === 0) {
    return null
  }

  return (
    <section className="py-24 bg-brand-soft">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-brand uppercase tracking-wider mb-2">
            Our Team
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink mb-4">
            Meet the Experts
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Our team brings together decades of combined experience in Abuja real estate,
            client service, and property investment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <div key={member.id} className="bg-white group rounded-xl overflow-hidden">
              {/* Image */}
              <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HugeiconsIcon icon={UserIcon} className="w-20 h-20 text-neutral-300" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-ink">{member.name}</h3>
                <p className="text-sm text-brand mb-3">{member.role}</p>

                {member.bio && (
                  <p className="text-sm text-neutral-600 line-clamp-3 mb-4">
                    {member.bio}
                  </p>
                )}

                {/* Social Links */}
                <div className="flex items-center gap-3">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="p-2 text-neutral-400 hover:text-brand transition-colors"
                      title={`Email ${member.name}`}
                    >
                      <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                    </a>
                  )}
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-neutral-400 hover:text-brand transition-colors"
                      title={`${member.name}'s LinkedIn`}
                    >
                      <HugeiconsIcon icon={Linkedin01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                    </a>
                  )}
                  {member.twitter && (
                    <a
                      href={member.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-neutral-400 hover:text-brand transition-colors"
                      title={`${member.name}'s Twitter`}
                    >
                      <HugeiconsIcon icon={NewTwitterIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
