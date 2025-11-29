'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LOCAL_STORAGE_KEY } from '@/components/granite-grid-page';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, MessageSquare } from 'lucide-react';

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

export default function BillPage() {
  const [data, setData] = useState<StoredData | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
      }
    }
  }, []);

  const getValidData = () => {
    return data?.measurements
      ?.map((m) => ({
        length: parseFloat(m.length),
        width: parseFloat(m.width),
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0) || [];
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
  
  const validRows = getValidData();
  const totalArea = calculateTotalSquareFeet();
  const rate = data?.rate ? parseFloat(data.rate) : 0;
  const totalAmount = totalArea * rate;
  const labourCharges = data?.labourCharges ? parseFloat(data.labourCharges) : 0;
  const transportCharges = data?.transportCharges ? parseFloat(data.transportCharges) : 0;
  const grandTotal = totalAmount + labourCharges + transportCharges;

  const handleSendWhatsApp = () => {
    if (!data?.partyPhoneNumber) {
        alert("Party phone number is not available.");
        return;
    }

    let phoneNumber = data.partyPhoneNumber.replace(/\s+/g, ''); // Remove spaces
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
        phoneNumber = `91${phoneNumber}`; // Assume Indian number if 10 digits
    }

    const message = `
*Priyanka Granite*
*Bill Summary*

Party Name: ${data.partyName || 'N/A'}
Color: ${data.color || 'N/A'}
-------------------------
Total Sq. Ft.: ${totalArea.toFixed(2)}
Rate: ₹${rate.toFixed(2)}
*Total Amount: ₹${totalAmount.toFixed(2)}*
-------------------------
Labour Charges: ₹${labourCharges.toFixed(2)}
Transport Charges: ₹${transportCharges.toFixed(2)}
-------------------------
*Grand Total: ₹${grandTotal.toFixed(2)}*

Thank you for your business!
    `;
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message.trim())}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Title
    doc.setFontSize(20);
    doc.text("Priyanka Granite", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text("Granite Measurement Sheet", 105, 28, { align: 'center' });

    // Party Details
    const details = [
        ['Party Name:', data?.partyName || 'N/A'],
        ['Party Phone:', data?.partyPhoneNumber || 'N/A'],
        ['Color:', data?.color || 'N/A'],
    ];
    doc.autoTable({
        body: details,
        startY: 35,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } },
    });

    // Measurements Table
    const tableData = validRows.map((row, index) => [
        index + 1,
        row.length,
        row.width,
        ((row.length * row.width) / 144).toFixed(2),
    ]);

    doc.autoTable({
      head: [['Row', 'Length (in)', 'Width (in)', 'Area (sq ft)']],
      body: tableData,
      startY: (doc as any).lastAutoTable.finalY + 10,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      didDrawPage: (data) => {
        // Footer
        const str = "Page " + doc.internal.getNumberOfPages()
        doc.setFontSize(10)
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10)
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // Summary
    const summaryData = [
      ['Total Sq. Ft.', totalArea.toFixed(2)],
      ['Rate', `Rs. ${rate.toFixed(2)}`],
      [{ content: 'Total Amount', styles: { fontStyle: 'bold' } }, `Rs. ${totalAmount.toFixed(2)}`],
      ['Labour Charges', `Rs. ${labourCharges.toFixed(2)}`],
      ['Transport Charges', `Rs. ${transportCharges.toFixed(2)}`],
      [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 12 } }, { content: `Rs. ${grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 12 } }]
    ];
    
    doc.autoTable({
        body: summaryData,
        startY: finalY + 10,
        theme: 'plain',
        columnStyles: { 1: { halign: 'right' } },
        styles: { fontSize: 10 },
    });

    doc.save('bill.pdf');
  };

  if (!isClient) {
    return null;
  }
  
  if (!data) {
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
            <Button onClick={handleSendWhatsApp} variant="outline">
                <MessageSquare className="mr-2" />
                Send via WhatsApp
            </Button>
            <Button onClick={handleExportPdf}>
                <Download className="mr-2" />
                Export PDF
            </Button>
          </div>
        </header>

        <div className="p-8 border rounded-lg" id="bill-content">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Priyanka Granite</h1>
            <p className="text-muted-foreground">Granite Measurement Sheet</p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Party Name</p>
                  <p>{data?.partyName || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Party Phone</p>
                  <p>{data?.partyPhoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Color</p>
                  <p>{data?.color || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-semibold mb-4">Measurements</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Row</TableHead>
                  <TableHead>Length (in)</TableHead>
                  <TableHead>Width (in)</TableHead>
                  <TableHead className="text-right">Area (sq ft)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validRows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{row.length}</TableCell>
                    <TableCell>{row.width}</TableCell>
                    <TableCell className="text-right">
                      {((row.length * row.width) / 144).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={3}>Total Square Feet</TableCell>
                    <TableCell className="text-right">{totalArea.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

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
