// Central route definitions for the application

export const Routes = {
  Home: "/",
  Privacy: "/legal/privacy",
  Terms: "/legal/terms",
  Contact: "/contact",
  Dashboard: "/dashboard",
  PatientPortal: "/portal",
  PatientPortalSettings: "/portal/settings", // If no slug
  PatientPortalForClinic: (slug: string) => `/portal/${slug}`,
  PatientPortalSettingsForClinic: (slug: string) => `/portal/${slug}/settings`,
  Login: "/login",
  Register: "/register",
  Onboarding: "/onboarding",
  ConsultationJoin: (roomId: string) => `/consultation/join/${roomId}`,
};
