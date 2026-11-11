import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { OfferInput } from '../../shared/types.js';

export const ANCHORS = {
  candidateSign: '/cand_sign/',
  candidateDate: '/cand_date/',
  candidateMobile: '/cand_mobile/',
  managerSign: '/mgr_sign/',
  managerDate: '/mgr_date/',
};

const peso = (amount: number) => `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export async function offerLetterPdf(offer: OfferInput): Promise<string> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 720;

  const line = (text: string, { size = 11, gap = 18, f = font } = {}) => {
    page.drawText(text, { x: 72, y, size, font: f, color: rgb(0.05, 0.05, 0.13) });
    y -= gap;
  };
  // Anchors are white so they stay findable in the text layer but invisible on the page.
  const anchor = (text: string, x: number) => page.drawText(text, { x, y, size: 6, font, color: rgb(1, 1, 1) });

  line('Offer of employment', { size: 20, gap: 36, f: bold });
  line(`Dear ${offer.candidateName},`, { gap: 24 });
  line(`We are pleased to offer you the position of ${offer.jobTitle}, starting ${offer.startDate},`);
  line(`with a monthly salary of ${peso(offer.salary)}.`, { gap: 24 });
  line('Please sign below to accept this offer and enter a mobile number we can reach you on.', { gap: 60 });

  const signatureBlock = (title: string, name: string, sign: string, date: string) => {
    line(title, { f: bold, gap: 14 });
    anchor(sign, 72);
    anchor(date, 330);
    y -= 76;
    line(name, { size: 10, gap: 22 });
  };

  signatureBlock('Candidate', offer.candidateName, ANCHORS.candidateSign, ANCHORS.candidateDate);
  line('Mobile number:', { size: 10, gap: 0 });
  anchor(ANCHORS.candidateMobile, 160);
  y -= 60;
  signatureBlock('Hiring manager', offer.managerName, ANCHORS.managerSign, ANCHORS.managerDate);

  return Buffer.from(await pdf.save()).toString('base64');
}
