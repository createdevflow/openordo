import { db } from "@/lib/db"
import ConsultationRoomClient from "./ConsultationRoomClient"
import { auth } from "@/lib/auth"
import { hasActivePlugin } from "@/lib/plugins"

export default async function ConsultationPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params

  // Find appointment by roomId or by id
  const appointment = await db.appointment.findFirst({
    where: {
      OR: [
        { roomId },
        { id: roomId }
      ]
    },
    include: {
      patient: true,
      doctor: true,
      clinic: true
    }
  })

  const session = await auth()
  
  // Determine if the viewer is the host (the doctor/clinic staff)
  const isHost = Boolean(
    session?.user &&
    appointment?.clinicId &&
    (session.user.clinicId === appointment.clinicId ||
      (session.user as any).activeClinicId === appointment.clinicId)
  )

  // Check if the clinic has E-Prescriptions plugin active
  const hasEprescriptions = appointment?.clinicId
    ? await hasActivePlugin(appointment.clinicId, "e-prescriptions")
    : false

  return (
    <ConsultationRoomClient
      roomId={roomId}
      appointment={appointment}
      isHost={isHost}
      hasEprescriptions={hasEprescriptions}
    />
  )
}
