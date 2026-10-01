import { setDefaultResultOrder } from 'node:dns'
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'
import type { Catalogue, CatalogueDownload, CompanyProfilePage, MediaAsset } from '@/lib/content'
import type { CatalogProduct } from '@/lib/catalog'
import { clampRange, defaultRange, fillVisitorSeries, isIsoDate, monthStart, parsePeriod, weekStart } from '@/lib/visitor-report'

setDefaultResultOrder('ipv4first')

type AdminUser = {
  _id?: string
  username?: string
  email: string
  name: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

type ProductImage = MediaAsset

type ProductContent = {
  erpProductId: string
  details: string
  images: ProductImage[]
  distributedFor?: string
  updatedAt: Date
}

type SiteSettings = {
  _id: string
  showPrices: boolean
  updatedAt: Date
}

const MYSQL_SCHEMA_VERSION = 5

type MysqlState = {
  pool: Pool | null
  schemaReady: boolean
  schemaVersion: number
  schemaPromise: Promise<void> | null
  localCatalogReady: { at: number; ready: boolean } | null
  downUntil: number
  warmPromise: Promise<Pool> | null
  loggedDown: boolean
}

const globalForMysql = globalThis as typeof globalThis & { __accordMysql?: MysqlState }

function mysqlState(): MysqlState {
  if (!globalForMysql.__accordMysql) {
    globalForMysql.__accordMysql = {
      pool: null,
      schemaReady: false,
      schemaVersion: 0,
      schemaPromise: null,
      localCatalogReady: null,
      downUntil: 0,
      warmPromise: null,
      loggedDown: false,
    }
  }
  const state = globalForMysql.__accordMysql
  if (typeof state.downUntil !== 'number') state.downUntil = 0
  if (typeof state.loggedDown !== 'boolean') state.loggedDown = false
  if (!('warmPromise' in state)) state.warmPromise = null
  return state
}

export function isMysqlConfigured() {
  return Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE)
}

export function isStoreConfigured() {
  return isMysqlConfigured() || Boolean(process.env.MONGODB_URI)
}

function mysqlId(value: string | number | undefined | null) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

function iso(value?: Date | string | null) {
  if (!value) return ''
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function fileAsset(id: number, extra?: { installation?: boolean }): MediaAsset {
  return {
    publicId: `mysql:file:${id}`,
    secureUrl: `/api/media/file/${id}`,
    ...(extra?.installation ? { installation: true } : {}),
  }
}

function catalogueAsset(id: number): MediaAsset {
  return { publicId: `mysql:catalogue:${id}`, secureUrl: `/api/catalogues/${id}/download` }
}

export function mysqlFileIdFromPublicId(publicId: string) {
  const match = /^mysql:(?:file|catalogue):(\d+)$/.exec(publicId)
  return match ? Number(match[1]) : null
}

export function isMysqlConnectError(error: unknown) {
  const code = (error as { code?: string }).code
  return code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ENETUNREACH'
}

function isMysqlFatal(error: unknown) {
  if (isMysqlConnectError(error)) return false
  const err = error as { code?: string; fatal?: boolean }
  return Boolean(err.fatal)
    || err.code === 'PROTOCOL_CONNECTION_LOST'
    || err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'
    || err.code === 'ECONNRESET'
}

function mysqlUnreachableError() {
  const host = process.env.MYSQL_HOST || 'MYSQL_HOST'
  const port = process.env.MYSQL_PORT || '3306'
  const error = new Error(`Cannot reach MySQL at ${host}:${port}`) as Error & { code: string }
  error.code = 'ETIMEDOUT'
  return error
}

function markMysqlDown(error: unknown) {
  if (!isMysqlConnectError(error)) return
  const state = mysqlState()
  state.downUntil = Date.now() + 20_000
  if (state.loggedDown) return
  state.loggedDown = true
  console.error(`MySQL unreachable (${(error as { code?: string }).code}). Retrying in 20s.`)
}

async function resetMysqlPool() {
  const state = mysqlState()
  const pool = state.pool
  state.pool = null
  state.schemaReady = false
  state.schemaVersion = 0
  state.schemaPromise = null
  state.localCatalogReady = null
  state.warmPromise = null
  if (pool) await pool.end().catch(() => {})
}

async function getPool(): Promise<Pool> {
  if (!isMysqlConfigured()) throw new Error('MySQL is not configured')
  const state = mysqlState()
  if (Date.now() < state.downUntil) throw mysqlUnreachableError()
  if (state.pool && !state.warmPromise) return state.pool
  if (state.warmPromise) return state.warmPromise

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 4,
    enableKeepAlive: true,
    charset: 'utf8mb4',
    connectTimeout: 4_000,
  })
  state.pool = pool
  state.warmPromise = (async () => {
    try {
      const conn = await pool.getConnection()
      conn.release()
      state.downUntil = 0
      state.loggedDown = false
      return pool
    } catch (error) {
      markMysqlDown(error)
      state.pool = null
      await pool.end().catch(() => {})
      throw error
    }
  })().finally(() => {
    if (state.warmPromise) state.warmPromise = null
  })
  return state.warmPromise
}

async function withMysqlRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (!isMysqlFatal(error)) throw error
    await resetMysqlPool()
    return fn()
  }
}

