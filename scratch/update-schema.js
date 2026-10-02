const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!code.includes('model CheckoutQuote')) {
code += `

model CheckoutQuote {
  id              String   @id @default(cuid())
  clinicId        String
  itemType        String   // "PLAN" | "PLUGIN"
  itemId          String
  interval        String   // "MONTHLY" | "YEARLY" | "ONE_TIME"
  currency        String   // "INR" | "USD"
  countryCode     String
  baseAmount      Int      // stored in smallest currency unit (e.g., paise/cents)
  taxLabel        String   // "GST" | "VAT" | "No Tax"
  taxRate         Float
  taxAmount       Int      // computed based on baseAmount and taxRate
  cgst            Int?
  sgst            Int?
  igst            Int?
  totalAmount     Int      // baseAmount + taxAmount
  gateway         String   // "RAZORPAY" | "STRIPE"
  trialEndsAt     DateTime?
  status          String   @default("PENDING") // "PENDING" | "PAID"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model GatewayPriceMap {
  id              String   @id @default(cuid())
  planId          String
  interval        String   // "MONTHLY" | "YEARLY"
  currency        String
  taxRate         Float
  gatewayPlanId   String   // the Razorpay or Stripe plan ID
  createdAt       DateTime @default(now())
  
  @@unique([planId, interval, currency, taxRate])
}
`;
  fs.writeFileSync('prisma/schema.prisma', code);
  console.log('Appended billing models');
}
