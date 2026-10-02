import React from "react"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PatientPortalSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({ where: { slug } })
  
  if (!clinic) return notFound()

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Notification Preferences</h1>
      <p className="text-gray-600 mb-8">Manage how {clinic.name} contacts you.</p>
      
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <form className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-500">Receive appointment confirmations and reminders via email.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">SMS Reminders</h3>
              <p className="text-sm text-gray-500">Get text messages before your appointments.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          <button 
            type="button" 
            className="w-full bg-[#1E4638] text-white py-2 px-4 rounded font-medium hover:bg-[#1E4638]/90 transition-colors"
          >
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  )
}
