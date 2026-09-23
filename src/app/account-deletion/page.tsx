import { Metadata } from "next"
import AccountDeletionForm from "./AccountDeletionForm"

export const metadata: Metadata = {
  title: "Account Deletion Request - OpenORDO",
  description: "Submit a request to delete your OpenORDO account.",
}

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-[34px] font-serif text-ink tracking-tight">
          Account Deletion Request
        </h2>
        <p className="mt-2 text-center text-[14.5px] text-ink-soft">
          Submit a request to permanently delete your account and all associated data.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-paper-raised py-8 px-4 border border-line rounded-[14px] sm:px-10">
          <AccountDeletionForm />
        </div>
      </div>
    </div>
  )
}
