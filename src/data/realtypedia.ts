// Realtypedia: plain-language explanations of the terms people meet when buying,
// renting or investing in Abuja property.
//
// Body paragraphs can link to other entries with [[slug]] or [[slug|label]].
// Keep figures general: fees and tax rules change, so point readers to confirm
// current amounts rather than quoting numbers that will go stale.
import type { StickerName } from '@/components/StickerIcon'

export type CategoryId = 'titles' | 'land-admin' | 'buying' | 'property-types' | 'renting'

export const CATEGORIES: { id: CategoryId; label: string; blurb: string; icon: StickerName }[] = [
  { id: 'titles', label: 'Titles & documents', blurb: 'The papers that prove who owns land and what they can do with it.', icon: 'documents' },
  { id: 'land-admin', label: 'Land administration', blurb: 'The agencies, laws and rules that govern land in the FCT.', icon: 'map' },
  { id: 'buying', label: 'Buying & costs', blurb: 'How a purchase moves from inspection to handover, and what it costs.', icon: 'wallet' },
  { id: 'property-types', label: 'Property types', blurb: 'What the listing words actually mean on the ground.', icon: 'listings' },
  { id: 'renting', label: 'Renting', blurb: 'Tenancy terms for landlords and tenants.', icon: 'key' },
]

export interface Entry {
  slug: string
  term: string
  /** Other names or abbreviations people search for */
  aka?: string[]
  category: CategoryId
  /** One sentence shown in the index and as the page description */
  summary: string
  body: string[]
  /** Practical steps or checks, shown as a list */
  checklist?: string[]
  /** The most common mistake or risk */
  watchOut?: string
  related?: string[]
}