async function mysqlAddColumnIfMissing(table: string, column: string, definition: string) {
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )
  if (Number(rows[0]?.n)) return
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`)
}

async function applyMysqlSchema() {
  const pool = await getPool()
  let productsExist = false
  try {
    await pool.query('SELECT 1 FROM accord_nx_products LIMIT 1')
    productsExist = true
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code !== 'ER_NO_SUCH_TABLE' && code !== 'ER_BAD_TABLE_ERROR') throw error
  }
  if (!productsExist) {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_files (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      kind VARCHAR(32) NOT NULL,
      owner_key VARCHAR(191) NOT NULL DEFAULT '',
      filename VARCHAR(255) NOT NULL,
      mime VARCHAR(128) NOT NULL,
      file_data LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY kind_owner (kind, owner_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_admins (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(191) NOT NULL,
      email VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY username (username),
      UNIQUE KEY email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_catalogues (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      erp_product_id VARCHAR(64) NOT NULL,
      category_id VARCHAR(128) NOT NULL DEFAULT '',
      product_name VARCHAR(255) NOT NULL DEFAULT '',
      file_id INT UNSIGNED NOT NULL,
      download_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY erp_product_id (erp_product_id),
      KEY download_count (download_count)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_catalogue_downloads (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      catalogue_id INT UNSIGNED NOT NULL,
      product_id VARCHAR(64) NOT NULL DEFAULT '',
      ip_hash VARCHAR(64) NOT NULL DEFAULT '',
      referrer VARCHAR(512) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY catalogue_created (catalogue_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_product_content (
      erp_product_id VARCHAR(64) NOT NULL,
      details MEDIUMTEXT NOT NULL,
      distributed_for VARCHAR(255) NOT NULL DEFAULT '',
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (erp_product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_site_settings (
      id VARCHAR(32) NOT NULL,
      show_prices TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_docs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      kind VARCHAR(64) NOT NULL,
      slug VARCHAR(191) NOT NULL DEFAULT '',
      published TINYINT(1) NOT NULL DEFAULT 1,
      payload LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY kind_slug (kind, slug),
      KEY kind_published (kind, published, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_product_performance (
      erp_product_id VARCHAR(64) NOT NULL,
      product_name VARCHAR(255) NOT NULL DEFAULT '',
      category_id VARCHAR(128) NOT NULL DEFAULT '',
      category_name VARCHAR(255) NOT NULL DEFAULT '',
      clicks INT NOT NULL DEFAULT 0,
      shares INT NOT NULL DEFAULT 0,
      last_clicked_at DATETIME NULL,
      last_shared_at DATETIME NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (erp_product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_product_journeys (
      from_product_id VARCHAR(64) NOT NULL,
      to_product_id VARCHAR(64) NOT NULL,
      journey_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (from_product_id, to_product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
    await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_products (
      id VARCHAR(64) NOT NULL,
      slug VARCHAR(191) NOT NULL,
      name VARCHAR(255) NOT NULL,
      product_type VARCHAR(191) NOT NULL DEFAULT '',
      description MEDIUMTEXT NOT NULL,
      details MEDIUMTEXT NOT NULL,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      compare_at DECIMAL(12,2) NULL,
      manufacturer VARCHAR(255) NOT NULL DEFAULT '',
      category_id VARCHAR(128) NOT NULL,
      category_name VARCHAR(255) NOT NULL,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      in_stock TINYINT(1) NOT NULL DEFAULT 1,
      created_on VARCHAR(64) NOT NULL DEFAULT '',
      imported_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY slug (slug),
      KEY category_id (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  }
  await mysqlAddColumnIfMissing('accord_nx_files', 'source_url', `source_url VARCHAR(512) NOT NULL DEFAULT ''`)
  await mysqlAddColumnIfMissing('accord_nx_site_settings', 'use_local_catalog', `use_local_catalog TINYINT(1) NOT NULL DEFAULT 0`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_site_visits (
      visit_date DATE NOT NULL,
      visitor_id VARCHAR(64) NOT NULL,
      path VARCHAR(255) NOT NULL,
      hits INT NOT NULL DEFAULT 1,
      last_seen_at DATETIME NOT NULL,
      PRIMARY KEY (visit_date, visitor_id, path),
      KEY visit_date (visit_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_event_likes (
      event_id INT UNSIGNED NOT NULL,
      visitor_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (event_id, visitor_id),
      KEY event_id (event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accord_nx_event_comments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      event_id INT UNSIGNED NOT NULL,
      visitor_id VARCHAR(64) NOT NULL DEFAULT '',
      name VARCHAR(80) NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY event_created (event_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
}

export async function ensureMysqlSchema() {
  const state = mysqlState()
  if (!isMysqlConfigured() || (state.schemaReady && state.schemaVersion === MYSQL_SCHEMA_VERSION)) return
  if (!state.schemaPromise) {
    state.schemaPromise = applyMysqlSchema()
      .then(() => {
        state.schemaReady = true
        state.schemaVersion = MYSQL_SCHEMA_VERSION
      })
      .finally(() => {
        state.schemaPromise = null
      })
  }
  await state.schemaPromise
}

type FileRow = RowDataPacket & {
  id: number
  kind: string
  owner_key: string
  filename: string
  mime: string
  file_data?: Buffer
  source_url?: string
  created_at: Date
}

type AdminRow = RowDataPacket & {
  id: number
  username: string
  email: string
  name: string
  password_hash: string
  created_at: Date
  updated_at: Date
}

type CatalogueRow = RowDataPacket & {
  id: number
  title: string
  erp_product_id: string
  category_id: string
  product_name: string
  file_id: number
  download_count: number
  created_at: Date
  updated_at: Date
}

type ContentRow = RowDataPacket & {
  erp_product_id: string
  details: string
  distributed_for: string
  updated_at: Date
}

type DocRow = RowDataPacket & {
  id: number
  kind: string
  slug: string
  published: number
  payload: string
  created_at: Date
  updated_at: Date
}

function mapAdmin(row: AdminRow): AdminUser {
  return {
    _id: String(row.id),
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapCatalogue(row: CatalogueRow): Catalogue {
  return {
    _id: String(row.id),
    title: row.title,
    erpProductId: row.erp_product_id,
    categoryId: row.category_id,
    productName: row.product_name,
    file: catalogueAsset(row.id),
    downloadCount: Number(row.download_count) || 0,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export async function mysqlSaveFile(input: {
  kind: string
  ownerKey?: string
  filename: string
  mime: string
  buffer: Buffer
  sourceUrl?: string
}): Promise<MediaAsset> {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO accord_nx_files (kind, owner_key, filename, mime, file_data, source_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      input.kind,
      input.ownerKey || '',
      input.filename || 'file',
      input.mime || 'application/octet-stream',
      input.buffer,
      input.sourceUrl || '',
      new Date(),
    ],
  )
  return fileAsset(result.insertId)
}

export async function mysqlGetFile(id: string | number) {
  const fileId = mysqlId(id)
  if (!fileId) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<FileRow[]>(
    'SELECT id, kind, owner_key, filename, mime, file_data, created_at FROM accord_nx_files WHERE id = ? LIMIT 1',
    [fileId],
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    kind: row.kind,
    ownerKey: row.owner_key,
    filename: row.filename,
    mime: row.mime,
    data: Buffer.isBuffer(row.file_data) ? row.file_data : Buffer.from(row.file_data || []),
  }
}

export async function mysqlDeleteFile(publicIdOrId: string) {
  const id = mysqlFileIdFromPublicId(publicIdOrId) || mysqlId(publicIdOrId)
  if (!id) return false
  await ensureMysqlSchema()
  const pool = await getPool()
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM accord_nx_files WHERE id = ?', [id])
  return result.affectedRows > 0
}

export async function mysqlGetAdmin(login: string) {
  const key = login.trim()
  if (!key) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<AdminRow[]>(
    'SELECT * FROM accord_nx_admins WHERE email = ? OR username = ? LIMIT 1',
    [key.toLowerCase(), key],
  )
  return rows[0] ? mapAdmin(rows[0]) : null
}

export async function mysqlCountAdmins() {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM accord_nx_admins')
  return Number(rows[0]?.total) || 0
}

export async function mysqlCreateAdmin(input: { username?: string; email: string; name: string; passwordHash: string }) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const now = new Date()
  const email = input.email.trim().toLowerCase()
  const username = (input.username || email.split('@')[0] || 'admin').trim()
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO accord_nx_admins (username, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [username, email, input.name, input.passwordHash, now, now],
  )
  return {
    _id: String(result.insertId),
    email,
    name: input.name,
    passwordHash: input.passwordHash,
    createdAt: now,
    updatedAt: now,
  } satisfies AdminUser
}

export async function mysqlUpdateAdminEmail(fromEmail: string, toEmail: string) {
  await ensureMysqlSchema()
  const pool = await getPool()
  await pool.query(
    'UPDATE accord_nx_admins SET email = ?, updated_at = ? WHERE email = ?',
    [toEmail.trim().toLowerCase(), new Date(), fromEmail.trim().toLowerCase()],
  )
}

export async function mysqlListCatalogues(erpProductId?: string) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = erpProductId
    ? await pool.query<CatalogueRow[]>(
        'SELECT id, title, erp_product_id, category_id, product_name, file_id, download_count, created_at, updated_at FROM accord_nx_catalogues WHERE erp_product_id = ? ORDER BY created_at DESC',
        [erpProductId],
      )
    : await pool.query<CatalogueRow[]>(
        'SELECT id, title, erp_product_id, category_id, product_name, file_id, download_count, created_at, updated_at FROM accord_nx_catalogues ORDER BY download_count DESC, created_at DESC',
      )
  return rows.map(mapCatalogue)
}

export async function mysqlGetCatalogue(id: string) {
  const catalogueId = mysqlId(id)
  if (!catalogueId) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<CatalogueRow[]>(
    'SELECT id, title, erp_product_id, category_id, product_name, file_id, download_count, created_at, updated_at FROM accord_nx_catalogues WHERE id = ? LIMIT 1',
    [catalogueId],
  )
  return rows[0] ? mapCatalogue(rows[0]) : null
}

export async function mysqlCreateCatalogue(input: {
  title: string
  erpProductId: string
  categoryId: string
  productName: string
  filename: string
  mime: string
  buffer: Buffer
}) {
  await ensureMysqlSchema()
  const file = await mysqlSaveFile({
    kind: 'catalogue',
    ownerKey: input.erpProductId,
    filename: input.filename,
    mime: input.mime,
    buffer: input.buffer,
  })
  const fileId = mysqlFileIdFromPublicId(file.publicId)
  if (!fileId) throw new Error('Could not store catalogue file')
  const pool = await getPool()
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO accord_nx_catalogues (title, erp_product_id, category_id, product_name, file_id, download_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    [input.title, input.erpProductId, input.categoryId, input.productName, fileId, now, now],
  )
  return mysqlGetCatalogue(String(result.insertId)) as Promise<Catalogue>
}

export async function mysqlDeleteCatalogue(id: string) {
  const existing = await mysqlGetCatalogue(id)
  if (!existing) return null
  const catalogueId = mysqlId(id)
  const pool = await getPool()
  const [rows] = await pool.query<CatalogueRow[]>(
    'SELECT file_id FROM accord_nx_catalogues WHERE id = ? LIMIT 1',
    [catalogueId],
  )
  await pool.query('DELETE FROM accord_nx_catalogues WHERE id = ?', [catalogueId])
  if (rows[0]?.file_id) await mysqlDeleteFile(String(rows[0].file_id))
  return existing
}

export async function mysqlGetCatalogueFile(id: string) {
  const catalogueId = mysqlId(id)
  if (!catalogueId) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<(CatalogueRow & FileRow)[]>(
    `SELECT c.id, c.product_name, c.title, f.filename, f.mime, f.file_data
     FROM accord_nx_catalogues c
     JOIN accord_nx_files f ON f.id = c.file_id
     WHERE c.id = ? LIMIT 1`,
    [catalogueId],
  )
  const row = rows[0]
  if (!row) return null
  return {
    filename: row.filename || `${row.product_name || row.title || 'catalogue'}.pdf`,
    mime: row.mime || 'application/pdf',
    data: Buffer.isBuffer(row.file_data) ? row.file_data : Buffer.from(row.file_data || []),
  }
}

export async function mysqlRecordCatalogueDownload(input: {
  catalogueId: string
  productId?: string
  ipHash: string
  referrer: string
}) {
  const catalogue = await mysqlGetCatalogue(input.catalogueId)
  if (!catalogue) return null
  const pool = await getPool()
  const now = new Date()
  await pool.query(
    'INSERT INTO accord_nx_catalogue_downloads (catalogue_id, product_id, ip_hash, referrer, created_at) VALUES (?, ?, ?, ?, ?)',
    [mysqlId(input.catalogueId), input.productId || catalogue.erpProductId, input.ipHash, input.referrer, now],
  )
  await pool.query(
    'UPDATE accord_nx_catalogues SET download_count = download_count + 1, updated_at = ? WHERE id = ?',
    [now, mysqlId(input.catalogueId)],
  )
  return mysqlGetCatalogue(input.catalogueId)
}

export async function mysqlCatalogueAnalytics() {
  const catalogues = await mysqlListCatalogues()
  const pool = await getPool()
  const [recent] = await pool.query<RowDataPacket[]>(
    'SELECT catalogue_id, product_id, created_at FROM accord_nx_catalogue_downloads ORDER BY created_at DESC LIMIT 40',
  )
  return {
    total: catalogues.reduce((sum, item) => sum + item.downloadCount, 0),
    catalogues,
    recent: recent.map((row) => ({
      catalogueId: String(row.catalogue_id),
      productId: String(row.product_id || ''),
      createdAt: iso(row.created_at as Date),
    })) satisfies Pick<CatalogueDownload, 'catalogueId' | 'productId' | 'createdAt'>[],
  }
}

async function mysqlProductImages(erpProductId?: string) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const kinds = ['product-image', 'product-installation']
  const [rows] = erpProductId
    ? await pool.query<FileRow[]>(
        'SELECT id, kind, owner_key, filename, mime, created_at FROM accord_nx_files WHERE kind IN (?, ?) AND owner_key = ? ORDER BY id ASC',
        [...kinds, erpProductId],
      )
    : await pool.query<FileRow[]>(
        'SELECT id, kind, owner_key, filename, mime, created_at FROM accord_nx_files WHERE kind IN (?, ?) ORDER BY id ASC',
        kinds,
      )
  return rows
}

export async function mysqlGetProductContentMap() {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [contentRows] = await pool.query<ContentRow[]>('SELECT * FROM accord_nx_product_content')
  const images = await mysqlProductImages()
  const map = new Map<string, ProductContent>()
  for (const row of contentRows) {
    map.set(row.erp_product_id, {
      erpProductId: row.erp_product_id,
      details: row.details || '',
      distributedFor: row.distributed_for || '',
      images: [],
      updatedAt: row.updated_at,
    })
  }
  for (const image of images) {
    const current = map.get(image.owner_key) || {
      erpProductId: image.owner_key,
      details: '',
      images: [],
      updatedAt: image.created_at,
    }
    current.images.push(fileAsset(image.id, { installation: image.kind === 'product-installation' }))
    map.set(image.owner_key, current)
  }
  return map
}

export async function mysqlProductHasDetails(erpProductId: string) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT details FROM accord_nx_product_content WHERE erp_product_id = ? LIMIT 1',
    [erpProductId],
  )
  return Boolean(String(rows[0]?.details || '').trim())
}

export async function mysqlGetProductContent(erpProductId: string): Promise<ProductContent> {
  const map = await mysqlGetProductContentMap()
  return map.get(erpProductId) || { erpProductId, details: '', images: [], updatedAt: new Date() }
}

export async function mysqlAddProductImage(erpProductId: string, buffer: Buffer, filename: string, mime: string, installation = false) {
  await mysqlSaveFile({
    kind: installation ? 'product-installation' : 'product-image',
    ownerKey: erpProductId,
    filename,
    mime,
    buffer,
  })
  await ensureMysqlSchema()
  const pool = await getPool()
  await pool.query(
    `INSERT INTO accord_nx_product_content (erp_product_id, details, distributed_for, updated_at)
     VALUES (?, '', '', ?)
     ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)`,
    [erpProductId, new Date()],
  )
  return mysqlGetProductContent(erpProductId)
}

export async function mysqlRemoveProductImage(erpProductId: string, publicId: string) {
  const fileId = mysqlFileIdFromPublicId(publicId)
  if (!fileId) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<FileRow[]>(
    'SELECT id FROM accord_nx_files WHERE id = ? AND kind IN (?, ?) AND owner_key = ? LIMIT 1',
    [fileId, 'product-image', 'product-installation', erpProductId],
  )
  if (!rows[0]) return null
  const image = fileAsset(fileId)
  await mysqlDeleteFile(String(fileId))
  return image
}

export async function mysqlSetProductImageInstallation(erpProductId: string, publicId: string, installation: boolean) {
  const fileId = mysqlFileIdFromPublicId(publicId)
  if (!fileId) return mysqlGetProductContent(erpProductId)
  await ensureMysqlSchema()
  const pool = await getPool()
  await pool.query(
    'UPDATE accord_nx_files SET kind = ? WHERE id = ? AND owner_key = ? AND kind IN (?, ?)',
    [installation ? 'product-installation' : 'product-image', fileId, erpProductId, 'product-image', 'product-installation'],
  )
  return mysqlGetProductContent(erpProductId)
}

export async function mysqlUpdateProductDetails(erpProductId: string, details: string, extra?: { distributedFor?: string }) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const now = new Date()
  await pool.query(
    `INSERT INTO accord_nx_product_content (erp_product_id, details, distributed_for, updated_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE details = VALUES(details), distributed_for = VALUES(distributed_for), updated_at = VALUES(updated_at)`,
    [erpProductId, details, extra?.distributedFor || '', now],
  )
  return mysqlGetProductContent(erpProductId)
}

export async function mysqlGetSiteSettings(): Promise<SiteSettings> {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM accord_nx_site_settings WHERE id = ? LIMIT 1', ['default'])
  if (rows[0]) {
    return { _id: 'default', showPrices: Boolean(rows[0].show_prices), updatedAt: rows[0].updated_at as Date }
  }
  const defaults: SiteSettings = { _id: 'default', showPrices: true, updatedAt: new Date() }
  await pool.query(
    'INSERT INTO accord_nx_site_settings (id, show_prices, updated_at) VALUES (?, ?, ?)',
    ['default', 1, defaults.updatedAt],
  )
  return defaults
}

export async function mysqlUpdateSiteSettings(updates: Partial<Pick<SiteSettings, 'showPrices'>>) {
  const current = await mysqlGetSiteSettings()
  const next = { ...current, ...updates, updatedAt: new Date() }
  const pool = await getPool()
  await pool.query(
    'INSERT INTO accord_nx_site_settings (id, show_prices, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE show_prices = VALUES(show_prices), updated_at = VALUES(updated_at)',
    ['default', next.showPrices ? 1 : 0, next.updatedAt],
  )
  return next
}

function parseDoc<T extends { _id: string }>(row: DocRow): T {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
  return {
    ...payload,
    _id: String(row.id),
    slug: row.slug || payload.slug || '',
    published: Boolean(row.published),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  } as T
}

export async function mysqlListDocs<T extends { _id: string }>(kind: string, publishedOnly = false) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = publishedOnly
    ? await pool.query<DocRow[]>(
        'SELECT * FROM accord_nx_docs WHERE kind = ? AND published = 1 ORDER BY created_at DESC',
        [kind],
      )
    : await pool.query<DocRow[]>('SELECT * FROM accord_nx_docs WHERE kind = ? ORDER BY created_at DESC', [kind])
  return rows.map((row) => parseDoc<T>(row))
}

export async function mysqlGetDoc<T extends { _id: string }>(kind: string, id: string) {
  const docId = mysqlId(id)
  if (!docId) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<DocRow[]>('SELECT * FROM accord_nx_docs WHERE kind = ? AND id = ? LIMIT 1', [kind, docId])
  return rows[0] ? parseDoc<T>(rows[0]) : null
}

export async function mysqlGetDocBySlug<T extends { _id: string }>(kind: string, slug: string) {
  if (!slug) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<DocRow[]>('SELECT * FROM accord_nx_docs WHERE kind = ? AND slug = ? LIMIT 1', [kind, slug])
  return rows[0] ? parseDoc<T>(rows[0]) : null
}

export async function mysqlGetDocByPayloadFrom<T extends { _id: string; from?: string }>(kind: string, from: string) {
  if (!from) return null
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<DocRow[]>(
    `SELECT id, kind, slug, published, payload, created_at, updated_at
     FROM accord_nx_docs
     WHERE kind = ? AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.from')) = ?
     LIMIT 1`,
    [kind, from],
  )
  return rows[0] ? parseDoc<T>(rows[0]) : null
}

export async function mysqlUniqueSlug(kind: string, base: string, excludeId?: string) {
  const root = base || 'item'
  let slug = root
  let n = 2
  while (true) {
    const existing = await mysqlGetDocBySlug(kind, slug)
    if (!existing || (excludeId && existing._id === excludeId)) return slug
    slug = `${root}-${n}`
    n += 1
  }
}

export async function mysqlInsertDoc<T extends { _id: string; published?: boolean; slug?: string }>(
  kind: string,
  payload: Omit<T, '_id' | 'createdAt' | 'updatedAt'>,
) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO accord_nx_docs (kind, slug, published, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [kind, payload.slug || '', payload.published === false ? 0 : 1, JSON.stringify(payload), now, now],
  )
  return mysqlGetDoc<T>(kind, String(result.insertId)) as Promise<T>
}

export async function mysqlUpdateDoc<T extends { _id: string; published?: boolean; slug?: string }>(
  kind: string,
  id: string,
  payload: Partial<T>,
) {
  const existing = await mysqlGetDoc<T>(kind, id)
  if (!existing) return null
  const next = { ...existing, ...payload, _id: existing._id }
  const pool = await getPool()
  await pool.query(
    'UPDATE accord_nx_docs SET slug = ?, published = ?, payload = ?, updated_at = ? WHERE kind = ? AND id = ?',
    [next.slug || '', next.published === false ? 0 : 1, JSON.stringify(next), new Date(), kind, mysqlId(id)],
  )
  return mysqlGetDoc<T>(kind, id)
}

export async function mysqlDeleteDoc<T extends { _id: string }>(kind: string, id: string) {
  const existing = await mysqlGetDoc<T>(kind, id)
  if (!existing) return null
  const pool = await getPool()
  await pool.query('DELETE FROM accord_nx_docs WHERE kind = ? AND id = ?', [kind, mysqlId(id)])
  return existing
}

export async function mysqlListProfilePages(publishedOnly = false): Promise<CompanyProfilePage[]> {
  const rows = await mysqlListDocs<CompanyProfilePage>('company-profile', publishedOnly)
  return rows.sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt.localeCompare(b.createdAt))
}

export async function mysqlRecordProductClick(input: {
  erpProductId: string
  productName: string
  categoryId: string
  categoryName: string
  fromProductId?: string
}) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const now = new Date()
  await pool.query(
    `INSERT INTO accord_nx_product_performance
      (erp_product_id, product_name, category_id, category_name, clicks, shares, last_clicked_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      clicks = clicks + 1,
      product_name = VALUES(product_name),
      category_id = VALUES(category_id),
      category_name = VALUES(category_name),
      last_clicked_at = VALUES(last_clicked_at),
      updated_at = VALUES(updated_at)`,
    [input.erpProductId, input.productName, input.categoryId, input.categoryName, now, now, now],
  )
  if (input.fromProductId && input.fromProductId !== input.erpProductId) {
    await pool.query(
      `INSERT INTO accord_nx_product_journeys (from_product_id, to_product_id, journey_count, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE journey_count = journey_count + 1, updated_at = VALUES(updated_at)`,
      [input.fromProductId, input.erpProductId, now, now],
    )
  }
}

export async function mysqlRecordProductShare(input: {
  erpProductId: string
  productName: string
  categoryId: string
  categoryName: string
}) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const now = new Date()
  await pool.query(
    `INSERT INTO accord_nx_product_performance
      (erp_product_id, product_name, category_id, category_name, clicks, shares, last_shared_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      shares = shares + 1,
      product_name = VALUES(product_name),
      category_id = VALUES(category_id),
      category_name = VALUES(category_name),
      last_shared_at = VALUES(last_shared_at),
      updated_at = VALUES(updated_at)`,
    [input.erpProductId, input.productName, input.categoryId, input.categoryName, now, now, now],
  )
}

export async function mysqlGetProductMetricsMap() {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT erp_product_id, clicks, shares FROM accord_nx_product_performance',
  )
  const map = new Map<string, { clicks: number; shares: number }>()
  for (const row of rows) {
    map.set(String(row.erp_product_id), { clicks: Number(row.clicks) || 0, shares: Number(row.shares) || 0 })
  }
  return map
}

export async function mysqlGetRelatedProductIds(fromProductId: string, limit = 8) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT to_product_id FROM accord_nx_product_journeys WHERE from_product_id = ? ORDER BY journey_count DESC LIMIT ' + Math.max(1, Math.min(50, Number(limit) || 8)),
    [fromProductId],
  )
  return rows.map((row) => String(row.to_product_id))
}

export async function mysqlGetCategoryPerformance() {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT category_id AS categoryId, MAX(category_name) AS categoryName,
            SUM(clicks) AS clicks, SUM(shares) AS shares, COUNT(*) AS productsClicked
     FROM accord_nx_product_performance
     GROUP BY category_id
     ORDER BY clicks DESC`,
  )
  return rows.map((row) => ({
    categoryId: String(row.categoryId || ''),
    categoryName: String(row.categoryName || ''),
    clicks: Number(row.clicks) || 0,
    shares: Number(row.shares) || 0,
    productsClicked: Number(row.productsClicked) || 0,
  }))
}

type CatalogProductRow = RowDataPacket & {
  id: string
  slug: string
  name: string
  product_type: string
  description: string
  details: string
  price: number | string
  compare_at: number | string | null
  manufacturer: string
  category_id: string
  category_name: string
  featured: number
  in_stock: number
  created_on: string
}

function mapCatalogProductRow(row: CatalogProductRow): CatalogProduct {
  const price = Number(row.price) || 0
  const compareAt = Number(row.compare_at)
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    details: row.details || '',
    categoryId: row.category_id,
    categoryName: row.category_name,
    price,
    compareAt: Number.isFinite(compareAt) && compareAt > 0 ? compareAt : undefined,
    unit: 'unit',
    stock: 0,
    inStock: Boolean(row.in_stock),
    image: null,
    images: [],
    imageAssets: [],
    manufacturer: row.manufacturer || undefined,
    clicks: 0,
    shares: 0,
    slug: row.slug,
    shopUrl: `/product/${row.slug}`,
    productType: row.product_type || null,
    featured: Boolean(row.featured),
    createdOn: row.created_on || undefined,
  }
}

export async function mysqlCountCatalogProducts() {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM accord_nx_products')
  return Number(rows[0]?.total) || 0
}

export async function mysqlCatalogProductIds() {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM accord_nx_products')
  return new Set(rows.map((row) => String(row.id)))
}

export async function mysqlListSourceUrls(ownerKey: string) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [rows] = await pool.query<FileRow[]>(
    'SELECT source_url FROM accord_nx_files WHERE owner_key = ? AND source_url <> ?',
    [ownerKey, ''],
  )
  return new Set(rows.map((row) => row.source_url).filter(Boolean) as string[])
}

