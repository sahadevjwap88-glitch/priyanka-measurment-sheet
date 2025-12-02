'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LOCAL_STORAGE_KEY } from '@/components/granite-grid-page';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

interface Measurement {
  length: string;
  width: string;
}

interface StoredData {
  partyName?: string;
  partyPhoneNumber?: string;
  color?: string;
  rate?: string;
  measurements?: Measurement[];
  labourCharges?: string;
  transportCharges?: string;
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
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;


export default function BillPage() {
  const [isClient, setIsClient] = useState(false);
  const [labourManuallyEdited, setLabourManuallyEdited] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyName: '',
      partyPhoneNumber: '',
      color: '',
      rate: '',
      labourCharges: '',
      transportCharges: '',
      measurements: [],
    },
    mode: 'onBlur',
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


  const getValidData = () => {
    const measurements = Array.isArray(watchedData.measurements) ? watchedData.measurements : [];
    return measurements
      .map((m) => ({
        length: parseFloat(m.length),
        width: parseFloat(m.width),
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0);
  };

  const calculateTotalSquareFeet = () => {
    if (!isClient) return 0;
    const validData = getValidData();
    if (validData.length === 0) {
      return 0;
    }
    const totalAreaInches = validData.reduce((acc, m) => acc + m.length * m.width, 0);
    return totalAreaInches / 144;
  };
  
  const totalArea = calculateTotalSquareFeet();

  useEffect(() => {
    if (!labourManuallyEdited && isClient) {
      const calculatedLabour = Math.max(200, totalArea * 3);
      form.setValue('labourCharges', calculatedLabour.toFixed(2), { shouldDirty: true });
    }
  }, [totalArea, isClient, labourManuallyEdited, form]);


  const rate = watchedData?.rate ? parseFloat(watchedData.rate) : 0;
  const totalAmount = totalArea * rate;
  const labourCharges = watchedData?.labourCharges ? parseFloat(watchedData.labourCharges) : 0;
  const transportCharges = watchedData?.transportCharges ? parseFloat(watchedData.transportCharges) : 0;
  const grandTotal = totalAmount + labourCharges + transportCharges;

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const date = new Date();
    const today = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
    const filename = `bill_${timestamp}.pdf`;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("INVOICE", pageWidth / 2, 20, { align: 'center' });

    // Party Details
    const details = [
        [{content: 'Party Name:', styles: {fontStyle: 'bold'}}, watchedData?.partyName || 'N/A', {content: 'Date:', styles: {fontStyle: 'bold'}}, today],
        [{content: 'Party Phone:', styles: {fontStyle: 'bold'}}, watchedData?.partyPhoneNumber || 'N.A', '', ''],
        [{content: 'Color:', styles: {fontStyle: 'bold'}}, watchedData?.color || 'N/A', '', ''],
    ];

    doc.autoTable({
        body: details,
        startY: 30,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 2 },
        columnStyles: { 
          0: { cellWidth: 35 }, 
          1: { cellWidth: 60},
          2: { cellWidth: 35 },
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY;
    
    // Summary
    const summaryData = [
      ['Total Sq. Ft.', totalArea.toFixed(2)],
      ['Rate', `Rs. ${rate.toFixed(2)}`],
      [{ content: 'Total Amount', styles: { fontStyle: 'bold' } }, { content: `Rs. ${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold' } }],
      ['Labour Charges', `Rs. ${labourCharges.toFixed(2)}`],
      ['Transport Charges', `Rs. ${transportCharges.toFixed(2)}`],
      [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 14 } }, { content: `Rs. ${grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 14 } }]
    ];
    
    doc.autoTable({
        body: summaryData,
        startY: finalY + 10,
        theme: 'plain',
        columnStyles: { 0: {cellWidth: 145, fontStyle: 'bold'}, 1: { halign: 'right' } },
        styles: { fontSize: 12, cellPadding: 2 },
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for your business!", pageWidth / 2, finalY + 20, { align: 'center' });


    doc.save(filename);
  };

  if (!isClient) {
    return null;
  }
  
  if (!watchedData) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>No bill data found. Please enter data on the main page first.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Bill Details</h1>
          <div className="flex gap-2">
            <Link href="/" passHref>
              <Button variant="outline">
                  <ArrowLeft className="mr-2" />
                  Back
              </Button>
            </Link>
            <Button onClick={handleExportPdf}>
                <Download className="mr-2" />
                Export PDF
            </Button>
          </div>
        </header>

        <div className="py-8 border rounded-lg" id="bill-content">
          
          <Card className="mb-6">
            <CardContent className="grid gap-4 pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="partyName">Party Name</Label>
                        <Input id="partyName" placeholder="Enter party name" {...form.register('partyName')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="partyPhoneNumber">Party Phone Number</Label>
                        <Input id="partyPhoneNumber" type="tel" placeholder="Enter phone number" {...form.register('partyPhoneNumber')} />
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="rate">Rate (per sq ft)</Label>
                        <Input id="rate" type="number" placeholder="Enter rate" {...form.register('rate')} />
                    </div>
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="labourCharges">Labour Charges</Label>
                        <Input 
                          id="labourCharges" 
                          type="number" 
                          placeholder="Enter labour charges" 
                          {...form.register('labourCharges')}
                          onChange={(e) => {
                            form.setValue('labourCharges', e.target.value);
                            setLabourManuallyEdited(true);
                          }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="transportCharges">Transport Charges</Label>
                        <Input id="transportCharges" type="number" placeholder="Enter transport charges" {...form.register('transportCharges')} />
                    </div>
                </div>
            </CardContent>
          </Card>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sq. Ft.</span>
                    <span>{totalArea.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{rate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Total Amount</span>
                    <span>{totalAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Labour Charges</span>
                    <span>{labourCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transport Charges</span>
                    <span>{transportCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Grand Total</span>
                    <span>{grandTotal.toFixed(2)}</span>
                </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
              <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
