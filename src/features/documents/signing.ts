import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { computeSHA256 } from '@/lib/crypto'

export interface HandSignature {
  pngBytes: Uint8Array
}

function formatDocumentId(documentId: string): string {
  const id = documentId.trim()
  if (id.length <= 20) {
    return id
  }
  return `${id.slice(0, 8)}…${id.slice(-6)}`
}

function metadataLines(signerName: string, documentId: string): string[] {
  return [
    `Signed by: ${signerName}`,
    `Date: ${new Date().toISOString()}`,
    `Document ID: ${formatDocumentId(documentId)}`,
  ]
}

function fitText(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text
  }

  const ellipsis = '…'
  let low = 0
  let high = text.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    const candidate = `${text.slice(0, mid)}${ellipsis}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      low = mid
    } else {
      high = mid - 1
    }
  }

  return low > 0 ? `${text.slice(0, low)}${ellipsis}` : ellipsis
}

async function stampSignatureBlock(
  pdfDoc: PDFDocument,
  page: PDFPage,
  signerName: string,
  documentId: string,
  handSignature?: HandSignature | null,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { width } = page.getSize()

  const boxWidth = Math.min(320, width - 72)
  const boxX = 50
  const boxBottom = 36
  const paddingX = 12
  const paddingTop = 14
  const paddingBottom = 10
  const titleSize = 7
  const metaSize = 8
  const metaLineGap = 11
  const titleGap = 10
  const imageGap = 8
  const dividerGap = 8
  const contentWidth = boxWidth - paddingX * 2

  const lines = metadataLines(signerName, documentId).map((line) =>
    fitText(font, line, metaSize, contentWidth),
  )
  const metaBlockHeight = lines.length * metaLineGap

  let imageDrawWidth = 0
  let imageDrawHeight = 0
  let embeddedImage: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null

  if (handSignature?.pngBytes.length) {
    embeddedImage = await pdfDoc.embedPng(handSignature.pngBytes)
    const maxImageWidth = contentWidth
    const maxImageHeight = 44
    const scale = Math.min(
      maxImageWidth / embeddedImage.width,
      maxImageHeight / embeddedImage.height,
      1,
    )
    imageDrawWidth = embeddedImage.width * scale
    imageDrawHeight = embeddedImage.height * scale
  }

  const imageBlock =
    embeddedImage && imageDrawHeight > 0
      ? imageDrawHeight + imageGap + 1 + dividerGap
      : 0

  const boxHeight =
    paddingTop +
    titleSize +
    titleGap +
    imageBlock +
    metaBlockHeight +
    paddingBottom

  page.drawRectangle({
    x: boxX,
    y: boxBottom,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.75, 0.8, 0.76),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  })

  let cursorY = boxBottom + boxHeight - paddingTop - titleSize

  page.drawText('AUTHORIZED SIGNATURE', {
    x: boxX + paddingX,
    y: cursorY,
    size: titleSize,
    font: bold,
    color: rgb(0.36, 0.42, 0.38),
  })

  cursorY -= titleGap

  if (embeddedImage && imageDrawHeight > 0) {
    cursorY -= imageDrawHeight
    page.drawImage(embeddedImage, {
      x: boxX + paddingX,
      y: cursorY,
      width: imageDrawWidth,
      height: imageDrawHeight,
    })
    cursorY -= imageGap
    page.drawLine({
      start: { x: boxX + paddingX, y: cursorY },
      end: { x: boxX + boxWidth - paddingX, y: cursorY },
      thickness: 0.6,
      color: rgb(0.72, 0.76, 0.73),
    })
    cursorY -= dividerGap
  }

  lines.forEach((line, index) => {
    const lineY = cursorY - index * metaLineGap
    page.drawText(line, {
      x: boxX + paddingX,
      y: lineY,
      size: metaSize,
      font,
      color: rgb(0.18, 0.22, 0.19),
      maxWidth: contentWidth,
    })
  })
}

async function appendSignaturePage(
  pdfDoc: PDFDocument,
  signerName: string,
  documentId: string,
  handSignature?: HandSignature | null,
): Promise<Uint8Array> {
  const page = pdfDoc.addPage([612, 792])
  await stampSignatureBlock(pdfDoc, page, signerName, documentId, handSignature)
  return pdfDoc.save()
}

export async function signDocumentBytes(
  originalBytes: Uint8Array,
  mimeType: string,
  signerName: string,
  documentId: string,
  handSignature?: HandSignature | null,
): Promise<Uint8Array> {
  if (mimeType === 'application/pdf') {
    const pdfDoc = await PDFDocument.load(originalBytes)
    const pages = pdfDoc.getPages()
    const page = pages[pages.length - 1] ?? pdfDoc.addPage([612, 792])
    await stampSignatureBlock(pdfDoc, page, signerName, documentId, handSignature)
    return pdfDoc.save()
  }

  if (mimeType === 'image/png' || mimeType === 'image/jpeg') {
    const pdfDoc = await PDFDocument.create()
    const image =
      mimeType === 'image/png'
        ? await pdfDoc.embedPng(originalBytes)
        : await pdfDoc.embedJpg(originalBytes)

    const page = pdfDoc.addPage([612, 792])
    const maxWidth = 500
    const scale = Math.min(1, maxWidth / image.width)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale

    page.drawImage(image, {
      x: 50,
      y: 500,
      width: drawWidth,
      height: drawHeight,
    })

    return appendSignaturePage(pdfDoc, signerName, documentId, handSignature)
  }

  throw new Error('Only PDF, PNG, and JPG documents can be signed electronically.')
}

export async function hashSignedDocument(bytes: Uint8Array): Promise<string> {
  return computeSHA256(bytes)
}

export function mimeTypeFromPath(filePath: string): string {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return 'application/octet-stream'
}
