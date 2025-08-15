"use client"

import * as React from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/app/components/shadcn/button"
import { Calendar } from "@/app/components/shadcn/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/shadcn/popover"
import { useFormState } from "../context/FormProvider"

interface DatePickerProps {
  date?: Date
  setDate: (date: Date) => void
  customClass?: string
  placeholder?: string
}

export function DatePicker({ date, setDate, customClass, placeholder }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { userData } = useFormState();
  const handleDateSelect = (day: Date | undefined) => {
    if (day) {
      setDate(day as Date)
      setOpen(false)
    }
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-between text-left font-normal h-[40px] rounded-[10px]",
            !date && "text-muted-foreground",
            userData?.theme === 'dark' ? 'bg-foreground-dark text-white  border border-gray-800' : 'bg-white text-text'
          )}
        >
          {date ? format(date, "PPP") : <span className={`${userData?.theme === 'dark' ? 'text-white' : 'text-text'}`}>{placeholder}</span>}
          <svg width="20" height="20" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.25 4.02466H3.75C2.71447 4.02466 1.875 4.86412 1.875 5.89966V17.1497C1.875 18.1852 2.71447 19.0247 3.75 19.0247H16.25C17.2855 19.0247 18.125 18.1852 18.125 17.1497V5.89966C18.125 4.86412 17.2855 4.02466 16.25 4.02466Z" stroke="#333333" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M11.5625 10.8989C12.0803 10.8989 12.5 10.4792 12.5 9.96143C12.5 9.44366 12.0803 9.02393 11.5625 9.02393C11.0447 9.02393 10.625 9.44366 10.625 9.96143C10.625 10.4792 11.0447 10.8989 11.5625 10.8989Z" fill="#333333"/>
          <path d="M14.6875 10.8989C15.2053 10.8989 15.625 10.4792 15.625 9.96143C15.625 9.44366 15.2053 9.02393 14.6875 9.02393C14.1697 9.02393 13.75 9.44366 13.75 9.96143C13.75 10.4792 14.1697 10.8989 14.6875 10.8989Z" fill="#333333"/>
          <path d="M11.5625 14.0239C12.0803 14.0239 12.5 13.6042 12.5 13.0864C12.5 12.5687 12.0803 12.1489 11.5625 12.1489C11.0447 12.1489 10.625 12.5687 10.625 13.0864C10.625 13.6042 11.0447 14.0239 11.5625 14.0239Z" fill="#333333"/>
          <path d="M14.6875 14.0239C15.2053 14.0239 15.625 13.6042 15.625 13.0864C15.625 12.5687 15.2053 12.1489 14.6875 12.1489C14.1697 12.1489 13.75 12.5687 13.75 13.0864C13.75 13.6042 14.1697 14.0239 14.6875 14.0239Z" fill="#333333"/>
          <path d="M5.3125 14.0239C5.83027 14.0239 6.25 13.6042 6.25 13.0864C6.25 12.5687 5.83027 12.1489 5.3125 12.1489C4.79473 12.1489 4.375 12.5687 4.375 13.0864C4.375 13.6042 4.79473 14.0239 5.3125 14.0239Z" fill="#333333"/>
          <path d="M8.4375 14.0239C8.95527 14.0239 9.375 13.6042 9.375 13.0864C9.375 12.5687 8.95527 12.1489 8.4375 12.1489C7.91973 12.1489 7.5 12.5687 7.5 13.0864C7.5 13.6042 7.91973 14.0239 8.4375 14.0239Z" fill="#333333"/>
          <path d="M5.3125 17.1489C5.83027 17.1489 6.25 16.7292 6.25 16.2114C6.25 15.6937 5.83027 15.2739 5.3125 15.2739C4.79473 15.2739 4.375 15.6937 4.375 16.2114C4.375 16.7292 4.79473 17.1489 5.3125 17.1489Z" fill="#333333"/>
          <path d="M8.4375 17.1489C8.95527 17.1489 9.375 16.7292 9.375 16.2114C9.375 15.6937 8.95527 15.2739 8.4375 15.2739C7.91973 15.2739 7.5 15.6937 7.5 16.2114C7.5 16.7292 7.91973 17.1489 8.4375 17.1489Z" fill="#333333"/>
          <path d="M11.5625 17.1489C12.0803 17.1489 12.5 16.7292 12.5 16.2114C12.5 15.6937 12.0803 15.2739 11.5625 15.2739C11.0447 15.2739 10.625 15.6937 10.625 16.2114C10.625 16.7292 11.0447 17.1489 11.5625 17.1489Z" fill="#333333"/>
          <path d="M15 2.77393V4.02393M5 2.77393V4.02393V2.77393Z" stroke="#333333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18.125 7.14966H1.875" stroke="#333333" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`w-auto p-0 ${customClass} `}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          className={userData?.theme === 'dark' ? 'bg-foreground-dark text-white  border border-gray-800' : 'bg-white text-text'}
        />
      </PopoverContent>
    </Popover>
  )
}
