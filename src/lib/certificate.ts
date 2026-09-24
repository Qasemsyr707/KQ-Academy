import sharp from 'sharp';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { mkdir } from 'fs/promises';

// Configuration for Certificate Layout (adjust these according to the actual clean template image)
// Assuming template resolution is approximately 911x985 based on the provided image
const CERTIFICATE_LAYOUT = {
  width: 911,
  height: 985,
  // Name box is around y: 440
  studentName: { x: 455, y: 445, fontSize: 32, fill: '#D9A441', fontFamily: 'Georgia, serif' },
  // Course box is around y: 560
  courseName:  { x: 455, y: 560, fontSize: 26, fill: '#D9A441', fontFamily: 'Georgia, serif' },
  // Course Date line is around y: 615
  // Note: the template has "Course Date: ________ (  )" we will overlay our own text or fill the gaps
  courseDate:  { x: 455, y: 610, fontSize: 16, fill: '#FFFFFF', fontFamily: 'Georgia, serif' },
  // Issue date line is around y: 765
  issueDate:   { x: 180, y: 765, fontSize: 12, fill: '#FFFFFF', fontFamily: 'Georgia, serif' },
  // Cert No line is around y: 785
  certNumber:  { x: 180, y: 785, fontSize: 12, fill: '#FFFFFF', fontFamily: 'Georgia, serif' },
  // QR code bottom left
  qrCode:      { x: 50, y: 830, size: 80 } 
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

        <!-- Course Date (Positioned exactly on the line) -->
        <text x="${courseDate.x}" y="${courseDate.y}" text-anchor="middle" font-family="${courseDate.fontFamily}" font-size="${courseDate.fontSize}" fill="${courseDate.fill}">
          ${escapeXml(data.startDate)} - ${escapeXml(data.endDate)} (${data.durationHours} Hours)
        </text>

        <!-- Issue Date -->
        <text x="${issueDate.x}" y="${issueDate.y}" font-family="${issueDate.fontFamily}" font-size="${issueDate.fontSize}" fill="${issueDate.fill}">
          ${escapeXml(data.issueDate)}
        </text>

        <!-- Certificate Number -->
        <text x="${certNumber.x}" y="${certNumber.y}" font-family="${certNumber.fontFamily}" font-size="${certNumber.fontSize}" fill="${certNumber.fill}">
          ${escapeXml(data.certificateNumber)}
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
