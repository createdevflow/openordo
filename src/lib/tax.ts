import { TaxCountryConfig } from "@prisma/client";

export function computeTax(baseAmount: number, taxConfig: TaxCountryConfig, clinicRegion?: string | null): { taxAmount: number, cgst?: number, sgst?: number, igst?: number, totalAmount: number, taxLabel: string, taxRate: number } {
  if (taxConfig.calculationMode === 'NONE' || !taxConfig.flatRate) {
    return { taxAmount: 0, totalAmount: baseAmount, taxLabel: taxConfig.taxLabel || "No Tax", taxRate: 0 };
  }

  const taxAmount = Math.round(baseAmount * (taxConfig.flatRate / 100));

  if (taxConfig.calculationMode === 'FLAT_PERCENTAGE') {
    return { taxAmount, totalAmount: baseAmount + taxAmount, taxLabel: taxConfig.taxLabel, taxRate: taxConfig.flatRate };
  }

  if (taxConfig.calculationMode === 'SPLIT_BY_SUPPLY_REGION') {
    const isSameRegion = clinicRegion && taxConfig.ourRegisteredRegion && clinicRegion.toLowerCase() === taxConfig.ourRegisteredRegion.toLowerCase();
    
    if (isSameRegion) {
      const half = Math.round(taxAmount / 2);
      return { taxAmount, cgst: half, sgst: taxAmount - half, totalAmount: baseAmount + taxAmount, taxLabel: taxConfig.taxLabel, taxRate: taxConfig.flatRate };
    } else {
      return { taxAmount, igst: taxAmount, totalAmount: baseAmount + taxAmount, taxLabel: taxConfig.taxLabel, taxRate: taxConfig.flatRate };
    }
  }

  return { taxAmount: 0, totalAmount: baseAmount, taxLabel: taxConfig.taxLabel || "No Tax", taxRate: 0 };
}
