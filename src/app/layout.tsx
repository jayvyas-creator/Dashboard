import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist_Mono, IBM_Plex_Sans } from 'next/font/google'
import '@/styles/global.css'

const bricolageGrotesque = Bricolage_Grotesque({ variable: '--font-bricolage-grotesque', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'UX Eves',
  description: 'UX Eves',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolageGrotesque.variable} ${geistMono.variable} ${ibmPlexSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
