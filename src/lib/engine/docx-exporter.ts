import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType
} from 'docx';
import { generateOfferSheet, offerSheetToText, type OfferSheetData } from './offer-sheet-generator';
import { generateLongForm, longFormToText, type LongFormData } from './longform-generator';

// ---------------------------------------------------------------------------
// AI Polish helper
// ---------------------------------------------------------------------------

async function polishWithAI(text: string, type: 'offer_sheet' | 'long_form'): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return text; // graceful fallback

  const systemPrompt = type === 'offer_sheet'
    ? `You are a professional entertainment lawyer polishing an offer sheet for a celebrity talent deal.
Improve the language to be more professional, clear, and industry-standard.
Preserve ALL deal terms, numbers, dates, and party names exactly as provided.
Do not add terms that weren't in the original. Return only the polished text.`
    : `You are a professional entertainment lawyer polishing a long-form talent agreement.
Improve the legal language to be more precise and professional.
Ensure clauses are clear and enforceable. Preserve ALL deal terms, numbers, dates, and party names exactly.
Do not add clauses that weren't in the original. Return only the polished text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Please polish the following ${type === 'offer_sheet' ? 'offer sheet' : 'long-form contract'}:\n\n---\n${text}\n---`,
        }],
      }),
    });

    if (!response.ok) return text;

    const data = await response.json();
    const content = data?.content?.[0]?.text;
    return content || text;
  } catch {
    return text; // fallback on error
  }
}

// ---------------------------------------------------------------------------
// DOCX Builders
// ---------------------------------------------------------------------------

function buildOfferSheetDocx(data: OfferSheetData, polishedText?: string): Document {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'FIRM OFFER SHEET', bold: true, size: 32, font: 'Arial' }),
      ],
    }),
  );

  // Header info
  const headerLines = [
    `Client: ${data.header.client}`,
    `Talent: ${data.header.talent}`,
    `Campaign: ${data.header.campaign}`,
    `Date: ${data.header.date}`,
  ];
  for (const line of headerLines) {
    sections.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: line, size: 22, font: 'Arial' })],
    }));
  }

  sections.push(new Paragraph({ spacing: { after: 200 }, children: [] })); // spacer

  // Sections
  if (polishedText) {
    // Use polished text as paragraphs
    const paras = polishedText.split('\n\n');
    for (const para of paras) {
      if (!para.trim()) continue;
      sections.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: para.trim(), size: 22, font: 'Arial' })],
      }));
    }
  } else {
    for (const section of data.sections) {
      sections.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: section.title, bold: true, size: 24, font: 'Arial' })],
      }));

      const contentLines = section.content.split('\n');
      for (const line of contentLines) {
        sections.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: line, size: 22, font: 'Arial' })],
        }));
      }
    }
  }

  // Footer
  sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  sections.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: '___________________________', size: 22, font: 'Arial' })],
  }));
  sections.push(new Paragraph({
    children: [new TextRun({ text: 'Authorized Signature', italics: true, size: 20, font: 'Arial', color: '666666' })],
  }));

  return new Document({
    sections: [{ children: sections }],
  });
}

function buildLongFormDocx(data: LongFormData, polishedText?: string): Document {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: data.header.title, bold: true, size: 28, font: 'Arial' }),
      ],
    }),
  );

  // Parties
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: `Effective Date: ${data.header.effectiveDate}`, size: 22, font: 'Arial' })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: `Between ${data.header.parties.company} ("Company") and ${data.header.parties.talent} ("Talent")`, size: 22, font: 'Arial' }),
    ],
  }));

  if (polishedText) {
    const paras = polishedText.split('\n\n');
    for (const para of paras) {
      if (!para.trim()) continue;
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: para.trim(), size: 22, font: 'Arial' })],
      }));
    }
  } else {
    for (const section of data.sections) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: `${section.number}. ${section.title}`, bold: true, size: 24, font: 'Arial' })],
      }));

      const contentLines = section.content.split('\n');
      for (const line of contentLines) {
        children.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: line, size: 22, font: 'Arial' })],
        }));
      }
    }
  }

  // Signature blocks
  children.push(new Paragraph({ spacing: { before: 400, after: 200 }, children: [] }));

  const sigLabels = ['Company Signature', 'Talent Signature'];
  for (const label of sigLabels) {
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: '___________________________', size: 22, font: 'Arial' })],
    }));
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: label, italics: true, size: 20, font: 'Arial', color: '666666' })],
    }));
  }

  return new Document({
    sections: [{ children }],
  });
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export async function generateOfferSheetDocx(deal: any, options?: { aiPolish?: boolean }): Promise<Buffer> {
  const data = generateOfferSheet(deal);
  let polishedText: string | undefined;

  if (options?.aiPolish) {
    const rawText = offerSheetToText(data);
    polishedText = await polishWithAI(rawText, 'offer_sheet');
    // If polish returned same text, don't use it (fallback)
    if (polishedText === rawText) polishedText = undefined;
  }

  const doc = buildOfferSheetDocx(data, polishedText);
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateLongFormDocx(deal: any, options?: { aiPolish?: boolean }): Promise<Buffer> {
  const data = generateLongForm(deal);
  let polishedText: string | undefined;

  if (options?.aiPolish) {
    const rawText = longFormToText(data);
    polishedText = await polishWithAI(rawText, 'long_form');
    if (polishedText === rawText) polishedText = undefined;
  }

  const doc = buildLongFormDocx(data, polishedText);
  return Buffer.from(await Packer.toBuffer(doc));
}
