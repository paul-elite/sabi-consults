// Built-in templates and workflows. They are copied into the database on first
// use; after that admins edit the database copy and these stay as the "reset" version.
//
// Template body syntax (also shown in the editor):
//   # Heading / ## Subheading, blank line between paragraphs, "- " for lists,
//   **bold**, [link text](https://...), {{variable}} or {{variable|fallback}}
//   Blocks on their own line: [[property]] [[properties]] [[agent]] [[inspection]]
//   [[enquiry]] [[lead]] [[transaction]] [[divider]] [[whatsapp]] [[button Label | url]]
//   Conditions: [[if property_type=land]] ... [[else]] ... [[endif]]

export type Audience = 'transactional' | 'service' | 'marketing' | 'internal'

export interface TemplateDefault {
  key: string
  name: string
  category: string
  audience: Audience
  subject: string
  preheader?: string
  body: string
  version?: number
}

export const TEMPLATE_CATEGORIES: Record<string, string> = {
  enquiry: 'Enquiries',
  inspection: 'Inspections',
  nurture: 'Follow-up sequences',
  property: 'Property updates',
  newsletter: 'Newsletters & campaigns',
  transaction: 'Transactions',
  retention: 'Customer relationship',
  referral: 'Referrals & reviews',
  b2b: 'Owners, developers & partners',
  subscription: 'Subscriptions',
  internal: 'Team notifications',
}

