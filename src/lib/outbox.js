// Writes that couldn't reach the server yet.
//
// Every hook in this app talks to Supabase directly and assumes the network is
// there, so logging an expense on the metro simply lost it. This is the queue
// that stops that: a failed write is parked in IndexedDB and replayed when the
// connection comes back.
//
// IndexedDB rather than localStorage because localStorage is synchronous (it
// blocks the main thread on every write, which is felt on a phone), capped
// around 5MB, and stores strings only — so every read would be a JSON.parse of
// the entire queue. IndexedDB is none of those things.

const DB = 'duo-budget-outbox'
const STORE = 'pending'
let dbPromise = null

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    const out = fn(store)
    t.oncomplete = () => resolve(out?.result ?? out)
    t.onerror = () => reject(t.error)
  })
}

// One queued write. `table` and `payload` are all a replay needs — deliberately
// plain data, because anything holding a function or a Supabase client
// reference could not survive being written to disk and read back tomorrow.
export async function enqueue({ table, op = 'insert', payload, match = null }) {
  return tx('readwrite', (s) => s.add({ table, op, payload, match, queuedAt: Date.now() }))
}

export async function pending() {
  return tx('readonly', (s) => s.getAll())
}

export async function remove(id) {
  return tx('readwrite', (s) => s.delete(id))
}

export async function count() {
  return tx('readonly', (s) => s.count())
}

// Replays everything in order. Stops at the first failure that looks like a
// network problem, so the queue keeps its order and nothing is lost; a write
// the server actively rejects (a validation error, a row that no longer
// exists) is dropped instead, because retrying it forever would block every
// item behind it in the queue.
export async function flush(supabase) {
  const rows = await pending()
  let sent = 0
  for (const row of rows.sort((a, b) => a.queuedAt - b.queuedAt)) {
    try {
      let error
      if (row.op === 'insert') {
        ;({ error } = await supabase.from(row.table).insert(row.payload))
      } else if (row.op === 'update') {
        ;({ error } = await supabase.from(row.table).update(row.payload).match(row.match))
      } else if (row.op === 'delete') {
        ;({ error } = await supabase.from(row.table).delete().match(row.match))
      }
      if (error) {
        // PostgREST answered, so we're online — the row itself is the problem.
        // Keeping it would stall the whole queue behind something that will
        // never succeed.
        console.error('outbox: server rejected a queued write, dropping it', row.table, error)
        await remove(row.id)
        continue
      }
      await remove(row.id)
      sent++
    } catch {
      // Threw rather than answering: still offline. Leave this row and
      // everything after it for the next attempt.
      break
    }
  }
  return sent
}

// Wraps one Supabase write so a lost connection queues it instead of dropping
// it. `run` performs the write; `spec` is what to replay if the request never
// reached the server.
//
// The distinction that matters: a request that *throws* never got an answer,
// so it's a network problem and belongs in the queue. A request that returns
// an `error` was answered and refused — queueing that would replay a rejection
// forever, so it's handed straight back to the caller.
export async function withOutbox(run, spec) {
  try {
    return await run()
  } catch {
    await enqueue(spec)
    window.dispatchEvent(new Event('outbox-changed'))
    return { data: null, error: null, queued: true }
  }
}
