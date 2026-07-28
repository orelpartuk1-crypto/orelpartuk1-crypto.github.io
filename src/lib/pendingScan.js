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
