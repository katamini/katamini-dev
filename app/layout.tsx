import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Katamini',
  description: 'Katamini: the game v0',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <link rel="icon" type="image/png" href="https://i.imgur.com/UyA8YJC.png" />
      <body>{children}</body>
    </html>
  )
}
