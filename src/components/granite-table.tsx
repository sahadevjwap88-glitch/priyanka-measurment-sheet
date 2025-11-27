'use client';

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { FieldArrayWithId } from 'react-hook-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeasurementRow } from '@/lib/types';

interface GraniteTableProps {
  fields: FieldArrayWithId<{ measurements: MeasurementRow[] }, 'measurements', 'id'>[];
  register: UseFormRegister<{ measurements: MeasurementRow[] }>;
  remove: (index: number) => void;
  errors: FieldErrors<{ measurements: MeasurementRow[] }>;
}

export function GraniteTable({ fields, register, remove, errors }: GraniteTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Row</TableHead>
            <TableHead>Length (cm)</TableHead>
            <TableHead>Width (cm)</TableHead>
            <TableHead className="w-[50px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id} className={cn(index % 2 === 0 ? 'bg-muted/20' : '')}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="e.g., 120.5"
                  step="0.1"
                  min="0"
                  {...register(`measurements.${index}.length`)}
                  className={cn(
                    'w-full',
                    errors.measurements?.[index]?.length && 'border-destructive'
                  )}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="e.g., 75.2"
                  step="0.1"
                  min="0"
                  {...register(`measurements.${index}.width`)}
                  className={cn(
                    'w-full',
                    errors.measurements?.[index]?.width && 'border-destructive'
                  )}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  aria-label={`Remove row ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
