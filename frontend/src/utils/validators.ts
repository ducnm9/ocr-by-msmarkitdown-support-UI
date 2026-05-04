const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.html', '.csv',
  '.json', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.bmp',
  '.tiff', '.mp3', '.wav', '.zip', '.epub', '.ipynb',
])

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

const ALLOWED_URL_SCHEMES = new Set(['http', 'https', 'file', 'data'])

/**
 * Validate that a file extension is in the allowed set (case-insensitive).
 * Returns true if allowed, false otherwise.
 */
export function validateFileExtension(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

/**
 * Validate that a file size does not exceed 50 MB.
 * Returns true if within limit, false if exceeded.
 */
export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_BYTES
}

/**
 * Validate that a URL has a supported scheme (http, https, file, data).
 * Returns an object with valid flag and optional error message.
 */
export function validateUrlScheme(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url)
    const scheme = parsed.protocol.replace(':', '')
    if (!ALLOWED_URL_SCHEMES.has(scheme)) {
      return {
        valid: false,
        error: `Unsupported URL scheme "${scheme}". Supported schemes: ${[...ALLOWED_URL_SCHEMES].join(', ')}`,
      }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Validate that an extension field starts with a dot character.
 * Returns true if valid (starts with "."), false otherwise.
 * Empty string is considered valid (field is optional).
 */
export function validateExtensionDot(extension: string): boolean {
  if (extension === '') return true
  return extension.startsWith('.')
}

/**
 * Detect if a URL is a YouTube URL.
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'youtube.com' ||
      parsed.hostname === 'youtu.be'
    )
  } catch {
    return false
  }
}
