import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Sidebar from "./components/Sidebar"
import { CompanyProvider } from "./context/CompanyContext"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Valoris",
  description: "Valorisation M&A",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <CompanyProvider>
          <div className="flex">
            <Sidebar />
            {children}
          </div>
        </CompanyProvider>
      </body>
    </html>
  )
}