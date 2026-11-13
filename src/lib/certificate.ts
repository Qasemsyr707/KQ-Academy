import sharp from 'sharp';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

// Positions measured on the template (public/templates/kq-academy-certificate-v2.png,
// 1023 x 1080: the original artwork without the location line, the old domain and
// the empty duration brackets, which are now drawn only when they have a value). `cx`/`cy` is the centre of the text, `maxWidth` the room it may use.
const LAYOUT = {
  studentName: { cx: 512, cy: 465, maxWidth: 370, size: 30, color: '#D9A441' },
  courseName:  { cx: 511, cy: 597, maxWidth: 310, size: 24, color: '#D9A441' },
  courseDate:  { cx: 525, cy: 652, maxWidth: 300, size: 15, color: '#FFFFFF' },
  duration:    { cx: 745, cy: 660, maxWidth: 90,  size: 14, color: '#FFFFFF' },
  website:     { cx: 512, cy: 1012, maxWidth: 220, size: 13, color: '#E8E2D4', spacing: 2 },
  issueDate:   { cx: 268, cy: 814, maxWidth: 150, size: 12, color: '#FFFFFF' },
  certNumber:  { cx: 268, cy: 839, maxWidth: 150, size: 12, color: '#FFFFFF' },
  qrCode:      { x: 60, y: 880, size: 84 },
} as const;

type TextSlot = { cx: number; cy: number; maxWidth: number; size: number; color: string; spacing?: number };

// The font ships with the application: the production image has no system
// fonts, which rendered every field as empty boxes. Amiri covers Arabic and
// Latin, and Pango shapes and orders right-to-left text correctly.
const FONT_FILE = path.join(process.cwd(), 'public', 'fonts', 'Amiri-Bold.ttf');
const FONT_FAMILY = 'Amiri';

const escapeMarkup = (value: string) => value.replace(/[<>&'"]/g, c => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string
));

/** Render one field, shrinking the font until it fits its slot. */
async function renderText(value: string, slot: TextSlot) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  for (let size = slot.size; size >= 9; size -= 1) {
    const image = sharp({
      text: {
        text: `<span foreground="${slot.color}"${slot.spacing ? ` letter_spacing="${slot.spacing * 1024}"` : ''}>${escapeMarkup(clean)}</span>`,
        font: `${FONT_FAMILY} Bold ${size}`,
        fontfile: FONT_FILE,
        rgba: true,
        dpi: 72,
      },
    });
    const { data, info } = await image.png().toBuffer({ resolveWithObject: true });
    if (info.width <= slot.maxWidth || size === 9) {
      return {
        input: data,
        left: Math.max(0, Math.round(slot.cx - info.width / 2)),
        top: Math.max(0, Math.round(slot.cy - info.height / 2)),
      };
    }
  }
  return null;
}

export async function generateCertificateBuffer(data: {
  studentName: string;
  courseName: string;
  startDate: string;
  endDate: string;
  /** Null when the course has no real duration: nothing is printed. */
  durationHours: number | null;
  issueDate: string;
  certificateNumber: string;
  /** Unguessable public reference encoded in the QR code. */
  verifyReference: string;
}): Promise<Buffer> {
  try {
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'kq-academy-certificate-v2.png');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Certificate template not found at ${templatePath}. Please upload the clean template.`);
    }
    if (!fs.existsSync(FONT_FILE)) throw new Error(`Certificate font not found at ${FONT_FILE}`);

    const texts = await Promise.all([
      renderText(data.studentName, LAYOUT.studentName),
      renderText(data.courseName, LAYOUT.courseName),
      renderText(`${data.startDate} - ${data.endDate}`, LAYOUT.courseDate),
      data.durationHours ? renderText(`( ${data.durationHours} h )`, LAYOUT.duration) : null,
      renderText('www.kqacademy.com', LAYOUT.website),
      renderText(data.issueDate, LAYOUT.issueDate),
      renderText(data.certificateNumber, LAYOUT.certNumber),
    ]);

    const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.kqacademy.com').replace(/\/+$/, '');
    const qrCodeBuffer = await QRCode.toBuffer(`${base}/verify/${data.verifyReference}`, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: LAYOUT.qrCode.size,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return await sharp(templatePath)
      .composite([
        ...texts.filter((text): text is NonNullable<typeof text> => text !== null),
        { input: qrCodeBuffer, top: LAYOUT.qrCode.y, left: LAYOUT.qrCode.x },
      ])
      .png()
      .toBuffer();
  } catch (error) {
    console.error('Certificate Generation Error:', error);
    throw error;
  }
}