export const DEFAULT_TEMPLATES: TemplateDefault[] = [
  // ------------------------------------------------------------------ enquiries
  {
    key: 'enquiry_confirmation', name: 'General enquiry confirmation', category: 'enquiry', audience: 'transactional',
    subject: 'We’ve received your enquiry ({{reference}})',
    preheader: 'Thanks for contacting {{brand_name}}. Here’s what happens next.',
    body: `Hi {{first_name|there}},

Thank you for getting in touch with {{brand_name}}. Your enquiry reference is **{{reference}}**.

[[if enquiry_type=valuation]]
A consultant will contact you to arrange the valuation. It helps to have the property’s address, its title document type (for example C of O or R of O) and any recent photos ready.
[[endif]]
[[if enquiry_type=property_management]]
A consultant will contact you to understand the property, its current occupancy and what you’d like us to manage, then explain how our management service works.
[[endif]]
[[if enquiry_type=owner_listing]]
A consultant will contact you about listing your property with us. Please have the address, title documents and your asking price to hand.
[[endif]]
[[if enquiry_type=landowner]]
A consultant will contact you about your land. It helps to have the plot location, its size and the title or allocation documents ready.
[[endif]]
[[if enquiry_type=developer]]
Our partnerships team will review your project and contact you to discuss how we could market and sell it.
[[endif]]
[[if enquiry_type=corporate]]
Our corporate services team will contact you to understand your organisation’s property needs.
[[endif]]
[[if enquiry_type=consultation]]
A consultant will contact you to arrange a time to talk through what you’re looking for.
[[endif]]
[[if enquiry_type=general]]
A member of our team will reply as soon as possible, usually within one working day.
[[endif]]

[[enquiry]]

If anything is urgent, you can reach us directly on WhatsApp.

[[whatsapp]]`,
  },
  {
    key: 'property_enquiry_confirmation', name: 'Property enquiry confirmation', category: 'enquiry', audience: 'transactional',
    subject: 'Your enquiry about {{property_title}} ({{reference}})',
    preheader: 'Thanks for your interest. Here are the details and what happens next.',
    body: `Hi {{first_name|there}},

Thank you for your interest in **{{property_title}}**. Your enquiry reference is **{{reference}}**.

[[property]]

[[if property_type=land]]
For land, the next step is usually a site visit so you can see the plot and its surroundings, and a look at the title and survey documents. A consultant will contact you to arrange both.
[[else]]
A consultant will contact you shortly to answer your questions and, if you’d like, arrange an inspection at a time that suits you.
[[endif]]

[[button View the property | {{property_url}}]]

Prefer to talk now? Message us on WhatsApp and quote {{reference}}.

[[whatsapp]]`,
  },

  // ---------------------------------------------------------------- inspections
  {
    key: 'inspection_requested', name: 'Inspection request received', category: 'inspection', audience: 'transactional',
    subject: 'Inspection request received: {{property_title}}',
    preheader: 'We’ll confirm the date and time with you shortly.',
    body: `Hi {{first_name|there}},

We’ve received your request to inspect **{{property_title}}** (reference {{reference}}).

[[inspection]]

A consultant will contact you to confirm the exact date and time. You’ll receive a confirmation email once it’s booked.

[[whatsapp]]`,
  },
  {
    key: 'inspection_confirmed', name: 'Inspection booking confirmation', category: 'inspection', audience: 'transactional',
    subject: '[[if rescheduled]]Rescheduled: [[endif]]Inspection confirmed for {{inspection_date}}',
    preheader: '{{property_title}} at {{inspection_time}}. Directions and your agent’s details inside.',
    body: `Hi {{first_name|there}},

[[if rescheduled]]
Your inspection has been **rescheduled**. The new details are below.
[[else]]
Your inspection is confirmed. We look forward to meeting you.
[[endif]]

[[inspection]]

[[button Get directions | {{maps_url}}]]

[[agent]]

Please bring a valid ID. If your plans change, let your agent know so we can rearrange.`,
  },
  {
    key: 'inspection_reminder', name: 'Inspection reminder', category: 'inspection', audience: 'transactional',
    subject: 'Reminder: your inspection is {{when}} at {{inspection_time}}',
    preheader: '{{property_title}}. Directions and contact details inside.',
    body: `Hi {{first_name|there}},

A quick reminder that your inspection of **{{property_title}}** is **{{when}}**.

[[inspection]]

[[button Get directions | {{maps_url}}]]

[[agent]]

Running late or need to change the time? Call or message your agent directly.`,
  },
  {
    key: 'inspection_cancelled', name: 'Inspection cancelled', category: 'inspection', audience: 'transactional',
    subject: 'Your inspection of {{property_title}} has been cancelled',
    body: `Hi {{first_name|there}},

Your inspection of **{{property_title}}** (reference {{reference}}) has been cancelled.

If you’d still like to see the property, or would like to look at other options, just reply to this email or message us on WhatsApp and we’ll arrange a new time.

[[whatsapp]]`,
  },
  {
    key: 'inspection_followup', name: 'Post-inspection follow-up', category: 'inspection', audience: 'service',
    subject: 'What did you think of {{property_title}}?',
    preheader: 'We’d love to hear your thoughts.',
    body: `Hi {{first_name|there}},

Thank you for inspecting **{{property_title}}** with us.

We’d really value your thoughts:

- What did you think of the property?
- Would you like to proceed, or talk through next steps?
- Do you have any questions about the price, documents or payment?
- Would you like us to show you similar options?

Just reply to this email, or contact {{agent_name|your agent}} directly.

[[agent]]

[[button See the property again | {{property_url}}]]`,
  },
  {
    key: 'inspection_missed', name: 'Missed inspection (to agent)', category: 'internal', audience: 'internal',
    subject: 'Inspection not updated: {{lead_name}} at {{property_title}}',
    body: `The inspection below was due but hasn’t been marked completed, cancelled or no-show.

[[inspection]]

[[lead]]

[[button Update the inspection | {{admin_url}}]]`,
  },

  // ------------------------------------------------------------------- nurture
  {
    key: 'nurture_property_details', name: 'Follow-up 1: more about the property', category: 'nurture', audience: 'service',
    subject: 'A little more about {{property_title}}',
    preheader: 'Photos, location and how to arrange a viewing.',
    body: `Hi {{first_name|there}},

Following your enquiry, here is a little more about **{{property_title}}**.

[[property]]

[[if property_type=land]]
If you’d like to see the plot, we can arrange a site visit and take you through the title and survey documents.
[[else]]
The best way to get a feel for a home is to see it in person. We can arrange an inspection at a time that suits you.
[[endif]]

[[button Book an inspection | {{property_url}}#inspect]]`,
  },
  {
    key: 'nurture_consider', name: 'Follow-up 2: still considering?', category: 'nurture', audience: 'service',
    subject: 'Have you had a chance to consider {{property_title}}?',
    body: `Hi {{first_name|there}},

I wanted to check in about **{{property_title}}**. Have you had a chance to think it over?

If you have questions about the price, payment plan, documents or the area, a consultant can talk them through with you. Or, if you’re ready, we can book an inspection.

[[button Arrange an inspection | {{property_url}}#inspect]]

[[whatsapp]]`,
  },
  {
    key: 'nurture_alternatives', name: 'Follow-up 3: other properties', category: 'nurture', audience: 'marketing',
    subject: 'A few more properties worth exploring',
    preheader: 'Picked from our current listings to match what you asked about.',
    body: `Hi {{first_name|there}},

Based on your interest in {{property_title|our listings}}, here are some other available properties you may like.

[[properties]]

[[button Browse all properties | {{site_url}}/properties]]`,
  },
  {
    key: 'nurture_still_looking', name: 'Follow-up 4: still looking?', category: 'nurture', audience: 'marketing',
    subject: 'Are you still looking for your next property?',
    body: `Hi {{first_name|there}},

It’s been a little while since you got in touch. Are you still looking?

If your plans or budget have changed, you can update what you’re looking for and we’ll only send you properties that match.

[[button Update my preferences | {{prefs_url}}]]

Or reply to this email and a consultant will help you find the right place.`,
  },

  // ----------------------------------------------------------------- property
  {
    key: 'new_property_announcement', name: 'New property announcement', category: 'property', audience: 'marketing',
    subject: 'New listing: {{property_title}}',
    preheader: '{{property_price}} in {{property_location}}.',
    body: `Hi {{first_name|there}},

A new property matching what you’re looking for has just been listed.

[[property]]

[[button View the property | {{property_url}}]]

You’re receiving this because you asked for property alerts. [Change what you receive]({{prefs_url}}).`,
  },
  {
    key: 'price_change', name: 'Price change notification', category: 'property', audience: 'service',
    subject: 'Price update: {{property_title}}',
    preheader: 'Now {{new_price}}.',
    body: `Hi {{first_name|there}},

The price of **{{property_title}}**, which you’ve shown interest in, has changed.

- Previous price: {{old_price}}
- New price: **{{new_price}}**

[[property]]

[[button View the property | {{property_url}}]]`,
  },
  {
    key: 'property_unavailable', name: 'Property no longer available', category: 'property', audience: 'service',
    subject: 'Update on {{property_title}}',
    body: `Hi {{first_name|there}},

We wanted to let you know that **{{property_title}}** is no longer available.

[[if has_properties]]
Here are some similar properties that are still available:

[[properties]]
[[endif]]

If you’d like help finding something similar, just reply to this email.`,
  },
  {
    key: 'similar_properties', name: 'Similar property recommendations', category: 'property', audience: 'marketing',
    subject: 'Properties picked for you',
    preheader: 'Current listings that match your preferences.',
    body: `Hi {{first_name|there}},

Here are available properties that match what you told us you’re looking for.

[[properties]]

[[button Browse all properties | {{site_url}}/properties]]

Not quite right? [Update your preferences]({{prefs_url}}).`,
  },
  {
    key: 'weekly_digest', name: 'Weekly new-listings digest', category: 'property', audience: 'marketing',
    subject: 'This week’s new listings in Abuja',
    body: `Hi {{first_name|there}},

Here are the properties listed this week that match your preferences.

[[properties]]

[[button Browse all properties | {{site_url}}/properties]]`,
  },

  // --------------------------------------------------------------- newsletters
  {
    key: 'newsletter', name: 'Newsletter', category: 'newsletter', audience: 'marketing',
    subject: '{{campaign_subject}}',
    body: `Hi {{first_name|there}},

{{campaign_body}}

[[if has_properties]]
[[properties]]
[[endif]]

[[button Browse properties | {{site_url}}/properties]]`,
  },
  {
    key: 'campaign_basic', name: 'Simple campaign', category: 'newsletter', audience: 'marketing',
    subject: '{{campaign_subject}}',
    body: `Hi {{first_name|there}},

{{campaign_body}}

[[if has_properties]]
[[properties]]
[[endif]]`,
  },

  // -------------------------------------------------------------- transactions
  {
    key: 'transaction_update', name: 'Transaction update', category: 'transaction', audience: 'transactional',
    subject: '{{transaction_stage_label}}: {{property_title|your purchase}} ({{transaction_reference}})',
    body: `Hi {{first_name|there}},

[[if transaction_stage=offer_submitted]]
Thank you. We’ve received your offer and passed it to the seller. We’ll let you know as soon as we hear back.
[[endif]]
[[if transaction_stage=offer_accepted]]
Good news: your offer has been accepted. Your consultant will contact you about the next steps.
[[endif]]
[[if transaction_stage=offer_rejected]]
Unfortunately the seller has not accepted your offer. Your consultant will talk you through your options, including a revised offer or similar properties.
[[endif]]
[[if transaction_stage=negotiating]]
We’re now negotiating with the seller on your behalf and will keep you updated.
[[endif]]
[[if transaction_stage=documentation_requested]]
To move forward we need some documents from you. Your consultant will confirm exactly what’s needed and how to send it securely.
[[endif]]
[[if transaction_stage=interest]]
Thank you for confirming your interest. Your consultant will guide you through the next steps.
[[endif]]

[[transaction]]

{{note}}

[[agent]]`,
  },
  {
    key: 'payment_instructions', name: 'Payment instructions issued', category: 'transaction', audience: 'transactional',
    subject: 'Payment instructions for {{property_title|your purchase}} ({{transaction_reference}})',
    body: `Hi {{first_name|there}},

Your consultant has issued payment instructions for **{{property_title|your purchase}}**.

[[transaction]]

{{note}}

**Before you pay:** always confirm the account details by calling your consultant on a number you already know. {{brand_name}} will never change bank details by email.

[[agent]]`,
  },
  {
    key: 'payment_confirmation', name: 'Payment confirmation', category: 'transaction', audience: 'transactional',
    subject: 'Payment received ({{transaction_reference}})',
    body: `Hi {{first_name|there}},

We confirm that we have received your payment of **{{amount}}** for **{{property_title|your purchase}}**.

[[transaction]]

{{note}}

Your consultant will be in touch about the next step.

[[agent]]`,
  },
  {
    key: 'transaction_completed', name: 'Transaction completed / thank you', category: 'transaction', audience: 'transactional',
    subject: 'Congratulations on your new property',
    body: `Hi {{first_name|there}},

Congratulations! Your purchase of **{{property_title|your property}}** is complete. Thank you for trusting {{brand_name}}.

[[transaction]]

**What happens next**

- Keep your original documents somewhere safe and make copies.
- Your consultant will confirm any outstanding documentation steps.
- If you need help with letting or managing the property, we can help.

{{note}}

[[agent]]`,
  },

  // ----------------------------------------------------------------- retention
  {
    key: 'birthday', name: 'Birthday greeting', category: 'retention', audience: 'marketing',
    subject: 'Happy birthday, {{first_name}}!',
    body: `Hi {{first_name|there}},

Everyone at {{brand_name}} wishes you a very happy birthday. We hope the year ahead is a wonderful one.

Warm wishes,
The {{brand_name}} team`,
  },
  {
    key: 'purchase_anniversary', name: 'Purchase anniversary', category: 'retention', audience: 'marketing',
    subject: 'Happy home anniversary, {{first_name}}',
    body: `Hi {{first_name|there}},

It’s been {{years}} since you completed your purchase with {{brand_name}}. We hope the property is serving you well.

If you’re thinking about letting, selling, adding to your portfolio or need help with maintenance or documents, we’re always happy to help.

[[whatsapp]]`,
  },
  {
    key: 'reactivation', name: 'Re-engagement', category: 'retention', audience: 'marketing',
    subject: 'Still interested in property in Abuja?',
    body: `Hi {{first_name|there}},

We haven’t heard from you in a while. If you’re still interested in property in Abuja, here are some current listings that match what you told us.

[[if has_properties]]
[[properties]]
[[endif]]

If you’d rather hear from us less, or not at all, you can [update your preferences]({{prefs_url}}) any time.`,
  },
  {
    key: 'investment_update', name: 'Investment opportunities', category: 'retention', audience: 'marketing',
    subject: 'Investment opportunities in Abuja',
    body: `Hi {{first_name|there}},

{{campaign_body}}

[[if has_properties]]
[[properties]]
[[endif]]`,
  },

  // ------------------------------------------------------------------ referral
  {
    key: 'referral_request', name: 'Referral request', category: 'referral', audience: 'service',
    subject: 'Know someone looking for property?',
    body: `Hi {{first_name|there}},

We hope you’re settling in well. If you know anyone looking to buy, sell or invest in property in Abuja, we’d be grateful for an introduction. We’ll take good care of them.

Just reply to this email with their name and how to reach them (with their permission), or ask them to mention your name when they contact us.

Thank you for your support.`,
  },
  {
    key: 'testimonial_request', name: 'Testimonial / review request', category: 'referral', audience: 'service',
    subject: 'How did we do?',
    body: `Hi {{first_name|there}},

We’d love to hear about your experience with {{brand_name}}. A few honest sentences help us improve and help other buyers decide.

Simply reply to this email with your feedback. We will only publish it with your permission, and you can choose whether your name is shown.`,
  },
  {
    key: 'referral_thanks', name: 'Referral thank-you', category: 'referral', audience: 'transactional',
    subject: 'Thank you for your referral',
    body: `Hi {{first_name|there}},

Thank you for introducing **{{referral_name}}** to {{brand_name}}. [[if referral_status=converted]]We’re pleased to tell you they’ve gone ahead with us.[[else]]We’ll take good care of them.[[endif]]

We really appreciate your trust and support.`,
  },

  // ----------------------------------------------------------------------- b2b
  {
    key: 'owner_acquisition', name: 'Property owner acquisition', category: 'b2b', audience: 'marketing',
    subject: 'Selling or letting property in Abuja?',
    body: `Hi {{first_name|there}},

{{brand_name}} works with property owners across Abuja to market, sell, let and manage their properties.

- We present your property to buyers and tenants who are actively looking
- We handle enquiries, inspections and negotiations
- We keep you updated at every stage

{{campaign_body}}

[[button Talk to us about your property | {{site_url}}/contact?type=owner_listing]]`,
  },
  {
    key: 'partnership_outreach', name: 'Developer partnership outreach', category: 'b2b', audience: 'marketing',
    subject: 'Marketing your development with {{brand_name}}',
    body: `Hi {{first_name|there}},

{{campaign_body}}

If you’re planning or selling a development in Abuja, we’d welcome a conversation about how we could help market and sell it.

[[button Start a conversation | {{site_url}}/contact?type=developer]]`,
  },

  // -------------------------------------------------------------- subscription
  {
    key: 'subscribe_confirm', name: 'Confirm subscription (double opt-in)', category: 'subscription', audience: 'transactional',
    subject: 'Please confirm your subscription',
    body: `Hi {{first_name|there}},

Please confirm that you’d like to receive {{subscription_label|property updates}} from {{brand_name}}.

[[button Yes, subscribe me | {{confirm_url}}]]

If you didn’t ask for this, you can ignore this email and you won’t hear from us.`,
  },
  {
    key: 'welcome', name: 'Welcome to the newsletter', category: 'subscription', audience: 'marketing',
    subject: 'Welcome to {{brand_name}}',
    body: `Hi {{first_name|there}},

Thanks for subscribing. We’ll send you properties and updates that match your interests, and nothing else.

You can change what you receive, or how often, at any time.

[[button Choose what you receive | {{prefs_url}}]]

[[button Browse current properties | {{site_url}}/properties]]`,
  },
  {
    key: 'guide_delivery', name: 'Guide download', category: 'subscription', audience: 'transactional',
    subject: 'Your guide: {{guide_title}}',
    body: `Hi {{first_name|there}},

Thanks for requesting **{{guide_title}}**. You can download it here:

[[button Download the guide | {{guide_url}}]]

If you have questions as you read it, reply to this email or message us on WhatsApp.

[[whatsapp]]`,
  },
  {
    key: 'alert_confirmed', name: 'Property alert set up', category: 'subscription', audience: 'transactional',
    subject: 'Your property alert is set up',
    body: `Hi {{first_name|there}},

Your property alert is active. We’ll email you when a property matching these details is listed:

{{alert_summary}}

[[button Manage your alerts | {{prefs_url}}]]`,
  },

  // ------------------------------------------------------------------ internal
  {
    key: 'internal_new_lead', name: 'New enquiry alert (team)', category: 'internal', audience: 'internal',
    subject: 'New {{enquiry_type_label}}: {{lead_name}}[[if property_title]] – {{property_title}}[[endif]]',
    body: `A new enquiry has come in.

[[lead]]

[[enquiry]]

[[button Open the lead | {{admin_url}}]]`,
  },
  {
    key: 'internal_inspection', name: 'Inspection update (team)', category: 'internal', audience: 'internal',
    subject: 'Inspection {{inspection_event}}: {{lead_name}} – {{property_title}}',
    body: `Inspection {{inspection_event}}.

[[inspection]]

[[lead]]

[[button Open inspections | {{admin_url}}]]`,
  },
  {
    key: 'internal_lead_assigned', name: 'Lead assigned (to agent)', category: 'internal', audience: 'internal',
    subject: 'Lead assigned to you: {{lead_name}}',
    body: `{{lead_name}} has been assigned to you.

[[lead]]

[[button Open the lead | {{admin_url}}]]`,
  },
  {
    key: 'internal_unassigned', name: 'Unassigned lead reminder (team)', category: 'internal', audience: 'internal',
    subject: 'Unassigned for {{hours}}h: {{lead_name}}',
    body: `This lead has had no agent assigned for {{hours}} hours.

[[lead]]

[[button Assign an agent | {{admin_url}}]]`,
  },
  {
    key: 'internal_follow_up_due', name: 'Follow-up due (to agent)', category: 'internal', audience: 'internal',
    subject: 'Follow-up due: {{lead_name}}',
    body: `This lead hasn’t been marked as contacted yet.

[[lead]]

[[button Open the lead | {{admin_url}}]]`,
  },
  {
    key: 'internal_transaction', name: 'Transaction update (team)', category: 'internal', audience: 'internal',
    subject: 'Transaction {{transaction_reference}}: {{transaction_stage_label}}',
    body: `[[transaction]]

[[lead]]

{{note}}

[[button Open the transaction | {{admin_url}}]]`,
  },
  {
    key: 'internal_referral', name: 'New referral (team)', category: 'internal', audience: 'internal',
    subject: 'New referral: {{referral_name}}',
    body: `{{lead_name}} has referred **{{referral_name}}**.

[[button Open referrals | {{admin_url}}]]`,
  },
]