export const ENTRIES: Entry[] = [
  /* ---------------- Titles & documents ---------------- */
  {
    slug: 'certificate-of-occupancy',
    term: 'Certificate of Occupancy',
    aka: ['C of O', 'CofO'],
    category: 'titles',
    summary: 'The government-issued title that confirms a statutory right to occupy and use a piece of land.',
    body: [
      'Under the [[land-use-act]], land is held by the state and individuals hold a right of occupancy, not outright ownership. In the FCT, a Certificate of Occupancy is the document that evidences that right, and it is issued by the FCT Administration through [[agis]].',
      'An FCT C of O is normally granted for a term of 99 years and sets out the land use (residential, commercial and so on), the plot number, the district and the conditions attached to the grant, including payment of [[ground-rent]] and a deadline to develop.',
      'Buyers and banks treat a C of O as the strongest title for a plot. Even so, it only proves the grant was made. You still need to confirm it is genuine, current and in the seller’s name.',
    ],
    checklist: [
      'Run a search at AGIS on the file number and plot number.',
      'Match the name on the C of O to the seller, or to the chain of [[deed-of-assignment|assignments]] leading to them.',
      'Check that ground rent and other bills are paid up to date.',
      'Confirm the land use on the C of O matches what you plan to build.',
    ],
    watchOut: 'A photocopy or a “C of O in process” is not a C of O. Ask to see the original and verify it with AGIS before paying.',
    related: ['right-of-occupancy', 'recertification', 'ministers-consent', 'tdp'],
  },
  {
    slug: 'right-of-occupancy',
    term: 'Right of Occupancy',
    aka: ['R of O', 'Offer of Statutory Right of Occupancy', 'Allocation letter'],
    category: 'titles',
    summary: 'The offer that grants land to an allottee, issued before the Certificate of Occupancy.',
    body: [
      'When the FCT Administration allocates a plot, the allottee first receives an offer of a statutory right of occupancy, often called the R of O or allocation letter. It names the plot, the allottee and the terms of the grant.',
      'The allottee accepts the offer and pays the bills that come with it. Once those are settled and processing is complete, a [[certificate-of-occupancy]] can be issued.',
      'Many plots in Abuja change hands at R of O stage. That is legal, but the buyer takes on whatever is still outstanding on the file, so the risk is higher than buying land with a C of O.',
    ],
    checklist: [
      'Verify the R of O at AGIS and confirm it has not been revoked or reallocated.',
      'Ask which bills have been paid and get the receipts.',
      'Confirm the acceptance was submitted within the time allowed.',
    ],
    watchOut: 'Some offers lapse if the allottee never accepted them or paid the bills. A lapsed offer can be reallocated to someone else.',
    related: ['certificate-of-occupancy', 'agis', 'revocation'],
  },
  {
    slug: 'ministers-consent',
    term: 'Minister’s Consent',
    aka: ['Governor’s Consent', 'Consent to assign'],
    category: 'titles',
    summary: 'The approval the FCT Minister must give before a right of occupancy can be sold, mortgaged or transferred.',
    body: [
      'The [[land-use-act]] says a holder of a statutory right of occupancy cannot transfer it without consent. In the states this is the Governor’s Consent; in the FCT it is given on behalf of the FCT Minister and is commonly called the Minister’s Consent.',
      'In practice, a buyer and seller sign a [[deed-of-assignment]], then apply for consent through AGIS. Once consent is granted and the deed is registered, the buyer’s interest is recorded on the title.',
      'Skipping consent leaves the buyer with a private agreement but no registered interest, which matters when you want to resell, mortgage or defend the title.',
    ],
    checklist: [
      'Budget for consent fees, [[stamp-duty]] and registration on top of the price.',
      'Make sure the seller signs every form the consent application needs before you complete.',
    ],
    watchOut: 'Buying on a [[power-of-attorney]] alone, without ever getting consent, is common and risky.',
    related: ['deed-of-assignment', 'certificate-of-occupancy', 'agis'],
  },
  {
    slug: 'deed-of-assignment',
    term: 'Deed of Assignment',
    category: 'titles',
    summary: 'The legal document that transfers the seller’s interest in a property to the buyer.',
    body: [
      'A deed of assignment records that the seller (assignor) transfers their whole remaining interest in the land to the buyer (assignee) for the stated price. It describes the property, recites the seller’s title and is signed by both parties before witnesses.',
      'The deed only takes full effect once [[ministers-consent]] is obtained, [[stamp-duty]] is paid and the deed is registered at the land registry.',
    ],
    checklist: [
      'Have your own lawyer draft or review the deed.',
      'Check that the property description matches the [[tdp]] and the title document.',
      'Keep the registered original somewhere safe; it is the link in your chain of title.',
    ],
    related: ['ministers-consent', 'contract-of-sale', 'power-of-attorney'],
  },
  {
    slug: 'contract-of-sale',
    term: 'Contract of sale',
    aka: ['Sale agreement'],
    category: 'titles',
    summary: 'The agreement that sets the price, payment terms and conditions before ownership is transferred.',
    body: [
      'A contract of sale is signed early in a deal, often when a deposit is paid. It fixes the price, how and when the balance will be paid, what happens if either side backs out, and what the seller must deliver.',
      'It does not transfer the property by itself. Transfer happens later through the [[deed-of-assignment]] and [[ministers-consent]].',
    ],
    checklist: [
      'Include a refund clause if the title fails [[due-diligence]].',
      'Spell out who pays which fees.',
      'List the documents the seller must hand over at completion.',
    ],
    related: ['deed-of-assignment', 'due-diligence', 'off-plan'],
  },
  {
    slug: 'power-of-attorney',
    term: 'Power of Attorney',
    aka: ['POA', 'Irrevocable power of attorney'],
    category: 'titles',
    summary: 'A document that authorises someone to act for the owner. It does not transfer ownership.',
    body: [
      'A power of attorney lets an attorney deal with property on the owner’s behalf, for example to sign documents while the owner is abroad. It is a useful tool for the diaspora.',
      'Some sellers offer an “irrevocable” power of attorney in place of a proper sale, to avoid consent fees. The buyer then holds authority to act, but the title stays in the seller’s name.',
    ],
    watchOut: 'A power of attorney can be challenged, and it may end if the donor dies. If you are buying, insist on a [[deed-of-assignment]] and [[ministers-consent]].',
    related: ['deed-of-assignment', 'ministers-consent'],
  },
  {
    slug: 'tdp',
    term: 'Title Deed Plan',
    aka: ['TDP', 'Survey plan'],
    category: 'titles',
    summary: 'The official plan that shows a plot’s exact boundaries, coordinates and size.',
    body: [
      'In the FCT, the Title Deed Plan is the survey document attached to the title. It shows the plot number, the beacon coordinates, the dimensions and the land area.',
      'It is how you confirm that the land you are standing on is the land on the papers. Plots in Abuja are often sold by plot number, and mix-ups between neighbouring plots do happen.',
    ],
    checklist: [
      'Have a registered surveyor locate the beacons on site.',
      'Compare the area on the TDP with the area in the listing.',
    ],
    related: ['certificate-of-occupancy', 'agis', 'inspection'],
  },
  {
    slug: 'building-plan-approval',
    term: 'Building plan approval',
    aka: ['Development permit', 'Approved plan'],
    category: 'titles',
    summary: 'Permission from Development Control to build a specific design on a specific plot.',
    body: [
      'Before construction starts in the FCT, the building drawings must be approved by the Department of [[development-control]]. The approval checks the design against the land use, setbacks, height limits and other planning rules for the district.',
      'For a finished house, an approved plan shows the building was put up lawfully. For land, it tells you what you will be allowed to build.',
    ],
    watchOut: 'Structures built without approval, or that differ from the approved plan, can be served notices and in serious cases demolished.',
    related: ['development-control', 'certificate-of-occupancy'],
  },

  /* ---------------- Land administration ---------------- */
  {
    slug: 'land-use-act',
    term: 'Land Use Act',
    aka: ['Land Use Act 1978'],
    category: 'land-admin',
    summary: 'The 1978 law that vests land in government and grants people rights of occupancy to use it.',
    body: [
      'The Land Use Act is the foundation of land law in Nigeria. It vests land in each state in the Governor, who holds it in trust for the people. In the Federal Capital Territory, land is vested in the Federal Government and administered through the FCT Minister.',
      'Because of the Act, nobody holds freehold land in the old sense. What you buy is a right of occupancy, usually evidenced by a [[certificate-of-occupancy]], for a fixed term.',
      'The Act also requires [[ministers-consent|consent]] for transfers and allows government to revoke rights for overriding public interest.',
    ],
    related: ['leasehold', 'ministers-consent', 'revocation'],
  },
  {
    slug: 'leasehold',
    term: 'Leasehold vs freehold',
    aka: ['Freehold', '99-year lease'],
    category: 'land-admin',
    summary: 'Why Abuja property is held for a term of years, not forever.',
    body: [
      'Listings sometimes say “freehold”, but under the [[land-use-act]] the strongest interest a private person can hold is a statutory right of occupancy for a fixed term. In the FCT that term is normally 99 years.',
      'When you buy a house or plot, you take over the remaining years on the grant. A title granted in 1995 has fewer years left than one granted in 2015, though grants can usually be renewed.',
    ],
    related: ['land-use-act', 'certificate-of-occupancy'],
  },
  {
    slug: 'agis',
    term: 'AGIS',
    aka: ['Abuja Geographic Information Systems'],
    category: 'land-admin',
    summary: 'The FCT agency that keeps land records and processes titles.',
    body: [
      'AGIS is the land information and registry agency of the FCT Administration. It holds the digital records of plots and titles, processes applications such as [[ministers-consent|consent]] and [[recertification]], and issues documents like the [[certificate-of-occupancy]] and [[tdp]].',
      'An official search at AGIS is the most important step in [[due-diligence]] for land in Abuja.',
    ],
    related: ['fcda', 'due-diligence', 'recertification'],
  },
  {
    slug: 'fcda',
    term: 'FCDA',
    aka: ['Federal Capital Development Authority'],
    category: 'land-admin',
    summary: 'The authority that plans and builds the Federal Capital City and its infrastructure.',
    body: [
      'The FCDA was set up to plan and develop Abuja. It is responsible for the city master plan, district layouts and engineering infrastructure such as roads, drainage and water.',
      'For buyers, FCDA matters because district plans decide what a plot can be used for and when infrastructure reaches an area. [[development-control]] sits within this planning system.',
    ],
    related: ['agis', 'development-control', 'districts-and-phases'],
  },
  {
    slug: 'development-control',
    term: 'Development Control',
    category: 'land-admin',
    summary: 'The FCT department that approves building plans and enforces planning rules.',
    body: [
      'Development Control reviews and approves building plans, inspects construction and acts against buildings that break planning rules, from unapproved extensions to structures on green areas or road reserves.',
      'Before buying a built property, check that it has [[building-plan-approval]] and that nothing on site goes beyond what was approved.',
    ],
    related: ['building-plan-approval', 'fcda'],
  },
  {
    slug: 'ground-rent',
    term: 'Ground rent',
    category: 'land-admin',
    summary: 'The annual rent a title holder pays to the FCT Administration for the land.',
    body: [
      'Because land is held under a right of occupancy, the holder pays an annual ground rent to government. The amount depends on the land use and location.',
      'Unpaid ground rent accumulates with the plot and can be a ground for [[revocation]]. FCT authorities have published lists of defaulters and revoked titles over unpaid rent in the past.',
    ],
    checklist: ['Ask the seller for ground rent receipts and confirm the balance with AGIS before you pay.'],
    related: ['revocation', 'certificate-of-occupancy'],
  },
  {
    slug: 'recertification',
    term: 'Recertification',
    category: 'land-admin',
    summary: 'The FCT exercise that replaced older land titles with new computerised records.',
    body: [
      'AGIS introduced recertification so that older paper titles could be checked and reissued on the new computerised system. Holders submitted their documents and, once verified, received new certificates.',
      'If you are buying a property with an older title, ask whether it was recertified. Titles that were never recertified can be harder to verify and may need extra work before consent is possible.',
    ],
    related: ['agis', 'certificate-of-occupancy'],
  },
  {
    slug: 'revocation',
    term: 'Revocation',
    category: 'land-admin',
    summary: 'When government cancels a right of occupancy.',
    body: [
      'Under the [[land-use-act]], a right of occupancy can be revoked for overriding public interest, for example to build a road, or for breach of the grant’s terms, such as failing to develop the plot in time or not paying [[ground-rent]].',
      'Revoked plots may be reallocated. That is why a recent official search matters: a document that was valid when issued may not be valid today.',
    ],
    watchOut: 'Undeveloped plots bought many years ago are the ones most often caught by revocation for failure to develop.',
    related: ['ground-rent', 'right-of-occupancy', 'due-diligence'],
  },
  {
    slug: 'districts-and-phases',
    term: 'Districts & phases',
    aka: ['Phase 1', 'Phase 2', 'Phase 3'],
    category: 'land-admin',
    summary: 'How the Abuja master plan groups the city into districts built out in phases.',
    body: [
      'The Federal Capital City is laid out in districts, grouped into phases that were developed in sequence. Phase 1 holds the oldest, most established districts such as Maitama, Asokoro, Wuse, Garki and the Central Business District.',
      'Phase 2 includes districts like Jabi, Utako, Wuye, Katampe, Mabushi and Gudu, and Phase 3 includes areas such as Gwarinpa. Later phases generally have newer infrastructure and lower prices than Phase 1.',
      'Outside the city proper are the [[satellite-towns]], which follow different planning and title arrangements.',
    ],
    related: ['satellite-towns', 'area-councils', 'fcda'],
  },
  {
    slug: 'satellite-towns',
    term: 'Satellite towns',
    category: 'land-admin',
    summary: 'The growing towns around the Federal Capital City, such as Kubwa, Lugbe and Gwagwalada.',
    body: [
      'Satellite towns sit outside the city districts but within the FCT. They include Kubwa, Lugbe, Karu, Gwagwalada and Bwari, and they house much of Abuja’s workforce.',
      'Prices are lower than in the city, but titles vary more. Some land carries FCT statutory titles; other land is held under [[customary-right-of-occupancy|customary rights]] or area council papers, which need extra checks.',
    ],
    related: ['area-councils', 'customary-right-of-occupancy', 'districts-and-phases'],
  },
  {
    slug: 'area-councils',
    term: 'Area councils',
    aka: ['AMAC'],
    category: 'land-admin',
    summary: 'The six local government areas of the FCT.',
    body: [
      'The FCT is divided into six area councils: Abuja Municipal (AMAC), Bwari, Gwagwalada, Kuje, Kwali and Abaji. They run local services and, in some areas, issue land documents of their own.',
      'Area council papers are not the same as an FCT statutory title. If a plot is offered with council documents, find out whether it can be regularised with AGIS before you buy.',
    ],
    related: ['satellite-towns', 'customary-right-of-occupancy'],
  },
  {
    slug: 'customary-right-of-occupancy',
    term: 'Customary Right of Occupancy',
    category: 'land-admin',
    summary: 'A right to land in rural areas, granted by local authorities rather than the FCT Minister.',
    body: [
      'Alongside statutory rights, the [[land-use-act]] provides for customary rights of occupancy over land in non-urban areas, granted at local government level.',
      'Customary titles are common in some [[satellite-towns]] and outlying communities. They can be valid, but they are harder to verify and less accepted by banks than a [[certificate-of-occupancy]].',
    ],
    related: ['area-councils', 'satellite-towns', 'land-use-act'],
  },
  {
    slug: 'mass-housing',
    term: 'Mass Housing scheme',
    category: 'land-admin',
    summary: 'The FCT programme that allocated large parcels to developers to build estates.',
    body: [
      'Under the FCT mass housing programme, land was allocated to private developers to deliver estates at scale. Many estates in districts like Lokogoma, Galadimawa and Lugbe began this way.',
      'When you buy in such an estate, the developer may hold the head title and issue sub-titles or [[deed-of-assignment|assignments]] to buyers. Check how the developer’s title is structured and whether individual units can get their own title.',
    ],
    related: ['off-plan', 'deed-of-assignment'],
  },

  /* ---------------- Buying & costs ---------------- */
  {
    slug: 'due-diligence',
    term: 'Due diligence',
    category: 'buying',
    summary: 'The checks a buyer makes before paying, to confirm the property and title are what they claim to be.',
    body: [
      'Due diligence combines a document check, a registry search and a site visit. Its aim is simple: make sure the seller owns what they are selling, that the title is valid, and that the land on the papers is the land on the ground.',
      'A lawyer usually leads the legal checks. A surveyor confirms boundaries against the [[tdp]].',
    ],
    checklist: [
      'Official search at [[agis]] on the title.',
      'Surveyor’s report on the beacons and plot size.',
      'Check for [[revocation]], unpaid [[ground-rent]] and pending court cases.',
      'For built property, check [[building-plan-approval]].',
      'Meet the seller in person and confirm their identity.',
    ],
    watchOut: 'Never pay the full price before the search results are back. Hold funds in [[escrow]] if the timing is tight.',
    related: ['agis', 'inspection', 'escrow'],
  },
  {
    slug: 'inspection',
    term: 'Inspection',
    category: 'buying',
    summary: 'Visiting the property to check its condition, location and boundaries before you commit.',
    body: [
      'An inspection is your chance to confirm the property exists, matches the listing and suits you. For land, it means locating the plot and its beacons. For buildings, it means checking structure, finishes, water, power and drainage.',
      'Some agents charge an inspection fee. Ask before you go.',
    ],
    checklist: [
      'Visit in daylight and, if you can, after heavy rain to see drainage.',
      'Check road access and how far finished infrastructure reaches.',
      'For buildings, look for cracks, damp and roof leaks.',
    ],
    related: ['due-diligence', 'tdp'],
  },
  {
    slug: 'agency-fee',
    term: 'Agency fee',
    aka: ['Commission'],
    category: 'buying',
    summary: 'The fee paid to the agent who brokers a sale or rental.',
    body: [
      'Agents in Abuja usually charge a percentage of the sale price or annual rent. The rate is negotiable and varies by deal size, so agree it in writing before the transaction starts.',
      'On rentals, agency fees are commonly quoted alongside a [[legal-fee]] and [[caution-deposit]], all payable with the first rent.',
    ],
    watchOut: 'Confirm who the agent represents. An agent paid by the seller is not working for you.',
    related: ['legal-fee', 'caution-deposit'],
  },
  {
    slug: 'legal-fee',
    term: 'Legal fee',
    category: 'buying',
    summary: 'The fee paid to the lawyer who prepares agreements and handles the legal side of a deal.',
    body: [
      'For a purchase, the legal fee covers the [[contract-of-sale]], [[deed-of-assignment]] and the [[due-diligence]] checks. For a rental, it covers the tenancy agreement.',
      'Buyers should have their own lawyer rather than rely on the seller’s.',
    ],
    related: ['agency-fee', 'due-diligence'],
  },
  {
    slug: 'stamp-duty',
    term: 'Stamp duty',
    category: 'buying',
    summary: 'A tax paid on legal documents such as deeds and leases.',
    body: [
      'Instruments like a [[deed-of-assignment]] or a lease must be stamped, which means paying stamp duty, before they can be registered or relied on in court.',
      'Rates and collection rules have changed in recent years. Your lawyer will confirm the current amount when preparing the documents.',
    ],
    related: ['deed-of-assignment', 'ministers-consent'],
  },
  {
    slug: 'capital-gains-tax',
    term: 'Capital gains tax',
    aka: ['CGT'],
    category: 'buying',
    summary: 'Tax that may be due on the profit when you sell a property.',
    body: [
      'If you sell a property for more than you paid, the gain may be taxable. Nigeria’s tax laws were overhauled in 2025, and how gains are taxed now depends on whether the seller is an individual or a company and on any reliefs that apply.',
      'Get advice from a tax professional before you sell so the cost is in your numbers.',
    ],
    related: ['stamp-duty'],
  },
  {
    slug: 'off-plan',
    term: 'Off-plan',
    category: 'buying',
    summary: 'Buying a property before it is built, usually at a lower price.',
    body: [
      'Off-plan purchases let you lock in a price early and often pay in instalments as construction progresses. Developers use the payments to fund the build.',
      'The trade-off is risk: delays, changes to the design, or a project that stalls. The developer’s track record and title matter as much as the price.',
    ],
    checklist: [
      'Verify the developer’s title to the land and the [[building-plan-approval]].',
      'Visit projects the developer has already finished.',
      'Tie payments to construction milestones in the [[contract-of-sale]].',
      'Agree what happens to your money if the project is delayed or cancelled.',
    ],
    related: ['mass-housing', 'contract-of-sale', 'escrow'],
  },
  {
    slug: 'escrow',
    term: 'Escrow',
    category: 'buying',
    summary: 'Holding the purchase money with a neutral party until agreed conditions are met.',
    body: [
      'With escrow, the buyer pays into an account held by a third party, often a lawyer or a bank. The money is released to the seller only when the agreed conditions are met, such as a clean search or signed transfer documents.',
      'It protects both sides and is especially useful for buyers in the diaspora who cannot be present.',
    ],
    related: ['due-diligence', 'off-plan'],
  },
  {
    slug: 'land-banking',
    term: 'Land banking',
    category: 'buying',
    summary: 'Buying land to hold for future price growth rather than to build on now.',
    body: [
      'Land banking is a common investment strategy in Abuja, betting that infrastructure and demand will raise values in a district over time.',
      'In the FCT, grants usually come with a deadline to develop. Holding land undeveloped for years can expose it to [[revocation]], so check the conditions on the title.',
    ],
    related: ['revocation', 'districts-and-phases'],
  },

  /* ---------------- Property types ---------------- */
  {
    slug: 'detached-duplex',
    term: 'Detached duplex',
    category: 'property-types',
    summary: 'A two-storey house standing on its own plot, with no shared walls.',
    body: [
      'A detached duplex is the classic family home in districts like Maitama, Asokoro and Guzape. It usually comes with its own compound, parking and often a [[bq]].',
      'Because it sits alone on its plot, it offers the most privacy and the most room to extend, subject to [[development-control]] rules.',
    ],
    related: ['semi-detached-duplex', 'terrace', 'bq'],
  },
  {
    slug: 'semi-detached-duplex',
    term: 'Semi-detached duplex',
    category: 'property-types',
    summary: 'A two-storey house that shares one wall with a neighbouring unit.',
    body: [
      'Semi-detached duplexes come in pairs, sharing a central wall. They are common in estates across Lokogoma, Gwarinpa and Life Camp and offer more space than a [[terrace]] at a lower price than a [[detached-duplex]].',
    ],
    related: ['detached-duplex', 'terrace'],
  },
  {
    slug: 'terrace',
    term: 'Terrace',
    aka: ['Terraced duplex', 'Townhouse'],
    category: 'property-types',
    summary: 'A house in a row of identical units sharing side walls.',
    body: [
      'Terraces are built in rows, with each unit sharing walls on both sides except at the ends. They make good use of land, so they are popular in estates and in central districts where plots are expensive.',
      'Estates with terraces usually charge a [[service-charge]] for shared areas and security.',
    ],
    related: ['semi-detached-duplex', 'service-charge'],
  },
  {
    slug: 'bungalow',
    term: 'Bungalow',
    category: 'property-types',
    summary: 'A single-storey house.',
    body: [
      'Bungalows put every room on one floor. They suit older buyers and families who prefer no stairs, and they are common in satellite towns and older parts of the city.',
    ],
    related: ['detached-duplex'],
  },
  {
    slug: 'bq',
    term: 'Boys’ Quarters',
    aka: ['BQ'],
    category: 'property-types',
    summary: 'A small separate unit in the compound, traditionally for staff or guests.',
    body: [
      'A BQ is a self-contained outbuilding, usually one or two rooms with a bathroom and kitchenette, set apart from the main house. Today it is often used for domestic staff, guests or as a rental unit.',
    ],
    related: ['detached-duplex', 'self-contain'],
  },
  {
    slug: 'self-contain',
    term: 'Self-contain',
    aka: ['Studio'],
    category: 'property-types',
    summary: 'A single room with its own bathroom and kitchen space.',
    body: [
      'A self-contain is a studio-style unit with a room, private bathroom and a small kitchen area. It is the most affordable rental option and common in satellite towns.',
      'A “mini flat” adds a separate sitting room to the same idea.',
    ],
    related: ['bq'],
  },
  {
    slug: 'carcass',
    term: 'Carcass',
    aka: ['Shell', 'Shell and core'],
    category: 'property-types',
    summary: 'A building with its structure and roof in place but no finishes.',
    body: [
      'A carcass building has walls, floors and roof but no plastering, fittings, electrics or finishes. Buyers choose it to save money upfront and finish to their own taste.',
      'Budget carefully: finishing can cost a large share of the total, and quality depends on who you hire.',
    ],
    related: ['off-plan', 'serviced-plot'],
  },
  {
    slug: 'serviced-plot',
    term: 'Serviced plot',
    category: 'property-types',
    summary: 'Land in an area where roads, drainage and utilities are already in place.',
    body: [
      'A serviced plot has access to engineering infrastructure such as tarred roads, drainage, water and power lines. It costs more than unserviced land but you can build sooner and avoid infrastructure risk.',
      'Some estates sell plots as “serviced” before the work is finished. Check what has actually been delivered.',
    ],
    related: ['districts-and-phases', 'land-banking'],
  },

  /* ---------------- Renting ---------------- */
  {
    slug: 'tenancy-agreement',
    term: 'Tenancy agreement',
    aka: ['Lease agreement'],
    category: 'renting',
    summary: 'The contract that sets out rent, length of stay and the duties of landlord and tenant.',
    body: [
      'A written tenancy agreement records the rent, how long the tenancy lasts, what the tenant can and cannot do, who repairs what, and how either side ends it.',
      'In Abuja, rent is usually paid yearly in advance, sometimes for two years at once. The agreement should say what happens to that advance if the tenancy ends early.',
    ],
    checklist: [
      'Confirm the landlord owns the property or is authorised to let it.',
      'Get receipts for rent, [[caution-deposit]] and fees.',
      'Agree the [[service-charge]] in writing.',
    ],
    related: ['caution-deposit', 'service-charge', 'quit-notice'],
  },
  {
    slug: 'caution-deposit',
    term: 'Caution deposit',
    aka: ['Caution fee', 'Security deposit'],
    category: 'renting',
    summary: 'A refundable sum held by the landlord to cover damage or unpaid bills.',
    body: [
      'Landlords often take a caution deposit at the start of a tenancy. It should be refunded when the tenant leaves, minus the cost of any damage beyond normal wear and tear.',
      'Record the condition of the property with photos when you move in and when you leave.',
    ],
    related: ['tenancy-agreement', 'agency-fee'],
  },
  {
    slug: 'service-charge',
    term: 'Service charge',
    category: 'renting',
    summary: 'A regular payment for shared services in an estate or building.',
    body: [
      'Service charges pay for things residents share: security, cleaning, waste collection, maintenance of common areas, and sometimes a shared generator or water supply.',
      'Ask what the charge covers, how often it is reviewed, and whether it is paid to the landlord or an estate association.',
    ],
    related: ['tenancy-agreement', 'terrace'],
  },
  {
    slug: 'quit-notice',
    term: 'Quit notice',
    aka: ['Notice to quit'],
    category: 'renting',
    summary: 'Formal notice from a landlord that a tenancy is ending.',
    body: [
      'A landlord who wants a tenant to leave must serve a valid notice to quit. The length of notice depends on the type of tenancy and the law that applies, and a yearly tenancy needs longer notice than a monthly one.',
      'If the tenant does not leave when the notice expires, the landlord serves a notice of intention to recover possession and then goes to court. Self-help evictions such as changing locks are not lawful.',
    ],
    related: ['tenancy-agreement'],
  },
]

export const entryBySlug = new Map(ENTRIES.map(e => [e.slug, e]))
export const categoryById = new Map(CATEGORIES.map(c => [c.id, c]))
