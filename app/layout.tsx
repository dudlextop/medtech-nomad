import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/app-nav";

export const metadata: Metadata = {
  title: "Nomad Radar - цены на медицинские услуги",
  description: "Сравнение цен на медицинские услуги в клиниках Казахстана."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body className="min-h-screen font-sans antialiased">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
