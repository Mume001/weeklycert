import './globals.css'
import type { ReactNode } from 'react'

// Top navigation and footer come in session Z (spec/19 §2, §10).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
