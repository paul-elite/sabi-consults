// Finds real estate businesses for each configured location.
// Uses the Google Places API when GOOGLE_PLACES_API_KEY is set (best coverage, includes
// review counts), otherwise falls back to OpenStreetMap, which is free but sparser.

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const PLACES_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.internationalPhoneNumber',
  'places.businessStatus',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

export async function discover(config, { fetchImpl = fetch, log = console.error } = {}) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const found = new Map();
  for (const location of config.locations) {
    const places = key
      ? await fromGooglePlaces(location, config, key, fetchImpl, log)
      : await fromOpenStreetMap(location, config, fetchImpl, log);
    for (const place of places) {
      const id = dedupeKey(place);
      if (!found.has(id)) found.set(id, { ...place, city: location.name, country: location.country, priority: location.priority });
    }
    log(`[discover] ${location.name}: ${places.length} results (${found.size} unique so far)`);
  }
  return [...found.values()];
}

async function fromGooglePlaces(location, config, key, fetchImpl, log) {
  const results = [];
  for (const query of config.queries) {
    let pageToken;
    for (let page = 0; page < config.maxPagesPerQuery; page++) {
      const body = {
        textQuery: `${query} in ${location.name}`,
        pageSize: 20,
        locationBias: {
          circle: { center: { latitude: location.lat, longitude: location.lon }, radius: Math.min(location.radiusKm * 1000, 50000) },
        },
        ...(pageToken ? { pageToken } : {}),
      };
      const res = await fetchImpl(PLACES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': PLACES_FIELDS },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        log(`[discover] Places error ${res.status} for "${body.textQuery}": ${(await res.text()).slice(0, 200)}`);
        break;
      }
      const data = await res.json();
      for (const p of data.places ?? []) {
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
        results.push({
          source: 'google',
          placeId: p.id,
          name: p.displayName?.text ?? '',
          address: p.formattedAddress ?? '',
          website: p.websiteUri ?? '',
          phone: p.internationalPhoneNumber ?? '',
          rating: p.rating ?? null,
          reviews: p.userRatingCount ?? 0,
          mapsUrl: p.googleMapsUri ?? '',
        });
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }
  return results;
}

async function fromOpenStreetMap(location, config, fetchImpl, log) {
  const radius = Math.round(location.radiusKm * 1000);
  const around = `(around:${radius},${location.lat},${location.lon})`;
  const query = `[out:json][timeout:90];(nwr["office"="estate_agent"]${around};nwr["shop"="estate_agent"]${around};);out tags center;`;
  const res = await fetchImpl(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    log(`[discover] OpenStreetMap error ${res.status} for ${location.name}`);
    return [];
  }
  const data = await res.json();
  return (data.elements ?? [])
    .filter((e) => e.tags?.name)
    .map((e) => {
      const t = e.tags;
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      return {
        source: 'osm',
        placeId: `osm:${e.type}/${e.id}`,
        name: t.name,
        address: [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' '),
        website: t.website ?? t['contact:website'] ?? '',
        phone: t.phone ?? t['contact:phone'] ?? '',
        rating: null,
        reviews: 0,
        mapsUrl: lat != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : '',
      };
    });
}

// Hosts that aren't the company's own website (many agencies list an Instagram page instead).
const NOT_OWN_SITE = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|linktr\.ee|wa\.me|whatsapp\.com|propertypro\.ng|nigeriapropertycentre\.com|jiji\.ng|zillow\.com|rightmove\.co\.uk|zoopla\.co\.uk|realtor\.com)$/i;

export function isOwnSite(url) {
  const host = siteHost(url);
  return Boolean(host) && !NOT_OWN_SITE.test(host);
}

export function dedupeKey(place) {
  const host = isOwnSite(place.website) ? siteHost(place.website) : '';
  return host || `${place.name.toLowerCase().replace(/[^a-z0-9]/g, '')}|${place.phone.replace(/\D/g, '').slice(-9)}`;
}

export function siteHost(url) {
  if (!url) return '';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}
