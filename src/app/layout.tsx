import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Lápiz — Tutti Frutti online",
  description: "Juego de palabras multijugador en tiempo real",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-bg text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
