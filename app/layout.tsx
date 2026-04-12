import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Staff Hub — MAH & HPVC',
  description: 'Staff knowledge base for MAH and HPVC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
