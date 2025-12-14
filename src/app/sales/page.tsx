
'use client';
import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon, Download } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Label } from '@/components/ui/label';

interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
}


function SalesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const salesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'sales'),
            orderBy('createdAt', 'desc')
        );
    }, [user, firestore]);
    

    const { data: sales, isLoading } = useCollection(salesQuery);

    const filteredSales = useMemo(() => {
        if (!sales) return [];
        return sales.filter(sale => {
            const saleDate = sale.createdAt?.toDate();
            if (!saleDate) return false;

            const start = startDate ? new Date(startDate.setHours(0, 0, 0, 0)) : null;
            const end = endDate ? new Date(endDate.setHours(23, 59, 59, 999)) : null;

            if (start && saleDate < start) return false;
            if (end && saleDate > end) return false;
            
            return true;
        });
    }, [sales, startDate, endDate]);

    const handleRowClick = (saleId: string) => {
        router.push(`/sales/${saleId}`);
    };

    const handleExportReport = () => {
        if (filteredSales.length === 0) {
            alert("No sales to export in the selected date range.");
            return;
        }

        const doc = new jsPDF() as jsPDFWithAutoTable;
        doc.setFontSize(18);
        doc.text("Sales Report", 14, 22);
        doc.setFontSize(11);
        doc.text(`Date Range: ${startDate ? format(startDate, 'PPP') : 'N/A'} - ${endDate ? format(endDate, 'PPP') : 'N/A'}`, 14, 30);
        
        const tableColumn = ["Date", "Party Name", "Subtotal", "Labour", "Transport", "Discount", "Grand Total"];
        const tableRows: any[][] = [];

        let totalSubtotal = 0;
        let totalLabour = 0;
        let totalTransport = 0;
        let totalDiscount = 0;
        let totalGrandTotal = 0;

        filteredSales.forEach(sale => {
            const saleDate = sale.createdAt?.toDate() ? format(sale.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A';
            const rowData = [
                saleDate,
                sale.partyName || 'N/A',
                sale.subtotal.toFixed(2),
                sale.labourCharges.toFixed(2),
                sale.transportCharges.toFixed(2),
                (sale.discount || 0).toFixed(2),
                Math.round(sale.grandTotal).toLocaleString('en-IN')
            ];
            tableRows.push(rowData);
            totalSubtotal += sale.subtotal;
            totalLabour += sale.labourCharges;
            totalTransport += sale.transportCharges;
            totalDiscount += sale.discount || 0;
            totalGrandTotal += sale.grandTotal;
        });

        // Add total row
        const totalRow = [
            { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold' } },
            { content: totalSubtotal.toFixed(2), styles: { fontStyle: 'bold' } },
            { content: totalLabour.toFixed(2), styles: { fontStyle: 'bold' } },
            { content: totalTransport.toFixed(2), styles: { fontStyle: 'bold' } },
            { content: totalDiscount.toFixed(2), styles: { fontStyle: 'bold' } },
            { content: Math.round(totalGrandTotal).toLocaleString('en-IN'), styles: { fontStyle: 'bold' } }
        ];
        tableRows.push(totalRow);


        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            didDrawPage: (data) => {
                // Footer
                doc.setFontSize(10);
                const pageCount = doc.internal.pages.length;
                doc.text(`Page ${data.pageNumber} of ${pageCount - 1}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        doc.save(`sales_report_${timestamp}.pdf`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <h1 className="text-3xl font-bold">Sales Records</h1>
                     <Link href="/" passHref>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                </header>

                <Card className="mb-8">
                    <CardContent className="p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label>From</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="flex items-center gap-2">
                            <Label>To</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={handleExportReport} size="sm" className="ml-auto">
                            <Download className="mr-2 h-4 w-4" />
                            Export Report
                        </Button>
                    </CardContent>
                </Card>
                
                {isLoading && (
                    <div className="text-center">Loading sales records...</div>
                )}

                {!isLoading && filteredSales.length === 0 && (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No sales records found for the selected date range.
                        </CardContent>
                    </Card>
                )}

                {!isLoading && filteredSales.length > 0 && (
                    <div className="space-y-6">
                        {filteredSales.map(sale => (
                            <Card key={sale.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRowClick(sale.id)}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>{sale.partyName || 'N/A'}</CardTitle>
                                            <CardDescription>
                                                {sale.createdAt?.toDate().toLocaleDateString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </CardDescription>
                                        </div>
                                         <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Grand Total</p>
                                            <p className="text-2xl font-bold">₹{Math.round(sale.grandTotal).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Color</TableHead>
                                                <TableHead className="text-right">Rate</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sale.sheets?.map((sheet: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>{sheet.color || 'N/A'}</TableCell>
                                                    <TableCell className="text-right">₹{parseFloat(sheet.rate || '0').toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
                                    <div className="flex justify-between w-full text-sm">
                                         <div className="flex gap-4 flex-wrap">
                                            <span>Subtotal: <span className="font-medium">₹{sale.subtotal.toFixed(2)}</span></span>
                                            <Separator orientation="vertical" className="h-5"/>
                                            <span>Labour: <span className="font-medium">₹{sale.labourCharges.toFixed(2)}</span></span>
                                            <Separator orientation="vertical" className="h-5"/>
                                            <span>Transport: <span className="font-medium">₹{sale.transportCharges.toFixed(2)}</span></span>
                                            {sale.discount > 0 && (
                                                <>
                                                 <Separator orientation="vertical" className="h-5"/>
                                                 <span>Discount: <span className="font-medium text-green-600">- ₹{sale.discount.toFixed(2)}</span></span>
                                                </>
                                            )}
                                         </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SalesPageWithAuth() {
    return (
        <AuthGuard>
            <SalesPage />
        </AuthGuard>
    );
}
