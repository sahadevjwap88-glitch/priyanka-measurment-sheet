'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, Plus, Ruler } from 'lucide-react';
import type { MeasurementRow } from '@/lib/types';
import { GraniteTable } from '@/components/granite-table';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const formSchema = z.object({
  measurements: z.array(
    z.object({
      length: z.string(),
      width: z.string(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const INITIAL_ROWS = 10;
const MAX_ROWS = 100;
const LOCAL_STORAGE_KEY = 'priyanka-granite-sheet-data';

const getInitialData = (): FormValues => {
    if (typeof window === 'undefined') {
        return { measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' }) };
    }
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              return { measurements: parsedData };
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
        }
    }
    return { measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' }) };
};

export default function GraniteGridPage() {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialData(),
    mode: 'onBlur',
  });
  
  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'measurements',
  });
  
  const measurements = useWatch({ control: form.control, name: 'measurements' });

  useEffect(() => {
    if (measurements) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(measurements));
    }
  }, [measurements]);


  const handleAddRow = () => {
    if (fields.length < MAX_ROWS) {
      append({ length: '', width: '' });
    } else {
      toast({
        title: 'Row Limit Reached',
        description: `You cannot add more than ${MAX_ROWS} rows.`,
        variant: 'destructive',
      });
    }
  };

  const getValidData = () => {
    return measurements
      .map((m) => ({
        length: parseFloat(m.length),
        width: parseFloat(m.width),
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0);
  };
  
  const handleExport = () => {
    const validRows = measurements.filter(row => row.length && row.width);

    if (validRows.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'Please enter some measurements before exporting.',
        variant: 'destructive'
      });
      return;
    }
    
    const doc = new jsPDF();
    
    const tableColumn = ["Row", "Length (in)", "Width (in)", "Area (sq ft)"];
    const tableRows: (string|number)[][] = [];

    validRows.forEach((row, index) => {
        const length = parseFloat(row.length) || 0;
        const width = parseFloat(row.width) || 0;
        const area = (length * width) / 144;
        const rowData = [
            index + 1,
            length,
            width,
            area.toFixed(2)
        ];
        tableRows.push(rowData);
    });

    const totalArea = parseFloat(calculateTotalSquareFeet());
    const finalRow = ["", "Total", "", totalArea.toFixed(2)];
    tableRows.push(finalRow);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.text("Priyanka Granite Sheet", 14, 15);
    doc.save('priyanka_granite_sheet.pdf');
  };

  const calculateTotalSquareFeet = () => {
    const validData = getValidData();
    if (validData.length === 0) {
      return '0.00';
    }
    const totalAreaInches = validData.reduce((acc, m) => acc + m.length * m.width, 0);
    return (totalAreaInches / 144).toFixed(2);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Ruler className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Priyanka Granite Sheet</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Input granite slab measurements in inches, view statistics, and export your data. You can add up to {MAX_ROWS} rows. Your data is saved automatically.
        </p>
      </header>
      
      <Card>
        <div className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <h2 className="text-xl font-semibold">Measurement Data</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Square Feet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {calculateTotalSquareFeet()}
                </div>
              </CardContent>
            </Card>
            <GraniteTable
                fields={fields}
                register={form.register}
                errors={form.formState.errors}
                control={form.control}
            />
            <div className="mt-4 flex justify-start">
                <Button variant="secondary" onClick={handleAddRow} disabled={fields.length >= MAX_ROWS}>
                    <Plus className="mr-2" />
                    Add Row
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
}
