export type KenyaCounty = {
  id: number
  code: string
  name: string
  lat: number
  lng: number
  span: number
  aliases: string[]
}

export const KENYA_COUNTIES: KenyaCounty[] = [
  { id: 1, code: '01', name: 'Mombasa', lat: -4.0435, lng: 39.6682, span: 0.18, aliases: ['mombasa'] },
  { id: 2, code: '02', name: 'Kwale', lat: -4.1816, lng: 39.4521, span: 0.55, aliases: ['kwale', 'ukunda', 'diani'] },
  { id: 3, code: '03', name: 'Kilifi', lat: -3.5107, lng: 39.9093, span: 0.7, aliases: ['kilifi', 'malindi', 'watamu', 'marafa'] },
  { id: 4, code: '04', name: 'Tana River', lat: -1.528, lng: 40.1269, span: 0.9, aliases: ['tana river', 'hola', 'garsen'] },
  { id: 5, code: '05', name: 'Lamu', lat: -2.2717, lng: 40.902, span: 0.45, aliases: ['lamu'] },
  { id: 6, code: '06', name: 'Taita-Taveta', lat: -3.396, lng: 38.367, span: 0.55, aliases: ['taita', 'taita-taveta', 'taita taveta', 'voi', 'taveta'] },
  { id: 7, code: '07', name: 'Garissa', lat: -0.4536, lng: 39.6461, span: 0.95, aliases: ['garissa'] },
  { id: 8, code: '08', name: 'Wajir', lat: 1.7471, lng: 40.0573, span: 1.05, aliases: ['wajir'] },
  { id: 9, code: '09', name: 'Mandera', lat: 3.9366, lng: 41.867, span: 0.85, aliases: ['mandera'] },
  { id: 10, code: '10', name: 'Marsabit', lat: 2.3344, lng: 37.9909, span: 1.15, aliases: ['marsabit', 'moyale'] },
  { id: 11, code: '11', name: 'Isiolo', lat: 0.3556, lng: 37.5833, span: 0.8, aliases: ['isiolo'] },
  { id: 12, code: '12', name: 'Meru', lat: 0.0469, lng: 37.6559, span: 0.4, aliases: ['meru', 'maua', 'timau'] },
  { id: 13, code: '13', name: 'Tharaka-Nithi', lat: -0.296, lng: 37.723, span: 0.32, aliases: ['tharaka', 'tharaka-nithi', 'tharaka nithi', 'chuka'] },
  { id: 14, code: '14', name: 'Embu', lat: -0.539, lng: 37.457, span: 0.28, aliases: ['embu'] },
  { id: 15, code: '15', name: 'Kitui', lat: -1.367, lng: 38.01, span: 0.75, aliases: ['kitui', 'mwingi'] },
  { id: 16, code: '16', name: 'Machakos', lat: -1.5177, lng: 37.2634, span: 0.4, aliases: ['machakos', 'athiriver', 'athi river', 'mlolongo'] },
  { id: 17, code: '17', name: 'Makueni', lat: -1.804, lng: 37.62, span: 0.5, aliases: ['makueni', 'wote', 'mtito andei'] },
  { id: 18, code: '18', name: 'Nyandarua', lat: -0.32, lng: 36.423, span: 0.32, aliases: ['nyandarua', 'ol kalou', 'nyahururu'] },
  { id: 19, code: '19', name: 'Nyeri', lat: -0.4201, lng: 36.9476, span: 0.28, aliases: ['nyeri', 'karatina'] },
  { id: 20, code: '20', name: 'Kirinyaga', lat: -0.659, lng: 37.308, span: 0.22, aliases: ['kirinyaga', 'kerugoya'] },
  { id: 21, code: '21', name: "Murang'a", lat: -0.784, lng: 37.04, span: 0.26, aliases: ['muranga', "murang'a", 'murang’a', 'kenol'] },
  { id: 22, code: '22', name: 'Kiambu', lat: -1.171, lng: 36.835, span: 0.32, aliases: ['kiambu', 'thika', 'ruiru', 'kikuyu', 'limuru', 'juja', 'githunguri'] },
  { id: 23, code: '23', name: 'Turkana', lat: 3.312, lng: 35.566, span: 1.2, aliases: ['turkana', 'lodwar'] },
  { id: 24, code: '24', name: 'West Pokot', lat: 1.4, lng: 35.12, span: 0.55, aliases: ['west pokot', 'kapenguria'] },
  { id: 25, code: '25', name: 'Samburu', lat: 1.166, lng: 36.8, span: 0.75, aliases: ['samburu', 'maralal'] },
  { id: 26, code: '26', name: 'Trans Nzoia', lat: 1.02, lng: 35.0, span: 0.28, aliases: ['trans nzoia', 'trans-nzoia', 'kitale'] },
  { id: 27, code: '27', name: 'Uasin Gishu', lat: 0.5143, lng: 35.2698, span: 0.32, aliases: ['uasin gishu', 'eldoret'] },
  { id: 28, code: '28', name: 'Elgeyo-Marakwet', lat: 0.8, lng: 35.48, span: 0.32, aliases: ['elgeyo', 'elgeyo-marakwet', 'elgeyo marakwet', 'iten'] },
  { id: 29, code: '29', name: 'Nandi', lat: 0.188, lng: 35.103, span: 0.3, aliases: ['nandi', 'kapsabet'] },
  { id: 30, code: '30', name: 'Baringo', lat: 0.67, lng: 35.94, span: 0.55, aliases: ['baringo', 'kabarnet'] },
  { id: 31, code: '31', name: 'Laikipia', lat: 0.205, lng: 36.78, span: 0.5, aliases: ['laikipia', 'nanyuki'] },
  { id: 32, code: '32', name: 'Nakuru', lat: -0.3031, lng: 36.08, span: 0.5, aliases: ['nakuru', 'naivasha', 'gilgil', 'molo'] },
  { id: 33, code: '33', name: 'Narok', lat: -1.0806, lng: 35.8711, span: 0.65, aliases: ['narok'] },
  { id: 34, code: '34', name: 'Kajiado', lat: -2.098, lng: 36.782, span: 0.8, aliases: ['kajiado', 'ngong', 'kitengela', 'ongata rongai', 'rongai', 'loitokitok'] },
  { id: 35, code: '35', name: 'Kericho', lat: -0.367, lng: 35.283, span: 0.28, aliases: ['kericho'] },
  { id: 36, code: '36', name: 'Bomet', lat: -0.781, lng: 35.342, span: 0.28, aliases: ['bomet'] },
  { id: 37, code: '37', name: 'Kakamega', lat: 0.2827, lng: 34.7519, span: 0.32, aliases: ['kakamega', 'mumias'] },
  { id: 38, code: '38', name: 'Vihiga', lat: 0.078, lng: 34.722, span: 0.16, aliases: ['vihiga', 'mbale'] },
  { id: 39, code: '39', name: 'Bungoma', lat: 0.5635, lng: 34.5606, span: 0.32, aliases: ['bungoma', 'webuye'] },
  { id: 40, code: '40', name: 'Busia', lat: 0.46, lng: 34.111, span: 0.22, aliases: ['busia'] },
  { id: 41, code: '41', name: 'Siaya', lat: 0.061, lng: 34.288, span: 0.28, aliases: ['siaya', 'bondo'] },
  { id: 42, code: '42', name: 'Kisumu', lat: -0.0917, lng: 34.768, span: 0.28, aliases: ['kisumu'] },
  { id: 43, code: '43', name: 'Homa Bay', lat: -0.527, lng: 34.457, span: 0.32, aliases: ['homa bay', 'homabay'] },
  { id: 44, code: '44', name: 'Migori', lat: -1.0634, lng: 34.4731, span: 0.32, aliases: ['migori', 'awendo'] },
  { id: 45, code: '45', name: 'Kisii', lat: -0.6817, lng: 34.767, span: 0.22, aliases: ['kisii'] },
  { id: 46, code: '46', name: 'Nyamira', lat: -0.563, lng: 34.936, span: 0.18, aliases: ['nyamira'] },
  { id: 47, code: '47', name: 'Nairobi', lat: -1.2921, lng: 36.8219, span: 0.16, aliases: ['nairobi', 'nairobi area', 'westlands', 'eastleigh', 'karen', 'langata'] },
]

