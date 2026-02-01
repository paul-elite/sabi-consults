import { Property, District, Testimonial } from '@/lib/types'

// Abuja districts with coordinates
export const districts: District[] = [
  { id: 'maitama', name: 'Maitama', description: 'Diplomatic and high-end residential area', latitude: 9.0820, longitude: 7.4878 },
  { id: 'asokoro', name: 'Asokoro', description: 'Exclusive residential district near Aso Rock', latitude: 9.0406, longitude: 7.5149 },
  { id: 'wuse2', name: 'Wuse II', description: 'Vibrant commercial and residential hub', latitude: 9.0677, longitude: 7.4626 },
  { id: 'jabi', name: 'Jabi', description: 'Modern district with Jabi Lake', latitude: 9.0736, longitude: 7.4237 },
  { id: 'gwarinpa', name: 'Gwarinpa', description: 'Africa\'s largest housing estate', latitude: 9.1019, longitude: 7.3925 },
  { id: 'katampe', name: 'Katampe', description: 'Serene hillside residential area', latitude: 9.0892, longitude: 7.4456 },
  { id: 'lifecamp', name: 'Life Camp', description: 'Growing residential and commercial zone', latitude: 9.0831, longitude: 7.3847 },
  { id: 'utako', name: 'Utako', description: 'Central business and residential district', latitude: 9.0582, longitude: 7.4419 },
]

// Sample properties - in production, this would come from a database
export const properties: Property[] = [
  {
    id: '1',
    title: '5 Bedroom Detached Duplex with BQ',
    description: 'Exquisite 5-bedroom detached duplex in the heart of Maitama. This property features modern finishes, spacious living areas, a well-equipped kitchen, and a beautifully landscaped garden. The property comes with a 2-room boys quarters, ample parking space, and 24/7 security. Perfect for families seeking luxury and convenience in Abuja\'s most prestigious district.',
    price: 450000000,
    type: 'house',
    district: 'Maitama',
    address: '24 Yedseram Street, Maitama, Abuja',
    latitude: 9.0820,
    longitude: 7.4878,
    bedrooms: 5,
    bathrooms: 6,
    bq: 2,
    landSize: 650,
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
    ],
    features: ['Swimming Pool', 'Generator House', 'Security Post', 'Landscaped Garden', 'Central AC', 'Smart Home System'],
    status: 'available',
    featured: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    title: '4 Bedroom Terrace Duplex',
    description: 'Contemporary 4-bedroom terrace duplex in Asokoro. Features include high-quality finishes, open-plan living and dining, fitted kitchen, and private garden. Located in a secure, gated community with excellent access to major roads and amenities.',
    price: 280000000,
    type: 'house',
    district: 'Asokoro',
    address: '8 Danube Close, Asokoro, Abuja',
    latitude: 9.0406,
    longitude: 7.5149,
    bedrooms: 4,
    bathrooms: 5,
    bq: 1,
    landSize: 420,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200',
    ],
    features: ['Fitted Kitchen', 'Private Garden', 'Gated Estate', '24/7 Security', 'Ample Parking'],
    status: 'available',
    featured: true,
    createdAt: '2024-01-20',
    updatedAt: '2024-01-20',
  },
  {
    id: '3',
    title: 'Luxury 3 Bedroom Apartment',
    description: 'Stunning 3-bedroom apartment in a prime Wuse II location. This unit offers panoramic city views, modern interiors, and access to building amenities including gym, pool, and concierge services. Ideal for professionals and small families.',
    price: 120000000,
    type: 'house',
    district: 'Wuse II',
    address: 'Aminu Kano Crescent, Wuse II, Abuja',
    latitude: 9.0677,
    longitude: 7.4626,
    bedrooms: 3,
    bathrooms: 4,
    bq: 0,
    landSize: 220,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
    ],
    features: ['City Views', 'Gym Access', 'Swimming Pool', 'Concierge', 'Underground Parking'],
    status: 'available',
    featured: true,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
  },
  {
    id: '4',
    title: 'Commercial Plot - Prime Location',
    description: 'Strategic commercial land in Utako, perfect for office development or mixed-use projects. The plot offers excellent visibility from the main road and is situated in a rapidly developing commercial corridor.',
    price: 350000000,
    type: 'land',
    district: 'Utako',
    address: 'Plot 421, Utako District, Abuja',
    latitude: 9.0582,
    longitude: 7.4419,
    landSize: 2000,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
    ],
    features: ['Commercial Zoning', 'Road Frontage', 'C of O Available', 'Survey Plan'],
    status: 'available',
    featured: false,
    createdAt: '2024-02-10',
    updatedAt: '2024-02-10',
  },
  {
    id: '5',
    title: '6 Bedroom Villa with Pool',
    description: 'Magnificent 6-bedroom villa set on expansive grounds in Katampe Extension. This property showcases exceptional architecture, premium finishes, and resort-style outdoor living with infinity pool and entertainment areas.',
    price: 800000000,
    type: 'house',
    district: 'Katampe',
    address: '15 Katampe Extension, Abuja',
    latitude: 9.0892,
    longitude: 7.4456,
    bedrooms: 6,
    bathrooms: 7,
    bq: 3,
    landSize: 950,
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200',
    ],
    features: ['Infinity Pool', 'Home Cinema', 'Wine Cellar', 'Staff Quarters', 'Rooftop Terrace', 'Smart Home'],
    status: 'available',
    featured: true,
    createdAt: '2024-02-15',
    updatedAt: '2024-02-15',
  },
  {
    id: '6',
    title: '3 Bedroom Flat in Jabi',
    description: 'Well-maintained 3-bedroom flat in Jabi. The apartment features modern amenities, excellent natural lighting, and is located close to Jabi Lake Mall and other conveniences.',
    price: 85000000,
    type: 'house',
    district: 'Jabi',
    address: 'Jabi District, Abuja',
    latitude: 9.0736,
    longitude: 7.4237,
    bedrooms: 3,
    bathrooms: 3,
    bq: 1,
    landSize: 180,
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
    ],
    features: ['Serviced', 'Security', 'Generator', 'Water Supply'],
    status: 'available',
    featured: false,
    createdAt: '2024-02-20',
    updatedAt: '2024-02-20',
  },
  {
    id: '7',
    title: '4 Bedroom Semi-Detached Duplex',
    description: 'Brand new 4-bedroom semi-detached duplex in Gwarinpa. Modern design with quality finishes, spacious rooms, and family-friendly neighborhood. Estate offers 24/7 security and good road network.',
    price: 95000000,
    type: 'house',
    district: 'Gwarinpa',
    address: '3rd Avenue, Gwarinpa, Abuja',
    latitude: 9.1019,
    longitude: 7.3925,
    bedrooms: 4,
    bathrooms: 4,
    bq: 1,
    landSize: 320,
    images: [
      'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200',
    ],
    features: ['New Build', 'Estate Living', 'Family Friendly', 'Good Road Network', 'Shopping Nearby'],
    status: 'available',
    featured: false,
    createdAt: '2024-02-25',
    updatedAt: '2024-02-25',
  },
  {
    id: '8',
    title: 'Residential Plot in Life Camp',
    description: 'Prime residential land in Life Camp. Perfect for building a family home or investment property. Plot is in a rapidly developing area with good infrastructure and amenities.',
    price: 75000000,
    type: 'land',
    district: 'Life Camp',
    address: 'Jabi-Life Camp Link Road, Abuja',
    latitude: 9.0831,
    longitude: 7.3847,
    landSize: 600,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
    ],
    features: ['Residential Zoning', 'C of O Available', 'Survey Plan', 'Good Access Road'],
    status: 'available',
    featured: false,
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
  },
]

