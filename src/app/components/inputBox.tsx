import React, { useId } from "react";
import { DatePicker } from "./datePicker";
import { CustomDropdownMenu } from "./dropdown";
import { DatePickerWithTime } from "./datePickerWithTime";
import WeekdaySelector from "./weekdaySelector";
import { useFormState } from "../context/FormProvider";
export interface DropdownOption {
  name: string;
  color?: string;
  project_id?: string;
}

interface InputBoxProps {
  label?: string;
  placeholder: string;
  value: {
    name: string;
    color?: string;
    project_id?: string;
  };
  /** Text, date and weekday inputs. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Dropdowns: receives the chosen option directly (no synthetic event). */
  onSelect?: (option: DropdownOption) => void;
  type?: "text" | "textarea" | "date" | "dropdown" | "weekdayselector" | "datewithtime" | 'password' | 'email';
  error?: string;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isLabelVisible?: boolean;
  dropdownptions?: {
    name: string;
    color?: string;
    title?: string;
    project_id?: string;
  }[];  
  customClass?: string;
  labelCustomClass?: string;
  isLanding?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  ref?: React.RefObject<HTMLInputElement>;
}

export default function InputBox({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  type = "text",
  error,
  disabled,
  onBlur,
  isLabelVisible = true,
  dropdownptions,
  customClass,
  labelCustomClass,
  isLanding,
  onKeyDown,
  autoFocus,
  ref
}: InputBoxProps) {
  const { userData } = useFormState();
  // Programmatic label and error wiring. Additive: value, handlers and ref are unchanged.
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const isNativeControl = type === "text" || type === "password" || type === "email" || type === "textarea";
  const labelClass = `${userData?.theme === 'dark' ? 'text-white' : 'text-text'} text-base font-normal font-lato 
              ${error ? "text-error-default" : (isLanding ? "text-primary-default" : "text-text")}`;
  const describedBy = error ? errorId : undefined;
  return (
    <div className="w-full">
      <div className={`${error ? "shake" : ""} ${labelCustomClass}`}>
        {label && (
          isNativeControl ? (
            <label id={labelId} htmlFor={id} className={`${isLabelVisible ? "" : "sr-only "}${labelClass}`}>
              {label}
            </label>
          ) : (
            // Buttons and groups have no native label association; the control points back here with aria-labelledby.
            <span id={labelId} className={`${isLabelVisible ? "" : "sr-only "}${labelClass}`}>
              {label}
            </span>
          )
        )}
      </div>

      {(type === "text" || type === "password" || type === "email")? (
        <input
          value={value.name ?? ""}
          onChange={onChange}
          type={type}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onBlur={onBlur}
          className={`rounded-md border w-full h-[40px] py-2 px-2
            outline-none transition-all duration-200 ${isLanding ? "text-primary-default" : "text-text"}
            ${error ? "focus:ring-error border-error" : "focus:ring-primary-default focus:ring-2 border-[#E0E0E0]"}
            disabled:opacity-50 disabled:cursor-not-allowed ${customClass} 
            ${userData?.theme === 'dark' ? 'bg-foreground-dark text-white border-gray-800 border' : 'bg-white text-text'}`}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          ref={ref}
        />
      ) : type === "textarea" ? (
        <textarea
          value={value.name ?? ""}
          onChange={onChange}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          onBlur={onBlur}
          className={`resize-y rounded-md border w-full min-h-[70px] max-h-[200px] py-2 px-2
            outline-none transition-all duration-200 text-text
            ${error ? "focus:ring-error border-error" : "focus:ring-text focus:ring-2 border-[#E0E0E0]"}
            disabled:opacity-50 disabled:cursor-not-allowed ${customClass} 
            ${userData?.theme === 'dark' ? 'bg-foreground-dark text-white border-gray-800 border' : 'bg-white text-text'}`}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : type === "date" ? (
        <DatePicker
          date={value.name ? new Date(value.name) : undefined}
          setDate={(date: Date) => {
            const syntheticEvent = {
              target: { value: date.toISOString() },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange?.(syntheticEvent);
          }}
          placeholder={placeholder}
          customClass={customClass}
          id={id}
          labelId={labelId}
          errorId={describedBy}
          invalid={!!error}
        />
      ) : type === "datewithtime" ? (
        <DatePickerWithTime
          date={value.name ? new Date(value.name) : undefined}
          setDate={(date: Date) => {
            const syntheticEvent = {
              target: { value: date.toISOString() },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange?.(syntheticEvent);
          }}
          placeholder={placeholder}
          customClass={customClass}
          id={id}
          labelId={labelId}
          errorId={describedBy}
          invalid={!!error}
        />
      ) : type === "weekdayselector" ? (
        <WeekdaySelector
          onChange={(days: string[]) => {
            const syntheticEvent = {
              target: { name: days.join(","), value: days.join(",") },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange?.(syntheticEvent);
          }}
          defaultSelected={value.name ? value.name.split(",") : []}
          isDisabled={disabled}
          labelId={labelId}
          errorId={describedBy}
        />
      ) : type === "dropdown" ? (
        <CustomDropdownMenu 
          placeholder={placeholder}
          options={dropdownptions ?? []}
          selectedOption={value}
          disabled={disabled}
          setSelectedOption={(option) => onSelect?.(option)}
          id={id}
          labelId={labelId}
          errorId={describedBy}
          invalid={!!error}
        />
      ) : (
        <></>
      )}

      {error && (
        <span id={errorId} className="text-error-default font-lato text-xs">{error}</span>
      )}
    </div>
  );
}
