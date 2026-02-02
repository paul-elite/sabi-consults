-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT DEFAULT 'Sabi Consults',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS blogs_slug_idx ON blogs(slug);
CREATE INDEX IF NOT EXISTS blogs_status_idx ON blogs(status);
CREATE INDEX IF NOT EXISTS blogs_published_at_idx ON blogs(published_at DESC);

-- Enable RLS
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published blogs
CREATE POLICY "Allow public read of published blogs" ON blogs
  FOR SELECT USING (status = 'published');

-- Allow all operations for service role (admin)
CREATE POLICY "Allow service role full access" ON blogs
  FOR ALL USING (true) WITH CHECK (true);

-- Insert sample blog posts
INSERT INTO blogs (title, slug, excerpt, content, cover_image, author, status, published_at) VALUES
(
  'Understanding Abuja''s Real Estate Market in 2024',
  'understanding-abuja-real-estate-market-2024',
  'A comprehensive guide to navigating the property market in Nigeria''s capital city, from premium districts to emerging investment opportunities.',
  '<h2>The State of Abuja Real Estate</h2>
<p>Abuja, Nigeria''s purpose-built capital city, continues to be one of the most attractive real estate markets in West Africa. With its planned layout, modern infrastructure, and status as the seat of federal government, the city offers unique investment opportunities for both local and diaspora investors.</p>

<h3>Premium Districts: Maitama, Asokoro, and Wuse II</h3>
<p>The triumvirate of Maitama, Asokoro, and Wuse II remains the gold standard for luxury real estate in Abuja. These districts command premium prices due to their proximity to government institutions, embassies, and high-end amenities.</p>

<p><strong>Maitama</strong> is often called the "Beverly Hills of Abuja." Properties here range from ₦500 million to several billion naira for top-tier mansions. The district is characterized by wide roads, mature trees, and a serene atmosphere that appeals to diplomats and high-net-worth individuals.</p>

<p><strong>Asokoro</strong> houses the Presidential Villa and several ministerial residences. This proximity to power makes it highly desirable for politicians and business executives who need quick access to government corridors.</p>

<p><strong>Wuse II</strong> offers a more vibrant, commercial atmosphere while maintaining residential appeal. It''s the go-to destination for young professionals and businesses, with numerous restaurants, shops, and entertainment venues.</p>

<h3>Emerging Investment Hotspots</h3>
<p>For investors seeking better value and growth potential, several emerging districts deserve attention:</p>

<ul>
<li><strong>Katampe Extension</strong> - Rapidly developing with modern estates and competitive pricing</li>
<li><strong>Jahi</strong> - Growing residential area with good infrastructure</li>
<li><strong>Gwarinpa</strong> - Africa''s largest housing estate with diverse property options</li>
<li><strong>Life Camp</strong> - Popular among young families for its community feel</li>
</ul>

<h3>Investment Considerations</h3>
<p>When investing in Abuja real estate, consider these factors:</p>

<ol>
<li><strong>Title Documentation</strong> - Always verify the Certificate of Occupancy (C of O) or Right of Occupancy (R of O)</li>
<li><strong>Land Use</strong> - Confirm the approved land use matches your intended purpose</li>
<li><strong>Infrastructure</strong> - Check access to roads, water, and electricity</li>
<li><strong>Developer Reputation</strong> - Research the track record of estate developers</li>
</ol>

<p>Working with a trusted real estate consultant like Sabi Consults can help you navigate these complexities and make informed investment decisions.</p>',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '5 days'
),
(
  'Buying Land in Abuja: A Complete Guide for Diaspora Investors',
  'buying-land-abuja-guide-diaspora-investors',
  'Essential tips and step-by-step guidance for Nigerians abroad looking to invest in land within the Federal Capital Territory.',
  '<h2>Why Diaspora Investors Choose Abuja</h2>
<p>For Nigerians living abroad, investing in Abuja real estate represents both a financial opportunity and a connection to home. The city''s stable property market, planned infrastructure, and potential for appreciation make it an attractive destination for diaspora investment.</p>

<h3>Benefits of Land Investment</h3>
<p>Land ownership in Abuja offers several advantages:</p>

<ul>
<li><strong>Capital Appreciation</strong> - Land values in Abuja have historically shown steady growth, particularly in developing areas</li>
<li><strong>No Depreciation</strong> - Unlike buildings, land doesn''t deteriorate over time</li>
<li><strong>Flexibility</strong> - Build when you''re ready, or hold as an investment</li>
<li><strong>Legacy Asset</strong> - Create generational wealth for your family</li>
</ul>

<h3>Step-by-Step Buying Process</h3>

<h4>1. Define Your Budget and Purpose</h4>
<p>Before searching, determine your budget and whether you''re buying for personal use, development, or pure investment. This clarity will guide your location choices.</p>

<h4>2. Choose Your Location</h4>
<p>Research different districts based on your budget:</p>
<ul>
<li><strong>Premium (₦200M+)</strong>: Maitama, Asokoro, Wuse II</li>
<li><strong>Mid-Range (₦50M-₦200M)</strong>: Katampe, Jahi, Guzape</li>
<li><strong>Affordable (₦15M-₦50M)</strong>: Lugbe, Kubwa, Karsana</li>
</ul>

<h4>3. Engage a Trusted Consultant</h4>
<p>Working with a reputable real estate consultant is crucial, especially for diaspora investors who cannot easily visit properties. A good consultant will:</p>
<ul>
<li>Verify property documentation</li>
<li>Conduct physical inspections on your behalf</li>
<li>Negotiate fair prices</li>
<li>Guide you through the legal process</li>
</ul>

<h4>4. Verify Documentation</h4>
<p>Essential documents to verify include:</p>
<ul>
<li><strong>Certificate of Occupancy (C of O)</strong> - The gold standard of land titles in Abuja</li>
<li><strong>Right of Occupancy (R of O)</strong> - Valid but should be converted to C of O</li>
<li><strong>Survey Plan</strong> - Confirms exact boundaries and coordinates</li>
<li><strong>Tax Clearance</strong> - Confirms seller has no outstanding obligations</li>
</ul>

<h4>5. Conduct Due Diligence</h4>
<p>Verify the property at AGIS (Abuja Geographic Information Systems) to confirm:</p>
<ul>
<li>True ownership</li>
<li>No existing encumbrances</li>
<li>Approved land use</li>
<li>No government acquisition notices</li>
</ul>

<h4>6. Complete the Transaction</h4>
<p>Once satisfied, proceed with:</p>
<ul>
<li>Signing the Deed of Assignment</li>
<li>Payment (preferably through escrow)</li>
<li>Governor''s Consent application</li>
<li>Registration at the Land Registry</li>
</ul>

<h3>Common Pitfalls to Avoid</h3>
<ol>
<li>Buying land without physical verification</li>
<li>Dealing with unauthorized agents</li>
<li>Ignoring the Governor''s Consent requirement</li>
<li>Paying without proper documentation</li>
<li>Not budgeting for additional costs (legal fees, survey, consent fees)</li>
</ol>

<p>At Sabi Consults, we specialize in helping diaspora investors navigate the Abuja property market safely. Contact us for personalized guidance.</p>',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '12 days'
),
(
  'Top 5 Upcoming Estates in Abuja You Should Know About',
  'top-5-upcoming-estates-abuja-2024',
  'Discover the most promising new residential developments in Abuja that offer modern amenities, strategic locations, and excellent investment potential.',
  '<h2>The Rise of Modern Estates in Abuja</h2>
<p>Abuja''s real estate landscape is being transformed by a new generation of thoughtfully planned estates. These developments offer more than just housing—they provide complete communities with modern amenities, security, and lifestyle features that appeal to today''s discerning buyers.</p>

<h3>What Makes a Great Estate?</h3>
<p>Before diving into our top picks, here''s what we look for in a quality estate:</p>
<ul>
<li><strong>Developer Track Record</strong> - Proven history of completing and delivering projects</li>
<li><strong>Infrastructure</strong> - Good roads, reliable utilities, and drainage systems</li>
<li><strong>Security</strong> - Perimeter fencing, controlled access, and security personnel</li>
<li><strong>Amenities</strong> - Recreation facilities, green spaces, and community features</li>
<li><strong>Location</strong> - Accessibility and proximity to key areas</li>
<li><strong>Documentation</strong> - Clear titles and proper government approvals</li>
</ul>

<h3>Our Top 5 Picks</h3>

<h4>1. Royal Gardens Estate, Katampe Extension</h4>
<p>Located in the rapidly developing Katampe Extension, Royal Gardens offers a perfect blend of accessibility and serenity. The estate features:</p>
<ul>
<li>24/7 security with CCTV surveillance</li>
<li>Underground electrical installations</li>
<li>Central sewage treatment plant</li>
<li>Recreational facilities including a clubhouse</li>
<li>Various plot sizes from 500sqm to 1000sqm</li>
</ul>
<p><strong>Price Range:</strong> ₦45M - ₦90M per plot</p>

<h4>2. Sunrise Valley, Gwarinpa Extension</h4>
<p>Building on Gwarinpa''s success as a residential haven, Sunrise Valley brings modern estate living to this beloved district:</p>
<ul>
<li>Gated community with single entry point</li>
<li>Wide internal roads with street lighting</li>
<li>Dedicated commercial zone</li>
<li>Children''s playground and sports facilities</li>
<li>Mix of terrace houses and detached plots</li>
</ul>
<p><strong>Price Range:</strong> ₦35M - ₦70M per plot</p>

<h4>3. Diplomatic Heights, Jahi</h4>
<p>Positioned near the diplomatic zone, this estate attracts professionals and expatriates:</p>
<ul>
<li>Premium finishes and specifications</li>
<li>Smart home integration options</li>
<li>Landscaped gardens and water features</li>
<li>Tennis courts and swimming pool</li>
<li>Proximity to international schools</li>
</ul>
<p><strong>Price Range:</strong> ₦80M - ₦150M per plot</p>

<h4>4. Green Valley Estate, Life Camp</h4>
<p>Emphasizing sustainable living, Green Valley appeals to environmentally conscious buyers:</p>
<ul>
<li>Solar-powered street lights</li>
<li>Rainwater harvesting systems</li>
<li>Extensive green spaces and tree planting</li>
<li>Waste recycling facilities</li>
<li>Community farming plots</li>
</ul>
<p><strong>Price Range:</strong> ₦40M - ₦75M per plot</p>

<h4>5. Metro Park Estate, Airport Road</h4>
<p>For those prioritizing convenience and connectivity:</p>
<ul>
<li>5 minutes from Nnamdi Azikiwe International Airport</li>
<li>Easy access to the expressway</li>
<li>Mixed-use development with retail spaces</li>
<li>Modern infrastructure throughout</li>
<li>Flexible payment plans available</li>
</ul>
<p><strong>Price Range:</strong> ₦30M - ₦55M per plot</p>

<h3>Investment Outlook</h3>
<p>These estates represent excellent investment opportunities due to:</p>
<ol>
<li>Abuja''s continued growth as Nigeria''s administrative center</li>
<li>Increasing demand for quality housing from the growing middle class</li>
<li>Limited supply of well-planned estates with proper documentation</li>
<li>Infrastructure improvements in surrounding areas</li>
</ol>

<p>Whether you''re looking to build your dream home or make a sound investment, these estates deserve your consideration. Contact Sabi Consults for exclusive access and expert guidance on any of these developments.</p>',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
  'Sabi Consults',
  'published',
  NOW() - INTERVAL '20 days'
);
