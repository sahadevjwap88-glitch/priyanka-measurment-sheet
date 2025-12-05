
'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LOCAL_STORAGE_KEY, SETTINGS_KEY } from '@/components/granite-grid-page';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const measurementSchema = z.object({
  length: z.string(),
  width: z.string(),
});

const sheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  rate: z.string().optional(),
  measurements: z.array(measurementSchema),
});

const formSchema = z.object({
  partyName: z.string().optional(),
  partyPhoneNumber: z.string().optional(),
  labourCharges: z.string().optional(),
  transportCharges: z.string().optional(),
  sheets: z.array(sheetSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;
type Sheet = z.infer<typeof sheetSchema>;

export default function BillPage() {
  const [isClient, setIsClient] = useState(false);
  const [labourManuallyEdited, setLabourManuallyEdited] = useState(false);
  
  // Settings state
  const [showLabourCharges, setShowLabourCharges] = useState(true);
  const [showTransportCharges, setShowTransportCharges] = useState(true);
  const [labourRate, setLabourRate] = useState(3);
  const [minLabourCharges, setMinLabourCharges] = useState(200);
  const [businessName, setBusinessName] = useState('Priyanka Granite');
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyName: '',
      partyPhoneNumber: '',
      labourCharges: '',
      transportCharges: '',
      sheets: [],
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
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setShowLabourCharges(parsedSettings.showLabourCharges);
        setShowTransportCharges(parsedSettings.showTransportCharges);
        if (parsedSettings.labourRate) setLabourRate(parsedSettings.labourRate);
        if (parsedSettings.minLabourCharges) setMinLabourCharges(parsedSettings.minLabourCharges);
        if (parsedSettings.businessName) setBusinessName(parsedSettings.businessName);
        if (parsedSettings.contactName) setContactName(parsedSettings.contactName);
        if (parsedSettings.phoneNumber) setPhoneNumber(parsedSettings.phoneNumber);
        if (parsedSettings.address) setAddress(parsedSettings.address);
      } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
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

  const calculateTotalSquareFeetForSheet = (sheet: Sheet) => {
    if (!sheet || !sheet.measurements) return 0;
    const totalAreaInches = sheet.measurements
      .map(m => ({ length: parseFloat(m.length), width: parseFloat(m.width) }))
      .filter(m => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0)
      .reduce((acc, m) => acc + m.length * m.width, 0);
    return totalAreaInches / 144;
  };

  const totalAreaAllSheets = watchedData.sheets?.reduce((acc, sheet) => acc + calculateTotalSquareFeetForSheet(sheet), 0) || 0;

  useEffect(() => {
    if (!labourManuallyEdited && isClient && showLabourCharges) {
      const calculatedLabour = Math.max(minLabourCharges, totalAreaAllSheets * labourRate);
      form.setValue('labourCharges', calculatedLabour.toFixed(2), { shouldDirty: true });
    }
  }, [totalAreaAllSheets, isClient, labourManuallyEdited, form, showLabourCharges, labourRate, minLabourCharges]);

  const subtotalAllSheets = watchedData.sheets?.reduce((acc, sheet) => {
    const rate = sheet.rate ? parseFloat(sheet.rate) : 0;
    const area = calculateTotalSquareFeetForSheet(sheet);
    return acc + (area * rate);
  }, 0) || 0;

  const labourCharges = showLabourCharges && watchedData?.labourCharges ? parseFloat(watchedData.labourCharges) : 0;
  const transportCharges = showTransportCharges && watchedData?.transportCharges ? parseFloat(watchedData.transportCharges) : 0;
  const grandTotal = subtotalAllSheets + labourCharges + transportCharges;

  const generatePdfDoc = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const date = new Date();
    const today = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    
    // Business Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const contactInfo = [contactName, phoneNumber, address].filter(Boolean).join(' | ');
    doc.text(contactInfo, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });


    // Party Details
    const details = [
        [{content: 'Party Name:', styles: {fontStyle: 'bold'}}, watchedData?.partyName || 'N/A', {content: 'Date:', styles: {fontStyle: 'bold'}}, today],
        [{content: 'Party Phone:', styles: {fontStyle: 'bold'}}, watchedData?.partyPhoneNumber || 'N.A', '', ''],
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

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Sheets Summary
    const allSheets = watchedData.sheets || [];
    const summaryBody = allSheets.map(sheet => {
      const area = calculateTotalSquareFeetForSheet(sheet);
      const rate = sheet.rate ? parseFloat(sheet.rate) : 0;
      const total = area * rate;
      return [
        sheet.color || 'N/A',
        area.toFixed(2),
        `Rs. ${rate.toFixed(2)}`,
        `Rs. ${total.toFixed(2)}`
      ];
    });

    doc.autoTable({
      head: [['Color', 'SFT', 'Rate', 'Total Amount']],
      body: summaryBody,
      startY: finalY,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' } }
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Grand Totals
    const summaryRows = [
      [{ content: 'Subtotal', styles: { fontStyle: 'bold' } }, { content: `Rs. ${subtotalAllSheets.toFixed(2)}`, styles: { fontStyle: 'bold' } }],
    ];

    if (showLabourCharges) {
      summaryRows.push(['Labour Charges', `Rs. ${labourCharges.toFixed(2)}`]);
    }
    if (showTransportCharges) {
      summaryRows.push(['Transport Charges', `Rs. ${transportCharges.toFixed(2)}`]);
    }

    summaryRows.push([{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 14 } }, { content: `Rs. ${Math.round(grandTotal).toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fontSize: 14 } }]);
    
    doc.autoTable({
        body: summaryRows,
        startY: finalY + 10,
        theme: 'plain',
        columnStyles: { 0: {cellWidth: 145, fontStyle: 'bold'}, 1: { halign: 'right' } },
        styles: { fontSize: 12, cellPadding: 2 },
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Footer
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for your business!", pageWidth / 2, finalY + 20, { align: 'center' });
    doc.text("sahadev jaat", pageWidth / 2, finalY + 25, { align: 'center' });

    return doc;
  };

  const handleExportPdf = () => {
    const doc = generatePdfDoc();
    const pdfDataUri = doc.output('dataurlstring');
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe width='100%' height='100%' src='${pdfDataUri}'></iframe>`);
      newWindow.document.title = `bill_${Date.now()}.pdf`;
    }
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
  
  const allSheets = watchedData.sheets || [];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Bill Details</h1>
          <div className="flex gap-2">
            <Link href="/" passHref>
              <Button variant="outline" size="lg">
                  <ArrowLeft className="mr-2" />
                  Back
              </Button>
            </Link>
            <Button onClick={handleExportPdf} size="lg">
                <Download className="mr-2" />
                Export PDF
            </Button>
          </div>
        </header>

        <div className="py-8 border rounded-lg" id="bill-content">
          
          <Card className="mb-6">
            <CardContent className="grid gap-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                    <Label htmlFor="partyName">Party Name</Label>
                    <Input id="partyName" placeholder="Enter party name" {...form.register('partyName')} />
                </div>
                <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                    <Label htmlFor="partyPhoneNumber">Party Phone Number</Label>
                    <Input id="partyPhoneNumber" type="tel" placeholder="Enter phone number" {...form.register('partyPhoneNumber')} />
                </div>
                {showLabourCharges && (
                  <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
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
                )}
                {showTransportCharges && (
                  <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                      <Label htmlFor="transportCharges">Transport Charges</Label>
                      <Input id="transportCharges" type="number" placeholder="Enter transport charges" {...form.register('transportCharges')} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Item Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-right">SFT</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSheets.map(sheet => {
                    const area = calculateTotalSquareFeetForSheet(sheet);
                    const rate = sheet.rate ? parseFloat(sheet.rate) : 0;
                    const total = area * rate;
                    return (
                      <TableRow key={sheet.id}>
                        <TableCell>{sheet.color || 'N/A'}</TableCell>
                        <TableCell className="text-right">{area.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{rate.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">₹{total.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-8 flex justify-end">
             <Card className="w-full max-w-md">
                <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center font-semibold">
                        <span>Subtotal</span>
                        <span>₹{Math.round(subtotalAllSheets).toLocaleString('en-IN')}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        {showLabourCharges && (
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Labour Charges</span>
                              <span className="font-medium">₹{labourCharges.toFixed(2)}</span>
                          </div>
                        )}
                        {showTransportCharges && (
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Transport Charges</span>
                              <span className="font-medium">₹{transportCharges.toFixed(2)}</span>
                          </div>
                        )}
                    </div>
                    <Separator />
                     <div className="flex justify-between items-center text-xl font-bold p-4 bg-primary/10 rounded-lg">
                        <span>Grand Total</span>
                        <span>₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                    </div>
                </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>sahadev jaat</p>
          </div>
        </div>
      </div>
    </div>
  );
}

    

    

    
