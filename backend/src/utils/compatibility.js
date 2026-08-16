/**
 * LifeLink - Blood Compatibility Utility
 * Defines biological compatibility rules (ABO & Rh factor) for Red Blood Cells (RBC).
 * Uses Prisma BloodType enum keys: A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG.
 */

// Mapping: Donor Blood Type -> Array of recipient blood types who can receive this blood
const DONOR_TO_RECIPIENTS_MAP = {
  O_NEG: ['O_NEG', 'O_POS', 'A_NEG', 'A_POS', 'B_NEG', 'B_POS', 'AB_NEG', 'AB_POS'], // Universal Donor
  O_POS: ['O_POS', 'A_POS', 'B_POS', 'AB_POS'],
  A_NEG: ['A_NEG', 'A_POS', 'AB_NEG', 'AB_POS'],
  A_POS: ['A_POS', 'AB_POS'],
  B_NEG: ['B_NEG', 'B_POS', 'AB_NEG', 'AB_POS'],
  B_POS: ['B_POS', 'AB_POS'],
  AB_NEG: ['AB_NEG', 'AB_POS'],
  AB_POS: ['AB_POS']
};

// Mapping: Recipient Blood Type -> Array of donor blood types this recipient can safely receive
const RECIPIENT_FROM_DONORS_MAP = {
  O_NEG: ['O_NEG'],
  O_POS: ['O_NEG', 'O_POS'],
  A_NEG: ['O_NEG', 'A_NEG'],
  A_POS: ['O_NEG', 'O_POS', 'A_NEG', 'A_POS'],
  B_NEG: ['O_NEG', 'B_NEG'],
  B_POS: ['O_NEG', 'O_POS', 'B_NEG', 'B_POS'],
  AB_NEG: ['O_NEG', 'A_NEG', 'B_NEG', 'AB_NEG'],
  AB_POS: ['O_NEG', 'O_POS', 'A_NEG', 'A_POS', 'B_NEG', 'B_POS', 'AB_NEG', 'AB_POS'] // Universal Recipient
};

// Human-readable labels for UI presentation
const BLOOD_TYPE_DISPLAY_MAP = {
  O_NEG: 'O-',
  O_POS: 'O+',
  A_NEG: 'A-',
  A_POS: 'A+',
  B_NEG: 'B-',
  B_POS: 'B+',
  AB_NEG: 'AB-',
  AB_POS: 'AB+'
};

// Reverse map to parse standard display strings back to Enum format
const DISPLAY_TO_ENUM_MAP = {
  'O-': 'O_NEG',
  'O+': 'O_POS',
  'A-': 'A_NEG',
  'A+': 'A_POS',
  'B-': 'B_NEG',
  'B+': 'B_POS',
  'AB-': 'AB_NEG',
  'AB+': 'AB_POS'
};

/**
 * Returns all recipient blood types that can receive blood from the specified donor.
 * @param {string} donorBloodType - Prisma BloodType enum (e.g., 'O_NEG', 'A_POS')
 * @returns {string[]} Array of compatible recipient BloodType enums
 */
function getCompatibleRecipients(donorBloodType) {
  return DONOR_TO_RECIPIENTS_MAP[donorBloodType] || [];
}

/**
 * Returns all donor blood types that can safely donate to the specified recipient.
 * @param {string} recipientBloodType - Prisma BloodType enum (e.g., 'A_POS', 'AB_POS')
 * @returns {string[]} Array of compatible donor BloodType enums
 */
function getCompatibleDonors(recipientBloodType) {
  return RECIPIENT_FROM_DONORS_MAP[recipientBloodType] || [];
}

/**
 * Checks if a specific donor can safely donate to a specific recipient.
 * @param {string} donorBloodType - Donor Prisma BloodType enum
 * @param {string} recipientBloodType - Recipient Prisma BloodType enum
 * @returns {boolean} True if compatible, false otherwise
 */
function isBloodCompatible(donorBloodType, recipientBloodType) {
  const allowedRecipients = getCompatibleRecipients(donorBloodType);
  return allowedRecipients.includes(recipientBloodType);
}

/**
 * Converts enum value to clean display format (e.g. 'A_POS' -> 'A+').
 * @param {string} bloodTypeEnum
 * @returns {string}
 */
function formatBloodType(bloodTypeEnum) {
  return BLOOD_TYPE_DISPLAY_MAP[bloodTypeEnum] || bloodTypeEnum;
}

/**
 * Parses clean display string to enum value (e.g. 'A+' -> 'A_POS').
 * @param {string} displayString
 * @returns {string|null}
 */
function parseBloodType(displayString) {
  const sanitized = displayString ? displayString.trim().toUpperCase() : '';
  return DISPLAY_TO_ENUM_MAP[sanitized] || null;
}

module.exports = {
  DONOR_TO_RECIPIENTS_MAP,
  RECIPIENT_FROM_DONORS_MAP,
  BLOOD_TYPE_DISPLAY_MAP,
  getCompatibleRecipients,
  getCompatibleDonors,
  isBloodCompatible,
  formatBloodType,
  parseBloodType
};