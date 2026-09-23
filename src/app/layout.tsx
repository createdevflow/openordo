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

import { db } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.globalSetting.findMany({
    where: { key: { in: ["SEO_META_TITLE", "SEO_META_DESC", "SEO_FAVICON_URL", "SEO_OG_IMAGE_URL"] } }
  }).catch(() => []);

  const config = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  const title = config.SEO_META_TITLE || "OpenORDO";
  const description = config.SEO_META_DESC || "Clinic management system";
  const favicon = config.SEO_FAVICON_URL || null;
  const ogImage = config.SEO_OG_IMAGE_URL || "";

  return {
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description,
    ...(favicon ? { icons: { icon: favicon } } : {}),
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

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
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </body>
    </html>
  );
}
