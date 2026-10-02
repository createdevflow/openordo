const fs = require('fs');
let code = fs.readFileSync('BUILD_LOG.md', 'utf8');
if (!code.includes('## Production Fixes')) {
  code += `
## Production Fixes

### 1. Payments & tax
- **Root cause:** The payment flows directly read \`plan.priceMonthlyInr\` and sent it to Razorpay, completely bypassing tax logic. The pricing logic wasn't centralized and \`<CheckoutPanel>\` wasn't universally used. Stripe was not fully wired.
- **Fix:** Created \`CheckoutQuote\` table and \`/api/billing/quote\` + \`/api/billing/checkout\` endpoints. Replaced individual Razorpay subscription endpoints with centralized logic handling both Razorpay and Stripe with taxes correctly calculated via \`computeTax\`.
`;
  fs.writeFileSync('BUILD_LOG.md', code);
}
