import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

const clinicScopedModels = [
  'Patient', 'Doctor', 'Appointment', 'Invoice', 'MedicalRecord',
  'PatientDocument', 'Membership', 'ClinicPlugin', 'StorageUsage',
  'PatientAccountLink'
]

export function getClinicScopedDb(clinicId: string) {
  return db.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = args as any
          if (clinicScopedModels.includes(model)) {
            if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
              if (!a) return query(args) // fallback if undefined
              if (!a.where) a.where = {}
              a.where = { ...a.where, clinicId }
            }
            if (['create', 'upsert'].includes(operation)) {
              if (!a) return query(args)
              if (!a.data) a.data = {}
              a.data.clinicId = clinicId
            }
            if (operation === 'createMany') {
              if (!a) return query(args)
              if (a.data) {
                if (Array.isArray(a.data)) {
                  a.data = a.data.map((d: any) => ({ ...d, clinicId }))
                } else {
                  a.data.clinicId = clinicId
                }
              }
            }
          }
          return query(a)
        }
      }
    }
  })
}
