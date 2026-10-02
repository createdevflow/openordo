import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not Found — Chartwell",
  description: "The page you are looking for could not be found.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-4xl font-semibold text-[#1E4638]" style={{ fontFamily: "Fraunces, serif" }}>
          Page Not Found
        </h1>
        <p className="text-[#5C5C5C] text-lg">
          We couldn&apos;t find the page you were looking for. It might have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/" className="px-6 py-2 bg-[#1E4638] text-white rounded-full font-medium hover:bg-[#15342a] transition-colors">
            Return Home
          </Link>
          <Link href="/pricing" className="px-6 py-2 border border-[#1E4638] text-[#1E4638] rounded-full font-medium hover:bg-[#1e463810] transition-colors">
            Pricing
          </Link>
          <Link href="/contact" className="px-6 py-2 text-[#5C5C5C] hover:text-[#1E4638] font-medium transition-colors">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
