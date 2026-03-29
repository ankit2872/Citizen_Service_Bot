/**
 * Eligibility Checker data — maps citizen profile to matching schemes
 */

export const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh'
];

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

// Language code → Speech Recognition BCP-47 tag
export const SPEECH_LANG_MAP = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
  te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
  ml: 'ml-IN', pa: 'pa-IN'
};

// Language code → human name for Gemini prompt
export const LANG_NAME_MAP = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil',
  te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada',
  ml: 'Malayalam', pa: 'Punjabi'
};

/**
 * Eligibility checker — returns matched schemes with score & reasons
 */
export function checkEligibility({ age, income, gender, category, occupation, hasGirlChild }) {
  const schemes = [];

  // PMAY — Housing
  if (income <= 600000) {
    let score = 70;
    const reasons = ['Low / Middle income group qualifies'];
    if (income <= 300000) { score = 95; reasons.push('EWS/LIG — highest priority category'); }
    schemes.push({ title: 'PM Awas Yojana (PMAY)', emoji: '🏠', score, reasons, category: 'Housing' });
  }

  // PM-JAY — Health
  if (income <= 500000) {
    const score = income <= 200000 ? 95 : 75;
    schemes.push({
      title: 'Ayushman Bharat PM-JAY', emoji: '🏥', score,
      reasons: ['Low-income families eligible for ₹5 lakh health cover'],
      category: 'Healthcare'
    });
  }

  // PM-KISAN — Farmers
  if (occupation === 'farmer') {
    schemes.push({ title: 'PM-KISAN', emoji: '🌾', score: 98, reasons: ['Farmer — direct ₹6000/year benefit'], category: 'Agriculture' });
  }

  // APY — Unorganized sector
  if (age >= 18 && age <= 40 && (occupation === 'selfemployed' || occupation === 'laborer' || occupation === 'farmer')) {
    const score = age <= 30 ? 90 : 75;
    schemes.push({ title: 'Atal Pension Yojana (APY)', emoji: '🧓', score, reasons: [`Age ${age} qualifies (18–40)`, 'Unorganized sector worker'], category: 'Pension' });
  }

  // PMJDY — Financial inclusion
  if (income <= 300000) {
    schemes.push({ title: 'PM Jan Dhan Yojana', emoji: '🏦', score: 85, reasons: ['Low income — zero balance account + insurance'], category: 'Banking' });
  }

  // Mudra — Entrepreneurs
  if (occupation === 'selfemployed' || occupation === 'business') {
    schemes.push({ title: 'PM Mudra Yojana', emoji: '💼', score: 90, reasons: ['Self-employed / business owner eligible for up to ₹10 lakh loan'], category: 'Business' });
  }

  // SSY — Girl child
  if (gender === 'female' || hasGirlChild) {
    schemes.push({ title: 'Sukanya Samriddhi Yojana', emoji: '👧', score: 95, reasons: [hasGirlChild ? 'You have a girl child' : 'Female citizen eligible'], category: "Girl's Welfare" });
  }

  // SC/ST/OBC bonus schemes
  if (category === 'sc' || category === 'st') {
    schemes.push({ title: 'SC/ST Special Scholarships & Loan Schemes', emoji: '🎓', score: 90, reasons: [`${category.toUpperCase()} category — multiple reserved benefit schemes available`], category: 'Education' });
  }

  return schemes.sort((a, b) => b.score - a.score);
}
