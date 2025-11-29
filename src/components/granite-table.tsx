
'use client';

import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { FieldArrayWithId } from 'react-hook-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MeasurementRow } from '@/lib/types';
import React from 'react';

interface GraniteTableProps {
  fields: FieldArrayWithId<{ measurements: MeasurementRow[] }, 'measurements', 'id'>[];
  register: UseFormRegister<{ measurements: MeasurementRow[] }>;
  errors: FieldErrors<{ measurements: MeasurementRow[] }>;
  control: Control<{ measurements: MeasurementRow[] }>;
  setValue: (name: any, value: any) => void;
}

export function GraniteTable({ fields, register, errors, control, setValue }: GraniteTableProps) {
  const measurements = useWatch({ control, name: 'measurements' });

  const calculateSquareFeet = (lengthStr: string, widthStr: string) => {
    const length = parseFloat(lengthStr);
    const width = parseFloat(widthStr);
    if (!isNaN(length) && length > 0 && !isNaN(width) && width > 0) {
      return ((length * width) / 144).toFixed(2);
    }
    return '0.00';
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.dataTransfer.setData('sourceIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
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
    e.preventDefault();
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-2 w-[15%]">Row</TableHead>
            <TableHead className="px-2 w-[25%]">Length (in)</TableHead>
            <TableHead className="px-2 w-[25%]">Width (in)</TableHead>
            <TableHead className="px-2 w-[35%]">Area (sq ft)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow 
              key={field.id} 
              className={cn(index % 2 === 0 ? 'bg-muted/20' : '', 'cursor-grab')}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={handleDragOver}
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
                    'w-full text-sm h-9',
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
                    'w-full text-sm h-9',
                    errors.measurements?.[index]?.width && 'border-destructive'
                  )}
                />
              </TableCell>
              <TableCell className="px-2 py-1">
                <Input
                  type="text"
                  readOnly
                  value={calculateSquareFeet(measurements?.[index]?.length, measurements?.[index]?.width)}
                  className="w-full bg-muted/50 text-sm h-9"
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
