import React from "react";

export interface NotesFieldProps {
  label?: React.ReactNode;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  rowClassName?: string;
  textareaClassName?: string;
}

export const NotesField: React.FC<NotesFieldProps> = ({
  label = "Notes",
  name,
  value,
  onChange,
  placeholder = "Additional notes...",
  rows = 3,
  disabled,
  rowClassName = "svc-row",
  textareaClassName = "svc-in",
}) => (
  <div className={rowClassName}>
    <div className="svc-label">
      <span>{label}</span>
    </div>
    <div className="svc-field">
      <textarea
        name={name}
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={textareaClassName}
      />
    </div>
  </div>
);
