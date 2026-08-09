// Hands a captured photo from the dashboard's camera button to the Scan screen,
// so tapping the camera opens it immediately (the file dialog runs inside the
// tap gesture) and the Scan page just processes the result.
let _file = null
export const setPendingScan = (f) => { _file = f }
export const takePendingScan = () => {
  const f = _file
  _file = null
  return f
}

// A scanned photo waiting to be filed against an expense that hasn't been
// created yet — set when you send a scan to the Add screen to adjust it, so the
// receipt still gets stored once that screen saves.
let _receipt = null
export const setPendingReceipt = (f) => { _receipt = f }
export const takePendingReceipt = () => {
  const f = _receipt
  _receipt = null
  return f
}
