import { useEffect, useId, useState } from 'react'

/** "Save route" button that expands into a small inline form to name the route. */
export function SaveRouteForm({ defaultName, onSave, savedName }: {
  defaultName: string
  /** Returns an error message, or null on success. */
  onSave: (name: string) => string | null
  /** Set when the current route is already in the library. */
  savedName: string | null
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState<string | null>(null)
  const nameId = useId()

  useEffect(() => {
    setName(defaultName)
    setError(null)
  }, [defaultName])

  if (savedName) {
    return (
      <div className="rounded-2xl bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
        ✓ Saved as <strong>{savedName}</strong>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:border-throttle-500 hover:text-throttle-600 dark:border-stone-700 dark:text-stone-300 dark:hover:text-throttle-400"
      >
        💾 Save route
      </button>
    )
  }

  const submit = () => {
    const err = onSave(name.trim() || defaultName)
    setError(err)
    if (!err) setOpen(false)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="space-y-2 rounded-2xl border-2 border-throttle-500/60 p-3"
    >
      <label htmlFor={nameId} className="block text-sm font-medium text-stone-600 dark:text-stone-300">
        Name this route
      </label>
      <input
        id={nameId}
        value={name}
        autoFocus
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none ring-throttle-500/40 focus:border-throttle-500 focus:ring-4 dark:border-stone-700 dark:bg-stone-800"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-xl bg-throttle-500 px-3 py-2 text-sm font-semibold text-white hover:bg-throttle-600">
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-stone-500 dark:text-stone-400">Saved in this browser only.</p>
    </form>
  )
}
