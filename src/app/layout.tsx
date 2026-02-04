import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SmartLedger - Simple Finance Tracking",
  description: "A simple and secure personal finance tracker. Upload documents, extract transactions, and get insights into your spending.",
  keywords: ["finance", "budget", "expense tracker", "personal finance", "money management"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
