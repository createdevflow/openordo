import { signIn } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=InvalidDemoLink", request.url))
  }

  try {
    await signIn("credentials", {
      demoToken: token,
      redirectTo: "/dashboard"
    })
  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") {
      throw error // Let Next.js handle the redirect (it includes the auth cookies)
    }
    return NextResponse.redirect(new URL("/login?error=InvalidOrExpiredDemoLink", request.url))
  }
}
