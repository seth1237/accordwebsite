import { v2 as cloudinary } from 'cloudinary'
import { randomUUID } from 'node:crypto'

const MANUFACTURER_BROCHURE_FOLDER = 'tarumed/manufacturers'
const MAX_MANUFACTURER_BROCHURE_SIZE = 20 * 1024 * 1024

function cloudName() {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || ''
}

function uploadPreset() {
  return process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || ''
}

function getCloudinaryConfig() {
  return {
    cloudName: cloudName(),
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadPreset: uploadPreset(),
  }
}

export function isCloudinaryConfigured(): boolean {
  const config = getCloudinaryConfig()
  if (!config.cloudName) return false
  return Boolean((config.apiKey && config.apiSecret) || config.uploadPreset)
}

export function createManufacturerBrochureUploadSignature() {
  const config = getCloudinaryConfig()
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error('Signed Cloudinary uploads are not configured')
  }

  const params = {
    folder: MANUFACTURER_BROCHURE_FOLDER,
    public_id: randomUUID(),
    timestamp: Math.floor(Date.now() / 1000),
    overwrite: 'false',
    filename_override: 'brochure.pdf',
  }

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    ...params,
    signature: cloudinary.utils.api_sign_request(params, config.apiSecret),
  }
}

export async function getManufacturerBrochure(publicId: string) {
  if (!publicId) return null
  if (!new RegExp(`^${MANUFACTURER_BROCHURE_FOLDER}/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}(?:\\.pdf)?$`, 'i').test(publicId)) {
    throw new Error('Invalid brochure upload')
  }

  const config = getCloudinaryConfig()
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error('Signed Cloudinary uploads are not configured')
  }

  configureCloudinary()
  const resource = await cloudinary.api.resource(publicId, { resource_type: 'raw' })
  if (
    resource.resource_type !== 'raw'
    || resource.format !== 'pdf'
    || typeof resource.bytes !== 'number'
    || resource.bytes > MAX_MANUFACTURER_BROCHURE_SIZE
    || typeof resource.secure_url !== 'string'
  ) {
    throw new Error('Upload a PDF under 20MB')
  }

  return { publicId: resource.public_id, secureUrl: resource.secure_url }
}

export function configureCloudinary(): void {
  const config = getCloudinaryConfig()
  if (!config.cloudName) throw new Error('Cloudinary is not configured')
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  })
}

async function unsignedUpload(buffer: Buffer, folder: string, id: string) {
  const name = cloudName()
  const preset = uploadPreset()
  if (!name || !preset) throw new Error('Cloudinary unsigned upload is not configured')
  const body = new FormData()
  body.append('file', `data:image/jpeg;base64,${buffer.toString('base64')}`)
  body.append('upload_preset', preset)
  body.append('folder', folder)
  body.append('public_id', `${id}-${Date.now()}`)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${name}/image/upload`, {
    method: 'POST',
    body,
  })
  const result = await response.json() as { public_id?: string; secure_url?: string; error?: { message?: string } }
  if (!response.ok || !result.public_id || !result.secure_url) {
    throw new Error(result.error?.message || 'Cloudinary unsigned upload failed')
  }
  return { public_id: result.public_id, secure_url: result.secure_url }
}

export async function uploadSiteImage(buffer: Buffer, folder: string, id: string) {
  const config = getCloudinaryConfig()
  if (config.apiKey && config.apiSecret && config.cloudName) {
    configureCloudinary()
    return new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'image',
            folder,
            public_id: `${id}-${Date.now()}`,
            overwrite: false,
            transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error || !result?.public_id || !result.secure_url) {
              reject(error || new Error('Cloudinary upload returned no URL'))
              return
            }
            resolve({ public_id: result.public_id, secure_url: result.secure_url })
          },
        )
        .end(buffer)
    }).catch(async (error) => {
      if (!config.uploadPreset) throw error
      return unsignedUpload(buffer, folder, id)
    })
  }
  return unsignedUpload(buffer, folder, id)
}

export async function uploadSiteFile(buffer: Buffer, folder: string, id: string, filename = 'file.pdf') {
  const config = getCloudinaryConfig()
  if (!config.apiKey || !config.apiSecret || !config.cloudName) {
    throw new Error('Cloudinary signed upload is required for documents')
  }
  configureCloudinary()
  return new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'raw',
          folder,
          public_id: `${id}-${Date.now()}`,
          overwrite: false,
          filename_override: filename,
        },
        (error, result) => {
          if (error || !result?.public_id || !result.secure_url) {
            reject(error || new Error('Cloudinary upload returned no URL'))
            return
          }
          resolve({ public_id: result.public_id, secure_url: result.secure_url })
        },
      )
      .end(buffer)
  })
}

export async function uploadProductImage(buffer: Buffer, erpProductId: string) {
  return uploadSiteImage(buffer, 'tarumed/products', erpProductId)
}

export async function deleteCloudinaryImage(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return
  configureCloudinary()
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}
