/**
 * The one tick this site draws. Inline and not `lucide-react`, because the site
 * ships no JavaScript to read the content (spec/16 §8) and a component library
 * for a single path is weight the LCP budget does not have.
 */
export function Check({ className = 'size-4 shrink-0 text-success-600' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
