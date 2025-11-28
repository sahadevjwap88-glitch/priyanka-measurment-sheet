'use client';

import type { UseFormRegister, FieldErrors, Control, UseFieldArrayRemove } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { FieldArrayWithId } from 'react-hook-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MeasurementRow } from '@/lib/types';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import React from 'react';

interface GraniteTableProps {
  fields: FieldArrayWithId<{ measurements: MeasurementRow[] }, 'measurements', 'id'>[];
  register: UseFormRegister<{ measurements: MeasurementRow[] }>;
  errors: FieldErrors<{ measurements: MeasurementRow[] }>;
  control: Control<{ measurements: MeasurementRow[] }>;
  remove: UseFieldArrayRemove;
  setValue: (name: any, value: any) => void;
}

export function GraniteTable({ fields, register, errors, control, remove, setValue }: GraniteTableProps) {
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
    if (sourceIndex !== targetIndex && measurements) {
      const sourceData = measurements[sourceIndex];
      setValue(`measurements.${targetIndex}.length`, sourceData.length);
      setValue(`measurements.${targetIndex}.width`, sourceData.width);
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
            <TableHead className="w-[80px] px-1">Row</TableHead>
            <TableHead className="px-1">Length (in)</TableHead>
            <TableHead className="px-1">Width (in)</TableHead>
            <TableHead className="px-1">Area (sq ft)</TableHead>
            <TableHead className="w-[100px] text-right px-1">Action</TableHead>
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
              <TableCell className="font-medium px-1">{index + 1}</TableCell>
              <TableCell className="px-1">
                <Input
                  type="number"
                  placeholder="e.g., 48.5"
                  step="0.1"
                  min="0"
                  {...register(`measurements.${index}.length`)}
                  className={cn(
                    'w-full text-sm',
                    errors.measurements?.[index]?.length && 'border-destructive'
                  )}
                />
              </TableCell>
              <TableCell className="px-1">
                <Input
                  type="number"
                  placeholder="e.g., 30.2"
                  step="0.1"
                  min="0"
                  {...register(`measurements.${index}.width`)}
                  className={cn(
                    'w-full text-sm',
                    errors.measurements?.[index]?.width && 'border-destructive'
                  )}
                />
              </TableCell>
              <TableCell className="px-1">
                <Input
                  type="text"
                  readOnly
                  value={calculateSquareFeet(measurements?.[index]?.length, measurements?.[index]?.width)}
                  className="w-full bg-muted/50 border-none text-sm"
                  tabIndex={-1}
                />
              </TableCell>
              <TableCell className="text-right px-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
