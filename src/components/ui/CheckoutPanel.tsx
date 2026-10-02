import React from "react";
import { CheckoutQuote } from "@/lib/billing/quote";
import { formatPrice } from "@/lib/pricing/index";

export function CheckoutPanel({ quote, onCheckout }: { quote: CheckoutQuote, onCheckout: () => void }) {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <div className="flex justify-between mb-2">
        <span>Base Price</span>
        <span>{formatPrice(quote.baseAmount, quote.currency)}</span>
      </div>
      
      {quote.taxAmount > 0 && (
        <div className="flex justify-between mb-2 text-sm text-gray-500">
          <span>+ {quote.taxLabel} ({quote.taxRate}%)</span>
          <span>{formatPrice(quote.taxAmount, quote.currency)}</span>
        </div>
      )}
      
      <div className="flex justify-between font-bold text-lg mb-4">
        <span>Total{quote.interval === "MONTHLY" ? "/mo" : quote.interval === "YEARLY" ? "/yr" : ""}</span>
        <span>{formatPrice(quote.totalAmount, quote.currency)}</span>
      </div>

      {quote.trialEndsAt && (
        <p className="text-sm text-gray-500 mb-4">
          After trial ends on {new Date(quote.trialEndsAt).toLocaleDateString()}, you will be charged {formatPrice(quote.totalAmount, quote.currency)}.
        </p>
      )}
      
      <button 
        onClick={onCheckout}
        className="w-full py-2 px-4 bg-primary text-white rounded font-medium"
      >
        Pay {formatPrice(quote.totalAmount, quote.currency)}
      </button>

      <div className="text-center mt-3 text-xs text-gray-400">
        Secured by {quote.gateway === "RAZORPAY" ? "Razorpay" : "Stripe"}
      </div>
    </div>
  );
}
