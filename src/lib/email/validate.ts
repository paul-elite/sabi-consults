// Validates workflow definitions coming from the automation builder.
import { CONDITION_LABELS, EXIT_EVENTS, LEAD_STATUSES, TRIGGERS, type Condition, type Step } from './defaults'
import { cleanText } from '@/lib/sanitize'

const CHECKS = new Set(Object.keys(CONDITION_LABELS))
const AUDIENCES = new Set(['transactional', 'service', 'marketing'])

function cleanCondition(raw: Record<string, unknown>): Condition | string {
  const check = String(raw.check || '')
  if (!CHECKS.has(check)) return `Unknown condition "${check}"`
  const values = Array.isArray(raw.values) ? raw.values.map(v => cleanText(v, 60)).filter(Boolean).slice(0, 20) : undefined
  return { check: check as Condition['check'], ...(values?.length ? { values } : {}), else: raw.else === 'skip_next' ? 'skip_next' : 'stop' }
}

export function validateAutomation(raw: Record<string, unknown>, templateKeys: Set<string>): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const name = cleanText(raw.name, 120)
  if (!name) return { ok: false, error: 'Give the workflow a name' }
  const trigger = String(raw.trigger || '')
  if (!TRIGGERS[trigger]) return { ok: false, error: 'Choose a trigger' }

  const conditions: Condition[] = []
  for (const c of Array.isArray(raw.conditions) ? raw.conditions : []) {
    const r = cleanCondition(c as Record<string, unknown>)
    if (typeof r === 'string') return { ok: false, error: r }
    conditions.push(r)
  }

  const steps: Step[] = []
  const list = Array.isArray(raw.steps) ? raw.steps : []
  if (!list.length) return { ok: false, error: 'Add at least one step' }
  if (list.length > 30) return { ok: false, error: 'A workflow can have up to 30 steps' }
  for (const [i, s] of list.entries()) {
    const step = s as Record<string, unknown>
    const n = i + 1
    switch (step.type) {
      case 'email': {
        const t = String(step.template || '')
        if (t !== 'auto:enquiry' && !templateKeys.has(t)) return { ok: false, error: `Step ${n}: choose a template` }
        const to = ['contact', 'assigned_agent', 'team'].includes(String(step.to)) ? String(step.to) : 'contact'
        const category = AUDIENCES.has(String(step.category)) ? String(step.category) : undefined
        steps.push({ type: 'email', template: t, to: to as 'contact', ...(category ? { category: category as 'marketing' } : {}) })
        break
      }
      case 'notify': {
        const t = String(step.template || '')
        if (!templateKeys.has(t)) return { ok: false, error: `Step ${n}: choose a notification template` }
        const to = ['assigned_agent', 'team', 'agent_or_team'].includes(String(step.to)) ? String(step.to) : 'agent_or_team'
        steps.push({ type: 'notify', template: t, to: to as 'team' })
        break
      }
      case 'wait': {
        const minutes = Math.round(Number(step.minutes))
        if (!(minutes >= 1 && minutes <= 365 * 24 * 60)) return { ok: false, error: `Step ${n}: wait between 1 minute and 365 days` }
        steps.push({ type: 'wait', minutes })
        break
      }
      case 'condition': {
        const r = cleanCondition(step)
        if (typeof r === 'string') return { ok: false, error: `Step ${n}: ${r}` }
        steps.push({ type: 'condition', ...r })
        break
      }
      case 'update_lead': {
        const status = String(step.status || '')
        if (!LEAD_STATUSES.some(s => s.value === status)) return { ok: false, error: `Step ${n}: choose a lead status` }
        steps.push({ type: 'update_lead', status })
        break
      }
      case 'add_tag': {
        const tag = cleanText(step.tag, 40).toLowerCase()
        if (!tag) return { ok: false, error: `Step ${n}: enter a tag` }
        steps.push({ type: 'add_tag', tag })
        break
      }
      default:
        return { ok: false, error: `Step ${n}: unknown step type` }
    }
  }
  const exit_on = (Array.isArray(raw.exit_on) ? raw.exit_on : []).map(String).filter(e => EXIT_EVENTS[e])
  return {
    ok: true,
    value: {
      name, description: cleanText(raw.description, 500) || null, trigger, conditions, steps, exit_on,
      allow_reenrol: raw.allow_reenrol === true, active: raw.active !== false,
    },
  }
}
