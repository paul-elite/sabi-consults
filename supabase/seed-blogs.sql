-- Blog posts for Sabi Consults
-- Run this in Supabase SQL Editor to add blog content

INSERT INTO blogs (title, slug, excerpt, content, cover_image, author, status, published_at, created_at, updated_at)
VALUES

-- Blog 1: District Guide
(
  'Understanding Abuja''s Districts: Where to Buy Property in 2026',
  'abuja-districts-guide-2026',
  'A practical breakdown of Abuja''s key residential districts, from established areas like Maitama and Asokoro to emerging opportunities in Guzape and Katampe.',
  '<p>Abuja''s property market is defined by its districts. Each has a distinct character, price range, and investment profile. Whether you''re buying your first home or adding to a portfolio, understanding these differences is essential.</p>

<h2>The Premium Tier: Maitama and Asokoro</h2>
<p>These two districts remain the gold standard for Abuja real estate. Maitama, home to embassies and corporate headquarters, commands the highest prices in the city. Properties here rarely fall below ₦400 million for a standard 5-bedroom detached house.</p>
<p>Asokoro, nestled close to the Presidential Villa, offers similar prestige with slightly more variety in property types. Both districts benefit from established infrastructure, consistent power supply, and strong security presence.</p>

<h2>The Growth Corridor: Guzape and Katampe</h2>
<p>For buyers seeking quality without Maitama prices, Guzape and Katampe Extension represent compelling alternatives. Guzape, positioned on the hillside adjacent to Asokoro, has seen rapid development over the past five years. New builds here typically range from ₦150 million to ₦350 million.</p>
<p>Katampe Extension offers larger plots and more architectural flexibility. The area attracts buyers who want to build custom homes rather than purchase completed properties.</p>

<h2>Family-Friendly Options: Gwarinpa and Life Camp</h2>
<p>Gwarinpa remains Africa''s largest housing estate and offers genuine community living. Properties are more affordable here—typically ₦80 million to ₦150 million for a 4-bedroom semi-detached house. The trade-off is distance from the city centre and heavier traffic during peak hours.</p>
<p>Life Camp has evolved from a quiet suburb into a bustling commercial and residential hub. Its proximity to the Jabi-Life Camp road makes it accessible, though traffic congestion has increased with development.</p>

<h2>Emerging Areas: Lugbe and Kubwa</h2>
<p>For first-time buyers or those prioritising value, Lugbe and Kubwa offer entry points to Abuja property ownership. Land prices in these areas remain significantly lower than central districts, making them attractive for long-term investment or building projects.</p>

<h2>Making Your Decision</h2>
<p>The right district depends on your priorities: proximity to work, family needs, investment horizon, and budget. We recommend visiting areas at different times of day to assess traffic patterns and neighbourhood activity before committing to any purchase.</p>',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- Blog 2: Buying Process
(
  'How to Buy Property in Abuja: A Step-by-Step Guide',
  'how-to-buy-property-abuja',
  'From initial search to final documentation, here''s what every buyer needs to know about purchasing property in Nigeria''s capital city.',
  '<p>Buying property in Abuja involves several stages, each requiring attention to detail. This guide walks you through the process, highlighting common pitfalls and how to avoid them.</p>

<h2>Step 1: Define Your Requirements</h2>
<p>Before viewing any properties, clarify your needs. Consider the property type (land, house, or apartment), preferred districts, budget range, and whether you''re buying for personal use or investment. This clarity saves time and helps agents show you relevant options.</p>

<h2>Step 2: Engage a Trusted Agent or Consultant</h2>
<p>The Abuja property market operates largely through agents and consultants. Choose someone with verifiable track record and local knowledge. Ask for references and check their history with previous transactions.</p>

<h2>Step 3: Property Inspection</h2>
<p>Never buy property without physical inspection. For land, confirm the boundaries match the survey plan. For houses, assess the quality of construction, check for structural issues, and verify that utilities function properly. Visit at different times of day if possible.</p>

<h2>Step 4: Document Verification</h2>
<p>This step is critical. The key documents to verify include:</p>
<ul>
<li><strong>Certificate of Occupancy (C of O):</strong> The primary title document issued by the FCT Administration</li>
<li><strong>Survey Plan:</strong> Must be current and registered with the Survey Department</li>
<li><strong>Building Approval:</strong> For developed properties, confirm the structure was approved</li>
<li><strong>Tax Clearance:</strong> Verify the seller has no outstanding property taxes</li>
</ul>
<p>Consider engaging a property lawyer to conduct searches at the Land Registry. This investment—typically ₦50,000 to ₦150,000—can save you from purchasing disputed or fraudulently sold property.</p>

<h2>Step 5: Price Negotiation</h2>
<p>Most asking prices in Abuja have room for negotiation, typically 5-15% depending on market conditions and seller motivation. Base your negotiations on comparable sales in the area rather than arbitrary offers.</p>

<h2>Step 6: Payment Structure</h2>
<p>Payment terms vary. Outright purchases are common for land, while some developers offer payment plans for new builds. If using a payment plan, ensure all terms are documented in writing before making any deposits.</p>

<h2>Step 7: Documentation and Transfer</h2>
<p>Once terms are agreed, your lawyer should prepare or review the Deed of Assignment. After signing, the document must be stamped at the Federal Inland Revenue Service and registered at the FCT Land Registry. Budget 3-6 months for this process.</p>

<h2>Common Mistakes to Avoid</h2>
<ul>
<li>Paying full amount before document verification</li>
<li>Relying on photocopies instead of original documents</li>
<li>Skipping the land registry search</li>
<li>Buying from "family representatives" without proper power of attorney</li>
</ul>',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),

-- Blog 3: Diaspora Guide
(
  'Buying Abuja Property from Abroad: A Guide for Diaspora Nigerians',
  'diaspora-property-buying-guide',
  'Practical advice for Nigerians living overseas who want to invest in Abuja real estate without falling victim to common scams.',
  '<p>For Nigerians in the diaspora, buying property back home represents both an investment opportunity and a connection to roots. However, distance creates vulnerability. This guide addresses the specific challenges diaspora buyers face.</p>

<h2>The Trust Challenge</h2>
<p>The biggest obstacle for diaspora buyers isn''t finding property—it''s finding trustworthy partners on the ground. Family members, while well-meaning, may lack the expertise to properly evaluate properties or verify documents. Professional agents may prioritise commission over your interests.</p>
<p>The solution is to build relationships gradually. Start with smaller transactions before committing significant capital. Visit in person if possible, even briefly, before major purchases.</p>

<h2>Remote Verification Methods</h2>
<p>Technology helps, but has limits. Video calls can show you a property, but cannot reveal document fraud or boundary disputes. For any significant purchase:</p>
<ul>
<li>Engage an independent property lawyer (not one recommended by the seller or agent)</li>
<li>Request certified true copies of all documents</li>
<li>Commission independent searches at the Land Registry</li>
<li>Consider hiring a surveyor to confirm boundaries</li>
</ul>

<h2>Payment Protection</h2>
<p>Never transfer full payment upfront. Structure payments in stages tied to specific milestones:</p>
<ul>
<li>Initial deposit (typically 10-20%) upon agreement</li>
<li>Balance upon document verification and physical inspection</li>
<li>Final payment upon registration completion</li>
</ul>
<p>Use documented bank transfers rather than cash payments. This creates a paper trail that provides legal protection.</p>

<h2>Power of Attorney Considerations</h2>
<p>If you cannot be present for the purchase, you''ll need to grant Power of Attorney to someone in Nigeria. Choose this person carefully—they''ll have legal authority to act on your behalf. Have the document prepared by a lawyer you trust, and consider limiting its scope to specific transactions.</p>

<h2>Common Scams Targeting Diaspora Buyers</h2>
<ul>
<li><strong>The "Urgent Sale" Pressure:</strong> Claims that another buyer is ready to pay, forcing quick decisions</li>
<li><strong>Document Forgery:</strong> Fake C of Os and survey plans that look authentic</li>
<li><strong>Multiple Sales:</strong> The same property sold to several buyers simultaneously</li>
<li><strong>Family Land Disputes:</strong> Property sold by one family member without consent of others</li>
</ul>

<h2>Building for the Future</h2>
<p>Many diaspora buyers purchase land with plans to build later. If this is your approach, factor in ongoing costs: security, clearing, and potential caretaker fees. Undeveloped land in growing areas can attract encroachment if left unmonitored.</p>',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
),

-- Blog 4: Land vs House
(
  'Land or House: Which Property Type Suits Your Goals?',
  'land-vs-house-investment',
  'Comparing the two main property types in Abuja—undeveloped land and completed houses—to help you make the right choice.',
  '<p>The choice between buying land and buying a completed house shapes your investment journey in fundamentally different ways. Each has advantages depending on your goals, timeline, and involvement level.</p>

<h2>The Case for Land</h2>
<p><strong>Lower Entry Point:</strong> Land typically requires less upfront capital than a completed house in the same area. A plot in an emerging district might cost ₦15-30 million, while a house on similar land would be ₦80-150 million.</p>
<p><strong>Appreciation Potential:</strong> Well-located land in developing areas can appreciate significantly as infrastructure improves. Areas like Guzape and Katampe have seen land values multiply over the past decade.</p>
<p><strong>Customisation:</strong> Building your own home means getting exactly what you want—your floor plan, your finishes, your specifications. You''re not compromising on someone else''s design choices.</p>

<h2>The Challenges of Land</h2>
<p><strong>Additional Costs:</strong> Land purchase is just the beginning. You''ll need to budget for building approval, construction, and potentially years of caretaker fees before development.</p>
<p><strong>Development Risk:</strong> Building projects can face delays, cost overruns, and contractor issues. Without construction experience, managing a build from abroad is particularly challenging.</p>
<p><strong>No Immediate Income:</strong> Unlike a house that can be rented immediately, land generates no income while you hold it.</p>

<h2>The Case for Houses</h2>
<p><strong>Immediate Use or Income:</strong> A completed house can be occupied or rented from day one. For diaspora buyers planning eventual return, this offers flexibility.</p>
<p><strong>Known Quantity:</strong> What you see is what you get. You can assess construction quality, test utilities, and identify issues before purchase—unlike a house that exists only as plans.</p>
<p><strong>Simpler Transaction:</strong> While due diligence is still essential, buying a completed house involves fewer variables than a land purchase followed by construction.</p>

<h2>The Challenges of Houses</h2>
<p><strong>Higher Capital Requirement:</strong> Houses demand more upfront capital, which may stretch budgets or require financing.</p>
<p><strong>Limited Availability:</strong> Quality houses in desirable areas are competitive. Finding the right combination of location, size, and price takes time.</p>
<p><strong>Compromise Required:</strong> Unless you''re buying to demolish and rebuild, you''re accepting someone else''s architectural and design decisions.</p>

<h2>Making Your Choice</h2>
<p>Consider these questions:</p>
<ul>
<li>What''s your timeline? Land suits long-term plays; houses suit immediate needs.</li>
<li>How involved can you be? Building requires active management; buying a house is more hands-off.</li>
<li>What''s your risk tolerance? Land in emerging areas carries development uncertainty; established houses in proven districts are more predictable.</li>
</ul>',
  'https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '12 days'
),

-- Blog 5: Document Verification
(
  'Essential Documents When Buying Property in Abuja',
  'property-documents-checklist',
  'A clear explanation of the key documents you need to verify before any property purchase in the FCT.',
  '<p>Document verification is where many property transactions go wrong. Understanding what each document means—and how to verify its authenticity—protects your investment.</p>

<h2>Certificate of Occupancy (C of O)</h2>
<p>The C of O is the primary title document for land in the FCT. Issued by the FCT Administration, it grants the holder rights to occupy and use the land for a specified period (typically 99 years from the original grant).</p>
<p><strong>What to check:</strong></p>
<ul>
<li>Is the document original, not a photocopy?</li>
<li>Does the name match the seller''s identity?</li>
<li>Is the plot number consistent with the survey plan?</li>
<li>Are there any encumbrances or charges registered against it?</li>
</ul>
<p><strong>Verification:</strong> Conduct a search at the FCT Land Registry (Abuja Geographic Information Systems - AGIS). This confirms the document is genuine and reveals any registered claims against the property.</p>

<h2>Right of Occupancy (R of O)</h2>
<p>The R of O is a preliminary title, often granted before the C of O is processed. It''s legitimate but represents an earlier stage in the documentation process. Properties with R of O only are typically less expensive, but buyers should factor in the cost and time to convert to C of O.</p>

<h2>Survey Plan</h2>
<p>The survey plan shows the exact boundaries, dimensions, and location of the plot. It''s prepared by a licensed surveyor and registered with the FCT Survey Department.</p>
<p><strong>What to check:</strong></p>
<ul>
<li>Is the surveyor''s stamp and signature present?</li>
<li>Does the plot number match the C of O?</li>
<li>Are the coordinates current and verifiable?</li>
</ul>
<p><strong>Verification:</strong> Commission an independent surveyor to confirm boundaries on the ground match the survey plan. This is especially important for land purchases.</p>

<h2>Building Approval</h2>
<p>For developed properties, building approval confirms the structure was legally authorised. The Development Control Department issues this after reviewing architectural plans.</p>
<p><strong>What to check:</strong></p>
<ul>
<li>Does the approved plan match what was actually built?</li>
<li>Were any modifications made without approval?</li>
</ul>

<h2>Deed of Assignment</h2>
<p>This document transfers ownership from seller to buyer. It should be prepared by a lawyer, signed by both parties, and witnessed. After signing, it must be:</p>
<ol>
<li>Stamped at the Federal Inland Revenue Service</li>
<li>Registered at the FCT Land Registry</li>
</ol>
<p>Registration is essential—an unregistered deed has limited legal standing.</p>

<h2>Tax Clearance</h2>
<p>Verify that the seller has paid all applicable taxes on the property. Outstanding taxes can become the buyer''s problem after transfer.</p>

<h2>Red Flags</h2>
<ul>
<li>Pressure to close quickly without time for verification</li>
<li>Seller unable to produce original documents</li>
<li>Inconsistencies between documents (different plot numbers, names, or boundaries)</li>
<li>Documents that look recently printed despite old dates</li>
<li>Reluctance to allow independent verification</li>
</ul>',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  cover_image = EXCLUDED.cover_image,
  updated_at = NOW();
