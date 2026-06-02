import { useCallback } from "react";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import type { ServiceModule } from "./types";

export function usePriceChangeLogger<Form, Config, Quote>(
  module: ServiceModule<Form, Config, Quote>,
  form: Form
): (fieldName: string, originalValue: number, newValue: number) => void {
  return useCallback(
    (fieldName: string, originalValue: number, newValue: number) => {
      const meta = module.priceChangeLog;
      if (!meta) return;
      const quantityField = meta.quantityField as string | undefined;
      const frequencyField = meta.frequencyField as string | undefined;
      const quantity = quantityField
        ? Number((form as Record<string, unknown>)[quantityField]) || 1
        : 1;
      const frequency = frequencyField
        ? String((form as Record<string, unknown>)[frequencyField] ?? "")
        : "";
      addPriceChange({
        productKey: `${meta.productKeyPrefix}_${fieldName}`,
        productName: `${meta.productNamePrefix} - ${getFieldDisplayName(fieldName)}`,
        productType: "service",
        fieldType: fieldName,
        fieldDisplayName: getFieldDisplayName(fieldName),
        originalValue,
        newValue,
        quantity,
        frequency,
      });
    },
    [form, module.priceChangeLog]
  );
}
