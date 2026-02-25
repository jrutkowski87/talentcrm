// /Users/jeffreyrutkowski/CRM Talent/talent-crm/src/lib/engine/brief-parser.ts
//
// AI-powered Brief Parser for Talent CRM
// Takes raw text input (creative brief in any format) and extracts structured deal fields.
// Two modes: AI (Claude API) and rule-based fallback (regex + keyword extraction).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedBrief {
  // Identity
  client_name: string | null;
  campaign_name: string | null;
  deal_name: string | null;

  // Talent criteria
  talent_criteria: {
    categories: string[];
    gender: string | null;
    description: string | null;
    energy_notes: string | null;
    restrictions: string[];
    requirements: string[];
  } | null;

  // Service days
  service_days: {
    type: string; // "production", "event", "appearance", "dinner", "hosting", "fitting", "rehearsal", "travel", "service"
    quantity: number | null;
    hours: number | null;
    location: string | null;
    date_or_window: string | null;
  }[];

  // Social
  social_posts: {
    quantity: number | null;
    platforms: string[];
    window: string | null;
  } | null;

  // Media
  media_opportunities: {
    quantity: number | null;
    types: string[];
    notes: string | null;
  } | null;

  // Ambassador duties
  ambassador_duties: {
    duties: string[];
    notes: string | null;
  } | null;

  // Term
  term_duration: string | null;
  term_duration_weeks: number | null;

  // Fee
  fee_total: number | null;
  fee_structure: string | null;
  fee_payments: {
    percentage: number | null;
    milestone: string | null;
  }[] | null;

  // Exclusivity
  exclusivity_category: string | null;
  exclusivity_brands: string[];
  exclusivity_duration: string | null;

  // Travel
  travel: {
    ground_transport: string | null;
    flights: string | null;
    hotel: string | null;
    per_diem: string | null;
  } | null;

  // HMU
  hmu: {
    hair: boolean;
    makeup: boolean;
    wardrobe: string | null;
  } | null;

  // Approval rights
  approval_rights: {
    scope: string | null;
    turnaround_hours: number | null;
    notes: string | null;
  } | null;

  // Image rights
  image_rights: {
    max_count: number | null;
    edits_allowed: boolean | null;
    notes: string | null;
  } | null;

  // Usage
  permitted_usage: {
    digital: string[];
    pr: boolean;
    retail: string[];
    ooh: string[];
    internal: boolean;
    photographer: string | null;
    paid_media: string | null;
  } | null;

  // Legal / admin
  governing_law: string | null;
  confidential: boolean | null;
  effective_date: string | null;
  post_term_rules: string | null;
  non_union: boolean | null;

  // Meta
  confidence: number; // 0 to 1
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function parseBrief(
  rawText: string,
  options?: { useAI?: boolean }
): Promise<ParsedBrief> {
  const useAI = options?.useAI ?? false;

  if (useAI) {
    return parseWithAI(rawText);
  }
  return parseWithRules(rawText);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

function wordToNumber(word: string): number | null {
  const lower = word.toLowerCase().trim();
  if (WORD_TO_NUM[lower] !== undefined) return WORD_TO_NUM[lower];
  const parsed = parseInt(lower, 10);
  return isNaN(parsed) ? null : parsed;
}

/** Normalize whitespace and strip HTML tags for cleaner matching. */
function normalize(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Case-insensitive match that returns all matches. */
function allMatches(text: string, regex: RegExp): RegExpMatchArray[] {
  const results: RegExpMatchArray[] = [];
  let m: RegExpExecArray | null;
  const g = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  while ((m = g.exec(text)) !== null) {
    results.push(m);
  }
  return results;
}

/** Parse a dollar string like "$25,000", "$350K", "$1M", "$1.5M" into a number. */
function parseDollar(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[$,\s]/g, "").toUpperCase();
  let multiplier = 1;
  if (s.endsWith("M")) {
    multiplier = 1_000_000;
    s = s.slice(0, -1);
  } else if (s.endsWith("K")) {
    multiplier = 1_000;
    s = s.slice(0, -1);
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n * multiplier;
}

// ---------------------------------------------------------------------------
// Rule-based parser
// ---------------------------------------------------------------------------

function parseWithRules(rawText: string): ParsedBrief {
  const text = normalize(rawText);
  const lower = text.toLowerCase();

  const result: ParsedBrief = {
    client_name: extractClientName(text),
    campaign_name: extractCampaignName(text),
    deal_name: extractDealName(text),
    talent_criteria: extractTalentCriteria(text, lower),
    service_days: extractServiceDays(text),
    social_posts: extractSocialPosts(text, lower),
    media_opportunities: extractMediaOpportunities(text, lower),
    ambassador_duties: extractAmbassadorDuties(text, lower),
    term_duration: null,
    term_duration_weeks: null,
    fee_total: null,
    fee_structure: null,
    fee_payments: null,
    exclusivity_category: null,
    exclusivity_brands: [],
    exclusivity_duration: null,
    travel: extractTravel(text, lower),
    hmu: extractHMU(text, lower),
    approval_rights: extractApprovalRights(text, lower),
    image_rights: extractImageRights(text, lower),
    permitted_usage: extractUsage(text, lower),
    governing_law: extractGoverningLaw(text, lower),
    confidential: extractConfidential(text, lower),
    effective_date: extractEffectiveDate(text),
    post_term_rules: extractPostTermRules(text, lower),
    non_union: extractNonUnion(text),
    confidence: 0,
  };

  // Fee
  const fee = extractFee(text, lower);
  result.fee_total = fee.total;
  result.fee_structure = fee.structure;
  result.fee_payments = fee.payments;

  // Term
  const term = extractTerm(text, lower);
  result.term_duration = term.duration;
  result.term_duration_weeks = term.weeks;

  // Exclusivity
  const excl = extractExclusivity(text, lower);
  result.exclusivity_category = excl.category;
  result.exclusivity_brands = excl.brands;
  result.exclusivity_duration = excl.duration;

  // Confidence (0-1)
  result.confidence = computeConfidence(result);

  return result;
}

// --- Client name -----------------------------------------------------------

function extractClientName(text: string): string | null {
  const patterns = [
    /(?:client|brand|advertiser|company)\s*[:=\-]\s*([^\n,;]+)/i,
    /(?:on behalf of|representing|for)\s+([A-Z][A-Za-z0-9&'. ]+)/,
    /(?:from|re:?|regarding)\s*:?\s*([A-Z][A-Za-z0-9&'. ]+?)(?:\s+(?:campaign|brief|project|deal|partnership|collaboration))/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// --- Campaign name ---------------------------------------------------------

function extractCampaignName(text: string): string | null {
  const patterns = [
    /(?:campaign|project|initiative|program)\s*(?:name|title)?\s*[:=\-]\s*([^\n,;]+)/i,
    /(?:campaign|project)\s*:\s*[""\u201C]([^""\u201D]+)[""\u201D]/i,
    /[""\u201C]([^""\u201D]{3,60})[""\u201D]\s+campaign/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// --- Deal name -------------------------------------------------------------

function extractDealName(text: string): string | null {
  const patterns = [
    /(?:deal|partnership|engagement|agreement)\s*(?:name|title)?\s*[:=\-]\s*([^\n,;]+)/i,
    /(?:subject|re)\s*:\s*([^\n]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// --- Fee -------------------------------------------------------------------

function extractFee(
  text: string,
  lower: string
): { total: number | null; structure: string | null; payments: { percentage: number | null; milestone: string | null }[] | null } {
  let total: number | null = null;
  let structure: string | null = null;
  let payments: { percentage: number | null; milestone: string | null }[] | null = null;

  // Range pattern: "$350K-$1M" -- take the higher value as the total
  const rangePattern =
    /\$\s*([\d,.]+\s*[KkMm]?)\s*[-\u2013\u2014to]+\s*\$?\s*([\d,.]+\s*[KkMm]?)/g;
  const rangeMatches = allMatches(text, rangePattern);
  if (rangeMatches.length > 0) {
    const m = rangeMatches[0];
    const low = parseDollar(m[1]);
    const high = parseDollar(m[2]);
    if (low !== null && high !== null) {
      total = high;
      structure = "range";
    }
  }

  // Single value: "fee of $100,000"
  if (total === null) {
    const singlePattern =
      /(?:fee|budget|compensation|rate|offer|quote|price|cost|payment|amount)\s*(?:of|is|:|=|\u2014|-)?\s*\$\s*([\d,.]+\s*[KkMm]?)/gi;
    const singleMatches = allMatches(text, singlePattern);
    if (singleMatches.length > 0) {
      total = parseDollar(singleMatches[0][1]);
      structure = "flat";
    }
  }

  // Bare dollar amount when no fee keyword precedes it
  if (total === null) {
    const bareDollar = /\$\s*([\d,.]+\s*[KkMm]?)/g;
    const bareMatches = allMatches(text, bareDollar);
    if (bareMatches.length === 1) {
      total = parseDollar(bareMatches[0][1]);
      structure = "flat";
    }
  }

  // Fee structure keywords
  if (!structure) {
    if (/all[- ]?in/i.test(text)) structure = "flat";
    if (/pay[- ]or[- ]play/i.test(lower)) structure = "pay_or_play";
    if (/revenue\s*share/i.test(lower)) structure = "revenue_share";
    if (/retainer/i.test(lower)) structure = "flat";
    if (/per\s*(?:day|diem)/i.test(text)) structure = "flat";
    if (/per\s*post/i.test(text)) structure = "flat";
  }

  // Payment splits: "50% upon signing, 50% upon completion"
  const paymentPattern =
    /(\d{1,3})\s*%\s*(?:upon|on|at|after|due)?\s*([^,;\n]+)/gi;
  const paymentMatches = allMatches(text, paymentPattern);
  if (paymentMatches.length > 0) {
    payments = paymentMatches.map((m) => ({
      percentage: parseInt(m[1], 10),
      milestone: m[2].trim(),
    }));
  }

  return { total, structure, payments };
}

// --- Term ------------------------------------------------------------------

function extractTerm(
  text: string,
  lower: string
): { duration: string | null; weeks: number | null } {
  let duration: string | null = null;
  let weeks: number | null = null;

  // "12 months", "six months", "6-month term"
  const monthPattern =
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eighteen|twenty-?four)\s*[-]?\s*months?/i;
  const mm = text.match(monthPattern);
  if (mm) {
    const n = wordToNumber(mm[1]);
    if (n) {
      duration = `${n} months`;
      weeks = Math.round(n * 4.33);
    }
  }

  // "4 weeks", "two weeks"
  if (!duration) {
    const weekPattern =
      /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty-?four)\s*[-]?\s*weeks?/i;
    const wm = text.match(weekPattern);
    if (wm) {
      const n = wordToNumber(wm[1]);
      if (n) {
        duration = `${n} weeks`;
        weeks = n;
      }
    }
  }

  // "year-long", "1 year", "one year", "2 years"
  if (!duration) {
    const yearPattern =
      /(\d+|one|two|three)\s*[-]?\s*years?(?:\s*[-]?\s*long)?|year[\s-]*long/i;
    const ym = text.match(yearPattern);
    if (ym) {
      const n = ym[1] ? wordToNumber(ym[1]) : 1;
      if (n) {
        duration = `${n} year${n > 1 ? "s" : ""}`;
        weeks = n * 52;
      }
    }
  }

  return { duration, weeks };
}

// --- Service days ----------------------------------------------------------

function extractServiceDays(text: string): ParsedBrief["service_days"] {
  const days: ParsedBrief["service_days"] = [];

  const dayTypePatterns: { type: string; pattern: RegExp }[] = [
    { type: "production", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?production\s+days?/gi },
    { type: "production", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?shoot\s+days?/gi },
    { type: "event", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?event\s*(?:appearance)?s?\s*(?:days?)?/gi },
    { type: "appearance", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?(?:personal\s+)?appearances?/gi },
    { type: "dinner", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?(?:brand\s+)?dinners?/gi },
    { type: "hosting", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?hosting\s*(?:days?|events?)?/gi },
    { type: "fitting", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?fittings?/gi },
    { type: "rehearsal", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?rehearsals?/gi },
    { type: "travel", pattern: /(?:(\d+|one|two|three|four|five|six)\s*[xX\u00D7]?\s*)?travel\s+days?/gi },
  ];

  // Generic "service day" pattern
  const genericPattern =
    /(?:(\d+|one|two|three|four|five|six)\s*(?:\((\d+)\))?\s*[xX\u00D7]?\s*)?service\s+days?/gi;
  const genericMatches = allMatches(text, genericPattern);
  for (const m of genericMatches) {
    const qty = wordToNumber(m[2] || m[1] || "1");
    const hours = extractHoursNear(text, m.index ?? 0);
    const location = extractLocationNear(text, m.index ?? 0);
    const dateWindow = extractDateNear(text, m.index ?? 0);
    days.push({ type: "service", quantity: qty, hours, location, date_or_window: dateWindow });
  }

  for (const { type, pattern } of dayTypePatterns) {
    const matches = allMatches(text, pattern);
    for (const m of matches) {
      const qty = wordToNumber(m[1] || "1");
      const hours = extractHoursNear(text, m.index ?? 0);
      const location = extractLocationNear(text, m.index ?? 0);
      const dateWindow = extractDateNear(text, m.index ?? 0);
      days.push({ type, quantity: qty, hours, location, date_or_window: dateWindow });
    }
  }

  // Dedup
  const seen = new Set<string>();
  return days.filter((d) => {
    const key = `${d.type}-${d.quantity}-${d.hours}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Extract hours mentioned near a position in text. */
function extractHoursNear(text: string, pos: number): number | null {
  const window = text.slice(Math.max(0, pos - 60), pos + 120);
  const patterns = [
    /(?:up\s+to\s+)?(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(?:\((\d+)\))?\s*(?:hours?|hrs?))/i,
    /\((\d+)\s*(?:hours?|hrs?)\)/i,
  ];
  for (const p of patterns) {
    const m = window.match(p);
    if (m) return wordToNumber(m[2] || m[1] || "") ?? null;
  }
  return null;
}

/** Extract location mentioned near a position in text. */
function extractLocationNear(text: string, pos: number): string | null {
  const window = text.slice(Math.max(0, pos - 30), pos + 150);
  const patterns = [
    /(?:in|at|location:?)\s+([A-Z][A-Za-z\s,]+(?:NY|LA|NYC|CA|London|Miami|Chicago|Dallas|Atlanta|Nashville))/,
    /(?:in|at|location:?)\s+((?:New York|Los Angeles|San Francisco|London|Miami|Chicago|Dallas|Atlanta|Nashville|Las Vegas|Toronto|Paris|Austin|Portland|Denver|Seattle|Boston|Detroit|Phoenix|Houston|Philadelphia)[^,.\n]*)/i,
  ];
  for (const p of patterns) {
    const m = window.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

/** Extract dates/windows near a position. */
function extractDateNear(text: string, pos: number): string | null {
  const window = text.slice(Math.max(0, pos - 30), pos + 150);
  const patterns = [
    /(?:on|date:?|scheduled:?)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(?:week\s+of)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i,
    /\b(TBD|TBC|to be (?:determined|confirmed))\b/i,
    /(Q[1-4]\s*\d{4}|(?:spring|summer|fall|autumn|winter)\s*\d{4})/i,
  ];
  for (const p of patterns) {
    const m = window.match(p);
    if (m) return m[1] || m[0];
  }
  return null;
}

// --- Social posts ----------------------------------------------------------

function extractSocialPosts(
  text: string,
  lower: string
): ParsedBrief["social_posts"] {
  const platforms: string[] = [];
  if (/\b(?:instagram|ig|insta)\b/i.test(text)) platforms.push("Instagram");
  if (/\b(?:tiktok|tik tok|tt)\b/i.test(text)) platforms.push("TikTok");
  if (/\b(?:twitter|x\.com|tweet)\b/i.test(text)) platforms.push("Twitter/X");
  if (/\byoutube\b/i.test(text)) platforms.push("YouTube");
  if (/\bfacebook\b/i.test(text)) platforms.push("Facebook");
  if (/\bthreads\b/i.test(text)) platforms.push("Threads");
  if (/\bpinterest\b/i.test(text)) platforms.push("Pinterest");
  if (/\bsnapchat\b/i.test(text)) platforms.push("Snapchat");
  if (/\blinkedin\b/i.test(text)) platforms.push("LinkedIn");

  const postPatterns = [
    /(?:up\s+to\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*[xX\u00D7]?\s*(?:social\s+)?(?:posts?|pieces?\s+of\s+content|content\s+pieces?|deliverables?)/i,
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:IG|Instagram|TikTok|social|TT)\s*(?:posts?|stories|reels?|videos?)/i,
    /(?:stories|reels?|posts?)\s*(?:\(|x|X|\u00D7)\s*(\d+)/i,
  ];

  let quantity: number | null = null;
  for (const p of postPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      quantity = wordToNumber(m[1]);
      break;
    }
  }

  // Window
  let window: string | null = null;
  const windowPatterns = [
    /(?:post(?:ing)?|content)\s+(?:within|over|during|across)\s+([^\n,.;]+)/i,
    /(?:within|over)\s+(\d+\s+(?:days?|weeks?|months?))\s+(?:of|from|after)/i,
  ];
  for (const p of windowPatterns) {
    const m = text.match(p);
    if (m) { window = m[1].trim(); break; }
  }

  if (quantity !== null || platforms.length > 0) {
    return { quantity, platforms, window };
  }
  if (/\bsocial\s+(?:media|post|content|deliverable)/i.test(text)) {
    return { quantity: null, platforms, window };
  }
  return null;
}

// --- Media opportunities ---------------------------------------------------

function extractMediaOpportunities(
  text: string,
  lower: string
): ParsedBrief["media_opportunities"] {
  const types: string[] = [];
  if (/\bpress\s+(?:day|junket|interview|tour)/i.test(text)) types.push("press");
  if (/\bpodcast/i.test(text)) types.push("podcast");
  if (/\bradio/i.test(text)) types.push("radio");
  if (/\btv\s+(?:appearance|interview|segment)/i.test(text) || /\btelevision/i.test(text)) types.push("TV");
  if (/\bprint\s+(?:interview|feature|editorial)/i.test(text)) types.push("print");
  if (/\bmedia\s+(?:tour|day|appearance)/i.test(text)) types.push("media tour");
  if (/\bjunket/i.test(text)) types.push("junket");

  if (types.length === 0) return null;

  let quantity: number | null = null;
  const qm = text.match(
    /(\d+|one|two|three|four|five|six)\s*(?:media|press)\s*(?:opportunities|appearances?|interviews?|days?)/i
  );
  if (qm) quantity = wordToNumber(qm[1]);

  return { quantity, types, notes: null };
}

// --- Ambassador duties -----------------------------------------------------

function extractAmbassadorDuties(
  text: string,
  lower: string
): ParsedBrief["ambassador_duties"] {
  if (!/ambassador|brand\s+(?:partner|representative|face|spokesperson)/i.test(text)) return null;

  const duties: string[] = [];
  if (/\brepresent/i.test(text)) duties.push("brand representation");
  if (/\battend\s+(?:events?|launches?|activations?)/i.test(text)) duties.push("event attendance");
  if (/\bwear(?:ing)?\s+(?:the\s+)?brand/i.test(text) || /\bgifting/i.test(text)) duties.push("product wearing/gifting");
  if (/\bsocial\s+(?:posts?|content|media)/i.test(text)) duties.push("social content");
  if (/\bcontent\s+(?:creation|shoot)/i.test(text)) duties.push("content creation");
  if (/\bmedia\s+(?:appearances?|interviews?)/i.test(text)) duties.push("media appearances");

  if (duties.length === 0) duties.push("general ambassador duties");

  return { duties, notes: null };
}

// --- Usage -----------------------------------------------------------------

function extractUsage(
  text: string,
  lower: string
): ParsedBrief["permitted_usage"] {
  if (!/usage|rights|license|licen[sc]e|permitted\s+use|grant\s+of\s+rights|media\s+rights/i.test(text)) {
    if (!/\bdigital\b|\bPR\b|\bretail\b|\bOOH\b|\bout[- ]of[- ]home\b|\bbillboard\b|\bprint\b|\be-?com/i.test(text)) {
      return null;
    }
  }

  const digital: string[] = [];
  if (/\bwebsite\b/i.test(text)) digital.push("website");
  if (/\bsocial\s+media\b|\bsocial\s+channels?\b/i.test(text)) digital.push("social media");
  if (/\bemail\b|\be-?mail\s+(?:marketing|newsletter|blast)/i.test(text)) digital.push("email");
  if (/\be-?com(?:merce)?\b|\bonline\s+(?:store|shop|retail)/i.test(text)) digital.push("e-commerce");
  if (/\bdigital\s+(?:ads?|advertising|media|banner|display)/i.test(text)) digital.push("digital advertising");
  if (/\bapp\b|\bmobile\s+app/i.test(text)) digital.push("app");
  if (/\bnewsletter/i.test(text)) digital.push("newsletter");
  if (/\bstreaming/i.test(text)) digital.push("streaming");

  const pr = /\bPR\b|\bpress\b|\bpublic\s+relations?\b|\bearned\s+media\b/i.test(text);

  const retail: string[] = [];
  if (/\bin[- ]store\b/i.test(text)) retail.push("in-store");
  if (/\bPOS\b|\bpoint[- ]of[- ]sale\b/i.test(text)) retail.push("POS");
  if (/\bpackaging\b/i.test(text)) retail.push("packaging");
  if (/\bsignage\b/i.test(text)) retail.push("signage");
  if (/\bretail\b/i.test(text) && retail.length === 0) retail.push("retail");

  const ooh: string[] = [];
  if (/\bOOH\b|\bout[- ]of[- ]home\b/i.test(text)) ooh.push("OOH");
  if (/\bbillboard/i.test(text)) ooh.push("billboard");
  if (/\btransit\b/i.test(text)) ooh.push("transit");
  if (/\bwild\s*posting/i.test(text)) ooh.push("wild posting");
  if (/\bbus\s+(?:shelter|stop|wrap)/i.test(text)) ooh.push("bus");
  if (/\bsubway/i.test(text)) ooh.push("subway");

  const internal = /\binternal\b/i.test(text);

  let photographer: string | null = null;
  const photoMatch = text.match(/photographer\s*[:=\-]?\s*([^\n,;]+)/i);
  if (photoMatch) photographer = photoMatch[1].trim();

  let paid_media: string | null = null;
  if (/\bpaid\s+(?:media|social|digital|advertising)\b/i.test(text)) {
    const pmMatch = text.match(/paid\s+(?:media|social|digital|advertising)\b[^.\n]*/i);
    paid_media = pmMatch ? pmMatch[0].trim() : "paid media";
  }

  return { digital, pr, retail, ooh, internal, photographer, paid_media };
}

// --- Exclusivity -----------------------------------------------------------

function extractExclusivity(
  text: string,
  lower: string
): { category: string | null; brands: string[]; duration: string | null } {
  let category: string | null = null;
  const brands: string[] = [];
  let duration: string | null = null;

  // "exclusivity in the [category] category" or "Exclusive in fashion retail"
  const catPatterns = [
    /exclusiv(?:e|ity)\s+(?:in|within|for|across)\s+(?:the\s+)?([A-Za-z\s/&]+?)(?:\s+(?:category|space|industry|sector|vertical))/i,
    /exclusiv(?:e|ity)\s+(?:in|within|for|across)\s+(?:the\s+)?([A-Za-z\s/&]+?)(?:\.|,|;|\n|$)/i,
    /(?:category|vertical)\s+exclusiv(?:e|ity)\s*[:=\-]?\s*([^\n,.;]+)/i,
    /exclusiv(?:e|ity)\s*[:=\-]\s*([^\n,.;]+)/i,
    /non[- ]?compete\s*(?:in|for|:)?\s*([^\n,.;]+)/i,
  ];
  for (const p of catPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      category = m[1].trim();
      break;
    }
  }

  // Brand exclusions
  const brandExclusionPatterns = [
    /must\s+not\s+(?:have|be|work|partner|endorse|represent)[^.\n]*(?:with|for)\s+([A-Z][A-Za-z0-9&'. ]+)/gi,
    /(?:cannot|can't|no|avoid|exclude|excluding)\s+(?:partnership|deal|work|endorsement|relationship)[^.\n]*(?:with|for)\s+([A-Z][A-Za-z0-9&'. ]+)/gi,
    /(?:conflict(?:ing)?|competing)\s+(?:brands?|partners?|sponsors?)\s*[:=\-]?\s*([^\n;]+)/i,
  ];
  for (const p of brandExclusionPatterns) {
    const matches = allMatches(text, p);
    for (const m of matches) {
      if (m[1]) {
        const rawBrands = m[1].split(/,|(?:\s+and\s+)|\s*\/\s*/);
        for (const b of rawBrands) {
          const cleaned = b.trim().replace(/[.;,]$/, "");
          if (cleaned.length >= 2 && cleaned.length <= 50) brands.push(cleaned);
        }
      }
    }
  }

  // Exclusivity duration: "exclusive for 12 months", "exclusivity period: 6 months"
  const durPatterns = [
    /exclusiv(?:e|ity)\s+(?:for|period|term)\s*(?:of|:)?\s*(\d+\s+(?:months?|weeks?|years?))/i,
    /(?:non[- ]?compete|exclusiv(?:e|ity))\s+(?:through|until|for)\s+([^\n,.;]+)/i,
  ];
  for (const p of durPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      duration = m[1].trim();
      break;
    }
  }

  return { category, brands, duration };
}

// --- Travel ----------------------------------------------------------------

function extractTravel(
  text: string,
  lower: string
): ParsedBrief["travel"] {
  if (!/\btravel\b|\bflight|fly\b|\bhotel\b|\bground\s*transport|\bper\s*diem|\bcar\s+service/i.test(text)) {
    return null;
  }

  let ground_transport: string | null = null;
  const groundMatch = text.match(/(?:ground\s*transport(?:ation)?|car\s+service|suv|sedan|driver)\s*[:=\-]?\s*([^\n,.;]*)/i);
  if (groundMatch) {
    ground_transport = groundMatch[0].trim();
  } else if (/\bground\s*transport|\bcar\s+service\b|\bsuv\b|\bsedan\b|\bdriver\b/i.test(text)) {
    ground_transport = "provided";
  }

  let flights: string | null = null;
  if (/\bfirst\s+class\b/i.test(text)) flights = "first class";
  else if (/\bbusiness\s+class\b/i.test(text)) flights = "business class";
  else if (/\bpremium\s+economy\b/i.test(text)) flights = "premium economy";
  else if (/\beconomy\b/i.test(text)) flights = "economy";
  else if (/\bflight/i.test(text) || /\bairfare/i.test(text) || /\bfly\b/i.test(text)) flights = "provided";

  let hotel: string | null = null;
  if (/\b5[- ]star\b/i.test(text)) hotel = "5-star";
  else if (/\b4[- ]star\b/i.test(text)) hotel = "4-star";
  else if (/\bhotel\b|\baccommodation|\blodging\b/i.test(text)) hotel = "provided";

  let per_diem: string | null = null;
  const pdMatch = text.match(/per\s*diem\s*(?:of|:)?\s*\$?\s*([\d,.]+\s*[KkMm]?)/i);
  if (pdMatch) {
    per_diem = `$${pdMatch[1].trim()}`;
  } else if (/per\s*diem/i.test(text)) {
    per_diem = "provided";
  }

  return { ground_transport, flights, hotel, per_diem };
}

// --- HMU -------------------------------------------------------------------

function extractHMU(
  text: string,
  lower: string
): ParsedBrief["hmu"] {
  const hasHair = /\bhair\b/i.test(text);
  const hasMakeup = /\bmakeup\b|\bmake[- ]up\b|\bglam\b|\bbeauty\b/i.test(text);
  const hasWardrobe = /\bwardrobe\b|\bstyling\b|\bstylist\b|\bclothing\b|\boutfit/i.test(text);
  const hasHMU = /\bHMU\b|\bhair\s*(?:and|&)\s*make\s*up/i.test(text);

  if (!hasHair && !hasMakeup && !hasWardrobe && !hasHMU) return null;

  let wardrobe: string | null = null;
  if (hasWardrobe) {
    const wMatch = text.match(/wardrobe\s*[:=\-]?\s*([^\n,.;]+)/i);
    wardrobe = wMatch ? wMatch[1].trim() : "provided";
  }

  return {
    hair: hasHair || hasHMU,
    makeup: hasMakeup || hasHMU,
    wardrobe,
  };
}

// --- Approval rights -------------------------------------------------------

function extractApprovalRights(
  text: string,
  lower: string
): ParsedBrief["approval_rights"] {
  if (!/\bapproval\b|\bapprove\b|\bsign[- ]off\b|\breview\s+(?:and\s+)?approv/i.test(text)) return null;

  let scope: string | null = null;
  const scopeMatch = text.match(/(?:approval|approve|sign[- ]off)\s+(?:of|on|over|for)\s+([^\n,.;]+)/i);
  if (scopeMatch) scope = scopeMatch[1].trim();

  let turnaround_hours: number | null = null;
  const turnaroundMatch = text.match(/(\d+)\s*(?:hours?|hrs?)\s*(?:turnaround|to\s+(?:review|approve))/i);
  if (turnaroundMatch) turnaround_hours = parseInt(turnaroundMatch[1], 10);
  const turnaroundDays = text.match(/(\d+)\s*(?:business\s+)?days?\s*(?:turnaround|to\s+(?:review|approve))/i);
  if (!turnaround_hours && turnaroundDays) {
    turnaround_hours = parseInt(turnaroundDays[1], 10) * 24;
  }

  let notes: string | null = null;
  if (/silence\s+(?:is\s+)?(?:deemed\s+)?approval/i.test(text)) {
    notes = "Silence deemed approval";
  }

  return { scope, turnaround_hours, notes };
}

// --- Image rights ----------------------------------------------------------

function extractImageRights(
  text: string,
  lower: string
): ParsedBrief["image_rights"] {
  if (!/\bimage\s+right|\bphoto\s+(?:approval|rights?|usage|selection)|\blikeness\b|\bimages?\s+(?:selected|approved)/i.test(text)) return null;

  let max_count: number | null = null;
  const countMatch = text.match(/(?:up\s+to\s+)?(\d+)\s*(?:images?|photos?|shots?|selects?)/i);
  if (countMatch) max_count = parseInt(countMatch[1], 10);

  let edits_allowed: boolean | null = null;
  if (/\bno\s+(?:editing|edits|retouching|alteration)/i.test(text)) edits_allowed = false;
  else if (/\bediting|edits|retouching\b/i.test(text)) edits_allowed = true;

  let notes: string | null = null;
  if (/\btext\s+overlay/i.test(text)) notes = "Text overlays referenced";
  if (/\bcropping\b/i.test(text)) notes = (notes ? notes + "; " : "") + "Cropping referenced";

  return { max_count, edits_allowed, notes };
}

// --- Talent criteria -------------------------------------------------------

function extractTalentCriteria(
  text: string,
  lower: string
): ParsedBrief["talent_criteria"] {
  const categories: string[] = [];
  if (/\bactor\b|\bactress\b|\bactors\b/i.test(text)) categories.push("actor");
  if (/\bmusician\b|\bartist\b|\bsinger\b|\brapper\b|\bband\b/i.test(text)) categories.push("musician");
  if (/\bathlete\b|\bsports?\b/i.test(text)) categories.push("athlete");
  if (/\binfluencer\b|\bcreator\b|\bcontent\s+creator\b/i.test(text)) categories.push("influencer");
  if (/\bmodel\b/i.test(text)) categories.push("model");
  if (/\bcomedian\b|\bcomic\b/i.test(text)) categories.push("comedian");
  if (/\bchef\b/i.test(text)) categories.push("chef");
  if (/\bdesigner\b/i.test(text)) categories.push("designer");
  if (/\bcelebrity\b|\bcelebrities\b/i.test(text)) categories.push("celebrity");
  if (/\bhost\b|\bpresenter\b/i.test(text)) categories.push("host");
  if (/\breality\s+(?:tv\s+)?star/i.test(text)) categories.push("reality star");

  let gender: string | null = null;
  if (/\bmale\s+(?:talent|actor|athlete|influencer|model)/i.test(text) && !/female/i.test(text)) gender = "male";
  else if (/\bfemale\s+(?:talent|actor|athlete|influencer|model)/i.test(text)) gender = "female";
  else if (/\bnon[- ]binary/i.test(text)) gender = "non-binary";

  let description: string | null = null;
  const descPatterns = [
    /(?:talent\s+)?(?:description|profile|type)\s*[:=\-]\s*([^\n;]+)/i,
    /(?:ideal\s+(?:talent|candidate|partner))\s*[:=\-]?\s*([^\n.;]+)/i,
  ];
  for (const p of descPatterns) {
    const m = text.match(p);
    if (m && m[1]) { description = m[1].trim(); break; }
  }

  let energy_notes: string | null = null;
  const energyPatterns = [
    /(?:energy|vibe|tone|personality|aesthetic)\s*[:=\-]?\s*([^\n,.;]+)/i,
    /(?:looking\s+for|seeking|want)\s+(?:someone|talent|a\s+person)\s+(?:who\s+(?:is|has|feels?))?\s*([^\n.;]+)/i,
  ];
  for (const p of energyPatterns) {
    const m = text.match(p);
    if (m && m[1]) { energy_notes = m[1].trim(); break; }
  }

  const restrictions: string[] = [];
  const restrictionPatterns = [
    /(?:must\s+not|cannot|can't|no)\s+(?:have|be|currently|previously)\s+([^\n.;]+)/gi,
    /(?:restriction|exclude|avoid)\s*[:=\-]?\s*([^\n.;]+)/gi,
  ];
  for (const p of restrictionPatterns) {
    const matches = allMatches(text, p);
    for (const m of matches) {
      if (m[1]) restrictions.push(m[1].trim());
    }
  }

  const requirements: string[] = [];
  const requirementPatterns = [
    /(?:must\s+(?:have|be)|required|requirement)\s*[:=\-]?\s*([^\n.;]+)/gi,
    /(?:minimum|min\.?)\s+(?:followers?|following|engagement|reach)\s*(?:of|:)?\s*([^\n.;]+)/gi,
  ];
  for (const p of requirementPatterns) {
    const matches = allMatches(text, p);
    for (const m of matches) {
      if (m[1]) requirements.push(m[1].trim());
    }
  }

  if (categories.length === 0 && !gender && !description && !energy_notes && restrictions.length === 0 && requirements.length === 0) {
    return null;
  }

  return { categories, gender, description, energy_notes, restrictions, requirements };
}

// --- Governing law ---------------------------------------------------------

function extractGoverningLaw(text: string, lower: string): string | null {
  const patterns = [
    /governing\s+law\s*[:=\-]?\s*([^\n,.;]+)/i,
    /governed\s+by\s+(?:the\s+)?(?:laws?\s+of\s+)?(?:the\s+)?(?:state\s+of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:jurisdiction|venue)\s*[:=\-]?\s*([^\n,.;]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// --- Confidential ----------------------------------------------------------

function extractConfidential(text: string, lower: string): boolean | null {
  if (/\bconfidential\b|\bNDA\b|\bnon[- ]disclosure/i.test(text)) return true;
  if (/\bproprietary\b/i.test(text)) return true;
  return null;
}

// --- Effective date --------------------------------------------------------

function extractEffectiveDate(text: string): string | null {
  const patterns = [
    /effective\s+(?:date|as\s+of)\s*[:=\-]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i,
    /effective\s+(?:date|as\s+of)\s*[:=\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(?:start|commence)\s+(?:date|on)\s*[:=\-]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// --- Post-term rules -------------------------------------------------------

function extractPostTermRules(text: string, lower: string): string | null {
  const patterns = [
    /post[- ]term\s*[:=\-]?\s*([^\n]+)/i,
    /(?:after|following)\s+(?:the\s+)?(?:term|expiration|termination)\s*[:,]?\s*([^\n]+)/i,
    /(?:wind[- ]?down|tail\s+period|sell[- ]?off)\s*[:=\-]?\s*([^\n,.;]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// --- Non-union -------------------------------------------------------------

function extractNonUnion(text: string): boolean | null {
  if (/\bnon[- ]?union\b/i.test(text)) return true;
  if (/\bunion\b|\bSAG[- ]?AFTRA\b|\bAFTRA\b|\bSAG\b/i.test(text)) return false;
  return null;
}

// --- Confidence scoring ----------------------------------------------------

function computeConfidence(result: ParsedBrief): number {
  let score = 0;
  let total = 0;

  const weights: { value: unknown; weight: number }[] = [
    { value: result.client_name, weight: 10 },
    { value: result.campaign_name, weight: 5 },
    { value: result.deal_name, weight: 5 },
    { value: result.fee_total, weight: 20 },
    { value: result.term_duration, weight: 15 },
    { value: result.service_days.length > 0 ? true : null, weight: 15 },
    { value: result.social_posts, weight: 8 },
    { value: result.permitted_usage, weight: 8 },
    { value: result.exclusivity_category, weight: 5 },
    { value: result.talent_criteria, weight: 5 },
    { value: result.travel, weight: 2 },
    { value: result.hmu, weight: 2 },
  ];

  for (const w of weights) {
    total += w.weight;
    if (w.value !== null && w.value !== undefined) score += w.weight;
  }

  return total > 0 ? Math.round((score / total) * 100) / 100 : 0;
}

// ---------------------------------------------------------------------------
// AI-based parser (Claude API)
// ---------------------------------------------------------------------------

async function parseWithAI(rawText: string): Promise<ParsedBrief> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("[brief-parser] No ANTHROPIC_API_KEY found, falling back to rule-based parsing.");
    return parseWithRules(rawText);
  }

  const systemPrompt = `You are an expert talent deal parser for a celebrity talent management CRM. Your job is to extract structured deal fields from raw creative brief text.

Given a raw brief (which could be a pasted email, sparse notes, a transcript, or a formal brief), extract all relevant deal fields into the following JSON structure. Be precise and conservative -- only extract what is clearly stated or strongly implied. Use null for fields you cannot determine.

Return ONLY valid JSON matching this TypeScript interface:

interface ParsedBrief {
  client_name: string | null;
  campaign_name: string | null;
  deal_name: string | null;
  talent_criteria: {
    categories: string[]; // "actor", "musician", "athlete", "influencer", "model", "comedian", "chef", "designer", "celebrity", "host", "reality star"
    gender: string | null;
    description: string | null;
    energy_notes: string | null;
    restrictions: string[];
    requirements: string[];
  } | null;
  service_days: {
    type: string; // "production", "event", "appearance", "dinner", "hosting", "fitting", "rehearsal", "travel", "service"
    quantity: number | null;
    hours: number | null;
    location: string | null;
    date_or_window: string | null;
  }[];
  social_posts: {
    quantity: number | null;
    platforms: string[];
    window: string | null;
  } | null;
  media_opportunities: {
    quantity: number | null;
    types: string[];
    notes: string | null;
  } | null;
  ambassador_duties: {
    duties: string[];
    notes: string | null;
  } | null;
  term_duration: string | null;
  term_duration_weeks: number | null;
  fee_total: number | null;
  fee_structure: string | null; // "flat", "pay_or_play", "revenue_share", "hybrid"
  fee_payments: { percentage: number | null; milestone: string | null }[] | null;
  exclusivity_category: string | null;
  exclusivity_brands: string[];
  exclusivity_duration: string | null;
  travel: {
    ground_transport: string | null;
    flights: string | null;
    hotel: string | null;
    per_diem: string | null;
  } | null;
  hmu: {
    hair: boolean;
    makeup: boolean;
    wardrobe: string | null;
  } | null;
  approval_rights: {
    scope: string | null;
    turnaround_hours: number | null;
    notes: string | null;
  } | null;
  image_rights: {
    max_count: number | null;
    edits_allowed: boolean | null;
    notes: string | null;
  } | null;
  permitted_usage: {
    digital: string[];
    pr: boolean;
    retail: string[];
    ooh: string[];
    internal: boolean;
    photographer: string | null;
    paid_media: string | null;
  } | null;
  governing_law: string | null;
  confidential: boolean | null;
  effective_date: string | null;
  post_term_rules: string | null;
  non_union: boolean | null;
  confidence: number; // 0.0 to 1.0
}

Important instructions:
- For fee values, always convert to raw numbers (e.g., "$350K" -> 350000, "$1.5M" -> 1500000).
- For term_duration_weeks, calculate the approximate number of weeks.
- Be conservative with confidence -- a sparse email with just a fee and vague description should score low (0.2-0.4), while a detailed formal brief with most fields should score high (0.7-0.9).
- Return ONLY the JSON object, no markdown formatting, no explanation.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Parse this creative brief and extract all deal fields as JSON:\n\n---\n${rawText}\n---`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[brief-parser] Claude API error (${response.status}): ${errorBody}`);
      console.warn("[brief-parser] Falling back to rule-based parsing.");
      return parseWithRules(rawText);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;

    if (!content) {
      console.error("[brief-parser] No content in Claude API response.");
      return parseWithRules(rawText);
    }

    // Parse the JSON response
    let parsed: ParsedBrief;
    try {
      // Strip potential markdown code fences
      const cleaned = content.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (jsonErr) {
      console.error("[brief-parser] Failed to parse Claude JSON response:", jsonErr);
      return parseWithRules(rawText);
    }

    return validateAndFill(parsed);
  } catch (err) {
    console.error("[brief-parser] Claude API call failed:", err);
    return parseWithRules(rawText);
  }
}

/** Ensure all required fields of ParsedBrief are present after AI parsing. */
function validateAndFill(raw: Partial<ParsedBrief>): ParsedBrief {
  return {
    client_name: raw.client_name ?? null,
    campaign_name: raw.campaign_name ?? null,
    deal_name: raw.deal_name ?? null,
    talent_criteria: raw.talent_criteria ?? null,
    service_days: Array.isArray(raw.service_days) ? raw.service_days : [],
    social_posts: raw.social_posts ?? null,
    media_opportunities: raw.media_opportunities ?? null,
    ambassador_duties: raw.ambassador_duties ?? null,
    term_duration: raw.term_duration ?? null,
    term_duration_weeks: raw.term_duration_weeks ?? null,
    fee_total: raw.fee_total ?? null,
    fee_structure: raw.fee_structure ?? null,
    fee_payments: raw.fee_payments ?? null,
    exclusivity_category: raw.exclusivity_category ?? null,
    exclusivity_brands: Array.isArray(raw.exclusivity_brands) ? raw.exclusivity_brands : [],
    exclusivity_duration: raw.exclusivity_duration ?? null,
    travel: raw.travel ?? null,
    hmu: raw.hmu ?? null,
    approval_rights: raw.approval_rights ?? null,
    image_rights: raw.image_rights ?? null,
    permitted_usage: raw.permitted_usage ?? null,
    governing_law: raw.governing_law ?? null,
    confidential: raw.confidential ?? null,
    effective_date: raw.effective_date ?? null,
    post_term_rules: raw.post_term_rules ?? null,
    non_union: raw.non_union ?? null,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
  };
}