export async function mysqlUpsertCatalogProduct(product: CatalogProduct) {
  await ensureMysqlSchema()
  const pool = await getPool()
  const now = new Date()
  await pool.query(
    `INSERT INTO accord_nx_products
      (id, slug, name, product_type, description, details, price, compare_at, manufacturer, category_id, category_name, featured, in_stock, created_on, imported_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      slug = VALUES(slug),
      name = VALUES(name),
      product_type = VALUES(product_type),
      description = VALUES(description),
      details = IF(details = '' OR details IS NULL, VALUES(details), details),
      price = VALUES(price),
      compare_at = VALUES(compare_at),
      manufacturer = VALUES(manufacturer),
      category_id = VALUES(category_id),
      category_name = VALUES(category_name),
      featured = VALUES(featured),
      in_stock = VALUES(in_stock),
      created_on = VALUES(created_on),
      updated_at = VALUES(updated_at)`,
    [
      product.id,
      product.slug,
      product.name,
      product.productType || '',
      product.description || '',
      product.details || '',
      product.price || 0,
      product.compareAt || null,
      product.manufacturer || '',
      product.categoryId,
      product.categoryName,
      product.featured ? 1 : 0,
      product.inStock ? 1 : 0,
      product.createdOn || '',
      now,
      now,
    ],
  )
}

