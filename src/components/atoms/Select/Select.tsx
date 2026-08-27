import React from "react";
import ReactSelect, {
  type GroupBase,
  type Props as ReactSelectProps,
  type StylesConfig,
} from "react-select";

export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

export interface SelectProps
  extends Omit<
    ReactSelectProps<SelectOption, false, GroupBase<SelectOption>>,
    "options" | "value" | "onChange" | "isMulti" | "classNamePrefix"
  > {
  options: SelectOption[];
  /** Controlled value, matched against `options[].value`. */
  value?: string | number | null;
  /** Fires with the raw option value so it drops into existing `<select>` handlers. */
  onValueChange?: (value: string) => void;
  selectSize?: SelectSize;
  invalid?: boolean;
}

// Everything visual is driven by the tokens in styles/tokens.css via the
// .em-select-* classes in styles/components.css. Only the handful of layout
// values react-select computes at runtime are set here.
const styles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: "none" }),
};

export function Select({
  options,
  value = null,
  onValueChange,
  selectSize = "md",
  invalid = false,
  className = "",
  isDisabled,
  ...rest
}: SelectProps) {
  const selected =
    value === null || value === undefined
      ? null
      : options.find((o) => String(o.value) === String(value)) ?? null;

  const classes = [
    "em-select",
    `em-select--${selectSize}`,
    invalid ? "em-select--invalid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ReactSelect<SelectOption, false, GroupBase<SelectOption>>
      className={classes}
      classNamePrefix="em-select"
      options={options}
      value={selected}
      isDisabled={isDisabled}
      onChange={(opt) => onValueChange?.(opt ? String(opt.value) : "")}
      styles={styles}
      // Render the menu in a portal so it is never clipped by an ancestor with
      // overflow:hidden, and stays above sticky headers and modals.
      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
      menuPlacement="auto"
      {...rest}
    />
  );
}

Select.displayName = "Select";
