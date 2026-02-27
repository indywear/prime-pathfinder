/**
 * Timezone utility for Bangkok (UTC+7)
 * All date boundaries in this app should use Bangkok time
 * since all users are Thai students.
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

/**
 * Get the start of today in Bangkok timezone (00:00:00 ICT)
 * Returns a UTC Date that corresponds to midnight in Bangkok.
 */
export function getBangkokStartOfDay(date?: Date): Date {
    const now = date ?? new Date()
    // Convert to Bangkok time by adding offset
    const bangkokTime = new Date(now.getTime() + BANGKOK_OFFSET_MS)
    // Zero out the time portion in Bangkok
    bangkokTime.setUTCHours(0, 0, 0, 0)
    // Convert back to UTC
    return new Date(bangkokTime.getTime() - BANGKOK_OFFSET_MS)
}

/**
 * Get the start of today in Bangkok timezone as a date string (YYYY-MM-DD)
 */
export function getBangkokDateString(date?: Date): string {
    const now = date ?? new Date()
    const bangkokTime = new Date(now.getTime() + BANGKOK_OFFSET_MS)
    return bangkokTime.toISOString().split('T')[0]
}

/**
 * Get current hour in Bangkok timezone (0-23)
 */
export function getBangkokHour(date?: Date): number {
    const now = date ?? new Date()
    const bangkokTime = new Date(now.getTime() + BANGKOK_OFFSET_MS)
    return bangkokTime.getUTCHours()
}