export const TEMPLATE_KEYS = new Set(DEFAULT_TEMPLATES.map(t => t.key))

// ----------------------------------------------------------------------------
// Workflows. Steps run in order; "wait" pauses; "condition" stops the run (or
// skips the next step) when it isn't met; any exit_on event ends the run early.
// ----------------------------------------------------------------------------

export type ConditionCheck =
  | 'has_property' | 'property_available' | 'not_contacted' | 'no_inspection_booked'
  | 'lead_status_in' | 'lead_status_not_in' | 'enquiry_type_in' | 'property_type_in'
  | 'contact_kind_in' | 'marketing_subscribed' | 'inspection_status_in' | 'has_email' | 'first_for_property'

export interface Condition { check: ConditionCheck; values?: string[]; else?: 'stop' | 'skip_next' }

export type Step =
  | { type: 'email'; template: string; to?: 'contact' | 'assigned_agent' | 'team'; category?: Audience }
  | { type: 'notify'; template: string; to: 'assigned_agent' | 'team' | 'agent_or_team' }
  | { type: 'wait'; minutes: number }
  | { type: 'condition'; check: ConditionCheck; values?: string[]; else?: 'stop' | 'skip_next' }
  | { type: 'update_lead'; status: string }
  | { type: 'add_tag'; tag: string }

