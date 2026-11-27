'use client'
import { useState } from 'react'

const WEEKDAYS = [
    {value: 'Monday',
     label: 'M' 
    }, 
    {value: 'Tuesday',
    label: 'T'
    }, 
    {value: 'Wednesday',
    label: 'W'
    }, 
    {value: 'Thursday',
    label: 'T'
    }, 
    {value: 'Friday',
    label: 'F'
    }, 
    {value: 'Saturday',
    label: 'S'
    }, 
    {value: 'Sunday',
    label: 'S'
    }]

export default function WeekdaySelector({
  onChange,
  defaultSelected = [],
  isDisabled = false,
  labelId,
  errorId,
}: {
  onChange?: (days: string[]) => void
  defaultSelected?: string[]
  isDisabled?: boolean
  /** Control wiring from InputBox: ids of the label and error elements. */
  labelId?: string
  errorId?: string
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected)

  const toggleDay = (day: string) => {
    const updated =
      selected.includes(day)
        ? selected.filter(d => d !== day)
        : [...selected, day]

    setSelected(updated)
    onChange?.(updated)
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={errorId}
      className={`flex gap-[6px] justify-start items-center h-[40px] ${isDisabled ? 'opacity-50' : ''}`}
    >
      {WEEKDAYS.map(day => (
        <button
          key={day.value}
          type="button"
          aria-pressed={selected.includes(day.value)}
          aria-label={day.value}
          disabled={isDisabled}
          onClick={() => {
            if (!isDisabled) {
              toggleDay(day.value)
            }
          }}
          className={` rounded-full border w-[30px] h-[30px] border-th-acc-soft flex justify-center items-center ${
            selected.includes(day.value)
              ? 'bg-th-acc text-th-on-acc'
              : 'text-th-acc-t'
          } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`
        }
        >
          {day.label}
        </button>
      ))}
    </div>
  )
}
