// src/lib/storage/categories.ts
export const FILE_CATEGORIES = {
  PLATFORM_SIGNATURE:      { scope: "PLATFORM", folder: "platform/signatures", read: ["SUPER_ADMIN"] },
  PLATFORM_BRANDING:       { scope: "PLATFORM", folder: "platform/branding",   read: ["PUBLIC"] },
  CLINIC_BRANDING_PUBLIC:  { scope: "CLINIC",   folder: "clinic/branding",     read: ["PUBLIC"] },
  CLINIC_COMPLIANCE:       { scope: "CLINIC",   folder: "clinic/compliance",   read: ["OWNER","ADMIN","SUPER_ADMIN"] },
  CLINIC_BILLING:          { scope: "CLINIC",   folder: "clinic/billing",      read: ["OWNER","ADMIN","SUPER_ADMIN"] },
  CLINIC_EXPORT:           { scope: "CLINIC",   folder: "clinic/exports",      read: ["OWNER"] },
  STAFF_AVATAR:            { scope: "CLINIC",   folder: "staff",               read: ["CLINIC_MEMBER"] },
  PATIENT_DOCUMENT:        { scope: "PATIENT",  folder: "documents",     read: ["OWNER","ADMIN","DOCTOR","FRONT_DESK","PATIENT_SELF"] },
  PATIENT_REPORT:          { scope: "PATIENT",  folder: "reports",       read: ["OWNER","ADMIN","DOCTOR","PATIENT_SELF_IF_SHARED"] },
  PATIENT_PRESCRIPTION:    { scope: "PATIENT",  folder: "prescriptions", read: ["OWNER","ADMIN","DOCTOR","PATIENT_SELF"] },
  PATIENT_INVOICE:         { scope: "PATIENT",  folder: "invoices",      read: ["OWNER","ADMIN","FRONT_DESK","PATIENT_SELF"] },
  PATIENT_RECORD_ATTACHMENT:{ scope: "PATIENT", folder: "records",       read: ["OWNER","ADMIN","DOCTOR","PATIENT_SELF_IF_SHARED"] },
  CONSULTATION_FILE:       { scope: "PATIENT",  folder: "consultations", read: ["DOCTOR","OWNER","ADMIN","PATIENT_SELF"] },
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;
