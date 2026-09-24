import sharp from 'sharp';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';

// Configuration for Certificate Layout (adjust these according to the actual clean template image)
const CERTIFICATE_LAYOUT = {
  width: 1600,
  height: 1200,
  studentName: { x: 800, y: 555, fontSize: 52, fill: '#D9A441', fontFamily: 'Georgia, serif' },
  courseName:  { x: 800, y: 745, fontSize: 42, fill: '#D9A441', fontFamily: 'Georgia, serif' },
  courseDate:  { x: 800, y: 805, fontSize: 24, fill: '#FFFFFF', fontFamily: 'Georgia, serif' },
  issueDate:   { x: 100, y: 1030, fontSize: 18, fill: '#FFFFFF', fontFamily: 'Georgia, serif' },
  certNumber:  { x: 100, y: 1070, fontSize: 18, fill: '#FFFFFF', fontFamily: 'Georgia, serif' },
  qrCode:      { x: 1350, y: 950, size: 150 } // Position for the QR code
};

const escapeXml = (unsafe: string) => {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
};

export async function generateCertificateFiles(data: {
  studentName: string;
  courseName: string;
  startDate: string;
  endDate: string;
  durationHours: number;
  issueDate: string;
  certificateNumber: string;
}) {
  try {
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'kq-academy-certificate.png');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Certificate template not found at ${templatePath}. Please upload the clean template.`);
    }

    const { width, height, studentName, courseName, courseDate, issueDate, certNumber, qrCode } = CERTIFICATE_LAYOUT;

    // Generate SVG for text overlay
    const svg = `
      <svg width="${width}" height="${height}">
        <!-- Student Name -->
        <text x="${studentName.x}" y="${studentName.y}" text-anchor="middle" font-family="${studentName.fontFamily}" font-size="${studentName.fontSize}" font-weight="bold" fill="${studentName.fill}">
          ${escapeXml(data.studentName.toUpperCase())}
        </text>

        <!-- Course Name -->
        <text x="${courseName.x}" y="${courseName.y}" text-anchor="middle" font-family="${courseName.fontFamily}" font-size="${courseName.fontSize}" font-weight="bold" fill="${courseName.fill}">
          ${escapeXml(data.courseName.toUpperCase())}
        </text>

        <!-- Course Date -->
        <text x="${courseDate.x}" y="${courseDate.y}" text-anchor="middle" font-family="${courseDate.fontFamily}" font-size="${courseDate.fontSize}" fill="${courseDate.fill}">
          Course Date: ${escapeXml(data.startDate)} - ${escapeXml(data.endDate)} (${data.durationHours} Hours)
        </text>

        <!-- Issue Date -->
        <text x="${issueDate.x}" y="${issueDate.y}" font-family="${issueDate.fontFamily}" font-size="${issueDate.fontSize}" fill="${issueDate.fill}">
          Date of Issued: ${escapeXml(data.issueDate)}
        </text>

        <!-- Certificate Number -->
        <text x="${certNumber.x}" y="${certNumber.y}" font-family="${certNumber.fontFamily}" font-size="${certNumber.fontSize}" fill="${certNumber.fill}">
          Certificate No. ${escapeXml(data.certificateNumber)}
        </text>
      </svg>
    `;

    // Generate QR Code
    const verificationUrl = \`https://kqacademy.com/verify/\${data.certificateNumber}\`;
    const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: qrCode.size,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Create directories
    const year = data.certificateNumber.substring(2, 6);
    const relativeDir = path.join('certificates', year, data.certificateNumber);
    const outputDir = path.join(process.cwd(), 'public', relativeDir);
    await mkdir(outputDir, { recursive: true });

    const pngPath = path.join(outputDir, 'certificate.png');
    const pdfPath = path.join(outputDir, 'certificate.pdf');

    // 1. Generate PNG using Sharp
    const pngBuffer = await sharp(templatePath)
      .composite([
        { input: Buffer.from(svg), top: 0, left: 0 },
        { input: qrCodeBuffer, top: qrCode.y, left: qrCode.x }
      ])
      .png()
      .toBuffer();

    fs.writeFileSync(pngPath, pngBuffer);

    // 2. Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedPng(pngBuffer);
    
    // Create a page with the same dimensions as the image
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(pdfPath, pdfBytes);

    return {
      pngUrl: \`/\${relativeDir.replace(/\\\\/g, '/')}/certificate.png\`,
      pdfUrl: \`/\${relativeDir.replace(/\\\\/g, '/')}/certificate.pdf\`
    };

  } catch (error) {
    console.error("Certificate Generation Error:", error);
    throw error;
  }
}
