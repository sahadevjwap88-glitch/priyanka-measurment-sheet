'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LOCAL_STORAGE_KEY } from '@/components/granite-grid-page';
import { Printer } from 'lucide-react';

interface Measurement {
  length: string;
  width: string;
}

interface StoredData {
  partyName?: string;
  partyPhoneNumber?: string;
  color?: string;
  measurements?: Measurement[];
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
    if (!isClient) return '0.00';
    const validData = getValidData();
    if (validData.length === 0) {
      return '0.00';
    }
    const totalAreaInches = validData.reduce((acc, m) => acc + m.length * m.width, 0);
    return (totalAreaInches / 144).toFixed(2);
  };
  
  const validRows = getValidData();
  const totalArea = calculateTotalSquareFeet();

  const handlePrint = () => {
    window.print();
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
        <header className="flex justify-between items-center mb-8 print:hidden">
          <h1 className="text-3xl font-bold">Bill Details</h1>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print Bill
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">{totalArea}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-8 text-center text-xs text-muted-foreground">
              <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
