import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Bob — your AI research friend',
  description: 'Download Bob, the AI research companion that remembers your goals. Free for early users.',
}

export const viewport: Viewport = {
  themeColor: '#fafaf8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/bob-site.css" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
