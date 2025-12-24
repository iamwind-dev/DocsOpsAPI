/**
 * PDF Utilities Module
 * 
 * Cung cấp các chức năng xử lý PDF sử dụng pdf-lib:
 * - Add watermark
 * - Apply signature image
 * - Extract metadata
 * - Generate thumbnail (placeholder)
 * - Merge/Split PDF
 * 
 * KHÔNG ảnh hưởng đến code hiện tại - module độc lập
 */

const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const crypto = require('crypto');

/**
 * Add watermark to PDF
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} text - Watermark text
 * @param {'pending'|'completed'|'draft'} type - Watermark type
 * @returns {Promise<Buffer>} - Watermarked PDF buffer
 */
const addWatermark = async (pdfBuffer, text, type = 'pending') => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Define colors based on type
  const colors = {
    pending: rgb(1, 0.8, 0), // Yellow/Orange
    completed: rgb(0, 0.6, 0), // Green
    draft: rgb(0.5, 0.5, 0.5), // Gray
  };

  const color = colors[type] || colors.pending;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = 60;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // Draw diagonal watermark
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color,
      opacity: 0.3,
      rotate: degrees(-45),
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
};

/**
 * Remove watermark by recreating PDF (simplified approach)
 * Note: This only works for watermarks we added via pdf-lib
 * @param {Buffer} pdfBuffer - Original PDF buffer (before watermark)
 * @returns {Promise<Buffer>}
 */
const removeWatermark = async (originalPdfBuffer) => {
  // Simply return the original - actual watermark removal requires original
  return originalPdfBuffer;
};

/**
 * Apply signature image to PDF at specific position
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {Buffer|string} signatureImage - Signature image (PNG buffer or base64)
 * @param {Object} position - Position config
 * @param {number} position.page - Page number (1-indexed)
 * @param {number} position.x - X coordinate
 * @param {number} position.y - Y coordinate
 * @param {number} position.width - Width of signature
 * @param {number} position.height - Height of signature
 * @returns {Promise<Buffer>} - Signed PDF buffer
 */
const applySignatureImage = async (pdfBuffer, signatureImage, position) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  
  // Validate page number
  const pageIndex = (position.page || 1) - 1;
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(`Invalid page number: ${position.page}. PDF has ${pages.length} pages.`);
  }

  const page = pages[pageIndex];

  // Convert base64 to buffer if needed
  let imageBuffer = signatureImage;
  if (typeof signatureImage === 'string') {
    // Remove data URL prefix if present
    const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  }

  // Embed image (supports PNG)
  let image;
  try {
    image = await pdfDoc.embedPng(imageBuffer);
  } catch (e) {
    // Try JPEG if PNG fails
    image = await pdfDoc.embedJpg(imageBuffer);
  }

  // Draw signature image
  const { width, height } = page.getSize();
  const sigWidth = position.width || 150;
  const sigHeight = position.height || 50;

  page.drawImage(image, {
    x: position.x || 100,
    y: height - (position.y || 100) - sigHeight, // PDF origin is bottom-left
    width: sigWidth,
    height: sigHeight,
  });

  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
};

/**
 * Apply text signature with metadata
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {Object} signatureData - Signature data
 * @param {string} signatureData.name - Signer name
 * @param {string} signatureData.email - Signer email
 * @param {Date} signatureData.signedAt - Signing timestamp
 * @param {Object} position - Position config
 * @returns {Promise<Buffer>}
 */