export interface AutomationDefault {
  key: string
  name: string
  description: string
  trigger: string
  conditions: Condition[]
  steps: Step[]
  exit_on: string[]
  allow_reenrol?: boolean
}

export const TRIGGERS: Record<string, string> = {
  'inquiry.created': 'An enquiry is submitted',
  'lead.created': 'A lead is captured (pop-up or form)',
  'lead.assigned': 'A lead is assigned to an agent',
  'lead.status_changed': 'A lead’s status changes',
  'subscriber.confirmed': 'Someone confirms a subscription',
  'inspection.requested': 'An inspection is requested',
  'inspection.booked': 'An inspection is confirmed',
  'inspection.rescheduled': 'An inspection is rescheduled',
  'inspection.cancelled': 'An inspection is cancelled',
  'inspection.completed': 'An inspection is completed',
  'inspection.missed': 'An inspection passes without an update',
  'transaction.stage_changed': 'A transaction moves to a new stage',
  'transaction.completed': 'A transaction is completed',
  'referral.created': 'A referral is recorded',
  'referral.converted': 'A referral converts',
  'guide.requested': 'A guide is requested',
}

export const EXIT_EVENTS: Record<string, string> = {
  'inspection.requested': 'Requests an inspection',
  'inspection.booked': 'Has an inspection confirmed',
  'lead.replied': 'Replies (marked by staff)',
  'lead.converted': 'Becomes a customer',
  'lead.lost': 'Is marked lost',
  'transaction.started': 'Starts a transaction',
  'subscriber.unsubscribed': 'Unsubscribes',
  'property.unavailable': 'The property is no longer available',
}

