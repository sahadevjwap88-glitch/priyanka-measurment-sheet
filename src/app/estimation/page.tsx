'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Calculator, Trash2, Plus } from 'lucide-react';
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
    const [discount, setDiscount] = useState('');
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
    const discVal = parseFloat(discount) || 0;
    const grandTotal = subtotal + labVal + transVal - discVal;

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
            headStyles: { fillColor: [24, 95, 53] },
            columnStyles: { 0: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });

        const lastY = (doc as any).lastAutoTable.finalY + 10;

        doc.autoTable({
            startY: lastY,
            body: [
                ['Labour Charges', `Rs. ${Math.round(labVal)}`],
                ['Transport Charges', `Rs. ${Math.round(transVal)}`],
                ['Discount', `- Rs. ${Math.round(discVal)}`],
                [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 14 } }, { content: `Rs. ${Math.round(grandTotal)}`, styles: { fontStyle: 'bold', fontSize: 14 } }]
            ],
            theme: 'plain',
            styles: { fontSize: 12 },
            columnStyles: { 0: { cellWidth: 140, halign: 'right' }, 1: { halign: 'right' } }
        });

        doc.save(`estimation_${Date.now()}.pdf`);
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
        setDiscount('');
        setIsLabourManuallyEdited(false);
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Calculator className="h-8 w-8 text-primary" />
                            Quick Estimation
                        </h1>
                        <p className="text-muted-foreground">Manual multi-item project quote.</p>
                    </div>
                    <Link href="/" passHref>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                </header>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div className="flex-1 flex items-center gap-4">
                            <Label htmlFor="customer-name" className="text-lg font-semibold whitespace-nowrap">Customer Name</Label>
                            <Input 
                                id="customer-name" 
                                value={customerName} 
                                onChange={(e) => setCustomerName(e.target.value)} 
                                className="max-w-md border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 px-0 h-8"
                                placeholder="Enter customer name"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-16 text-center">S.No</TableHead>
                                        <TableHead>Name Color</TableHead>
                                        <TableHead className="w-32 text-right">SFT</TableHead>
                                        <TableHead className="w-32 text-right">Rate</TableHead>
                                        <TableHead className="w-40 text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => {
                                        const sft = parseFloat(item.sft) || 0;
                                        const rate = parseFloat(item.rate) || 0;
                                        const itemTotal = sft * rate;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                                <TableCell>
                                                    <Input 
                                                        value={item.nameColor} 
                                                        onChange={(e) => handleItemChange(index, 'nameColor', e.target.value)}
                                                        placeholder="e.g. Black Galaxy"
                                                        className="h-8 border-none focus-visible:ring-0 px-0"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number"
                                                        value={item.sft} 
                                                        onChange={(e) => handleItemChange(index, 'sft', e.target.value)}
                                                        className="h-8 text-right border-none focus-visible:ring-0 px-0"
                                                        placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number"
                                                        value={item.rate} 
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        className="h-8 text-right border-none focus-visible:ring-0 px-0"
                                                        placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    ₹{Math.round(itemTotal)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="flex justify-start">
                            <Button variant="ghost" size="sm" onClick={addRow} className="text-primary hover:text-primary/80">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Row
                            </Button>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-end gap-4">
                                <Label htmlFor="labour" className="text-lg font-medium">Labour</Label>
                                <Input 
                                    id="labour" 
                                    type="number" 
                                    value={labourCharges} 
                                    onChange={(e) => {
                                        setLabourCharges(e.target.value);
                                        setIsLabourManuallyEdited(true);
                                    }} 
                                    className="w-48 text-right border-2 h-10 text-lg font-semibold"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-4">
                                <Label htmlFor="transport" className="text-lg font-medium">Transport</Label>
                                <Input 
                                    id="transport" 
                                    type="number" 
                                    value={transportCharges} 
                                    onChange={(e) => setTransportCharges(e.target.value)} 
                                    className="w-48 text-right border-2 h-10 text-lg font-semibold"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-4">
                                <Label htmlFor="discount" className="text-lg font-medium">Discount</Label>
                                <Input 
                                    id="discount" 
                                    type="number" 
                                    value={discount} 
                                    onChange={(e) => setDiscount(e.target.value)} 
                                    className="w-48 text-right border-2 h-10 text-lg font-semibold"
                                    placeholder="0"
                                />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-end gap-4">
                                <Label className="text-2xl font-bold">Grand Total</Label>
                                <div className="w-48 text-right px-3 py-2 bg-primary/10 rounded-md border-2 border-primary/20 text-2xl font-bold text-primary">
                                    ₹{Math.round(grandTotal)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-4 border-t pt-6">
                        <Button className="flex-1 h-12 text-lg" onClick={handleExportPdf} disabled={subtotal <= 0}>
                            <Download className="mr-2 h-5 w-5" />
                            Export PDF
                        </Button>
                        <Button variant="ghost" size="icon" className="h-12 w-12 text-destructive" onClick={handleReset}>
                            <Trash2 className="h-6 w-6" />
                        </Button>
                    </CardFooter>
                </Card>

                <footer className="text-center text-sm text-muted-foreground pt-8">
                    {businessName} - Professional Estimation Tool
                </footer>
            </div>
        </div>
    );
}

export default function EstimationPageWithAuth() {
    return (
        <AuthGuard>
            <EstimationPage />
        </AuthGuard>
    );
}