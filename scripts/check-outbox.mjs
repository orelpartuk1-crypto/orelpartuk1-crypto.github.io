// Exercises the offline queue's decision-making against a fake server.
//
// The three rules that matter are easy to get subtly wrong and impossible to
// notice by hand (you'd have to fly on a plane to reproduce them):
//   1. a request that THROWS is a lost connection  -> keep it, stop there
//   2. a request the server REFUSES is a bad row   -> drop it, keep going
//   3. replay happens oldest-first
// Rule 1 stopping at the first failure is what preserves order; rule 2 is what
// stops one bad row blocking everything behind it forever.
// Run: npm run check:outbox

// --- the smallest IndexedDB that outbox.js can run on ----------------------
const store = new Map()
let autoId = 1
const req = (result) => {
  const r = { result, onsuccess: null, onerror: null }
  queueMicrotask(() => r.onsuccess && r.onsuccess())
  return r
}
globalThis.indexedDB = {
  open() {
    const db = {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => {},
      transaction() {
        const t = { oncomplete: null, onerror: null }
        queueMicrotask(() => t.oncomplete && t.oncomplete())
        return {
          objectStore: () => ({
            add(v) { const id = autoId++; store.set(id, { ...v, id }); return req(id) },
            getAll() { return req([...store.values()]) },
            delete(id) { store.delete(id); return req(undefined) },
            count() { return req(store.size) },
          }),
          get oncomplete() { return t.oncomplete }, set oncomplete(f) { t.oncomplete = f },
          get onerror() { return t.onerror }, set onerror(f) { t.onerror = f },
        }
      },
    }
    const r = { result: db, onsuccess: null, onerror: null, onupgradeneeded: null }
    queueMicrotask(() => r.onsuccess && r.onsuccess())
    return r
  },
}

const { enqueue, flush, pending, count } = await import('../src/lib/outbox.js')

let failures = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`)
}

// A stand-in Supabase whose behaviour per table we control.
const server = (behaviour) => {
  const seen = []
  return {
    seen,
    from: (table) => {
      const act = () => {
        const b = behaviour[table]
        if (b === 'offline') throw new Error('network')
        seen.push(table)
        if (b === 'reject') return { error: { message: 'bad row' } }
        return { error: null }
      }
      return {
        insert: act, update: () => ({ match: act }), delete: () => ({ match: act }),
      }
    },
  }
}

// --- 1. everything succeeds: queue drains, oldest first --------------------
store.clear(); autoId = 1
await enqueue({ table: 'a', op: 'insert', payload: {} })
await enqueue({ table: 'b', op: 'insert', payload: {} })
await enqueue({ table: 'c', op: 'delete', match: { id: 1 } })
let s = server({ a: 'ok', b: 'ok', c: 'ok' })
check('drains fully', await flush(s), 3)
check('replayed oldest-first', s.seen, ['a', 'b', 'c'])
check('queue now empty', await count(), 0)

// --- 2. still offline: nothing is lost, nothing is sent --------------------
store.clear(); autoId = 1
await enqueue({ table: 'a', op: 'insert', payload: { n: 1 } })
await enqueue({ table: 'a', op: 'insert', payload: { n: 2 } })
check('sends nothing while offline', await flush(server({ a: 'offline' })), 0)
check('keeps every row while offline', await count(), 2)

// --- 3. a row the server refuses is dropped, the rest still go through -----
store.clear(); autoId = 1
await enqueue({ table: 'bad', op: 'insert', payload: {} })
await enqueue({ table: 'good', op: 'insert', payload: {} })
s = server({ bad: 'reject', good: 'ok' })
check('bad row does not block the queue', await flush(s), 1)
// Both reached the server — that is exactly how we learned 'bad' was bad.
// What matters is that it was dropped rather than retried forever.
check('both were attempted, in order', s.seen, ['bad', 'good'])
check('nothing left behind', await count(), 0)

// --- 4. connection drops mid-flush: the rest keep their place -------------
store.clear(); autoId = 1
await enqueue({ table: 'sent', op: 'insert', payload: {} })
await enqueue({ table: 'later', op: 'insert', payload: {} })
await enqueue({ table: 'later', op: 'insert', payload: {} })
check('stops at the disconnect', await flush(server({ sent: 'ok', later: 'offline' })), 1)
check('unsent rows survive', (await pending()).map((r) => r.table), ['later', 'later'])

console.log(failures ? `\n${failures} FAILED` : '\nall good')
process.exit(failures ? 1 : 0)