export const CONDITION_LABELS: Record<ConditionCheck, string> = {
  has_property: 'Is about a specific property',
  property_available: 'The property is still available',
  not_contacted: 'Lead hasn’t been marked contacted',
  no_inspection_booked: 'No inspection has been requested or booked',
  lead_status_in: 'Lead status is one of…',
  lead_status_not_in: 'Lead status is not one of…',
  enquiry_type_in: 'Enquiry type is one of…',
  property_type_in: 'Property type is one of…',
  contact_kind_in: 'Contact type is one of…',
  marketing_subscribed: 'Has agreed to marketing emails',
  inspection_status_in: 'Inspection status is one of…',
  has_email: 'Has an email address',
  first_for_property: 'Not already in this workflow for the same property',
}

const H = 60, D = 24 * 60

export const DEFAULT_AUTOMATIONS: AutomationDefault[] = [
  {
    key: 'enquiry_response', name: 'Enquiry confirmation and sales alert',
    description: 'Confirms every enquiry straight away (worded for the type of enquiry) and alerts the assigned agent or the team.',
    trigger: 'inquiry.created', conditions: [], exit_on: [],
    steps: [
      { type: 'email', template: 'auto:enquiry', to: 'contact', category: 'transactional' },
      { type: 'notify', template: 'internal_new_lead', to: 'agent_or_team' },
    ],
  },
  {
    key: 'property_enquiry_nurture', name: 'Property enquiry follow-up',
    description: 'Follows up on a property enquiry over two weeks. Stops as soon as the person books an inspection, replies, buys, unsubscribes, or the property is no longer available. The last two emails only go to people who agreed to marketing.',
    trigger: 'inquiry.created',
    conditions: [{ check: 'has_property' }, { check: 'has_email' }, { check: 'first_for_property' }],
    exit_on: ['inspection.requested', 'inspection.booked', 'lead.replied', 'lead.converted', 'lead.lost', 'transaction.started', 'subscriber.unsubscribed', 'property.unavailable'],
    steps: [
      { type: 'wait', minutes: 1 * D },
      { type: 'condition', check: 'property_available', else: 'stop' },
      { type: 'condition', check: 'no_inspection_booked', else: 'stop' },
      { type: 'email', template: 'nurture_property_details', to: 'contact', category: 'service' },
      { type: 'wait', minutes: 2 * D },
      { type: 'condition', check: 'no_inspection_booked', else: 'stop' },
      { type: 'email', template: 'nurture_consider', to: 'contact', category: 'service' },
      { type: 'wait', minutes: 4 * D },
      { type: 'email', template: 'nurture_alternatives', to: 'contact', category: 'marketing' },
      { type: 'wait', minutes: 7 * D },
      { type: 'email', template: 'nurture_still_looking', to: 'contact', category: 'marketing' },
    ],
  },
  {
    key: 'uncontacted_lead_reminder', name: 'Sales follow-up reminder',
    description: 'If an enquiry still isn’t marked contacted after 24 hours, reminds the assigned agent (or the team).',
    trigger: 'inquiry.created', conditions: [],
    exit_on: ['lead.replied', 'lead.converted', 'lead.lost'],
    steps: [
      { type: 'wait', minutes: 24 * H },
      { type: 'condition', check: 'not_contacted', else: 'stop' },
      { type: 'notify', template: 'internal_follow_up_due', to: 'agent_or_team' },
    ],
  },
  {
    key: 'b2b_follow_up', name: 'Owner, landowner and developer follow-up',
    description: 'Supply-side enquiries get a second reminder to the agent after 3 days if still not contacted.',
    trigger: 'inquiry.created',
    conditions: [{ check: 'enquiry_type_in', values: ['owner_listing', 'landowner', 'developer', 'property_management', 'valuation', 'corporate'] }],
    exit_on: ['lead.replied', 'lead.converted', 'lead.lost'],
    steps: [
      { type: 'wait', minutes: 3 * D },
      { type: 'condition', check: 'not_contacted', else: 'stop' },
      { type: 'notify', template: 'internal_follow_up_due', to: 'agent_or_team' },
    ],
  },
  {
    key: 'inspection_request', name: 'Inspection request received',
    description: 'Acknowledges an inspection request and alerts the team.',
    trigger: 'inspection.requested', conditions: [], exit_on: [],
    steps: [
      { type: 'email', template: 'inspection_requested', to: 'contact', category: 'transactional' },
      { type: 'notify', template: 'internal_inspection', to: 'agent_or_team' },
      { type: 'update_lead', status: 'inspection_scheduled' },
    ],
  },
  {
    key: 'inspection_booked', name: 'Inspection confirmed',
    description: 'Sends the confirmation with date, time, directions and agent details. Reminders are scheduled automatically from the inspection time.',
    trigger: 'inspection.booked', conditions: [], exit_on: [], allow_reenrol: true,
    steps: [
      { type: 'email', template: 'inspection_confirmed', to: 'contact', category: 'transactional' },
      { type: 'notify', template: 'internal_inspection', to: 'assigned_agent' },
      { type: 'update_lead', status: 'inspection_scheduled' },
    ],
  },
  {
    key: 'inspection_rescheduled', name: 'Inspection rescheduled',
    description: 'Sends the updated details. Old reminders are cancelled and new ones scheduled.',
    trigger: 'inspection.rescheduled', conditions: [], exit_on: [], allow_reenrol: true,
    steps: [
      { type: 'email', template: 'inspection_confirmed', to: 'contact', category: 'transactional' },
      { type: 'notify', template: 'internal_inspection', to: 'assigned_agent' },
    ],
  },
  {
    key: 'inspection_cancelled', name: 'Inspection cancelled',
    description: 'Tells the customer and agent. Pending reminders are cancelled automatically.',
    trigger: 'inspection.cancelled', conditions: [], exit_on: [], allow_reenrol: true,
    steps: [
      { type: 'email', template: 'inspection_cancelled', to: 'contact', category: 'transactional' },
      { type: 'notify', template: 'internal_inspection', to: 'assigned_agent' },
    ],
  },
  {
    key: 'inspection_completed', name: 'Post-inspection follow-up',
    description: 'A few hours after an inspection is marked completed, asks the customer what they thought.',
    trigger: 'inspection.completed', conditions: [], exit_on: ['transaction.started', 'lead.lost'], allow_reenrol: true,
    steps: [
      { type: 'update_lead', status: 'inspected' },
      { type: 'wait', minutes: 3 * H },
      { type: 'email', template: 'inspection_followup', to: 'contact', category: 'service' },
    ],
  },
  {
    key: 'inspection_missed', name: 'Missed inspection alert',
    description: 'Alerts the agent when an inspection time passes without being updated.',
    trigger: 'inspection.missed', conditions: [], exit_on: [], allow_reenrol: true,
    steps: [{ type: 'notify', template: 'inspection_missed', to: 'agent_or_team' }],
  },
  {
    key: 'lead_assigned', name: 'Lead assignment alert',
    description: 'Tells an agent when a lead is assigned to them.',
    trigger: 'lead.assigned', conditions: [], exit_on: [], allow_reenrol: true,
    steps: [{ type: 'notify', template: 'internal_lead_assigned', to: 'assigned_agent' }],
  },
  {
    key: 'welcome', name: 'Welcome new subscribers',
    description: 'Welcomes someone once they confirm their subscription.',
    trigger: 'subscriber.confirmed', conditions: [], exit_on: ['subscriber.unsubscribed'],
    steps: [{ type: 'email', template: 'welcome', to: 'contact', category: 'marketing' }],
  },
  {
    key: 'post_transaction', name: 'After a completed purchase',
    description: 'Thank-you email, then a referral request after 2 weeks and a feedback request after 4 weeks. Feedback is never published without approval.',
    trigger: 'transaction.completed', conditions: [], exit_on: ['subscriber.unsubscribed'],
    steps: [
      { type: 'email', template: 'transaction_completed', to: 'contact', category: 'transactional' },
      { type: 'add_tag', tag: 'customer' },
      { type: 'wait', minutes: 14 * D },
      { type: 'email', template: 'referral_request', to: 'contact', category: 'service' },
      { type: 'wait', minutes: 14 * D },
      { type: 'email', template: 'testimonial_request', to: 'contact', category: 'service' },
    ],
  },
  {
    key: 'transaction_team_alert', name: 'Transaction stage alert',
    description: 'Tells the assigned agent (or the team) whenever a transaction changes stage.',
    trigger: 'transaction.stage_changed', conditions: [], exit_on: [], allow_reenrol: true,
    steps: [{ type: 'notify', template: 'internal_transaction', to: 'agent_or_team' }],
  },
  {
    key: 'referral_created', name: 'Referral received',
    description: 'Thanks the referrer and alerts the team.',
    trigger: 'referral.created', conditions: [], exit_on: [],
    steps: [
      { type: 'email', template: 'referral_thanks', to: 'contact', category: 'transactional' },
      { type: 'notify', template: 'internal_referral', to: 'team' },
    ],
  },
  {
    key: 'referral_converted', name: 'Referral converted',
    description: 'Thanks the referrer when the person they referred goes ahead.',
    trigger: 'referral.converted', conditions: [], exit_on: [],
    steps: [{ type: 'email', template: 'referral_thanks', to: 'contact', category: 'transactional' }],
  },
]

