
'use client';

import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { ArrowDown } from 'lucide-react';

interface GraniteTableProps {
  fields: { id: string; length: string; width: string; }[];
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  control: Control<any>;
  setValue: (name: any, value: any, options?: any) => void;
  sheetIndex: number;
}

export function GraniteTable({ fields, register, errors, control, setValue, sheetIndex }: GraniteTableProps) {
  const measurements = useWatch({ control, name: `sheets.${sheetIndex}.measurements` });
  const [touchSourceIndex, setTouchSourceIndex] = useState<number | null>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  const calculateSquareFeet = (lengthStr: string, widthStr: string) => {
    const length = parseFloat(lengthStr);
    const width = parseFloat(widthStr);
    if (!isNaN(length) && length > 0 && !isNaN(width) && width > 0) {
      return ((length * width) / 144).toFixed(2);
    }
    return '0.00';
  };
  
  const applyCopyToRange = (sourceIndex: number, targetIndex: number) => {
     if (sourceIndex >= 0 && sourceIndex < (measurements?.length || 0)) {
        const sourceData = measurements[sourceIndex];

        if (sourceData && sourceData.length && sourceData.width) {
            const start = Math.min(sourceIndex, targetIndex);
            const end = Math.max(sourceIndex, targetIndex);

            for (let i = start; i <= end; i++) {
                if (i !== sourceIndex) {
                    setValue(`sheets.${sheetIndex}.measurements.${i}.length`, sourceData.length, { shouldDirty: true });
                    setValue(`sheets.${sheetIndex}.measurements.${i}.width`, sourceData.width, { shouldDirty: true });
                }
            }
        }
    }
  }

  // Desktop Drag & Drop
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.dataTransfer.setData('sourceIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('sourceIndex');
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    applyCopyToRange(sourceIndex, targetIndex);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };
  
  const handleTouchStart = (index: number) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
    longPressTimeout.current = setTimeout(() => {
      const sourceData = measurements?.[index];
      if (sourceData && sourceData.length && sourceData.width) {
        setTouchSourceIndex(index);
      }
      longPressTimeout.current = null;
    }, 500); // 500ms for long press
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLTableRowElement>) => {
    // If finger moves, cancel the long press
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    if (touchSourceIndex !== null) {
      e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetRow = targetElement?.closest('tr');
      if (targetRow && targetRow.dataset.index) {
        const targetIndex = parseInt(targetRow.dataset.index, 10);
        if (targetIndex !== touchSourceIndex) {
          applyCopyToRange(touchSourceIndex, targetIndex);
        }
      }
    }
  };
  
  const handleTouchEnd = () => {
    // Clear any pending long press
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    
    // Reset source index after any touch end
    setTouchSourceIndex(null);
  };
  
  const handleCopyDown = (index: number) => {
    if (index > 0 && measurements) {
      const rowAbove = measurements[index - 1];
      if (rowAbove && rowAbove.length && rowAbove.width) {
        setValue(`sheets.${sheetIndex}.measurements.${index}.length`, rowAbove.length, { shouldDirty: true });
        setValue(`sheets.${sheetIndex}.measurements.${index}.width`, rowAbove.width, { shouldDirty: true });
      }
    }
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[15%] px-2">S.No</TableHead>
            <TableHead className="w-[27.5%] px-2">Length (in)</TableHead>
            <TableHead className="w-[27.5%] px-2">Width (in)</TableHead>
            <TableHead className="w-[30%] px-2 text-center">Area (sq ft)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => {
            const currentLength = measurements?.[index]?.length;
            const currentWidth = measurements?.[index]?.width;
            const prevLength = measurements?.[index - 1]?.length;
            const prevWidth = measurements?.[index - 1]?.width;

            const hasCurrentValue = (currentLength && currentLength !== '0') || (currentWidth && currentWidth !== '0');
            const hasPrevValue = index > 0 && (prevLength && prevLength !== '0') && (prevWidth && prevWidth !== '0');
            
            const showCopyButton = hasPrevValue && !hasCurrentValue;
            
            return (
              <TableRow 
                key={field.id} 
                data-index={index}
                className={cn(
                  'cursor-grab',
                  index % 2 === 0 ? 'bg-muted/20' : '',
                  touchSourceIndex === index ? 'bg-primary/20' : ''
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={handleDragOver}
                onTouchStart={() => handleTouchStart(index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={() => {
                  if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
                  setTouchSourceIndex(null);
                }}
              >
                <TableCell 
                  className="font-medium px-2 py-1 select-none"
                >
                  {index + 1}
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Input
                    type="number"
                    placeholder="e.g., 102.5"
                    step="0.1"
                    min="0"
                    {...register(`sheets.${sheetIndex}.measurements.${index}.length`)}
                    className={cn(
                      'w-full text-sm h-9 border bg-card',
                      errors.sheets?.[sheetIndex]?.measurements?.[index]?.length && 'border-destructive'
                    )}
                  />
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Input
                    type="number"
                    placeholder="e.g., 48.2"
                    step="0.1"
                    min="0"
                    {...register(`sheets.${sheetIndex}.measurements.${index}.width`)}
                    className={cn(
                      'w-full text-sm h-9 border bg-card',
                      errors.sheets?.[sheetIndex]?.measurements?.[index]?.width && 'border-destructive'
                    )}
                  />
                </TableCell>
                <TableCell className="px-2 py-1 text-center">
                  {showCopyButton ? (
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyDown(index)}
                      className="h-8 w-full"
                    >
                      <ArrowDown className="mr-2 h-4 w-4"/>
                      Copy
                    </Button>
                  ) : (
                    <Input
                      type="text"
                      readOnly
                      value={calculateSquareFeet(currentLength, currentWidth)}
                      className="w-full bg-muted/50 text-sm h-9 border text-center"
                      tabIndex={-1}
                    />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  );
}
