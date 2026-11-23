// Offline checks for the email system's pure logic: template rendering,
// conditions, escaping, consent rules, workflow validation, CSV and tokens.
// Run: npx tsx scripts/test-email.ts
import assert from 'node:assert/strict'

process.env.SESSION_SECRET ||= 'test-secret-test-secret-test-secret-123'

async function main() {
  const { renderEmail, applyConditions, substitute } = await import('../src/lib/email/render')
  const { DEFAULT_TEMPLATES, DEFAULT_AUTOMATIONS } = await import('../src/lib/email/defaults')
  const { validateAutomation } = await import('../src/lib/email/validate')
  const { blockReason, clickTag, verifyClick, addTracking } = await import('../src/lib/email/send')
  const { parseCsv, csvEscape } = await import('../src/lib/email/api')
  const { contactToken, readContactToken } = await import('../src/lib/email/contacts')
  const { describe, cleanInterests } = await import('../src/lib/email/forms')
  const { propertyMatches } = await import('../src/lib/email/context')

  let passed = 0
  const test = (name: string, fn: () => void) => { fn(); passed++; console.log('✓', name) }

  const layout = { brandName: 'Sabi Consults', brandColor: '#0055CC', siteUrl: 'https://sabi.test', audience: 'marketing' as const, prefsUrl: 'https://sabi.test/p', unsubscribeUrl: 'https://sabi.test/u', whatsapp: '2349112122288', address: 'Wuse II' }
  const property = { id: 'p1', title: '4 Bed Duplex', district: 'Gwarinpa', type: 'house', price: 120000000, status: 'available', bedrooms: 4, bathrooms: 5, images: ['https://img.test/a.jpg'], description: '<p>Lovely home</p>' }

  test('conditions: if / else / nested / inline', () => {
    const vars = { a: 'land', b: true, c: '' }
    assert.equal(applyConditions('[[if a=land]]L[[else]]H[[endif]]', vars), 'L')
    assert.equal(applyConditions('[[if a=house]]L[[else]]H[[endif]]', vars), 'H')
    assert.equal(applyConditions('[[if a!=house]]X[[endif]]', vars), 'X')
    assert.equal(applyConditions('[[if b]]1[[if c]]2[[endif]]3[[endif]]', vars), '13')
    assert.equal(applyConditions('[[if a=house,land]]ok[[endif]]', vars), 'ok')
  })

  test('variables are escaped and cannot inject links or HTML', () => {
    const out = substitute('Hi {{name}}', { name: '<script>x</script>[evil](https://bad)' }, 'html')
    assert.ok(!out.includes('<script>'))
    assert.ok(!out.includes('[evil]'))
    const r = renderEmail({ subject: 'Hi {{name}}', body: 'Hello {{name}}' }, { vars: { name: '<b>x</b>**bold**' } }, layout)
    assert.ok(!r.html.includes('<b>x</b>'))
    assert.ok(!r.html.includes('<strong>bold</strong>'))
  })

  test('fallbacks and empty variables', () => {
    const r = renderEmail({ subject: 'Hi {{first_name|there}}', body: 'Hi {{first_name|there}},\n\n{{note}}\n\nEnd' }, { vars: {} }, layout)
    assert.equal(r.subject, 'Hi there')
    assert.ok(r.html.includes('Hi there,'))
    assert.ok(!r.html.includes('{{'))
  })

  test('every built-in template renders with no leftover syntax', () => {
    for (const t of DEFAULT_TEMPLATES) {
      for (const property_type of ['land', 'house']) {
        for (const enquiry_type of ['general', 'valuation', 'owner_listing', 'developer']) {
          const r = renderEmail(t, {
            vars: { first_name: 'Ada', property_type, enquiry_type, reference: 'SC-1', property_url: 'https://sabi.test/x', has_properties: true, maps_url: 'https://maps.test', confirm_url: 'https://c', guide_url: 'https://g', prefs_url: 'https://p', site_url: 'https://sabi.test', transaction_stage: 'offer_accepted' },
            property, properties: [property], agent: { name: 'Ade', phone: '+234', email: 'a@b.c' },
            inspection: { rows: [['Date', 'Mon']] }, enquiry: { rows: [['Ref', 'SC-1']] }, lead: { rows: [['Name', 'Ada']] }, transaction: { rows: [['Ref', 'TX']] },
          }, { ...layout, audience: t.audience })
          assert.ok(!/\{\{|\}\}|\[\[|\]\]/.test(r.html.replace(/<style[\s\S]*?<\/style>/, '')), `${t.key} (${property_type}/${enquiry_type}) leaves syntax: ${r.html.match(/.{30}(\{\{|\[\[).{30}/)?.[0]}`)
          assert.ok(r.subject.length > 0 && !/\[\[|\{\{/.test(r.subject), `${t.key} subject`)
          assert.ok(r.text.length > 0)
        }
      }
    }
  })

  test('contextual enquiry wording: land vs house', () => {
    const t = DEFAULT_TEMPLATES.find(x => x.key === 'property_enquiry_confirmation')!
    const land = renderEmail(t, { vars: { property_type: 'land', property_title: 'Plot', reference: 'R' }, property }, layout)
    const house = renderEmail(t, { vars: { property_type: 'house', property_title: 'Home', reference: 'R' }, property }, layout)
    assert.ok(land.text.includes('site visit'))
    assert.ok(!house.text.includes('site visit'))
    assert.ok(house.text.includes('inspection'))
  })

  test('marketing footer has unsubscribe; transactional does not', () => {
    const m = renderEmail({ subject: 's', body: 'b' }, { vars: {} }, layout)
    assert.ok(m.html.includes('https://sabi.test/u'))
    const t = renderEmail({ subject: 's', body: 'b' }, { vars: {} }, { ...layout, audience: 'transactional', unsubscribeUrl: undefined, prefsUrl: undefined })
    assert.ok(!t.html.includes('Unsubscribe'))
  })

  test('property card uses real data and escapes', () => {
    const r = renderEmail({ subject: 's', body: '[[property]]' }, { vars: {}, property: { ...property, title: 'A & B <x>' } }, layout)
    assert.ok(r.html.includes('A &amp; B &lt;x&gt;'))
    assert.ok(r.html.includes('₦120,000,000'))
    assert.ok(r.html.includes('4 beds'))
  })

  test('unsafe link schemes are dropped', () => {
    const r = renderEmail({ subject: 's', body: '[click](javascript:alert(1))\n\n[[button Go | javascript:x]]' }, { vars: {} }, layout)
    assert.ok(!r.html.includes('javascript:'))
  })

  test('consent rules', () => {
    const base = { marketing_status: 'none' as const, followups_opt_out: false, suppressed: false, archived_at: null }
    assert.equal(blockReason(base, 'transactional'), null)
    assert.ok(blockReason(base, 'marketing'))
    assert.equal(blockReason({ ...base, marketing_status: 'subscribed' }, 'marketing'), null)
    assert.ok(blockReason({ ...base, marketing_status: 'pending' }, 'marketing'), 'pending is not consent')
    assert.equal(blockReason(base, 'service'), null)
    assert.ok(blockReason({ ...base, followups_opt_out: true }, 'service'))
    assert.ok(blockReason({ ...base, marketing_status: 'unsubscribed' }, 'service'), 'unsubscribing stops follow-ups too')
    assert.equal(blockReason({ ...base, marketing_status: 'unsubscribed' }, 'transactional'), null, 'transactional still allowed')
    assert.ok(blockReason({ ...base, suppressed: true }, 'transactional'), 'bounced addresses get nothing')
  })

  test('click tracking: signed, UTM on own site only, unsubscribe untracked', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://sabi.test'
    const html = '<a href="https://sabi.test/properties/1">x</a><a href="https://other.com/">y</a><a href="https://sabi.test/u" data-notrack="1">u</a><a href="tel:+234">t</a></body>'
    const out = addTracking(html, '11111111-1111-1111-1111-111111111111', 'dec-news', 'newsletter', true)
    const links = [...out.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'))
    assert.ok(links[0].startsWith('https://sabi.test/api/email/c/'))
    const target = Buffer.from(new URL(links[0]).searchParams.get('u')!, 'base64url').toString()
    assert.ok(target.includes('utm_source=email') && target.includes('utm_campaign=dec-news'))
    assert.ok(verifyClick('11111111-1111-1111-1111-111111111111', target, new URL(links[0]).searchParams.get('s')!))
    assert.ok(!verifyClick('11111111-1111-1111-1111-111111111111', 'https://evil.com', new URL(links[0]).searchParams.get('s')!))
    const other = Buffer.from(new URL(links[1]).searchParams.get('u')!, 'base64url').toString()
    assert.equal(other, 'https://other.com/', 'no UTM on other sites')
    assert.equal(links[2], 'https://sabi.test/u')
    assert.equal(links[3], 'tel:+234')
    assert.ok(!out.includes('data-notrack'))
    assert.ok(out.includes('/api/email/o/'))
    assert.equal(clickTag('a', 'b').length, 16)
  })

  test('signed contact links', () => {
    const id = '22222222-2222-2222-2222-222222222222'
    const t = contactToken(id, 'unsub')
    assert.equal(readContactToken(t, 'unsub'), id)
    assert.equal(readContactToken(t, 'prefs'), null, 'token is purpose-bound')
    assert.equal(readContactToken(t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'), 'unsub'), null)
    assert.equal(readContactToken('33333333-3333-3333-3333-333333333333.' + t.split('.')[1], 'unsub'), null)
  })

  test('workflow validation', () => {
    const keys = new Set(DEFAULT_TEMPLATES.map(t => t.key))
    for (const a of DEFAULT_AUTOMATIONS) {
      const v = validateAutomation(a as unknown as Record<string, unknown>, keys)
      assert.ok(v.ok, `${a.key}: ${!v.ok && v.error}`)
    }
    assert.ok(!validateAutomation({ name: 'x', trigger: 'nope', steps: [{ type: 'wait', minutes: 5 }] }, keys).ok)
    assert.ok(!validateAutomation({ name: 'x', trigger: 'inquiry.created', steps: [{ type: 'email', template: 'missing' }] }, keys).ok)
    assert.ok(!validateAutomation({ name: 'x', trigger: 'inquiry.created', steps: [{ type: 'wait', minutes: 0 }] }, keys).ok)
    assert.ok(!validateAutomation({ name: 'x', trigger: 'inquiry.created', steps: [] }, keys).ok)
  })

  test('CSV parse and formula-safe export', () => {
    const rows = parseCsv('email,name\r\na@b.com,"Okafor, Ada"\n"c@d.com","Say ""hi"""\n\n')
    assert.deepEqual(rows, [['email', 'name'], ['a@b.com', 'Okafor, Ada'], ['c@d.com', 'Say "hi"']])
    assert.equal(csvEscape('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`)
    assert.equal(csvEscape(['a', 'b']), 'a; b')
  })

  test('alert matching and descriptions', () => {
    const c = cleanInterests({ types: ['house', 'boat'], districts: ['Gwarinpa'], maxBudget: '150000000', bedrooms: 3 })
    assert.deepEqual(c.types, ['house'])
    assert.ok(propertyMatches(property as never, c))
    assert.ok(!propertyMatches({ ...property, district: 'Maitama' } as never, c))
    assert.ok(!propertyMatches({ ...property, price: 200000000 } as never, c))
    assert.ok(!propertyMatches({ ...property, bedrooms: 2 } as never, c))
    assert.ok(propertyMatches({ ...property, price: 0 } as never, c), 'price on request still matches')
    assert.equal(describe(c), 'Houses with 3+ bedrooms in Gwarinpa up to ₦150,000,000')
  })

  console.log(`\n${passed} checks passed`)
}

main().catch(e => { console.error(e); process.exit(1) })
