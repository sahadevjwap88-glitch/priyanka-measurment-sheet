
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
    items: { label: string; value: string; }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
}

export function Combobox({ items, value, onChange, placeholder, emptyMessage }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")

  React.useEffect(() => {
    setInputValue(value || "")
  }, [value])


  return (
    <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            // On popover close, if the input value doesn't match any item, treat it as a new entry.
            const matchingItem = items.find(item => item.label.toLowerCase() === inputValue.toLowerCase());
            if (!matchingItem && inputValue !== value) {
                onChange(inputValue);
            }
        }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || (placeholder || "Select item...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Search or type new..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                {inputValue ? `Create "${inputValue}"` : (emptyMessage || "No item found.")}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    const selectedLabel = items.find(i => i.value.toLowerCase() === currentValue.toLowerCase())?.label || currentValue;
                    onChange(selectedLabel)
                    setInputValue(selectedLabel)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value && value.toLowerCase() === item.value.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
             {inputValue && !items.some(item => item.label.toLowerCase() === inputValue.toLowerCase()) && (
                 <CommandItem
                    key={inputValue}
                    value={inputValue}
                    onSelect={(currentValue) => {
                        onChange(currentValue);
                        setInputValue(currentValue);
                        setOpen(false);
                    }}
                    >
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{inputValue}"
                </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
