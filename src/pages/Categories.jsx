import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import TopBar from '../components/TopBar'
import Segmented from '../components/Segmented'

const COLORS = [
  '#16a34a', '#2563eb', '#db2777', '#f97316', '#d946ef', '#0891b2',
  '#ca8a04', '#dc2626', '#7c3aed', '#0d9488', '#92400e', '#4b5563',
]

export default function Categories() {
  const { hasBusiness } = useAuth()
  const { rows, tree, loading, add, update, remove } = useCategories()
  const [scope, setScope] = useState('expense')
  const [editing, setEditing] = useState(null)
  const [addingUnder, setAddingUnder] = useState(undefined) // undefined = closed, null = new top level

  const list = tree[scope] || []
  // Without this, switching a category off would hide it with no way back.
  const hidden = rows.filter((r) => r.scope === scope && !r.active && !r.parent_id)

  return (
    <div className="pb-28">
      <TopBar title="Categories" subtitle="Shared with your partner" back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <Segmented
          options={[
            { value: 'expense', label: 'Spending' },
            { value: 'income', label: 'Income' },
            ...(hasBusiness ? [{ value: 'business', label: '💼 Business' }] : []),
          ]}
          value={scope}
          onChange={setScope}
        />

        {loading && <p className="text-muted">Loading…</p>}

        <div className="card divide-y divide-slate-100 py-0">
          {list.map((parent) => (
            <div key={parent.id} className="py-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                  style={{ backgroundColor: parent.color + '22' }}
                >
                  {parent.emoji}
                </span>
                <button onClick={() => setEditing(parent)} className="min-w-0 flex-1 text-left active:opacity-60">
                  <span className="block truncate font-medium leading-tight">{parent.name}</span>
                  {parent.counts_as_expense === false && (
                    <span className="block text-[11px] leading-tight text-muted">Not counted as spending</span>
                  )}
                </button>
                <button
                  onClick={() => setAddingUnder(parent)}
                  aria-label={`Add subcategory to ${parent.name}`}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 active:scale-95"
                >
                  +
                </button>
                <button
                  onClick={() => update(parent.id, { active: false })}
                  aria-label={`Hide ${parent.name}`}
                  className="flex h-6 w-10 shrink-0 items-center justify-end rounded-full bg-brand-500 px-0.5"
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow" />
                </button>
              </div>

              {parent.children.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5 pl-11">
                  {parent.children.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setEditing(c)}
                      className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium active:scale-95"
                    >
                      {c.emoji} {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {addingUnder === undefined ? (
          <button className="btn-ghost w-full" onClick={() => setAddingUnder(null)}>+ Add category</button>
        ) : (
          <CategoryForm
            parent={addingUnder}
            scope={scope}
            onCancel={() => setAddingUnder(undefined)}
            onSave={async (row) => {
              const { error } = await add({ ...row, scope, parent_id: addingUnder?.id ?? null })
              if (!error) setAddingUnder(undefined)
              return error
            }}
          />
        )}

        {hidden.length > 0 && (
          <div className="card">
            <h2 className="label">Hidden</h2>
            <p className="mb-2 text-sm text-muted">Still on past expenses — just not offered when adding.</p>
            <ul className="divide-y divide-slate-100">
              {hidden.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-lg opacity-50">{c.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{c.name}</span>
                  <button
                    onClick={() => update(c.id, { active: true })}
                    aria-label={`Show ${c.name}`}
                    className="flex h-7 w-12 shrink-0 items-center justify-start rounded-full bg-slate-200 px-0.5 transition"
                  >
                    <span className="h-6 w-6 rounded-full bg-white shadow" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="px-1 text-xs text-muted">
          Renaming a category updates it everywhere. A subcategory always counts toward its parent in
          reports, so your monthly totals stay comparable.
        </p>

        {editing && (
          <EditSheet
            category={editing}
            onClose={() => setEditing(null)}
            onSave={async (row) => { await update(editing.id, row); setEditing(null) }}
            onDelete={async () => { await remove(editing.id); setEditing(null) }}
          />
        )}
      </div>
    </div>
  )
}

function CategoryForm({ parent, scope, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(parent?.emoji || '📦')
  const [color, setColor] = useState(parent?.color || COLORS[0])
  const [spendType, setSpendType] = useState('need')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async () => {
    if (!name.trim()) { setErr('Give it a name.'); return }
    setBusy(true); setErr(null)
    const error = await onSave({
      name: name.trim(),
      emoji: emoji || '📦',
      color,
      // Only a top-level category carries a need/treat default; a subcategory
      // inherits whatever its parent implies.
      ...(parent ? {} : { spend_type: scope === 'business' ? null : spendType }),
    })
    setBusy(false)
    if (error) setErr(error.message || 'Could not save.')
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">
        {parent ? `New subcategory under ${parent.name}` : 'New category'}
      </h2>
      <div className="grid grid-cols-4 gap-2">
        <input
          className="field text-center"
          value={emoji}
          onChange={(e) => setEmoji([...e.target.value].slice(-1).join(''))}
          aria-label="Emoji"
        />
        <input
          className="field col-span-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={parent ? 'e.g. Gym' : 'e.g. Subscriptions'}
        />
      </div>

      {!parent && (
        <>
          <div>
            <label className="label">Colour</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={`h-8 w-8 rounded-full transition ${color === c ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {scope !== 'business' && (
            <div>
              <label className="label">Usually a</label>
              <Segmented
                options={[{ value: 'need', label: '🧺 Need' }, { value: 'treat', label: '🍦 Treat' }]}
                value={spendType}
                onChange={setSpendType}
              />
            </div>
          )}
        </>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-3 text-base" onClick={onCancel}>Cancel</button>
        <button className="btn-primary flex-1 py-3 text-base" disabled={busy} onClick={submit}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function EditSheet({ category, onClose, onSave, onDelete }) {
  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [color, setColor] = useState(category.color)
  const [spendType, setSpendType] = useState(category.spend_type || 'need')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isParent = !category.parent_id
  const childCount = category.children?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-4 pb-8 animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mx-auto max-w-md space-y-3">
          <h2 className="text-xl font-bold">{isParent ? 'Edit category' : 'Edit subcategory'}</h2>

          <div className="grid grid-cols-4 gap-2">
            <input className="field text-center" value={emoji} onChange={(e) => setEmoji([...e.target.value].slice(-1).join(''))} aria-label="Emoji" />
            <input className="field col-span-3" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {isParent && (
            <>
              <div>
                <label className="label">Colour</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={c}
                      className={`h-8 w-8 rounded-full transition ${color === c ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {category.scope !== 'business' && (
                <div>
                  <label className="label">Usually a</label>
                  <Segmented
                    options={[{ value: 'need', label: '🧺 Need' }, { value: 'treat', label: '🍦 Treat' }]}
                    value={spendType}
                    onChange={setSpendType}
                  />
                </div>
              )}
            </>
          )}

          <button
            className="btn-primary w-full"
            onClick={() =>
              onSave({
                name: name.trim() || category.name,
                emoji: emoji || '📦',
                ...(isParent ? { color, ...(category.scope !== 'business' ? { spend_type: spendType } : {}) } : {}),
              })
            }
          >
            Save
          </button>

          {confirmDelete ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                Delete “{category.name}”?
                {childCount > 0 && ` Its ${childCount} subcategor${childCount === 1 ? 'y goes' : 'ies go'} too.`}
                {' '}Expenses already filed under it keep their history and their totals — they just stop
                pointing at a category you can pick again.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn-ghost py-2.5 text-base" onClick={() => setConfirmDelete(false)}>Keep it</button>
                <button className="btn py-2.5 text-base bg-red-600 text-white" onClick={onDelete}>Delete</button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn-ghost w-full" onClick={() => onSave({ active: false })}>Hide from the picker</button>
              <button className="btn-ghost w-full text-red-600" onClick={() => setConfirmDelete(true)}>Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
