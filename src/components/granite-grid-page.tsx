'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Ruler, Eye, Download, Trash2 } from 'lucide-react';
import { GraniteTable } from '@/components/granite-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


const formSchema = z.object({
  measurements: z.array(
    z.object({
      length: z.string(),
      width: z.string(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const INITIAL_ROWS = 20;
const MAX_ROWS = 500;
export const LOCAL_STORAGE_KEY = 'priyanka-granite-sheet-data';

const defaultValues = { 
  measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' }) 
};

export default function GraniteGridPage() {
  const [rowsToAdd, setRowsToAdd] = useState(1);
  const [isClient, setIsClient] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });
  
  const { fields, append, replace } = useFieldArray({
    control: form.control,
    name: 'measurements',
  });
  
  const watchedMeasurements = useWatch({ control: form.control, name: 'measurements' });

  useEffect(() => {
    setIsClient(true);
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData && parsedData.measurements) {
          // Ensure every measurement has length and width properties
          const cleanedMeasurements = parsedData.measurements.map((m: any) => ({
            length: m?.length || '',
            width: m?.width || '',
          }));
          form.reset({ ...parsedData, measurements: cleanedMeasurements });
        } else if (parsedData) {
          form.reset({
            ...parsedData,
            measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' })
          })
        } else {
           form.reset(defaultValues);
        }
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        form.reset(defaultValues);
      }
    }
  }, [form]);

  useEffect(() => {
    if (isClient) {
      const subscription = form.watch((value) => {
        const currentData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const newData = { ...currentData, ...value };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
      });
      return () => subscription.unsubscribe();
    }
  }, [isClient, form]);


  const getValidData = useCallback(() => {
    return watchedMeasurements
      ?.map((m) => ({
        length: parseFloat(m.length),
        width: parseFloat(m.width),
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0) || [];
  }, [watchedMeasurements]);
  
  const calculateTotalSquareFeet = useCallback(() => {
    if (!isClient) return 0;
    const validData = getValidData();
    if (validData.length === 0) {
      return 0;
    }
    const totalAreaInches = validData.reduce((acc, m) => acc + m.length * m.width, 0);
    return totalAreaInches / 144;
  }, [isClient, getValidData]);

  
  const handleClearAll = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const newDefaultValues = { 
      measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' }) 
    };
    form.reset(newDefaultValues);
    replace(newDefaultValues.measurements);
  };

  const handleAddRows = () => {
    const numRowsToAdd = Number(rowsToAdd) || 1;
    if (fields.length + numRowsToAdd > MAX_ROWS) {
      alert(`You can only add up to ${MAX_ROWS} rows in total.`);
      return;
    }
    const newRows = Array(numRowsToAdd).fill({ length: '', width: '' });
    append(newRows);
  };

  const handleExportMeasurementSheet = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const date = new Date();
    const today = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
    const filename = `measurement-sheet_${timestamp}.pdf`;
    
    const tableData = fields.map((field, index) => {
      const length = form.getValues(`measurements.${index}.length`);
      const width = form.getValues(`measurements.${index}.width`);
      const area = (parseFloat(length) * parseFloat(width)) / 144;
      return [index + 1, length, width, isNaN(area) ? '0.00' : area.toFixed(2)];
    }).filter(row => row[1] && row[2]);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Measurement Sheet`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${today}`, doc.internal.pageSize.width - 20, 30, { align: 'right' });
    
    doc.autoTable({
        head: [['S.No', 'Length (in)', 'Width (in)', 'Area (sq ft)']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Square Feet: ${calculateTotalSquareFeet().toFixed(2)}`, 14, finalY + 15);
    
    doc.save(filename);
  };

  if (!isClient) {
    return null; 
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Ruler className="h-8 w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Priyanka Granite</h1>
        </div>
      </header>
      
      <Card>
        <div className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <h2 className="text-xl font-semibold">Measurement Data</h2>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/bill" passHref>
                      <Button variant="outline" size="sm">
                          <Eye className="mr-2" />View Bill
                      </Button>
                    </Link>
                    <Button variant="secondary" size="sm" onClick={handleExportMeasurementSheet}>
                      <Download className="mr-2" />
                      Export Sheet
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2" />
                          All Clear
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all your data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClearAll}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Square Feet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {calculateTotalSquareFeet().toFixed(2)}
                </div>
              </CardContent>
            </Card>
            
            <GraniteTable
                fields={fields}
                register={form.register}
                errors={form.formState.errors}
                control={form.control}
                setValue={form.setValue}
            />
            <div className="mt-4 flex flex-wrap items-center justify-start gap-4">
                <div className="flex items-center gap-2">
                    <Input 
                        type="number"
                        value={rowsToAdd}
                        onChange={(e) => setRowsToAdd(Math.max(1, parseInt(e.target.value, 10)))}
                        className="w-24 h-9"
                        min="1"
                    />
                    <Button variant="secondary" onClick={handleAddRows} disabled={fields.length >= MAX_ROWS}>
                        <Plus className="mr-2" />
                        Add Row(s)
                    </Button>
                </div>
            </div>
        </div>
      </Card>
    </div>
  );
}
