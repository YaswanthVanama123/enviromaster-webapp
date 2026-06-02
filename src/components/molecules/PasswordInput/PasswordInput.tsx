import React, { forwardRef, useState } from "react";
import { Input, type InputProps } from "../../atoms/Input";
import { Icon } from "../../atoms/Icon";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, className = "", ...rest }, ref) => {
    const [shown, setShown] = useState(false);
    return (
      <div className={`em-input-group em-input-group--has-trailing ${className}`}>
        <Input
          ref={ref}
          type={shown ? "text" : "password"}
          autoComplete="current-password"
          {...rest}
        />
        {showToggle && (
          <button
            type="button"
            className="em-input-group__trailing"
            onClick={() => setShown((s) => !s)}
            tabIndex={-1}
            aria-label={shown ? "Hide password" : "Show password"}
          >
            <Icon name={shown ? "eye-off" : "eye"} />
          </button>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