// Testimonials
export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Adaeze Okonkwo',
    role: 'Property Investor',
    content: 'Sabi Consults made our property acquisition seamless. Their deep knowledge of the Abuja market and professional approach gave us confidence throughout the process. Highly recommended for anyone seeking trusted real estate guidance.',
  },
  {
    id: '2',
    name: 'Mohammed Ibrahim',
    role: 'Business Owner',
    content: 'As a diaspora Nigerian, finding trustworthy partners for property investment was crucial. Sabi Consults exceeded our expectations with their transparency, regular updates, and genuine care for our investment goals.',
  },
  {
    id: '3',
    name: 'Jennifer Adekunle',
    role: 'Homeowner',
    content: 'The team at Sabi Consults helped us find our dream home in Maitama. Their patience, market expertise, and attention to our specific needs made all the difference. We couldn\'t be happier with our new home.',
  },
]

// Helper functions
export function getPropertyById(id: string): Property | undefined {
  return properties.find(p => p.id === id)
}

export function getFeaturedProperties(): Property[] {
  return properties.filter(p => p.featured && p.status === 'available')
}

export function getPropertiesByDistrict(district: string): Property[] {
  return properties.filter(p => p.district.toLowerCase() === district.toLowerCase())
}

export function filterProperties(filters: {
  type?: 'land' | 'house'
  district?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
}): Property[] {
  return properties.filter(property => {
    if (filters.type && property.type !== filters.type) return false
    if (filters.district && property.district.toLowerCase() !== filters.district.toLowerCase()) return false
    if (filters.minPrice && property.price < filters.minPrice) return false
    if (filters.maxPrice && property.price > filters.maxPrice) return false
    if (filters.bedrooms && property.bedrooms !== filters.bedrooms) return false
    return property.status === 'available'
  })
}
