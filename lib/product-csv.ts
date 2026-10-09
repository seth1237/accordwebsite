import { stripHtml } from '@/lib/catalog'

export type ProductCsvRow = {
  name: string
  category: string
  features: string
  price?: number
  line: number
}

export type ProductCsvImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const NAME_HEADERS = new Set(['product name', 'name', 'product', 'item'])
const CATEGORY_HEADERS = new Set(['category', 'product category'])
const FEATURE_HEADERS = new Set(['product feature', 'product features', 'features', 'feature', 'details', 'description'])
const PRICE_HEADERS = new Set(['price', 'kes', 'cost', 'unit price'])

export const PRODUCT_CSV_TEMPLATE = `Product name,category,PRODUCT FEATURE,price
3 Part Hematology Analyzer (Z3),Laboratory Equipment,"21 parameters + 3 histograms
Throughput: 70 samples/h",
Hospital Bed,Hospital Furniture,"Steel frame
Five functions",45000
`

function normalizeHeader(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function parseDeclaredPrice(raw: string | undefined): number | undefined {
  const text = String(raw || '').trim()
  if (!text) return undefined
  if (/^(n\/?a|none|nil|null|quote|request|tbd|-|0)$/i.test(text)) return undefined
  const numeric = Number(text.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined
  return Math.round(numeric)
}

export function featuresToHtml(raw: string) {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-\*]+/, '').trim())
    .filter(Boolean)
  if (lines.length <= 1) return `<h3>PRODUCT FEATURES</h3><p>${escapeHtml(text)}</p>`
  return `<h3>PRODUCT FEATURES</h3><ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
}

export function parseCsvRecords(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (char === '\n' || (char === '\r' && next === '\n') || char === '\r') {
      row.push(cell)
      cell = ''
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      if (char === '\r' && next === '\n') i += 1
      continue
    }
    cell += char
  }
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function columnIndex(headers: string[], aliases: Set<string>, fallback: number) {
  const index = headers.findIndex((header) => aliases.has(header))
  return index >= 0 ? index : fallback
}

export function parseProductCsv(text: string): ProductCsvRow[] {
  const records = parseCsvRecords(text)
  if (!records.length) return []
  const first = records[0].map(normalizeHeader)
  const hasHeader =
    first.some((header) => NAME_HEADERS.has(header)) && first.some((header) => CATEGORY_HEADERS.has(header))
  const headers = hasHeader ? first : ['product name', 'category', 'product feature', 'price']
  const nameIndex = columnIndex(headers, NAME_HEADERS, 0)
  const categoryIndex = columnIndex(headers, CATEGORY_HEADERS, 1)
  const featureIndex = columnIndex(headers, FEATURE_HEADERS, 2)
  const priceIndex = columnIndex(headers, PRICE_HEADERS, 3)
  const body = hasHeader ? records.slice(1) : records
  const rows: ProductCsvRow[] = []
  body.forEach((record, index) => {
    const name = String(record[nameIndex] || '').trim()
    const category = String(record[categoryIndex] || '').trim()
    const features = String(record[featureIndex] || '').trim()
    if (!name && !category && !features) return
    rows.push({
      name,
      category,
      features,
      price: parseDeclaredPrice(record[priceIndex]),
      line: index + (hasHeader ? 2 : 1),
    })
  })
  return rows
}

function xmlEscape(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function productsToExcelXml(
  products: Array<{
    name: string
    categoryName: string
    details?: string
    description?: string
    price: number
  }>,
) {
  const header = ['Product name', 'category', 'PRODUCT FEATURE', 'price']
  const rows = [
    header,
    ...products.map((product) => [
      product.name,
      product.categoryName,
      stripHtml(product.details || product.description || ''),
      product.price > 0 ? String(product.price) : '',
    ]),
  ]
  const table = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
          .join('')}</Row>`,
    )
    .join('')
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Products">
    <Table>${table}</Table>
  </Worksheet>
</Workbook>`
}
