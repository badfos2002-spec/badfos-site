import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadResult,
} from 'firebase/storage'
import { storage, isFirebaseConfigured } from './firebase'

function ensureFirebase(): void {
  if (!isFirebaseConfigured || !storage) {
    console.warn('⚠️ Firebase Storage operation attempted but Firebase is not configured')
    throw new Error('Firebase is not configured. Please add Firebase credentials to .env.local')
  }
}

/**
 * Upload a design file to Firebase Storage
 */
export async function uploadDesignFile(
  file: File,
  orderId: string,
  fileName: string
): Promise<string> {
  ensureFirebase()
  const filePath = `designs/${orderId}/${fileName}`
  const storageRef = ref(storage!, filePath)

  await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(storageRef)

  return downloadURL
}

/**
 * Upload a mockup image (admin)
 */
export async function uploadMockupImage(
  file: File,
  category: string,
  fileName: string
): Promise<string> {
  ensureFirebase()
  const filePath = `mockups/${category}/${fileName}`
  const storageRef = ref(storage!, filePath)

  await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(storageRef)

  return downloadURL
}

/**
 * Upload a site image (admin)
 */
export async function uploadSiteImage(
  file: File,
  category: string,
  fileName: string
): Promise<string> {
  ensureFirebase()
  const filePath = `site-images/${category}/${fileName}`
  const storageRef = ref(storage!, filePath)

  await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(storageRef)

  return downloadURL
}

/**
 * Upload a base64 data URL to Firebase Storage and return the download URL.
 * Used at checkout to move design images out of the Firestore document.
 */
export async function uploadBase64Image(
  base64DataUrl: string,
  orderId: string,
  fileName: string
): Promise<string> {
  ensureFirebase()

  // Convert data URL → Blob (Safari doesn't support fetch() on data: URLs)
  const [header, b64] = base64DataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })

  const filePath = `designs/${orderId}/${fileName}`
  const storageRef = ref(storage!, filePath)

  await uploadBytes(storageRef, blob)
  return await getDownloadURL(storageRef)
}

/**
 * Delete a file from storage
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  ensureFirebase()
  try {
    const storageRef = ref(storage!, fileUrl)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

/**
 * Get download URL from storage path
 */
export async function getFileDownloadURL(filePath: string): Promise<string> {
  ensureFirebase()
  const storageRef = ref(storage!, filePath)
  return await getDownloadURL(storageRef)
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png']
): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `הקובץ גדול מדי. גודל מקסימלי: ${maxSizeMB}MB`,
    }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'סוג קובץ לא נתמך. אנא העלה JPG, JPEG או PNG',
    }
  }

  return { valid: true }
}

/**
 * Generate a unique filename
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()

  return `${timestamp}-${randomString}.${extension}`
}
