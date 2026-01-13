
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon, Download, Settings, Search, X } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
}


function SalesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    
    // State for date picker inputs
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [searchTerm, setSearchTerm] = useState('');

    const [columns, setColumns] = useState({
        date: true,
        partyName: true,
        colorName: true,
        sft: true,
        rate: true,
        subtotal: true,
        labour: true,
        transport: true,
        discount: true,
        grandTotal: true,
      });

    const salesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'sales'),
            orderBy('createdAt', 'desc')
        );
    }, [user, firestore]);
    

    const { data: sales, isLoading } = useCollection(salesQuery);

    const handleClearFilter = () => {
        setStartDate(undefined);
        setEndDate(undefined);
        setSearchTerm('');
    };

    const filteredSales = useMemo(() => {
        if (!sales) return [];
        return sales.filter(sale => {
            const saleDate = sale.createdAt?.toDate();
            if (!saleDate) return false;

            // Date filter
            let start = null;
            if (startDate) {
                start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
            }

            let end = null;
            if (endDate) {
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
            }

            if (start && saleDate < start) return false;
            if (end && saleDate > end) return false;

            // Search term filter
            if (searchTerm && !sale.partyName?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            
            return true;
        });
    }, [sales, startDate, endDate, searchTerm]);

    const handleRowClick = (saleId: string) => {
        router.push(`/sales/${saleId}`);
    };
    
    const calculateTotalSquareFeetForSheet = (sheet: any) => {
        if (!sheet || !sheet.measurements) return 0;
        const totalAreaInches = sheet.measurements
            .map((m: any) => ({ length: parseFloat(m.length), width: parseFloat(m.width) }))
            .filter((m: any) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0)
            .reduce((acc: number, m: any) => acc + m.length * m.width, 0);
        return totalAreaInches / 144;
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
        
        const tableColumn: string[] = [];
        if (columns.date) tableColumn.push("Date");
        if (columns.partyName) tableColumn.push("Party Name");
        if (columns.colorName) tableColumn.push("Color Name");
        if (columns.sft) tableColumn.push("SFT");
        if (columns.rate) tableColumn.push("Rate");
        if (columns.subtotal) tableColumn.push("Subtotal");
        if (columns.labour) tableColumn.push("Labour");
        if (columns.transport) tableColumn.push("Transport");
        if (columns.discount) tableColumn.push("Discount");
        if (columns.grandTotal) tableColumn.push("Grand Total");
        
        const tableRows: any[][] = [];

        let totalSft = 0;
        let totalSubtotal = 0;
        let totalLabour = 0;
        let totalTransport = 0;
        let totalDiscount = 0;
        let totalGrandTotal = 0;

        filteredSales.forEach(sale => {
            const saleDate = sale.createdAt?.toDate() ? format(sale.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A';
            if (sale.sheets && sale.sheets.length > 0) {
                sale.sheets.forEach((sheet: any, index: number) => {
                    const sft = calculateTotalSquareFeetForSheet(sheet);
                    const rate = parseFloat(sheet.rate || '0');
                    const itemSubtotal = sft * rate;
                    
                    const isFirstSheet = index === 0;

                    const rowData = [];
                    if (columns.date) rowData.push(isFirstSheet ? saleDate : '');
                    if (columns.partyName) rowData.push(isFirstSheet ? sale.partyName || 'N/A' : '');
                    if (columns.colorName) rowData.push(sheet.color || 'N/A');
                    if (columns.sft) rowData.push(sft.toFixed(2));
                    if (columns.rate) rowData.push(Math.round(rate));
                    if (columns.subtotal) rowData.push(Math.round(itemSubtotal));
                    
                    if (isFirstSheet) {
                        if (columns.labour) rowData.push(Math.round(sale.labourCharges));
                        if (columns.transport) rowData.push(Math.round(sale.transportCharges));
                        if (columns.discount) rowData.push(Math.round(sale.discount || 0));
                        if (columns.grandTotal) rowData.push(Math.round(sale.grandTotal));
                    } else {
                        // For subsequent rows of the same sale, leave these columns blank
                        const emptyColsNeeded = [columns.labour, columns.transport, columns.discount, columns.grandTotal].filter(Boolean).length;
                        for(let i=0; i < emptyColsNeeded; i++) {
                            rowData.push('');
                        }
                    }
                    
                    tableRows.push(rowData);
                });
            } else {
                 const rowData = [];
                 if (columns.date) rowData.push(saleDate);
                 if (columns.partyName) rowData.push(sale.partyName || 'N/A');
                 if (columns.colorName) rowData.push('N/A');
                 if (columns.sft) rowData.push('0.00');
                 if (columns.rate) rowData.push('0');
                 if (columns.subtotal) rowData.push(Math.round(sale.subtotal));
                 if (columns.labour) rowData.push(Math.round(sale.labourCharges));
                 if (columns.transport) rowData.push(Math.round(sale.transportCharges));
                 if (columns.discount) rowData.push(Math.round(sale.discount || 0));
                 if (columns.grandTotal) rowData.push(Math.round(sale.grandTotal));
                 tableRows.push(rowData);
            }

            totalSft += sale.sheets.reduce((acc: number, sheet: any) => acc + calculateTotalSquareFeetForSheet(sheet), 0);
            totalSubtotal += sale.subtotal;
            totalLabour += sale.labourCharges;
            totalTransport += sale.transportCharges;
            totalDiscount += sale.discount || 0;
            totalGrandTotal += sale.grandTotal;
        });

        const totalRow: any[] = [];
        const colSpan = (columns.date ? 1 : 0) + (columns.partyName ? 1 : 0) + (columns.colorName ? 1 : 0) -1;
        
        if (colSpan >= 0) {
            totalRow.push({ content: 'Grand Total', colSpan: colSpan + 1, styles: { fontStyle: 'bold' } });
        }
        
        if (columns.sft) totalRow.push({ content: totalSft.toFixed(2), styles: { fontStyle: 'bold' } });
        if (columns.rate) totalRow.push(''); // No total for rate
        if (columns.subtotal) totalRow.push({ content: Math.round(totalSubtotal), styles: { fontStyle: 'bold' } });
        if (columns.labour) totalRow.push({ content: Math.round(totalLabour), styles: { fontStyle: 'bold' } });
        if (columns.transport) totalRow.push({ content: Math.round(totalTransport), styles: { fontStyle: 'bold' } });
        if (columns.discount) totalRow.push({ content: Math.round(totalDiscount), styles: { fontStyle: 'bold' } });
        if (columns.grandTotal) totalRow.push({ content: Math.round(totalGrandTotal), styles: { fontStyle: 'bold' } });

        if(totalRow.some(c => c.content !== undefined && c.content !== '')){
             tableRows.push(totalRow);
        }

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

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

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
                    <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full md:w-auto">
                             <Label htmlFor='customer-search' className="sr-only">Search Customer</Label>
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="customer-search"
                                    placeholder="Search by customer name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                             </div>
                        </div>

                        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
                            <Label>From</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : <span>Start date</span>}
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
                         <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
                            <Label>To</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : <span>End date</span>}
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
                        
                        <div className="flex gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.keys(columns).map((key) => {
                                        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={key}
                                                checked={columns[key as keyof typeof columns]}
                                                onCheckedChange={(checked) => setColumns(prev => ({...prev, [key]: checked}))}
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                {formattedKey}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={handleExportReport} size="icon" variant="outline">
                                <Download className="h-4 w-4" />
                            </Button>
                             {(startDate || endDate || searchTerm) && (
                                <Button onClick={handleClearFilter} size="icon" variant="ghost">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                {isLoading && (
                    <div className="text-center">Loading sales records...</div>
                )}

                {!isLoading && filteredSales.length === 0 && (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No sales records found for the selected criteria.
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
                                            <div className="flex items-center justify-end gap-2">
                                                {sale.paymentType === 'credit' && (
                                                    <Badge variant={sale.balance > 0 ? 'destructive' : 'secondary'}>
                                                        {sale.balance > 0 ? `DUE: ₹${Math.round(sale.balance)}` : 'PAID'}
                                                    </Badge>
                                                )}
                                                 {sale.paymentType === 'cash' && (
                                                    <Badge variant="secondary">CASH</Badge>
                                                )}
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Grand Total</p>
                                                    <p className="text-2xl font-bold">₹{Math.round(sale.grandTotal)}</p>
                                                </div>
                                            </div>
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
                                                    <TableCell className="text-right">₹{Math.round(parseFloat(sheet.rate || '0'))}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
                                    <div className="flex justify-between w-full text-sm">
                                         <div className="flex gap-4 flex-wrap">
                                            <span>Subtotal: <span className="font-medium">₹{Math.round(sale.subtotal)}</span></span>
                                            <Separator orientation="vertical" className="h-5"/>
                                            <span>Labour: <span className="font-medium">₹{Math.round(sale.labourCharges)}</span></span>
                                            <Separator orientation="vertical" className="h-5"/>
                                            <span>Transport: <span className="font-medium">₹{Math.round(sale.transportCharges)}</span></span>
                                            {sale.discount > 0 && (
                                                <>
                                                 <Separator orientation="vertical" className="h-5"/>
                                                 <span>Discount: <span className="font-medium">₹{Math.round(sale.discount)}</span></span>
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
