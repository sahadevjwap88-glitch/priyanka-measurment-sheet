'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Ruler, Eye, Trash2, Download } from 'lucide-react';
import { GraniteTable } from '@/components/granite-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const formSchema = z.object({
  partyName: z.string().optional(),
  partyPhoneNumber: z.string().optional(),
  color: z.string().optional(),
  rate: z.string().optional(),
  labourCharges: z.string().optional(),
  transportCharges: z.string().optional(),
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
  partyName: '',
  partyPhoneNumber: '',
  color: '',
  rate: '',
  labourCharges: '',
  transportCharges: '',
  measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' }) 
};

export default function GraniteGridPage() {
  const { toast } = useToast();
  const [rowsToAdd, setRowsToAdd] = useState(1);
  const [isClient, setIsClient] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'measurements',
  });
  
  const watchedData = useWatch({ control: form.control });

  useEffect(() => {
    setIsClient(true);
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData) {
          form.reset(parsedData);
        }
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
      }
    }
  }, [form]);

  useEffect(() => {
    if (isClient) {
      const subscription = form.watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [isClient, form]);


  const handleAddRows = () => {
    const numRowsToAdd = Number(rowsToAdd) || 1;
    if (fields.length + numRowsToAdd > MAX_ROWS) {
      toast({
        title: 'Row Limit Exceeded',
        description: `You can only add up to ${MAX_ROWS} rows in total.`,
        variant: 'destructive',
      });
      return;
    }
    const newRows = Array(numRowsToAdd).fill({ length: '', width: '' });
    append(newRows);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      form.reset(defaultValues);
      replace(Array(INITIAL_ROWS).fill({ length: '', width: '' }));
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({
        title: 'Data Cleared',
        description: 'All measurements and details have been reset.',
      });
    }
  };
  
  const getValidData = () => {
    return watchedData.measurements
      ?.map((m) => ({
        length: parseFloat(m.length),
        width: parseFloat(m.width),
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0) || [];
  };
  
  const calculateTotalSquareFeet = () => {
    if (!isClient) return '0.00';
    const validData = getValidData();
    if (validData.length === 0) {
      return '0.00';
    }
    const totalAreaInches = validData.reduce((acc, m) => acc + m.length * m.width, 0);
    return (totalAreaInches / 144).toFixed(2);
  };
  
  const handleExportMeasurementSheet = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const validData = getValidData();

    // Title
    doc.setFontSize(20);
    doc.text("Priyanka Granite", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text("Granite Measurement Sheet", 105, 28, { align: 'center' });

    // Party Details
    const details = [
        ['Party Name:', watchedData.partyName || 'N/A'],
        ['Party Phone:', watchedData.partyPhoneNumber || 'N/A'],
        ['Color:', watchedData.color || 'N/A'],
    ];
    doc.autoTable({
        body: details,
        startY: 35,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // Measurements Table
    const tableData = validData.map((m, index) => [
        index + 1,
        m.length.toFixed(2),
        m.width.toFixed(2),
        ((m.length * m.width) / 144).toFixed(2)
    ]);
    
    doc.autoTable({
        head: [['Row', 'Length (in)', 'Width (in)', 'Area (sq ft)']],
        body: tableData,
        startY: finalY + 10,
        didDrawPage: (data) => {
            // Footer on each page
            const str = "Page " + doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Total Square Feet
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Square Feet:', 14, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(calculateTotalSquareFeet(), 55, finalY + 10);


    doc.save('measurement-sheet.pdf');
  };

  if (!isClient) {
    return null; 
  }

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
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <h2 className="text-xl font-semibold">Measurement Data</h2>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" size="sm" onClick={handleExportMeasurementSheet}>
                      <Download className="mr-2" />
                      Export Measurement Sheet
                    </Button>
                    <Link href="/bill">
                      <Button variant="outline" size="sm">
                          <Eye className="mr-2" />View Bill
                      </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={handleClearAll}>
                        <Trash2 className="mr-2" />
                        All Clear
                    </Button>
                </div>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="partyName">Party Name</Label>
                    <Input id="partyName" placeholder="Enter party name" {...form.register('partyName')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="partyPhoneNumber">Party Phone Number</Label>
                    <Input id="partyPhoneNumber" type="tel" placeholder="Enter phone number" {...form.register('partyPhoneNumber')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="color">Color Name</Label>
                    <Input id="color" placeholder="e.g., Black Pearl" {...form.register('color')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="rate">Rate (per sq ft)</Label>
                    <Input id="rate" type="number" placeholder="Enter rate" {...form.register('rate')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="labourCharges">Labour Charges</Label>
                    <Input id="labourCharges" type="number" placeholder="Enter labour charges" {...form.register('labourCharges')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="transportCharges">Transport Charges</Label>
                    <Input id="transportCharges" type="number" placeholder="Enter transport charges" {...form.register('transportCharges')} />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
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
                remove={remove}
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
