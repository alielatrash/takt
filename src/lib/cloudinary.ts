import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

// Avatar upload settings
export const AVATAR_FOLDER = 'silsila/avatars'
export const AVATAR_TRANSFORMATION = {
  width: 400,
  height: 400,
  crop: 'fill',
  gravity: 'face',
  quality: 'auto',
  fetch_format: 'auto',
}

// Extract public_id from Cloudinary URL
export function getPublicIdFromUrl(url: string): string | null {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    const match = url.match(/\/([^\/]+)\.[^.]+$/)
    if (!match) return null

    // For URLs with folders: silsila/avatars/user-id-timestamp
    const parts = url.split('/upload/')
    if (parts.length < 2) return null

    const pathParts = parts[1].split('/')
    // Remove any transformation parameters (starts with v_)
    const relevantParts = pathParts.filter(part => !part.startsWith('v') && !part.includes('_'))

    // Get the public_id (without extension)
    const filename = relevantParts[relevantParts.length - 1]
    const publicId = filename.replace(/\.[^.]+$/, '')

    // Return with folder structure
    return `${AVATAR_FOLDER}/${publicId}`
  } catch (error) {
    console.error('Error extracting public_id from URL:', error)
    return null
  }
}
