import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import TopBar from '../components/TopBar'
import Segmented from '../components/Segmented'
import { t } from '../lib/i18n'

const COLORS = [
  '#16a34a', '#2563eb', '#db2777', '#f97316', '#d946ef', '#0891b2',
  '#ca8a04', '#dc2626', '#7c3aed', '#0d9488', '#92400e', '#4b5563',
]

export default function Categories() {
  const { hasBusiness } = useAuth()
  const { rows, loading, add, update, remove } = useCategories()
  const [scope, setScope] = useState('expense')
  const [editing, setEditing] = useState(null)
  const [addingUnder, setAddingUnder] = useState(undefined) // undefined = closed, null = new top level

  // One list, active and switched-off together, in the order they were
  // created — so turning a category off never moves it and there's nowhere
  // else to go look for it.
  const list = useMemo(() => {
    const inScope = rows.filter((r) => r.scope === scope)
    return inScope
      .filter((r) => !r.parent_id)
      .map((parent) => ({ ...parent, children: inScope.filter((c) => c.parent_id === parent.id && c.active) }))
  }, [rows, scope])

  return (
    <div className="pb-28">
      <TopBar title={t('Categories')} subtitle={t('Shared with your partner')} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <Segmented
          options={[
            { value: 'expense', label: t('Spending') },
            { value: 'income', label: t('Income') },
            ...(hasBusiness ? [{ value: 'business', label: t('💼 Business') }] : []),
          ]}
          value={scope}
          onChange={setScope}
        />

        {loading && <p className="text-muted">{t('Loading…')}</p>}

        <div className="card divide-y divide-slate-100 py-0">
          {list.map((parent) => (
            <div key={parent.id} className={`py-2 ${!parent.active ? 'opacity-50' : ''}`}>
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
                    <span className="block text-[11px] leading-tight text-muted">{t('Not counted as spending')}</span>
                  )}
                </button>
                {parent.active && (
                  <button
                    onClick={() => setAddingUnder(parent)}
                    aria-label={t('Add subcategory to {name}', { name: parent.name })}
                    className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 active:scale-95"
                  >
                    +
                  </button>
                )}
                <button
                  onClick={() => update(parent.id, { active: !parent.active })}
                  aria-label={parent.active ? t('Turn off {name}', { name: parent.name }) : t('Turn on {name}', { name: parent.name })}
                  className={`flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                    parent.active ? 'justify-end bg-brand-500' : 'justify-start bg-slate-300'
                  }`}
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
          <button className="btn-ghost w-full" onClick={() => setAddingUnder(null)}>{t('+ Add category')}</button>
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

        <p className="px-1 text-xs text-muted">
          {t('Renaming a category updates it everywhere. A subcategory always counts toward its parent in reports, so your monthly totals stay comparable.')}
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
    if (!name.trim()) { setErr(t('Give it a name.')); return }
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
    if (error) setErr(error.message || t('Could not save.'))
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">
        {parent ? t('New subcategory under {name}', { name: parent.name }) : t('New category')}
      </h2>
      <div className="grid grid-cols-4 gap-2">
        <input
          className="field text-center"
          value={emoji}
          onChange={(e) => setEmoji([...e.target.value].slice(-1).join(''))}
          aria-label={t('Emoji')}
        />
        <input
          className="field col-span-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={parent ? t('e.g. Gym') : t('e.g. Subscriptions')}
        />
      </div>

      {!parent && (
        <>
          <div>
            <label className="label">{t('Colour')}</label>
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
              <label className="label">{t('Usually a')}</label>
              <Segmented
                options={[{ value: 'need', label: t('🧺 Need') }, { value: 'treat', label: t('🍦 Treat') }]}
                value={spendType}
                onChange={setSpendType}
              />
            </div>
          )}
        </>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-3 text-base" onClick={onCancel}>{t('Cancel')}</button>
        <button className="btn-primary flex-1 py-3 text-base" disabled={busy} onClick={submit}>
          {busy ? t('Saving…') : t('Save')}
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
          <h2 className="text-xl font-bold">{isParent ? t('Edit category') : t('Edit subcategory')}</h2>

          <div className="grid grid-cols-4 gap-2">
            <input className="field text-center" value={emoji} onChange={(e) => setEmoji([...e.target.value].slice(-1).join(''))} aria-label={t('Emoji')} />
            <input className="field col-span-3" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {isParent && (
            <>
              <div>
                <label className="label">{t('Colour')}</label>
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
                  <label className="label">{t('Usually a')}</label>
                  <Segmented
                    options={[{ value: 'need', label: t('🧺 Need') }, { value: 'treat', label: t('🍦 Treat') }]}
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
            {t('Save')}
          </button>

          {confirmDelete ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                {t('Delete “{name}”?', { name: category.name })}
                {childCount > 0 && ` ${childCount === 1 ? t('Its 1 subcategory goes too.') : t('Its {n} subcategories go too.', { n: childCount })}`}
                {' '}{t('Expenses already filed under it keep their history and their totals — they just stop pointing at a category you can pick again.')}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn-ghost py-2.5 text-base" onClick={() => setConfirmDelete(false)}>{t('Keep it')}</button>
                <button className="btn py-2.5 text-base bg-red-600 text-white" onClick={onDelete}>{t('Delete')}</button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn-ghost w-full" onClick={() => onSave({ active: false })}>{t('Hide from the picker')}</button>
              <button className="btn-ghost w-full text-red-600" onClick={() => setConfirmDelete(true)}>{t('Delete')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
