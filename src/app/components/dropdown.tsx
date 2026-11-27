"use client"

import * as React from "react"
import { Button } from "@/app/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/app/components/shadcn/dropdown-menu"

interface CustomDropdownMenuProps {
  options: {
    name: string;
    color?: string;
    project_id?: string;
    /** A heading shown above the first option of each group (FEAT-09 "Shared with me"). */
    group?: string;
  }[]
  selectedOption: {
    name: string;
    color?: string;
    project_id?: string;
  }
  setSelectedOption: (option: {name: string, color?: string, project_id?: string}) => void
  placeholder: string;
  disabled?: boolean;
  /** Control wiring from InputBox: id of the trigger, label and error elements. */
  id?: string;
  labelId?: string;
  errorId?: string;
  invalid?: boolean;
}

export function CustomDropdownMenu({
  options,
  selectedOption,
  setSelectedOption,
  placeholder,
  disabled,
  id,
  labelId,
  errorId,
  invalid,
}: CustomDropdownMenuProps) {
  const currentSelectedColor = options.find(option => option.name === selectedOption.name)?.color;

  return (
    <div className="w-full relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
          id={id}
          aria-labelledby={labelId && id ? `${labelId} ${id}` : undefined}
          aria-describedby={errorId}
          aria-invalid={invalid || undefined}
          variant="outline"
          className="w-full h-[40px] rounded-[10px] justify-between text-th-ink border border-th-ctl-border"
          disabled={disabled}
        >
          <div className="flex flex-row items-center justify-between w-full bg-th-card">
            {selectedOption.name != "" ? (
              <div className="flex flex-row items-center">
                {currentSelectedColor && 
                <div className={`w-[10px] h-[10px] rounded-full mr-4`} 
                style={{backgroundColor: currentSelectedColor}}
                ></div>} 
                <span className="text-sm font-normal font-ui text-th-ink">{selectedOption.name}</span>
              </div>
            ) : (
              <span className="text-sm font-normal font-ui text-th-ink">{placeholder}</span>
            )}
            <svg width="20" height="10" viewBox="0 0 22 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M1 0.5L10.2683 10.5L21 0.5" className="stroke-th-ink"/>
            </svg>

          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[244px] max-h-[286px] overflow-y-auto absolute bg-th-card [border-width:var(--edge-w)] border-th-edge" side="bottom" align="start" sideOffset={4}>
        <DropdownMenuRadioGroup
          value={selectedOption.name}
          onValueChange={(value) => {
            const selected = options.find(option => option.name === value);
            if (selected) {
              setSelectedOption({
                name: selected.name,
                color: selected.color,
                project_id: selected.project_id
              });
            }
          }}
        >
          {options.map((option, i) => (
            <React.Fragment key={option.name}>
              {option.group && option.group !== options[i - 1]?.group && (
                <DropdownMenuLabel className="px-2 pt-2 font-ui text-xs font-bold text-th-ink-note">
                  {option.group}
                </DropdownMenuLabel>
              )}
              <DropdownMenuRadioItem 
                value={option.name} 
                className="bg-th-card hover:bg-th-menu-hover"
              >
                {option.name != "" ? (
                  <>
                    {option.color && 
                    <div className={`w-[10px] h-[10px] rounded-full mr-4`} 
                    style={{backgroundColor: option.color}}
                    ></div>} 
                    <span className="text-sm font-normal font-ui text-th-ink">{option.name}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-normal font-ui">Select an option</span>
                  </>
                )}
              </DropdownMenuRadioItem>
            </React.Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
}
