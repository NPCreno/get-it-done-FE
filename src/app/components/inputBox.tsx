import React from "react";
import { DatePicker } from "./datePicker";
import { CustomDropdownMenu } from "./dropdown";
import { DatePickerWithTime } from "./datePickerWithTime";
import WeekdaySelector from "./weekdaySelector";
import { useFormState } from "../context/FormProvider";
interface InputBoxProps {
  label?: string;
  placeholder: string;
  value: {
    name: string;
    color?: string;
    project_id?: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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

interface CustomDropdownChangeEvent extends React.ChangeEvent<HTMLInputElement>{
  target: HTMLInputElement & {
    name: string;
    value: string;
    project_id: string;
  };
}

export default function InputBox({
  label,
  placeholder,
  value,
  onChange,
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
  return (
    <div className="w-full">
      <div className={`${error ? "shake" : ""} ${labelCustomClass}`}>
        {isLabelVisible && (
          <label
            htmlFor={label}
            className={`${userData?.theme === 'dark' ? 'text-white' : 'text-text'} text-base font-normal font-lato 
              ${error ? "text-error-default" : (isLanding ? "text-primary-default" : "text-text")}`}
          >
            {label}
          </label>
        )}
      </div>

      {(type === "text" || type === "password" || type === "email")? (
        <input
          value={value.name ?? ""}
          onChange={onChange}
          type={type}
          id={label}
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
          id={label}
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
            onChange(syntheticEvent);
          }}
          placeholder={placeholder}
          customClass={customClass}
        />
      ) : type === "datewithtime" ? (
        <DatePickerWithTime
          date={value.name ? new Date(value.name) : undefined}
          setDate={(date: Date) => {
            const syntheticEvent = {
              target: { value: date.toISOString() },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }}
          placeholder={placeholder}
          customClass={customClass}
        />
      ) : type === "weekdayselector" ? (
        <WeekdaySelector
          onChange={(days: string[]) => {
            const syntheticEvent = {
              target: { name: days.join(","), value: days.join(",") },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }}
          defaultSelected={value.name ? value.name.split(",") : []}
          isDisabled={disabled}
        />
      ) : type === "dropdown" ? (
        <CustomDropdownMenu 
          placeholder={placeholder}
          options={dropdownptions ?? []}
          selectedOption={value}
          disabled={disabled}
          setSelectedOption={(option) =>
            onChange({
              target: {
                name: option.name,
                value: option.color ?? '',
                project_id: option.project_id ?? '',
              },
            } as CustomDropdownChangeEvent)
          }
        />
      ) : (
        <></>
      )}

      {error && (
        <span className="text-error-default font-lato text-xs">{error}</span>
      )}
    </div>
  );
}
