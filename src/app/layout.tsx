import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EVES Ops Dashboard',
  description: 'EV charging operations dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