export async function mysqlListCatalogProducts(): Promise<CatalogProduct[]> {
  return withMysqlRetry(async () => {
    await ensureMysqlSchema()
    const pool = await getPool()
    const [rows] = await pool.query<CatalogProductRow[]>(
      `SELECT id, slug, name, product_type, description, details, price, compare_at, manufacturer,
              category_id, category_name, featured, in_stock, created_on
       FROM accord_nx_products ORDER BY name ASC`,
    )
    return rows.map(mapCatalogProductRow)
  })
}

export async function mysqlCatalogImportStats() {
  await ensureMysqlSchema()
  const pool = await getPool()
  const [productRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM accord_nx_products')
  const [imageRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM accord_nx_files
     WHERE kind IN ('product-image', 'product-installation') AND source_url <> ''`,
  )
  const [fileRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM accord_nx_files WHERE kind IN ('product-image', 'product-installation')`,
  )
  return {
    products: Number(productRows[0]?.total) || 0,
    importedImages: Number(imageRows[0]?.total) || 0,
    storedImages: Number(fileRows[0]?.total) || 0,
  }
}

export async function mysqlIsLocalCatalogReady() {
  const state = mysqlState()
  if (state.localCatalogReady && Date.now() - state.localCatalogReady.at < 30_000) {
    return state.localCatalogReady.ready
  }
  const count = await mysqlCountCatalogProducts().catch(() => 0)
  const ready = count > 0
  if (ready) void mysqlSetLocalCatalogReady(true)
  state.localCatalogReady = { at: Date.now(), ready }
  return ready
}

export async function mysqlSetLocalCatalogReady(ready: boolean) {
  await mysqlGetSiteSettings()
  const pool = await getPool()
  await pool.query(
    `UPDATE accord_nx_site_settings SET use_local_catalog = ?, updated_at = ? WHERE id = ?`,
    [ready ? 1 : 0, new Date(), 'default'],
  )
  mysqlState().localCatalogReady = { at: Date.now(), ready }
}

function nairobiDate(value = new Date()) {
  return value.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

export function sanitizeVisitPath(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw.startsWith('/')) return ''
  const path = raw.split('?')[0].split('#')[0].replace(/\/{2,}/g, '/').slice(0, 255)
  if (!path || path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/_next')) return ''
  return path
}

export function sanitizeVisitorId(value: unknown) {
  const id = String(value || '').trim()
  return /^[a-z0-9-]{8,64}$/i.test(id) ? id : ''
}

export async function mysqlRecordSiteVisit(input: { visitorId: string; path: string }) {
  const visitorId = sanitizeVisitorId(input.visitorId)
  const path = sanitizeVisitPath(input.path)
  if (!visitorId || !path) return
  await ensureMysqlSchema()
  const pool = await getPool()
  const now = new Date()
  await pool.query(
    `INSERT INTO accord_nx_site_visits (visit_date, visitor_id, path, hits, last_seen_at)
     VALUES (?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE hits = hits + 1, last_seen_at = VALUES(last_seen_at)`,
    [nairobiDate(now), visitorId, path, now],
  )
}

export type VisitorDay = {
  date: string
  visitors: number
  pageviews: number
}

function mapVisitRows(rows: RowDataPacket[]): VisitorDay[] {
  return rows.map((row) => ({
    date: String(row.visit_date || row.bucket),
    visitors: Number(row.visitors) || 0,
    pageviews: Number(row.pageviews) || 0,
  }))
}

export async function mysqlGetVisitorStats(days = 90): Promise<{ today: VisitorDay; days: VisitorDay[] }> {
  await ensureMysqlSchema()
  const pool = await getPool()
  const today = nairobiDate()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS visit_date,
            COUNT(DISTINCT visitor_id) AS visitors,
            SUM(hits) AS pageviews
     FROM accord_nx_site_visits
     WHERE visit_date >= DATE_SUB(?, INTERVAL ? DAY)
     GROUP BY visit_date
     ORDER BY visit_date DESC`,
    [today, Math.max(1, Math.min(365, days))],
  )
  const list = mapVisitRows(rows)
  return {
    today: list.find((row) => row.date === today) || { date: today, visitors: 0, pageviews: 0 },
    days: list,
  }
}

export async function mysqlGetVisitorReport(input: { period?: unknown; from?: unknown; to?: unknown } = {}) {
  const period = parsePeriod(input.period)
  const today = nairobiDate()
  const custom = isIsoDate(String(input.from || '')) || isIsoDate(String(input.to || ''))
  const range = custom
    ? clampRange(String(input.from || ''), String(input.to || ''), today)
    : defaultRange(period, today)
  const seriesFrom = period === 'weekly' ? weekStart(range.from) : period === 'monthly' ? monthStart(range.from) : range.from
  const bucket = period === 'weekly'
    ? `DATE_FORMAT(DATE_SUB(visit_date, INTERVAL WEEKDAY(visit_date) DAY), '%Y-%m-%d')`
    : period === 'monthly'
      ? `DATE_FORMAT(visit_date, '%Y-%m-01')`
      : `DATE_FORMAT(visit_date, '%Y-%m-%d')`

  await ensureMysqlSchema()
  const pool = await getPool()
  const [seriesRows, totalRows, todayRows] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT ${bucket} AS bucket,
              COUNT(DISTINCT visitor_id) AS visitors,
              SUM(hits) AS pageviews
       FROM accord_nx_site_visits
       WHERE visit_date BETWEEN ? AND ?
       GROUP BY ${bucket}
       ORDER BY bucket ASC`,
      [range.from, range.to],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT visitor_id) AS visitors, COALESCE(SUM(hits), 0) AS pageviews
       FROM accord_nx_site_visits
       WHERE visit_date BETWEEN ? AND ?`,
      [range.from, range.to],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS visit_date,
              COUNT(DISTINCT visitor_id) AS visitors,
              SUM(hits) AS pageviews
       FROM accord_nx_site_visits
       WHERE visit_date = ?
       GROUP BY visit_date`,
      [today],
    ),
  ])

  const todayPoint = mapVisitRows(todayRows[0])[0] || { date: today, visitors: 0, pageviews: 0 }
  const totalsRow = totalRows[0][0]
  return {
    period,
    from: range.from,
    to: range.to,
    today: todayPoint,
    totals: {
      visitors: Number(totalsRow?.visitors) || 0,
      pageviews: Number(totalsRow?.pageviews) || 0,
    },
    series: fillVisitorSeries(period, seriesFrom, range.to, mapVisitRows(seriesRows[0])),
  }
}

