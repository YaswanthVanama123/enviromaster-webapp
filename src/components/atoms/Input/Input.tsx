import React, { forwardRef } from "react";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: InputSize;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ inputSize = "md", invalid = false, className = "", ...rest }, ref) => {
    const classes = [
      "em-input",
      `em-input--${inputSize}`,
      invalid ? "em-input--invalid" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return <input ref={ref} className={classes} {...rest} />;
  }
);

Input.displayName = "Input";
