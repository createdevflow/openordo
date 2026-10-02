import { MetadataRoute } from 'next'
import { NEVER_INDEX_PREFIXES } from '@/lib/seo/routes'

export default function robots(): MetadataRoute.Robots {
  const isNonProd = 
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") || 
    (process.env.APP_ENV && process.env.APP_ENV !== "production")

  if (isNonProd) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      }
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...NEVER_INDEX_PREFIXES],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"}/sitemap.xml`,
  }
}
