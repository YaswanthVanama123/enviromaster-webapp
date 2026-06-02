import { useMemo } from "react";

export interface CustomFieldLike {
  type?: string;
  value?: unknown;
  calcValues?: { right?: string; left?: string; middle?: string };
}

export function useCustomFieldsTotal(customFields?: CustomFieldLike[]): {
  calcFieldsTotal: number;
  dollarFieldsTotal: number;
  total: number;
} {
  const calcFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;
    return customFields.reduce((sum, field) => {
      if (field.type === "calc" && field.calcValues?.right) {
        return sum + (parseFloat(field.calcValues.right) || 0);
      }
      return sum;
    }, 0);
  }, [customFields]);

  const dollarFieldsTotal = useMemo(() => {
    if (!customFields || customFields.length === 0) return 0;
    return customFields.reduce((sum, field) => {
      if (field.type === "dollar" && field.value) {
        return sum + (parseFloat(String(field.value)) || 0);
      }
      return sum;
    }, 0);
  }, [customFields]);

  return {
    calcFieldsTotal,
    dollarFieldsTotal,
    total: calcFieldsTotal + dollarFieldsTotal,
  };
}
