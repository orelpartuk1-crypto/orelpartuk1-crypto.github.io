// Client helper: compress the photo, send it to our OCR function, get text back.

// Downscale + JPEG-compress so we stay under OCR.space's size limit and upload fast.
async function compressToDataURL(file, maxW = 1600, quality = 0.7) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

// Returns recognized text, or throws if the cloud OCR is unavailable.
export async function cloudScan(file) {
  const dataUrl = await compressToDataURL(file)
  const res = await fetch('https://bckxqcyyvhxlcfbyvgzl.supabase.co/functions/v1/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl, language: 'spa' }),
  })
  if (!res.ok) throw new Error('cloud OCR unavailable')
  const j = await res.json()
  if (j.error) throw new Error(j.error)
  if (!j.text || !j.text.trim()) throw new Error('empty result')
  return j.text
}
