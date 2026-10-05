import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Modal panel: a bottom sheet on phones, a centered dialog on larger screens.
 * Uses the native <dialog> element for focus handling and Esc-to-close.
 */
export function Sheet({ open, onClose, title, icon, children, wide }: {
  open: boolean
  onClose: () => void
  title: string
  icon: string
  children: ReactNode
  /** Wider dialog on larger screens (for lists). */
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`animate-sheet mx-0 mb-0 mt-auto max-h-[88vh] w-full max-w-full overflow-y-auto rounded-t-3xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-black/40 sm:m-auto sm:rounded-3xl dark:bg-stone-900 dark:text-stone-100 ${
        wide ? 'sm:max-w-lg' : 'sm:max-w-md'
      }`}
    >
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden dark:bg-stone-700" aria-hidden />
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2
            id={titleId}
            className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-200"
          >
            <span aria-hidden>{icon}</span>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            ✕
          </button>
        </header>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-throttle-500 py-3 font-display text-base font-semibold uppercase tracking-wide text-white transition hover:bg-throttle-600"
        >
          Done
        </button>
      </div>
    </dialog>
  )
}
