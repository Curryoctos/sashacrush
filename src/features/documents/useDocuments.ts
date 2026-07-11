import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notifyDocumentSent, notifyDocumentSigned } from '@/features/documents/notify'
import {
  hashSignedDocument,
  mimeTypeFromPath,
  signDocumentBytes,
} from '@/features/documents/signing'
import {
  assertCanSignDocument,
  canSendForSigning,
  validateFileSize,
  validateFileType,
} from '@/features/documents/validation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'
import {
  DOCUMENT_BUCKET,
  FILE_SIZE_ERROR,
  FILE_TYPE_ERROR,
  UPLOAD_FAILED_ERROR,
} from '@/types/documents'

const DOCUMENT_COLUMNS =
  'id, land_id, uploader_id, assigned_to, signed_by, file_path, title, status, signature_hash, signed_at, created_at'

function mapDocument(row: Document): Document {
  return row
}

export function useDocuments(landId: string | null) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const documentsQuery = useQuery({
    queryKey: ['documents', landId, user?.role, user?.id],
    enabled: Boolean(landId && user),
    queryFn: async (): Promise<Document[]> => {
      let query = supabase
        .from('documents')
        .select(DOCUMENT_COLUMNS)
        .eq('land_id', landId!)
        .order('created_at', { ascending: false })

      if (user?.role === 'seller') {
        query = query.eq('assigned_to', user.id)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      return (data ?? []).map(mapDocument)
    },
  })

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents', landId] })
  }, [queryClient, landId])

  const fetchDocuments = useCallback(
    async (targetLandId: string): Promise<Document[]> => {
      let query = supabase
        .from('documents')
        .select(DOCUMENT_COLUMNS)
        .eq('land_id', targetLandId)
        .order('created_at', { ascending: false })

      if (user?.role === 'seller') {
        query = query.eq('assigned_to', user.id)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      return (data ?? []).map(mapDocument)
    },
    [user?.id, user?.role],
  )

  const uploadDocument = useCallback(
    async (
      file: File,
      targetLandId: string,
      onProgress?: (percent: number) => void,
    ): Promise<Document> => {
      setActionError(null)

      if (!validateFileType(file.type)) {
        throw new Error(FILE_TYPE_ERROR)
      }

      if (!validateFileSize(file.size)) {
        throw new Error(FILE_SIZE_ERROR)
      }

      if (!user) {
        throw new Error('You must be signed in to upload documents.')
      }

      onProgress?.(10)

      const objectId = crypto.randomUUID()
      const storagePath = `${targetLandId}/${objectId}-${file.name}`

      onProgress?.(35)

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(UPLOAD_FAILED_ERROR)
      }

      onProgress?.(75)

      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          land_id: targetLandId,
          uploader_id: user.id,
          file_path: storagePath,
          title: file.name,
          status: 'draft',
        })
        .select(DOCUMENT_COLUMNS)
        .single()

      if (insertError || !data) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath])
        throw new Error(UPLOAD_FAILED_ERROR)
      }

      onProgress?.(100)
      await refresh()
      return mapDocument(data as Document)
    },
    [refresh, user],
  )

  const sendForSigning = useCallback(
    async (documentId: string, sellerId: string): Promise<Document> => {
      setActionError(null)

      const { data: existing, error: fetchError } = await supabase
        .from('documents')
        .select(`${DOCUMENT_COLUMNS}, land_id`)
        .eq('id', documentId)
        .single()

      if (fetchError || !existing) {
        throw new Error('Document not found.')
      }

      const doc = mapDocument(existing as Document)

      if (doc.status !== 'draft') {
        throw new Error('Only draft documents can be sent for signing.')
      }

      if (doc.file_path && !canSendForSigning(mimeTypeFromPath(doc.file_path))) {
        throw new Error(
          'Only PDF, PNG, and JPG documents can be sent for signing. Convert DOCX to PDF first.',
        )
      }

      const { data: land, error: landError } = await supabase
        .from('land_records')
        .select('seller_id')
        .eq('id', doc.land_id)
        .single()

      if (landError || !land?.seller_id) {
        throw new Error('This land record has no seller assigned.')
      }

      if (land.seller_id !== sellerId) {
        throw new Error('Selected seller does not match the land record owner.')
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          status: 'sent',
          assigned_to: sellerId,
        })
        .eq('id', documentId)
        .select(DOCUMENT_COLUMNS)
        .single()

      if (error || !data) {
        throw new Error('Could not send document for signing.')
      }

      try {
        await notifyDocumentSent(documentId, sellerId)
      } catch (notificationError) {
        await supabase
          .from('documents')
          .update({ status: 'draft', assigned_to: null })
          .eq('id', documentId)

        const detail =
          notificationError instanceof Error
            ? notificationError.message
            : 'unknown error'
        throw new Error(`Could not notify seller: ${detail}`)
      }

      await refresh()
      return mapDocument(data as Document)
    },
    [refresh],
  )

  const signDocument = useCallback(
    async (documentId: string): Promise<Document> => {
      setActionError(null)

      if (!user) {
        throw new Error('You must be signed in to sign documents.')
      }

      const { data: existing, error: fetchError } = await supabase
        .from('documents')
        .select(DOCUMENT_COLUMNS)
        .eq('id', documentId)
        .single()

      if (fetchError || !existing) {
        throw new Error('Document not found.')
      }

      const doc = mapDocument(existing as Document)
      assertCanSignDocument(doc.status)

      if (doc.status !== 'sent') {
        throw new Error('Only documents awaiting signature can be signed.')
      }

      if (doc.assigned_to !== user.id) {
        throw new Error('You are not assigned to sign this document.')
      }

      if (!doc.file_path) {
        throw new Error('Document file is missing.')
      }

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .download(doc.file_path)

      if (downloadError || !fileBlob) {
        throw new Error('Could not download document for signing.')
      }

      const originalBytes = new Uint8Array(await fileBlob.arrayBuffer())
      const mimeType = mimeTypeFromPath(doc.file_path)

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      const signerName = profile?.full_name ?? profile?.email ?? user.email

      const signedBytes = await signDocumentBytes(
        originalBytes,
        mimeType,
        signerName,
        documentId,
      )

      const signatureHash = await hashSignedDocument(signedBytes)

      const signedFile = new File([new Uint8Array(signedBytes)], doc.title ?? 'signed-document.pdf', {
        type: 'application/pdf',
      })

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(doc.file_path, signedFile, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) {
        throw new Error('Could not save signed document.')
      }

      const signedAt = new Date().toISOString()

      const { data: updated, error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'signed',
          signature_hash: signatureHash,
          signed_at: signedAt,
          signed_by: user.id,
        })
        .eq('id', documentId)
        .select(DOCUMENT_COLUMNS)
        .single()

      if (updateError || !updated) {
        throw new Error('Could not update signed document record.')
      }

      void notifyDocumentSigned(documentId)

      await refresh()
      return mapDocument(updated as Document)
    },
    [refresh, user],
  )

  const downloadDocument = useCallback(async (document: Document) => {
    if (!document.file_path) {
      throw new Error('Document file is missing.')
    }

    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(document.file_path, 3600)

    if (error || !data?.signedUrl) {
      throw new Error('Could not create download link.')
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }, [])

  const getPreviewUrl = useCallback(async (document: Document): Promise<string> => {
    if (!document.file_path) {
      throw new Error('Document file is missing.')
    }

    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(document.file_path, 3600)

    if (error || !data?.signedUrl) {
      throw new Error('Could not create preview link.')
    }

    return data.signedUrl
  }, [])

  return {
    documents: documentsQuery.data ?? [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error ?? actionError,
    fetchDocuments,
    uploadDocument,
    sendForSigning,
    signDocument,
    downloadDocument,
    getPreviewUrl,
    refresh,
    setActionError,
  }
}