export type EventCommentPublic = {
  _id: string
  name: string
  body: string
  createdAt: string
}

export type EventEngagement = {
  likes: number
  liked: boolean
  comments: EventCommentPublic[]
}

function mapEventComment(row: RowDataPacket): EventCommentPublic {
  return {
    _id: String(row.id),
    name: String(row.name || 'Guest'),
    body: String(row.body || ''),
    createdAt: iso(row.created_at),
  }
}

export async function mysqlGetEventEngagement(eventId: string, visitorId = ''): Promise<EventEngagement> {
  const id = mysqlId(eventId)
  if (!id) return { likes: 0, liked: false, comments: [] }
  await ensureMysqlSchema()
  const pool = await getPool()
  const visitor = sanitizeVisitorId(visitorId)
  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM accord_nx_event_likes WHERE event_id = ?',
    [id],
  )
  let liked = false
  if (visitor) {
    const [likeRows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 AS liked FROM accord_nx_event_likes WHERE event_id = ? AND visitor_id = ? LIMIT 1',
      [id, visitor],
    )
    liked = Boolean(likeRows[0])
  }
  const [commentRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, body, created_at FROM accord_nx_event_comments WHERE event_id = ? ORDER BY created_at ASC, id ASC',
    [id],
  )
  return {
    likes: Number(countRows[0]?.total) || 0,
    liked,
    comments: commentRows.map(mapEventComment),
  }
}

