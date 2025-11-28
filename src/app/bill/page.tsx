'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LOCAL_STORAGE_KEY } from '@/components/granite-grid-page';
import { Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  const handleExportPdf = () => {
    if (!data) return;

    const doc = new jsPDF();
    const tableColumn = ["Row", "Length (in)", "Width (in)", "Area (sq ft)"];
    const tableRows: (string | number)[][] = [];

    validRows.forEach((row, index) => {
        const area = (row.length * row.width) / 144;
        const rowData = [
            index + 1,
            row.length.toFixed(2),
            row.width.toFixed(2),
            area.toFixed(2)
        ];
        tableRows.push(rowData);
    });
    
    doc.setFontSize(18);
    doc.text("Priyanka Granite", 14, 22);
    doc.setFontSize(11);
    doc.text("Granite Measurement Sheet", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Party Name: ${data.partyName || 'N/A'}`, 14, 38);
    doc.text(`Party Phone: ${data.partyPhoneNumber || 'N/A'}`, 14, 43);
    doc.text(`Color: ${data.color || 'N/A'}`, 14, 48);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      foot: [
          [{ content: 'Total Square Feet', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold' } }, { content: totalArea.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }]
      ],
      footStyles: { fillColor: [230, 230, 230] }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;

    const summaryData = [
        ['Total Sq. Ft.', totalArea.toFixed(2)],
        ['Rate', rate.toFixed(2)],
        ['Total Amount', totalAmount.toFixed(2)],
        ['Labour Charges', labourCharges.toFixed(2)],
        ['Transport Charges', transportCharges.toFixed(2)],
        ['Grand Total', grandTotal.toFixed(2)],
    ];

    (doc as any).autoTable({
        body: summaryData,
        startY: finalY + 10,
        theme: 'plain',
        tableWidth: 'wrap',
        margin: { left: doc.internal.pageSize.getWidth() - 80 },
        styles: {
            cellPadding: 1.5,
            fontSize: 10,
        },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' },
            1: { halign: 'right' }
        },
        didParseCell: function (data: any) {
            if (data.row.raw[0] === 'Grand Total') {
                data.cell.styles.fontStyle = 'bold';
                data.row.cells[1].styles.fontStyle = 'bold';
            }
        }
    });

    finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text("Thank you for your business!", 14, finalY + 15);

    doc.save(`bill_${data.partyName || 'details'}.pdf`);
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
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Bill Details</h1>
          <Button onClick={handleExportPdf} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
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
