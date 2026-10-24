import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudVault · Asset Upload & Storage Dashboard",
  description: "Secure, enterprise-grade cloud photo and digital asset upload portal backed by Google Drive."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="min-h-full font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
