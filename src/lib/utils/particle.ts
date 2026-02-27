/**
 * Thai gender-based particle utility.
 * Returns appropriate ครับ/ค่ะ particles based on user gender.
 *
 * Usage:
 *   import { p, np, kp } from "@/lib/utils/particle"
 *   `สวัสดี${p(user.gender)}`  → "สวัสดีครับ" or "สวัสดีค่ะ"
 */

/** Basic particle: ครับ (male) / ค่ะ (female) */
export function p(gender?: string | null): string {
    return gender === 'female' ? 'ค่ะ' : 'ครับ'
}

/** Polite particle with นะ: นะครับ (male) / นะคะ (female) */
export function np(gender?: string | null): string {
    return gender === 'female' ? 'นะคะ' : 'นะครับ'
}

/** Thank you: ขอบคุณครับ (male) / ขอบคุณค่ะ (female) */
export function kp(gender?: string | null): string {
    return gender === 'female' ? 'ขอบคุณค่ะ' : 'ขอบคุณครับ'
}

/** Sorry: ขออภัยครับ (male) / ขออภัยค่ะ (female) */
export function sp(gender?: string | null): string {
    return gender === 'female' ? 'ขออภัยค่ะ' : 'ขออภัยครับ'
}
