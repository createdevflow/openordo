import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenORDO",
  description: "Clinic management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
        <Toaster 
          position="bottom-center" 
          toastOptions={{
            className: "bg-forest-dark text-white px-5 py-3 rounded-lg text-[13.5px] font-medium flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border-0",
          }}
        />
      </body>
    </html>
  );
}
