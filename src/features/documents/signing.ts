import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { computeSHA256 } from '@/lib/crypto'

function signatureLines(signerName: string, documentId: string): string[] {
  return [
    `Signed by: ${signerName}`,
    `Date: ${new Date().toISOString()}`,
    `Document ID: ${documentId}`,
  ]
}

async function appendSignaturePage(
  pdfDoc: PDFDocument,
  signerName: string,
  documentId: string,
): Promise<Uint8Array> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page = pdfDoc.addPage([612, 792])
  const lines = signatureLines(signerName, documentId)

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 720 - index * 18,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
  })

  return pdfDoc.save()
}

export async function signDocumentBytes(
  originalBytes: Uint8Array,
  mimeType: string,
  signerName: string,
  documentId: string,
): Promise<Uint8Array> {
  if (mimeType === 'application/pdf') {
    const pdfDoc = await PDFDocument.load(originalBytes)
    const pages = pdfDoc.getPages()
    const page = pages[pages.length - 1] ?? pdfDoc.addPage([612, 792])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const lines = signatureLines(signerName, documentId)

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: 50,
        y: 80 - index * 16,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
    })

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
    const width = image.width * scale
    const height = image.height * scale

    page.drawImage(image, {
      x: 50,
      y: 500,
      width,
      height,
    })

    return appendSignaturePage(pdfDoc, signerName, documentId)
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
