// ---------------------------------------------------------------------------
// Music License Generator
// ---------------------------------------------------------------------------
// Generates Master Recording and Publishing (Composition) license agreements
// from deal, license, song, and rights holder data. The 10-section structure
// mirrors real commercial synchronization license agreements.
// ---------------------------------------------------------------------------

export interface MusicLicenseData {
  header: {
    title: string; // "MASTER RECORDING AGREEMENT" or "PUBLISHING RECORDING AGREEMENT"
    date: string;
    licensor: {
      name: string;
      address: string | null;
      obo: string | null; // "o/b/o [artist]" for publishing
    };
    licensee: {
      name: string;
    };
    percentageOfRights: number;
  };
  sections: MusicLicenseSection[];
  signature: {
    licensorName: string;
    licensorObo: string | null;
    licenseeName: string;
  };
}

export interface MusicLicenseSection {
  number: number;
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function currency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '[AMOUNT]';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function currencyWords(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '[AMOUNT] US Dollars ([AMOUNT])';
  const formatted = currency(amount);
  // Simple word conversion for common amounts
  const num = Math.round(amount);
  const words = numberToWords(num);
  return `${words} US Dollars (${formatted})`;
}

function numberToWords(n: number): string {
  if (n < 0) return 'Negative ' + numberToWords(-n);
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  n = Math.round(n);
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
  if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
  if (n < 1000000000) return numberToWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + numberToWords(n % 1000000) : '');
  if (n < 1000000000000) return numberToWords(Math.floor(n / 1000000000)) + ' Billion' + (n % 1000000000 ? ' ' + numberToWords(n % 1000000000) : '');
  return String(n);
}

