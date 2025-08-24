import React from "react";
import { useFormStore } from "../store/useFormStore";

interface ToggleSwitchProps {
  name: string; // Formik field name
  value: boolean;
  onChange: (name: string, value: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  name,
  value,
  onChange,
  onLabel = "On",
  offLabel = "Off",
  className = "",
}) => {
  const { userData } = useFormStore();
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`text-sm  ${userData?.theme === "dark" ? "text-white" : "text-text"}`}>{value ? onLabel : offLabel}</span>
      <button
        type="button"
        onClick={() => onChange(name, !value)}
        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
          value 
            ? userData?.theme === 'dark' 
              ? 'bg-primary-default' 
              : 'bg-text' 
            : userData?.theme === 'dark' 
              ? 'bg-gray-600' 
              : 'bg-gray-300'
        }`}
        aria-label={value ? onLabel : offLabel}
      >
        <div
          className={`${userData?.theme === 'dark' ? 'bg-gray-200' : 'bg-white'} w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
            value ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;
