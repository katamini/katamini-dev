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
      <head>
        <link rel="icon" type="image/png" href="https://i.imgur.com/UyA8YJC.png" />
        <meta property="og:title" content="Katamini: The Game" />
        <meta property="og:image" content="https://i.imgur.com/cBreCfD.gif" />
        <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "283699641ec94164a4dc894a1ab6e3f4"}'></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