export const LEAD_STATUSES: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'interested', label: 'Interested' },
  { value: 'inspection_scheduled', label: 'Inspection scheduled' },
  { value: 'inspected', label: 'Inspected' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'offer_submitted', label: 'Offer submitted' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'dormant', label: 'Dormant' },
]

/** Pipeline order, so automatic updates only move a lead forward. */
export const LEAD_STATUS_RANK: Record<string, number> = Object.fromEntries(LEAD_STATUSES.map((s, i) => [s.value, i]))

export const ENQUIRY_TYPES: { value: string; label: string; kind: string }[] = [
  { value: 'general', label: 'General enquiry', kind: 'buyer' },
  { value: 'property', label: 'Property enquiry', kind: 'buyer' },
  { value: 'consultation', label: 'Consultation request', kind: 'buyer' },
  { value: 'valuation', label: 'Property valuation', kind: 'owner' },
  { value: 'property_management', label: 'Property management', kind: 'owner' },
  { value: 'owner_listing', label: 'List my property', kind: 'owner' },
  { value: 'landowner', label: 'Land listing', kind: 'landowner' },
  { value: 'developer', label: 'Developer partnership', kind: 'developer' },
  { value: 'corporate', label: 'Corporate services', kind: 'corporate' },
]
export const enquiryTypeLabel = (v: string) => ENQUIRY_TYPES.find(t => t.value === v)?.label || 'Enquiry'