const aliasIndex = new Map<string, KenyaCounty>()
for (const county of KENYA_COUNTIES) {
  aliasIndex.set(normName(county.name), county)
  aliasIndex.set(county.code, county)
  aliasIndex.set(String(county.id), county)
  for (const alias of county.aliases) aliasIndex.set(normName(alias), county)
}

export function normName(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

export function countyByCode(code: string | number | null | undefined) {
  const key = String(code || '').trim()
  if (!key) return null
  return aliasIndex.get(key.padStart(2, '0')) || aliasIndex.get(key) || null
}

export function matchKenyaCounty(region: string, city = '') {
  const cityHit = aliasIndex.get(normName(city))
  if (cityHit) return cityHit
  const regionHit = aliasIndex.get(normName(region))
  if (regionHit) return regionHit
  const blob = `${region} ${city}`
  return KENYA_COUNTIES.find((county) => county.aliases.some((alias) => normName(blob).includes(alias))) || null
}

function box(county: KenyaCounty): number[][][] {
  const cos = Math.max(0.35, Math.cos((county.lat * Math.PI) / 180))
  const dLat = county.span * 0.55
  const dLng = (county.span * 0.55) / cos
  const west = county.lng - dLng
  const east = county.lng + dLng
  const south = county.lat - dLat
  const north = county.lat + dLat
  return [[
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]]
}

export function kenyaCountiesGeoJson() {
  return {
    type: 'FeatureCollection' as const,
    features: KENYA_COUNTIES.map((county) => ({
      type: 'Feature' as const,
      id: county.code,
      properties: {
        code: county.code,
        name: county.name,
        id: county.id,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: box(county),
      },
    })),
  }
}