function textOr(value: string | null | undefined, placeholder = '[TBD]'): string {
  return value && value.trim() ? value.trim() : placeholder;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '[DATE]';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatUsageMedia(deal: any): string {
  // If custom usage_description exists, use it (user edits take precedence)
  if (deal.usage_description && deal.usage_description.trim()) {
    return deal.usage_description.trim();
  }

  // Otherwise, auto-generate from spots, media, and edits settings
  const parts: string[] = [];

  // Spots summary
  const spots = deal.materials_videos;
  if (Array.isArray(spots) && spots.length > 0) {
    const spotParts = spots
      .filter((s: any) => s.count)
      .map((s: any) => `${s.count} × ${s.length} ${s.type || 'spot'}`);
    if (spotParts.length > 0) {
      parts.push(`Up to ${spotParts.join(', ')}`);
    }
  }

  // Media types - format as natural English
  const mediaList: string[] = Array.isArray(deal.media) ? deal.media : [];
  if (mediaList.includes('All Media')) {
    parts.push('across all media');
  } else if (mediaList.length > 0) {
    // Clean up media names for readability
    const cleanMedia = mediaList.map((m: string) => {
      if (m === 'TV / Broadcast') return 'Television and Broadcast';
      if (m === 'Streaming / OTT') return 'Streaming and OTT';
      if (m === 'Out of Home (OOH)') return 'Out of Home';
      if (m === 'In-Store / POS') return 'In-Store and Point of Sale';
      if (m === 'Industrial / Internal') return 'Industrial and Internal Use';
      return m;
    });
    if (cleanMedia.length === 1) {
      parts.push(`for ${cleanMedia[0]}`);
    } else if (cleanMedia.length === 2) {
      parts.push(`for ${cleanMedia[0]} and ${cleanMedia[1]}`);
    } else {
      const last = cleanMedia.pop();
      parts.push(`for ${cleanMedia.join(', ')}, and ${last}`);
    }
  }

  // Edits/versions
  if (deal.materials_edits_versions && parts.length > 0) {
    parts.push('including edits, versions, cutdowns, and lifts');
  }

  if (parts.length > 0) {
    return parts.join(', ') + '.';
  }

  // Fallback to old logic if nothing else works
  const usages: string[] = Array.isArray(deal.usage_type) ? deal.usage_type : [];
  if (usages.length > 0 || mediaList.length > 0) {
    const fallbackParts: string[] = [];
    if (usages.length > 0) fallbackParts.push(usages.join(', '));
    if (mediaList.length > 0) fallbackParts.push(`Media: ${mediaList.join(', ')}`);
    return fallbackParts.join('; ');
  }

  return '[Usage and media rights to be specified]';
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildRecordingOrComposition(side: string, song: any): MusicLicenseSection {
  const isMaster = side === 'master';
  const subjectType = isMaster ? 'master recording' : 'composition';
  const subjectLabel = isMaster ? 'Master Recording' : 'COMPOSITION';
  const verb = isMaster ? 'performed by' : 'written by';

  return {
    number: 1,
    title: isMaster ? 'Master Recording' : 'Composition',
    content: `The ${subjectType} ("${subjectLabel}") covered by this license is:\n\n"${textOr(song.title, '[SONG TITLE]')}" ${verb} ${textOr(song.artist_name, '[ARTIST]')}`,
  };
}

function buildUsageMediaRights(deal: any, side: string): MusicLicenseSection {
  const isMaster = side === 'master';
  const subjectLabel = isMaster ? 'Master Recording' : 'Composition';
  const usageDesc = formatUsageMedia(deal);

  let content = `The usage/media rights ("Use") granted by Licensor to Licensee in this Agreement are:\n\n${usageDesc}`;

  if (isMaster) {
    content += `\n\nLicensor hereby grants Licensee the right to record, reproduce, perform the ${subjectLabel} in whole or in part in the soundtrack of and in synchronization or timed relation with the production, to exhibit, broadcast, edit, adapt, make copies, or otherwise use the ${subjectLabel} as herein provided and as set forth herein.`;
  }

  return {
    number: 2,
    title: 'Usage / Media Rights',
    content,
  };
}

function buildTerm(deal: any): MusicLicenseSection {
  const parts: string[] = [];

  if (deal.term_duration) {
    parts.push(deal.term_duration);
  }

  if (deal.term_start_date) {
    parts.push(`beginning ${formatDate(deal.term_start_date)} or first use, whichever is earlier`);
  }

  if (deal.term_end_date) {
    parts.push(`ending ${formatDate(deal.term_end_date)}`);
  }

  const termText = parts.length > 0 ? parts.join(' ') : '[Term to be specified]';

  return {
    number: 3,
    title: 'Term',
    content: `The term ("Term") of this license and grant of rights made herein is:\n\n${termText}.`,
  };
}

function buildTerritory(deal: any): MusicLicenseSection {
  return {
    number: 4,
    title: 'Territory',
    content: `The territory ("Territory") of this license and grant of rights made herein is:\n\n${textOr(deal.territory, '[Territory to be specified]')}.`,
  };
}

function buildWarranties(side: string): MusicLicenseSection {
  const isMaster = side === 'master';
  const subject = isMaster ? 'Master Recording' : 'Composition';
  const sampleClause = isMaster ? `Licensor warrants that the ${subject} is sample free. ` : `Licensor warrants that the ${subject} is sample free. `;
  const unionRef = isMaster ? 'recorded' : 'written or produced';

  return {
    number: 5,
    title: 'Warranties',
    content: `Licensor warrants it owns, administers, or controls the applicable percentage of the ${subject}, and that it has the right to enter into this Agreement and to license all the rights hereinabove set forth and that the exercise by Licensee and client of the rights granted to it hereunder will not violate or infringe the rights of any third party. ${sampleClause}Licensor also warrants that it has all rights necessary to grant this license, including the permission and approval of all artists, including but not limited to singers and musicians, and producers of said ${subject}; that except as may be expressly set forth herein, there shall be no further payments required of Licensee and no payments are due any singer, musician or other performer pursuant to any union agreement or otherwise, that the ${subject} was not ${unionRef} under the aegis of SAG or AFTRA; that any payments to any of the aforementioned artists shall be the sole responsibility of Licensor which shall hold Licensee harmless. Licensor will indemnify, defend and hold Licensee and their respective officers, directors, employees, agents, successors and assigns harmless against any and all claims, liabilities, losses, damages or expenses including reasonable attorney's fees actually incurred by any of them by reason of Licensor's breach of said warranties or other provision of this Agreement.`,
  };
}

function buildFee(license: any, side: string): MusicLicenseSection {
  const subject = side === 'master' ? 'Master Recording' : 'Composition';
  const effectiveFee = license.fee_override ?? license.fee_amount;
  const pct = license.share_percentage ?? 100;

  return {
    number: 6,
    title: 'Fee',
    content: `In consideration of the foregoing, Licensee shall pay Licensor a fee of ${currencyWords(effectiveFee)}, based on ${pct}% of the rights in and to the ${subject}, (the "Fee"). Licensee shall not have any obligation to make any payments to Licensor other than the foregoing, it being understood that Licensor is responsible for any agent's, manager's, attorney's, artist's or other fees or commissions. Licensee shall be under no obligation to cause the ${subject} to be broadcast; it being understood that Licensee's only obligation is to make payment required under this Agreement.`,
  };
}

function buildBreachCure(deal: any): MusicLicenseSection {
  const cureDays = deal.termination_cure_days ?? 30;

  return {
    number: 7,
    title: 'Breach / Cure',
    content: `In the event of a breach of the terms hereof it shall be a condition precedent to the innocent party taking any legal action that it shall have served the other party with notice specifying the breach and requiring its remedy within ${cureDays} days after such notice is received ("Cure Period") and that such breach is not remedied within such period. Notwithstanding the foregoing, in the event of any breach of this Agreement by the Licensee, Licensor's rights and remedies shall be limited to its right, if any, to recover damages in an action at law and in no event shall Licensor be entitled to rescind this License or to receive injunctive or other equitable relief.`,
  };
}

function buildAssignment(): MusicLicenseSection {
  return {
    number: 8,
    title: 'Assignment',
    content: 'This Agreement and the license rights granted herein are assignable by Licensee in whole or in part to any person or entity.',
  };
}

function buildReservedRights(): MusicLicenseSection {
  return {
    number: 9,
    title: 'Reserved Rights',
    content: 'All rights not expressly granted to Licensee in this License Agreement are expressly reserved to Licensor.',
  };
}

function buildGoverningLaw(deal: any): MusicLicenseSection {
  const state = textOr(deal.governing_law, 'New York');

  return {
    number: 10,
    title: 'Governing Law & General Provisions',
    content: `This Agreement has been entered into in the State of ${state} and the validity, interpretation and legal effect of this Agreement shall be governed by the laws of the State of ${state} applicable to contracts entered into and performed entirely within the State of ${state}. Any legal action brought with respect to this Agreement shall be brought in the federal, state or local courts in the State of ${state} and each party hereby consents to jurisdiction therein. This Agreement sets forth the entire and only understanding of the parties hereto relating to the subject matter hereof, and supersedes any and all prior agreements relating thereto. No modification, amendment, waiver, termination or discharge of this Agreement or of any provision hereof shall be effective unless confirmed by a written instrument signed by the party sought to be bound. No waiver of any provision of this Agreement or of any default hereunder shall affect the waiving party's right thereafter to enforce such provision or to exercise any right or remedy in the event of any other default, whether or not similar. The invalidity or unenforceability of any provision hereof will not affect the validity of any other provisions of this Agreement and same will continue in full force and effect. This Agreement may be executed in PDF, facsimile and/or other electronic form and/or in one or more counterparts, each of which will be deemed an original, and all of which together will constitute one and the same legally binding instrument.`,
  };
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateMusicLicense(
  deal: any,
  license: any,
  song: any,
  rightsHolder: any,
): MusicLicenseData {
  if (!song) throw new Error('Cannot generate music license: song data is missing');
  if (!rightsHolder) throw new Error('Cannot generate music license: rights holder data is missing');
  if (!license) throw new Error('Cannot generate music license: license data is missing');

  const isMaster = license.side === 'master';
  const title = isMaster
    ? 'MASTER RECORDING AGREEMENT'
    : 'PUBLISHING RECORDING AGREEMENT';

  const obo = !isMaster ? song.artist_name || null : null;

  const header: MusicLicenseData['header'] = {
    title,
    date: formatDate(deal.effective_date) || '[DATE]',
    licensor: {
      name: rightsHolder.name || '[LICENSOR]',
      address: rightsHolder.address || null,
      obo,
    },
    licensee: {
      name: deal.client_name || '[LICENSEE]',
    },
    percentageOfRights: license.share_percentage ?? 100,
  };

  const sections: MusicLicenseSection[] = [
    buildRecordingOrComposition(license.side, song),
    buildUsageMediaRights(deal, license.side),
    buildTerm(deal),
    buildTerritory(deal),
    buildWarranties(license.side),
    buildFee(license, license.side),
    buildBreachCure(deal),
    buildAssignment(),
    buildReservedRights(),
    buildGoverningLaw(deal),
  ];

  const signature: MusicLicenseData['signature'] = {
    licensorName: rightsHolder.name || '[LICENSOR]',
    licensorObo: obo,
    licenseeName: deal.client_name || '[LICENSEE]',
  };

  return { header, sections, signature };
}

// ---------------------------------------------------------------------------
// Text serializer
// ---------------------------------------------------------------------------

export function musicLicenseToText(data: MusicLicenseData): string {
  const lines: string[] = [];
  const W = 70;

  // Title block
  lines.push('='.repeat(W));
  lines.push(`Commercial Licensing Agreement`);
  lines.push('='.repeat(W));
  lines.push('');

  // Preamble
  const licensorDesc = data.header.licensor.obo
    ? `${data.header.licensor.name} o/b/o ${data.header.licensor.obo}`
    : data.header.licensor.name;

  const licensorWithAddr = data.header.licensor.address
    ? `${licensorDesc}, ${data.header.licensor.address}`
    : licensorDesc;

  lines.push(
    `This is a ${data.header.title} ("Agreement") dated ${data.header.date} ` +
    `by and between ${licensorWithAddr} ("Licensor") and ` +
    `${data.header.licensee.name}, including its subsidiaries, divisions, ` +
    `and affiliated companies (individually and collectively, the "Licensee") ` +
    `contracting for ${data.header.percentageOfRights}% of the rights in and to the ` +
    `${data.header.title.includes('MASTER') ? 'Master Recording' : 'COMPOSITION'} ` +
    `(as defined below) and its synchronization use as further set forth below.`
  );
  lines.push('');
  lines.push('-'.repeat(W));

  // Numbered sections
  for (const section of data.sections) {
    lines.push('');
    lines.push(`${section.number}. ${section.content}`);
  }

  // Signature block
  lines.push('');
  lines.push('='.repeat(W));
  lines.push('ACCEPTED AND AGREED TO BY:');
  lines.push('='.repeat(W));
  lines.push('');

  // Licensor signature
  const licensorSigName = data.signature.licensorObo
    ? `${data.signature.licensorName} o/b/o ${data.signature.licensorObo}`
    : data.signature.licensorName;
  lines.push(licensorSigName);
  lines.push('');
  lines.push('____________________________________');
  lines.push('       An Authorized Signatory');
  lines.push('');
  lines.push('Name: _______________________________');
  lines.push('');
  lines.push('Title: ________________________________');
  lines.push('');
  lines.push('Date: ________________________________');

  // Licensee signature
  lines.push('');
  lines.push(data.signature.licenseeName);
  lines.push('');
  lines.push('____________________________________');
  lines.push('       An Authorized Signatory');
  lines.push('');
  lines.push('Name: _______________________________');
  lines.push('');
  lines.push('Title: ________________________________');
  lines.push('');
  lines.push('Date: ________________________________');
  lines.push('');
  lines.push('='.repeat(W));
  lines.push('END OF AGREEMENT');
  lines.push('='.repeat(W));

  return lines.join('\n');
}