const applyTextSignature = async (pdfBuffer, signatureData, position) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  
  const pageIndex = (position.page || 1) - 1;
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(`Invalid page number: ${position.page}`);
  }

  const page = pages[pageIndex];
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const x = position.x || 100;
  const y = height - (position.y || 100);

  // Draw signature box
  page.drawRectangle({
    x: x - 5,
    y: y - 45,
    width: position.width || 200,
    height: 50,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Draw signer name
  page.drawText(signatureData.name || 'Unknown', {
    x,
    y: y - 15,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Draw timestamp
  const timestamp = signatureData.signedAt 
    ? new Date(signatureData.signedAt).toLocaleString()
    : new Date().toLocaleString();
  
  page.drawText(`Signed: ${timestamp}`, {
    x,
    y: y - 30,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Draw email
  page.drawText(signatureData.email || '', {
    x,
    y: y - 40,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
};

/**
 * Extract PDF metadata
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} - Metadata object
 */
const extractMetadata = async (pdfBuffer) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  const pageInfo = pages.map((page, index) => {
    const { width, height } = page.getSize();
    return { page: index + 1, width, height };
  });

  return {
    pageCount: pages.length,
    title: pdfDoc.getTitle() || null,
    author: pdfDoc.getAuthor() || null,
    subject: pdfDoc.getSubject() || null,
    creator: pdfDoc.getCreator() || null,
    producer: pdfDoc.getProducer() || null,
    creationDate: pdfDoc.getCreationDate() || null,
    modificationDate: pdfDoc.getModificationDate() || null,
    pages: pageInfo,
    fileSizeBytes: pdfBuffer.length,
  };
};

/**
 * Merge multiple PDFs into one
 * @param {Buffer[]} pdfBuffers - Array of PDF buffers
 * @returns {Promise<Buffer>} - Merged PDF buffer
 */
const mergePdfs = async (pdfBuffers) => {
  const mergedPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfBuffers) {
    const pdf = await PDFDocument.load(pdfBuffer);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  return Buffer.from(mergedPdfBytes);
};

/**
 * Split PDF by page ranges
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {Array<{start: number, end: number}>} ranges - Page ranges (1-indexed)
 * @returns {Promise<Buffer[]>} - Array of PDF buffers
 */
const splitPdf = async (pdfBuffer, ranges) => {
  const sourcePdf = await PDFDocument.load(pdfBuffer);
  const totalPages = sourcePdf.getPageCount();
  const result = [];

  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const startIndex = Math.max(0, (range.start || 1) - 1);
    const endIndex = Math.min(totalPages - 1, (range.end || totalPages) - 1);
    
    const pageIndices = [];
    for (let i = startIndex; i <= endIndex; i++) {
      pageIndices.push(i);
    }

    const pages = await newPdf.copyPages(sourcePdf, pageIndices);
    pages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    result.push(Buffer.from(pdfBytes));
  }

  return result;
};

/**
 * Generate document hash for integrity verification
 * @param {Buffer} pdfBuffer - PDF buffer
 * @returns {string} - SHA256 hash
 */
const generateDocumentHash = (pdfBuffer) => {
  return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
};

/**
 * Generate a simple Certificate of Completion PDF
 * @param {Object} data - Certificate data
 * @returns {Promise<Buffer>} - Certificate PDF buffer
 */
const generateCertificate = async (data) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // Title
  page.drawText('CERTIFICATE OF COMPLETION', {
    x: 50,
    y: height - 80,
    size: 24,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.5),
  });

  // Document info
  let y = height - 140;
  
  page.drawText('Document:', { x: 50, y, size: 12, font: boldFont });
  page.drawText(data.documentTitle || 'Unknown', { x: 150, y, size: 12, font });
  y -= 25;

  page.drawText('Document ID:', { x: 50, y, size: 10, font: boldFont });
  page.drawText(data.documentId || 'N/A', { x: 150, y, size: 10, font });
  y -= 25;

  page.drawText('Request ID:', { x: 50, y, size: 10, font: boldFont });
  page.drawText(data.requestId || 'N/A', { x: 150, y, size: 10, font });
  y -= 40;

  // Signers section
  page.drawText('SIGNERS', { x: 50, y, size: 14, font: boldFont });
  y -= 25;

  if (data.signers && Array.isArray(data.signers)) {
    for (const signer of data.signers) {
      page.drawText(`• ${signer.name || signer.email}`, { x: 60, y, size: 11, font: boldFont });
      y -= 18;
      page.drawText(`  Email: ${signer.email}`, { x: 70, y, size: 9, font });
      y -= 15;
      page.drawText(`  Signed at: ${signer.signedAt || 'N/A'}`, { x: 70, y, size: 9, font });
      y -= 15;
      if (signer.ip) {
        page.drawText(`  IP Address: ${signer.ip}`, { x: 70, y, size: 9, font });
        y -= 15;
      }
      y -= 10;
    }
  }

  y -= 20;

  // Completion info
  page.drawText('COMPLETION DETAILS', { x: 50, y, size: 14, font: boldFont });
  y -= 25;

  page.drawText(`Completed at: ${data.completedAt || new Date().toISOString()}`, { x: 60, y, size: 10, font });
  y -= 20;

  if (data.documentHash) {
    page.drawText(`Document Hash: ${data.documentHash}`, { x: 60, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 15;
  }

  // Footer
  page.drawText('This certificate was automatically generated by DocsOps E-Signature System', {
    x: 50,
    y: 50,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Generated: ${new Date().toISOString()}`, {
    x: 50,
    y: 35,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

/**
 * Get page count from PDF
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<number>}
 */
const getPageCount = async (pdfBuffer) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  return pdfDoc.getPageCount();
};

module.exports = {
  addWatermark,
  removeWatermark,
  applySignatureImage,
  applyTextSignature,
  extractMetadata,
  mergePdfs,
  splitPdf,
  generateDocumentHash,
  generateCertificate,
  getPageCount,
};
