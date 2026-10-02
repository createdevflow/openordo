import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export const dynamic = "force-dynamic";
import { PUBLIC_ROUTES, assertIndexable } from '@/lib/seo/routes'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
  
  const entries: MetadataRoute.Sitemap = []
  
  // 1. Auto entries
  for (const route of PUBLIC_ROUTES) {
    const url = `${baseUrl}${route.path}`
    if (assertIndexable(url)) {
      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: route.changefreq as any,
        priority: route.priority,
      })
    }
  }

  // 2. Opted-in booking pages
  const seoFlag = await db.platformFlag.findUnique({ where: { key: "SEO_BOOKING_PAGES" } })
  if (seoFlag?.enabled) {
    const configs = await db.bookingPageConfig.findMany({
      where: {
        searchIndexing: true,
        clinic: {
          status: "ACTIVE"
        }
      },
      include: { clinic: true }
    })
    
    for (const config of configs) {
      if (config.clinic) {
        const url = `${baseUrl}/book/${config.clinic.slug}`
        if (assertIndexable(url)) {
          entries.push({
            url,
            lastModified: config.updatedAt,
            changeFrequency: 'weekly',
            priority: 0.6,
          })
        }
      }
    }
  }
  
  // 3. Manual entries
  const manualEntries = await db.seoSitemapEntry.findMany({
    where: { mode: "INCLUDE" }
  })
  
  for (const entry of manualEntries) {
    const url = `${baseUrl}${entry.path}`
    if (assertIndexable(url)) {
      entries.push({
        url,
        lastModified: entry.updatedAt,
        changeFrequency: entry.changefreq as any,
        priority: entry.priority,
      })
    }
  }
  
  // 4. Exclusions
  const exclusions = await db.seoSitemapEntry.findMany({
    where: { mode: "EXCLUDE" }
  })
  const excludePaths = exclusions.map(e => `${baseUrl}${e.path}`)
  
  return entries.filter(e => !excludePaths.includes(e.url))
}
