
'use client';

import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { FieldArrayWithId } from 'react-hook-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MeasurementRow } from '@/lib/types';
import React, { useState } from 'react';

interface GraniteTableProps {
  fields: FieldArrayWithId<{ measurements: MeasurementRow[] }, 'measurements', 'id'>[];
  register: UseFormRegister<{ measurements: MeasurementRow[] }>;
  errors: FieldErrors<{ measurements: MeasurementRow[] }>;
  control: Control<{ measurements: MeasurementRow[] }>;
  setValue: (name: any, value: any) => void;
}

export function GraniteTable({ fields, register, errors, control, setValue }: GraniteTableProps) {
  const measurements = useWatch({ control, name: 'measurements' });
  const [touchSourceIndex, setTouchSourceIndex] = useState<number | null>(null);

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
                    setValue(`measurements.${i}.length`, sourceData.length, { shouldDirty: true });
                    setValue(`measurements.${i}.width`, sourceData.width, { shouldDirty: true });
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
  
  // Mobile Touch Events
  const handleTouchStart = (index: number) => {
    setTouchSourceIndex(index);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLTableRowElement>) => {
    if (touchSourceIndex === null) return;
    
    // Find the element where the touch ended
    const touch = e.changedTouches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = targetElement?.closest('tr');

    if (targetRow && targetRow.dataset.index) {
      const targetIndex = parseInt(targetRow.dataset.index, 10);
      if (!isNaN(targetIndex) && targetIndex !== touchSourceIndex) {
        const sourceData = measurements?.[touchSourceIndex];
        if (sourceData && sourceData.length && sourceData.width) {
          setValue(`measurements.${targetIndex}.length`, sourceData.length, { shouldDirty: true });
          setValue(`measurements.${targetIndex}.width`, sourceData.width, { shouldDirty: true });
        }
      }
    }
    
    // Reset source index
    setTouchSourceIndex(null);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[15%] px-2">Row</TableHead>
            <TableHead className="w-[27.5%] px-2">Length (in)</TableHead>
            <TableHead className="w-[27.5%] px-2">Width (in)</TableHead>
            <TableHead className="w-[30%] px-2">Area (sq ft)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow 
              key={field.id} 
              data-index={index}
              className={cn(
                'cursor-grab',
                index % 2 === 0 ? 'bg-muted/20' : '',
                touchSourceIndex === index ? 'bg-accent' : ''
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={handleDragOver}
              onTouchStart={() => handleTouchStart(index)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={() => setTouchSourceIndex(null)}
            >
              <TableCell className="font-medium px-2 py-1">{index + 1}</TableCell>
              <TableCell className="px-2 py-1">
                <Input
                  type="number"
                  placeholder="e.g., 102.5"
                  step="0.1"
                  min="0"
                  {...register(`measurements.${index}.length`)}
                  className={cn(
                    'w-full text-sm h-9 border bg-card',
                    errors.measurements?.[index]?.length && 'border-destructive'
                  )}
                />
              </TableCell>
              <TableCell className="px-2 py-1">
                <Input
                  type="number"
                  placeholder="e.g., 48.2"
                  step="0.1"
                  min="0"
                  {...register(`measurements.${index}.width`)}
                  className={cn(
                    'w-full text-sm h-9 border bg-card',
                    errors.measurements?.[index]?.width && 'border-destructive'
                  )}
                />
              </TableCell>
              <TableCell className="px-2 py-1">
                <Input
                  type="text"
                  readOnly
                  value={calculateSquareFeet(measurements?.[index]?.length, measurements?.[index]?.width)}
                  className="w-full bg-muted/50 text-sm h-9 border"
                  tabIndex={-1}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
