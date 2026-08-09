import { supabase } from './supabase'

const BUCKET = 'receipts'

// Shrink the photo before storing it. This copy exists so you can look back and
// remember what a expense actually was, not for archival quality — the full
// resolution original still goes to Dropbox untouched via the share sheet.
async function compressToBlob(file, maxW = 1400, quality = 0.72) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = URL.createObjectURL(file)
  })
  const scale = Math.min(1, maxW / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(img.src)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// Store the picture for an expense that already exists (we need its id for the
// path, because the storage policies read the expense id out of the folder name
// to decide who is allowed to see the image).
export async function uploadReceipt(expenseId, file) {
  if (!expenseId || !file) return { path: null, error: null }
  try {
    const blob = await compressToBlob(file)
    if (!blob) return { path: null, error: new Error('Could not read that image') }
    const path = `${expenseId}/receipt.jpg`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) return { path: null, error }
    const { error: linkErr } = await supabase.from('expenses').update({ receipt_path: path }).eq('id', expenseId)
    return { path, error: linkErr || null }
  } catch (e) {
    return { path: null, error: e }
  }
}

// Signed URLs expire, so cache them only for as long as they stay valid —
// re-signing on every render would fire a request per thumbnail.
const TTL_SECONDS = 3600
const cache = new Map() // path -> { url, expires }

export async function receiptUrl(path) {
  if (!path) return null
  const hit = cache.get(path)
  if (hit && hit.expires > Date.now()) return hit.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS)
  if (error || !data?.signedUrl) return null
  // Expire our copy a minute early so we never hand out a URL mid-expiry.
  cache.set(path, { url: data.signedUrl, expires: Date.now() + (TTL_SECONDS - 60) * 1000 })
  return data.signedUrl
}
