
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Calculator, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import AuthGuard from '@/components/auth-guard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

interface EstimationItem {
    id: string;
    nameColor: string;
    sft: string;
    rate: string;
}

function EstimationPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    // Settings from Profile
    const [labourRate, setLabourRate] = useState(3);
    const [minLabourCharges, setMinLabourCharges] = useState(200);
    const [businessName, setBusinessName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [items, setItems] = useState<EstimationItem[]>([
        { id: '1', nameColor: '', sft: '', rate: '' },
        { id: '2', nameColor: '', sft: '', rate: '' },
        { id: '3', nameColor: '', sft: '', rate: '' },
        { id: '4', nameColor: '', sft: '', rate: '' },
        { id: '5', nameColor: '', sft: '', rate: '' },
    ]);
    const [labourCharges, setLabourCharges] = useState('');
    const [transportCharges, setTransportCharges] = useState('');
    const [isLabourManuallyEdited, setIsLabourManuallyEdited] = useState(false);

    // Load Settings
    useEffect(() => {
        if (user && firestore) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef).then((docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setLabourRate(data.labourRate ?? 3);
                    setMinLabourCharges(data.minLabourCharges ?? 200);
                    setBusinessName(data.businessName || 'Priyanka Granites');
                    setDisplayName(data.displayName || '');
                    setPhoneNumber(data.phoneNumber || '');
                }
            });
        }
    }, [user, firestore]);

    // Calculations
    const totalSft = useMemo(() => {
        return items.reduce((acc, item) => {
            const sft = parseFloat(item.sft) || 0;
            return acc + sft;
        }, 0);
    }, [items]);

    const subtotal = useMemo(() => {
        return items.reduce((acc, item) => {
            const sft = parseFloat(item.sft) || 0;
            const rate = parseFloat(item.rate) || 0;
            return acc + (sft * rate);
        }, 0);
    }, [items]);

    // Auto-calculate Labour
    useEffect(() => {
        if (!isLabourManuallyEdited) {
            if (totalSft > 0) {
                const calcLabour = Math.max(minLabourCharges, totalSft * labourRate);
                setLabourCharges(Math.round(calcLabour).toString());
            } else {
                setLabourCharges('');
            }
        }
    }, [totalSft, labourRate, minLabourCharges, isLabourManuallyEdited]);

    const labVal = parseFloat(labourCharges) || 0;
    const transVal = parseFloat(transportCharges) || 0;
    const grandTotal = subtotal + labVal + transVal;

    const handleItemChange = (index: number, field: keyof EstimationItem, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addRow = () => {
        setItems([...items, { id: Date.now().toString(), nameColor: '', sft: '', rate: '' }]);
    };

    const handleExportPdf = () => {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        const today = new Date().toLocaleDateString('en-IN');
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName || 'Quick Estimation', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${displayName} | ${phoneNumber}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

        doc.autoTable({
            startY: 30,
            body: [
                ['Customer Name:', customerName || 'N/A', 'Date:', today]
            ],
            theme: 'plain',
            styles: { fontSize: 11 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 5;

        const tableBody = items
            .filter(item => (parseFloat(item.sft) || 0) > 0)
            .map((item, idx) => [
                idx + 1,
                item.nameColor || 'N/A',
                item.sft,
                item.rate,
                Math.round((parseFloat(item.sft) || 0) * (parseFloat(item.rate) || 0))
            ]);

        doc.autoTable({
            startY: finalY,
            head: [['S.No', 'Name Color', 'SFT', 'Rate', 'Total']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 126, 0] },
            columnStyles: { 0: { halign: 'center', textColor: [255, 126, 0] }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });

        const lastY = (doc as any).lastAutoTable.finalY + 10;

        doc.autoTable({
            startY: lastY,
            body: [
                ['Labour Charges', `Rs. ${Math.round(labVal)}`],
                ['Transport Charges', `Rs. ${Math.round(transVal)}`],
                [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 14 } }, { content: `Rs. ${Math.round(grandTotal)}`, styles: { fontStyle: 'bold', fontSize: 14 } }]
            ],
            theme: 'plain',
            styles: { fontSize: 12 },
            columnStyles: { 0: { cellWidth: 140, halign: 'right' }, 1: { halign: 'right' } }
        });

        const pdfUrl = doc.output('bloburl');
        window.open(pdfUrl, '_blank');
    };

    const handleReset = () => {
        setCustomerName('');
        setItems([
            { id: '1', nameColor: '', sft: '', rate: '' },
            { id: '2', nameColor: '', sft: '', rate: '' },
            { id: '3', nameColor: '', sft: '', rate: '' },
            { id: '4', nameColor: '', sft: '', rate: '' },
            { id: '5', nameColor: '', sft: '', rate: '' },
        ]);
        setLabourCharges('');
        setTransportCharges('');
        setIsLabourManuallyEdited(false);
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-background">
                <div className="w-full space-y-0">
                    <header className="flex justify-between items-center p-2 border-b bg-card">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            Quick Estimation
                        </h1>
                        <Link href="/" passHref>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                    </header>

                    <div className="w-full">
                        <Card className="rounded-none border-0 shadow-none overflow-hidden">
                            <div className="p-2 border-b bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="customer-name" className="text-sm font-semibold whitespace-nowrap">Customer Name:</Label>
                                    <Input 
                                        id="customer-name" 
                                        value={customerName} 
                                        onChange={(e) => setCustomerName(e.target.value)} 
                                        className="flex-1 max-w-md border-b border-t-0 border-x-0 rounded-none focus-visible:ring-0 px-0 h-8 bg-transparent"
                                        placeholder="Enter customer name"
                                    />
                                </div>
                            </div>
                            <CardContent className="p-0 space-y-0">
                                <div className="border-b overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="w-12 text-center h-8 px-1 text-xs text-primary font-bold">S.No</TableHead>
                                                <TableHead className="min-w-[200px] h-8 px-2 text-xs text-primary font-bold">Name Color</TableHead>
                                                <TableHead className="w-24 text-right h-8 px-2 text-xs">SFT</TableHead>
                                                <TableHead className="w-24 text-right h-8 px-2 text-xs">Rate</TableHead>
                                                <TableHead className="w-28 text-right h-8 px-2 text-xs">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => {
                                                const sft = parseFloat(item.sft) || 0;
                                                const rate = parseFloat(item.rate) || 0;
                                                const itemTotal = sft * rate;
                                                return (
                                                    <TableRow key={item.id} className="hover:bg-muted/20">
                                                        <TableCell className="text-center font-medium py-1 px-1 h-8 text-primary">{index + 1}</TableCell>
                                                        <TableCell className="py-1 px-2 h-8">
                                                            <Input 
                                                                value={item.nameColor} 
                                                                onChange={(e) => handleItemChange(index, 'nameColor', e.target.value)}
                                                                placeholder="e.g. Black Galaxy"
                                                                className="h-7 border-none focus-visible:ring-0 px-0 w-full bg-transparent text-sm"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-1 px-2 h-8">
                                                            <Input 
                                                                type="number"
                                                                value={item.sft} 
                                                                onChange={(e) => handleItemChange(index, 'sft', e.target.value)}
                                                                className="h-7 text-right border-none focus-visible:ring-0 px-0 bg-transparent text-sm"
                                                                placeholder="0"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-1 px-2 h-8">
                                                            <Input 
                                                                type="number"
                                                                value={item.rate} 
                                                                onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                                className="h-7 text-right border-none focus-visible:ring-0 px-0 bg-transparent text-sm"
                                                                placeholder="0"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold py-1 px-2 h-8 text-sm">
                                                            ₹{Math.round(itemTotal)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                
                                <div className="flex justify-start px-2 py-2">
                                    <Button variant="ghost" size="sm" onClick={addRow} className="text-primary hover:text-primary/80 h-7 text-xs">
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Row
                                    </Button>
                                </div>

                                <div className="space-y-1 py-4 px-2 border-t bg-muted/10">
                                    <div className="flex items-center justify-end gap-3">
                                        <Label htmlFor="labour" className="text-sm font-medium">Labour</Label>
                                        <Input 
                                            id="labour" 
                                            type="number" 
                                            value={labourCharges} 
                                            onChange={(e) => {
                                                setLabourCharges(e.target.value);
                                                setIsLabourManuallyEdited(true);
                                            }} 
                                            className="w-32 text-right border h-8 text-sm font-semibold"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-3">
                                        <Label htmlFor="transport" className="text-sm font-medium">Transport</Label>
                                        <Input 
                                            id="transport" 
                                            type="number" 
                                            value={transportCharges} 
                                            onChange={(e) => setTransportCharges(e.target.value)} 
                                            className="w-32 text-right border h-8 text-sm font-semibold"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <Label className="text-lg font-bold">Grand Total</Label>
                                        <div className="w-32 text-right px-2 py-1 bg-primary/10 rounded border border-primary/20 text-lg font-bold text-primary">
                                            ₹{Math.round(grandTotal)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 p-2 bg-muted/30 border-t">
                                <Button className="flex-1 h-10 text-base" onClick={handleExportPdf} disabled={subtotal <= 0}>
                                    <Printer className="mr-2 h-5 w-5" />
                                    Print Preview
                                </Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={handleReset}>
                                    <Trash2 className="h-6 w-6" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <footer className="text-center text-xs text-muted-foreground py-4">
                        {businessName || 'Priyanka Granites'} - Professional Estimation Tool
                    </footer>
                </div>
            </div>
        </AuthGuard>
    );
}

export default function EstimationPageWithAuth() {
    return <EstimationPage />;
}
