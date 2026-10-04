// Abuja districts with map coordinates for visualization
// mapX/mapY are SVG coordinates for a 400x300 viewBox

export interface DistrictMapData {
  id: string
  name: string
  latitude: number
  longitude: number
  mapX: number
  mapY: number
}

// Convert geo coords to SVG coords
// Lat range: 8.97 - 9.16 → Y: 280 - 20 (inverted)
// Lng range: 7.32 - 7.58 → X: 20 - 380
function toMapCoords(lat: number, lng: number): { x: number; y: number } {
  const x = 20 + ((lng - 7.32) / (7.58 - 7.32)) * 360
  const y = 280 - ((lat - 8.97) / (9.16 - 8.97)) * 260
  return { x: Math.round(x), y: Math.round(y) }
}

const rawDistricts = [
  { id: 'asokoro', name: 'Asokoro', latitude: 9.0406, longitude: 7.5149 },
  { id: 'guzape', name: 'Guzape', latitude: 9.0168, longitude: 7.5095 },
  { id: 'kubwa', name: 'Kubwa', latitude: 9.1555, longitude: 7.3225 },
  { id: 'lugbe', name: 'Lugbe', latitude: 8.9770, longitude: 7.3712 },
  { id: 'galadimawa', name: 'Galadimawa', latitude: 8.9950, longitude: 7.4250 },
  { id: 'gaduwa', name: 'Gaduwa', latitude: 8.9850, longitude: 7.4750 },
  { id: 'kukwaba', name: 'Kukwaba', latitude: 9.0460, longitude: 7.4430 },
  { id: 'idu', name: 'Idu', latitude: 9.0340, longitude: 7.3830 },
  { id: 'apo', name: 'Apo', latitude: 8.9790, longitude: 7.4990 },
  { id: 'jikwoyi', name: 'Jikwoyi', latitude: 8.9893, longitude: 7.5741 },
  { id: 'maitama', name: 'Maitama', latitude: 9.0820, longitude: 7.4878 },
  { id: 'wuse2', name: 'Wuse II', latitude: 9.0677, longitude: 7.4626 },
  { id: 'jabi', name: 'Jabi', latitude: 9.0736, longitude: 7.4237 },
  { id: 'gwarinpa', name: 'Gwarinpa', latitude: 9.1019, longitude: 7.3925 },
  { id: 'katampe', name: 'Katampe', latitude: 9.0892, longitude: 7.4456 },
  { id: 'lifecamp', name: 'Life Camp', latitude: 9.0831, longitude: 7.3847 },
  { id: 'utako', name: 'Utako', latitude: 9.0582, longitude: 7.4419 },
]

export const DISTRICTS: DistrictMapData[] = rawDistricts.map(d => {
  const coords = toMapCoords(d.latitude, d.longitude)
  return {
    ...d,
    mapX: coords.x,
    mapY: coords.y,
  }
})

export function getDistrictByName(name: string): DistrictMapData | undefined {
  return DISTRICTS.find(d => d.name.toLowerCase() === name.toLowerCase())
}
