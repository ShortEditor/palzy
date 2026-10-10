// This checks the student-number format, not enrollment or ownership.
export const ALLOWED_BRANCH_CODES = ['CM', 'CS', 'EC']
const PIN_PATTERN = /^(\d{2})(\d{3})(?:-([A-Z]{2})-(\d{3})|([A-Z]{2})(\d{3}))$/

export function normalizeCollegePin(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().toUpperCase().match(PIN_PATTERN)
  if (!match) return null
  const [, year, college, oldBranch, oldSerial, branch, serial] = match
  const branchCode = oldBranch || branch
  if (college !== '170' || (ALLOWED_BRANCH_CODES && !ALLOWED_BRANCH_CODES.includes(branchCode))) return null
  return `${year}${college}-${branchCode}-${oldSerial || serial}`
}

export function collegePinVariants(value) {
  const normalized = normalizeCollegePin(value)
  return normalized ? [normalized, normalized.replaceAll('-', '')] : []
}