export async function mysqlToggleEventLike(eventId: string, visitorId: string) {
  const id = mysqlId(eventId)
  const visitor = sanitizeVisitorId(visitorId)
  if (!id || !visitor) return mysqlGetEventEngagement(eventId, visitorId)
  await ensureMysqlSchema()
  const pool = await getPool()
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT 1 AS liked FROM accord_nx_event_likes WHERE event_id = ? AND visitor_id = ? LIMIT 1',
    [id, visitor],
  )
  if (existing[0]) {
    await pool.query('DELETE FROM accord_nx_event_likes WHERE event_id = ? AND visitor_id = ?', [id, visitor])
  } else {
    await pool.query('INSERT INTO accord_nx_event_likes (event_id, visitor_id, created_at) VALUES (?, ?, ?)', [
      id,
      visitor,
      new Date(),
    ])
  }
  return mysqlGetEventEngagement(eventId, visitor)
}

export async function mysqlAddEventComment(input: {
  eventId: string
  visitorId: string
  name: string
  body: string
}) {
  const id = mysqlId(input.eventId)
  const visitor = sanitizeVisitorId(input.visitorId)
  const name = input.name.trim().slice(0, 80)
  const body = input.body.trim().slice(0, 1000)
  if (!id || !name || !body) throw new Error('Name and comment are required')
  await ensureMysqlSchema()
  const pool = await getPool()
  if (visitor) {
    const [recent] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM accord_nx_event_comments WHERE event_id = ? AND visitor_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [id, visitor],
    )
    if (Number(recent[0]?.total) >= 3) throw new Error('Please wait before posting another comment')
  }
  await pool.query(
    'INSERT INTO accord_nx_event_comments (event_id, visitor_id, name, body, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, visitor, name, body, new Date()],
  )
  return mysqlGetEventEngagement(input.eventId, visitor)
}

export async function mysqlDeleteEventEngagement(eventId: string) {
  const id = mysqlId(eventId)
  if (!id) return
  await ensureMysqlSchema()
  const pool = await getPool()
  await pool.query('DELETE FROM accord_nx_event_likes WHERE event_id = ?', [id])
  await pool.query('DELETE FROM accord_nx_event_comments WHERE event_id = ?', [id])
}