export const TRANSACTION_STAGES: { value: string; label: string; adminOnly?: boolean; template?: string }[] = [
  { value: 'interest', label: 'Serious interest', template: 'transaction_update' },
  { value: 'offer_submitted', label: 'Offer submitted', template: 'transaction_update' },
  { value: 'negotiating', label: 'Negotiating', template: 'transaction_update' },
  { value: 'offer_accepted', label: 'Offer accepted', template: 'transaction_update' },
  { value: 'offer_rejected', label: 'Offer not accepted', template: 'transaction_update' },
  { value: 'documentation_requested', label: 'Documents requested', template: 'transaction_update' },
  { value: 'payment_instructions', label: 'Payment instructions issued', adminOnly: true, template: 'payment_instructions' },
  { value: 'payment_received', label: 'Payment received', adminOnly: true, template: 'payment_confirmation' },
  { value: 'completed', label: 'Completed', adminOnly: true },
  { value: 'cancelled', label: 'Cancelled' },
]
export const stageLabel = (v: string) => TRANSACTION_STAGES.find(s => s.value === v)?.label || v

export const CONTACT_KINDS = [
  { value: 'buyer', label: 'Buyer / prospect' },
  { value: 'owner', label: 'Property owner' },
  { value: 'landowner', label: 'Landowner' },
  { value: 'developer', label: 'Developer' },
  { value: 'corporate', label: 'Corporate client' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
]

export const CAMPAIGN_TYPES = [
  { value: 'new_property', label: 'New property announcement', template: 'newsletter' },
  { value: 'newsletter', label: 'Property newsletter', template: 'newsletter' },
  { value: 'investment', label: 'Investment update', template: 'investment_update' },
  { value: 'promotion', label: 'Promotion', template: 'campaign_basic' },
  { value: 'seasonal', label: 'Seasonal', template: 'campaign_basic' },
  { value: 'owner_acquisition', label: 'Property owner acquisition', template: 'owner_acquisition' },
  { value: 'partnership', label: 'Developer partnership', template: 'partnership_outreach' },
  { value: 'retention', label: 'Customer retention', template: 'campaign_basic' },
]
