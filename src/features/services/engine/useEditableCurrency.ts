import { useState, type ChangeEvent, type FocusEvent } from "react";

type ChangeLike = { target: { name: string; value: string } };
type Commit = (e: ChangeLike) => void;

export interface EditableCurrencyHandlers {
  onFocus: (e: FocusEvent<HTMLInputElement>) => void;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
  getDisplayValue: (
    fieldName: string,
    calculatedValue: number | undefined,
    formatted?: boolean
  ) => string;
}

export function useEditableCurrency(commit: Commit): EditableCurrencyHandlers {
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});

  const onFocus = (e: FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingValues((prev) => ({ ...prev, [name]: value }));
    setOriginalValues((prev) => ({ ...prev, [name]: value }));
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingValues((prev) => ({ ...prev, [name]: value }));
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      commit({ target: { name, value: String(numValue) } });
    } else if (value === "") {
      commit({ target: { name, value: "" } });
    }
  };

  const onBlur = (e: FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const originalValue = originalValues[name];
    setEditingValues((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setOriginalValues((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    const numValue = parseFloat(value);
    if (originalValue !== value) {
      if (value === "" || isNaN(numValue)) {
        commit({ target: { name, value: "" } });
        return;
      }
      commit({ target: { name, value: String(numValue) } });
    }
  };

  const getDisplayValue = (
    fieldName: string,
    calculatedValue: number | undefined,
    formatted = false
  ): string => {
    if (editingValues[fieldName] !== undefined) {
      return editingValues[fieldName];
    }
    if (calculatedValue === undefined) return "";
    return formatted
      ? calculatedValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : calculatedValue.toFixed(2);
  };

  return { onFocus, onChange, onBlur, getDisplayValue };
}
