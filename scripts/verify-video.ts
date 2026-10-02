import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  console.log("Verifying Database Schema for Video Infrastructure...");
  
  try {
    // Check CallQualityLog model
    const log = await prisma.callQualityLog.findFirst();
    console.log("CallQualityLog table exists");

    // Check ConsultationMessage model
    const msg = await prisma.consultationMessage.findFirst();
    console.log("ConsultationMessage table exists");

    console.log("SUCCESS: Database schema is ready.");
  } catch (err: any) {
    if (err.message.includes("does not exist")) {
      console.error("ERROR: Table missing. Did you run `npx prisma db push`?");
    } else {
      console.error("ERROR:", err);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
