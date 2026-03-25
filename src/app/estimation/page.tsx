'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Download, Calculator, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import AuthGuard from '@/components/auth-guard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

function EstimationPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    // Form State
    const [partyName, setPartyName] = useState('');
    const [colorName, setColorName] = useState('');
    const [totalSft, setTotalSft] = useState('');
    const [rate, setRate] = useState('');
    const [labourCharges, setLabourCharges] = useState('');
    const [transportCharges, setTransportCharges] = useState('');
    const [discount, setDiscount] = useState('');
    
    // Settings from Profile
    const [labourRate, setLabourRate] = useState(3);
    const [minLabourCharges, setMinLabourCharges] = useState(200);
    const [businessName, setBusinessName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');

    const [isLabourManuallyEdited, setIsLabourManuallyEdited] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load Settings
    useEffect(() => {
        if (user && firestore) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef).then((docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setLabourRate(data.labourRate ?? 3);
                    setMinLabourCharges(data.minLabourCharges ?? 200);
                    setBusinessName(data.businessName || '');
                    setDisplayName(data.displayName || '');
                    setPhoneNumber(data.phoneNumber || '');
                    setAddress(data.address || '');
                }
            });
        }
    }, [user, firestore]);

    // Auto-calculate Labour
    useEffect(() => {
        if (!isLabourManuallyEdited) {
            const sft = parseFloat(totalSft);
            if (!isNaN(sft) && sft > 0) {
                const calcLabour = Math.max(minLabourCharges, sft * labourRate);
                setLabourCharges(Math.round(calcLabour).toString());
            } else {
                setLabourCharges('');
            }
        }
    }, [totalSft, labourRate, minLabourCharges, isLabourManuallyEdited]);

    // Derived values
    const sftVal = parseFloat(totalSft) || 0;
    const rateVal = parseFloat(rate) || 0;
    const labVal = parseFloat(labourCharges) || 0;
    const transVal = parseFloat(transportCharges) || 0;
    const discVal = parseFloat(discount) || 0;
    
    const subtotal = sftVal * rateVal;
    const grandTotal = subtotal + labVal + transVal - discVal;

    const handleSaveAsSale = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save.' });
            return;
        }

        if (sftVal <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Data', description: 'Total SFT must be greater than 0.' });
            return;
        }

        setIsSaving(true);
        try {
            const saleData = {
                partyName: partyName || 'Quick Estimate',
                partyPhoneNumber: '',
                labourCharges: Math.round(labVal),
                transportCharges: Math.round(transVal),
                discount: Math.round(discVal),
                sheets: [
                    {
                        id: `est_${Date.now()}`,
                        name: 'Estimation',
                        color: colorName || 'N/A',
                        rate: rateVal,
                        measurements: [{ length: totalSft, width: "144" }] // Represented as 144" width to equal SFT
                    }
                ],
                subtotal: Math.round(subtotal),
                grandTotal: Math.round(grandTotal),
                createdAt: Timestamp.now(),
                paymentType: 'cash',
                amountPaid: 0,
                balance: Math.round(grandTotal),
                payments: [],
            };

            await addDoc(collection(firestore, 'users', user.uid, 'sales'), saleData);
            toast({ title: 'Success', description: 'Estimation saved to sales records.' });
            router.push('/sales');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save estimation.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportPdf = () => {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        const today = new Date().toLocaleDateString('en-IN');
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName || 'Estimation Receipt', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${displayName} | ${phoneNumber}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

        doc.autoTable({
            startY: 30,
            body: [
                ['Customer Name:', partyName || 'N/A', 'Date:', today],
                ['Color:', colorName || 'N/A', 'Total SFT:', sftVal.toFixed(2)]
            ],
            theme: 'plain',
            styles: { fontSize: 11 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.autoTable({
            startY: finalY,
            head: [['Description', 'Amount']],
            body: [
                ['Material Cost', `Rs. ${Math.round(subtotal)}`],
                ['Labour Charges', `Rs. ${Math.round(labVal)}`],
                ['Transport Charges', `Rs. ${Math.round(transVal)}`],
                ['Discount', `- Rs. ${Math.round(discVal)}`],
                [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 14 } }, { content: `Rs. ${Math.round(grandTotal)}`, styles: { fontStyle: 'bold', fontSize: 14 } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [24, 95, 53] },
            columnStyles: { 1: { halign: 'right' } }
        });

        doc.save(`estimation_${Date.now()}.pdf`);
    };

    const handleReset = () => {
        setPartyName('');
        setColorName('');
        setTotalSft('');
        setRate('');
        setLabourCharges('');
        setTransportCharges('');
        setDiscount('');
        setIsLabourManuallyEdited(false);
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Calculator className="h-8 w-8 text-primary" />
                            Quick Estimation
                        </h1>
                        <p className="text-muted-foreground">Calculate a quick quote based on total area.</p>
                    </div>
                    <Link href="/" passHref>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Estimation Details</CardTitle>
                            <CardDescription>Enter the basic project requirements below.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="party-name">Customer Name</Label>
                                    <Input 
                                        id="party-name" 
                                        value={partyName} 
                                        onChange={(e) => setPartyName(e.target.value)} 
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color-name">Color Name</Label>
                                    <Input 
                                        id="color-name" 
                                        value={colorName} 
                                        onChange={(e) => setColorName(e.target.value)} 
                                        placeholder="e.g. Black Galaxy"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="total-sft">Total Area (SFT)</Label>
                                    <Input 
                                        id="total-sft" 
                                        type="number" 
                                        value={totalSft} 
                                        onChange={(e) => setTotalSft(e.target.value)} 
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rate">Rate per SFT (₹)</Label>
                                    <Input 
                                        id="rate" 
                                        type="number" 
                                        value={rate} 
                                        onChange={(e) => setRate(e.target.value)} 
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="labour">Labour Charges (₹)</Label>
                                    <Input 
                                        id="labour" 
                                        type="number" 
                                        value={labourCharges} 
                                        onChange={(e) => {
                                            setLabourCharges(e.target.value);
                                            setIsLabourManuallyEdited(true);
                                        }} 
                                        placeholder="Automatic..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="transport">Transport Charges (₹)</Label>
                                    <Input 
                                        id="transport" 
                                        type="number" 
                                        value={transportCharges} 
                                        onChange={(e) => setTransportCharges(e.target.value)} 
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="discount">Discount (₹)</Label>
                                    <Input 
                                        id="discount" 
                                        type="number" 
                                        value={discount} 
                                        onChange={(e) => setDiscount(e.target.value)} 
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2 bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle>Calculation Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-lg">
                                <span className="text-muted-foreground">Material Cost ({sftVal.toFixed(2)} SFT × ₹{rateVal})</span>
                                <span className="font-semibold">₹{Math.round(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg">
                                <span className="text-muted-foreground">Labour</span>
                                <span className="font-semibold">₹{Math.round(labVal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg">
                                <span className="text-muted-foreground">Transport</span>
                                <span className="font-semibold">₹{Math.round(transVal)}</span>
                            </div>
                            {discVal > 0 && (
                                <div className="flex justify-between items-center text-lg text-green-600">
                                    <span className="text-muted-foreground">Discount</span>
                                    <span className="font-semibold">- ₹{Math.round(discVal)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between items-center text-3xl font-bold pt-2">
                                <span>Grand Total</span>
                                <span className="text-primary">₹{Math.round(grandTotal)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-4">
                            <Button className="flex-1 h-12 text-lg" onClick={handleSaveAsSale} disabled={isSaving || sftVal <= 0}>
                                <Save className="mr-2 h-5 w-5" />
                                {isSaving ? 'Saving...' : 'Save as Sale'}
                            </Button>
                            <Button variant="outline" className="flex-1 h-12 text-lg" onClick={handleExportPdf} disabled={sftVal <= 0}>
                                <Download className="mr-2 h-5 w-5" />
                                Export PDF
                            </Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12 text-destructive" onClick={handleReset}>
                                <Trash2 className="h-6 w-6" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <footer className="text-center text-sm text-muted-foreground pt-8">
                    Priyanka Granites - Professional Estimation Tool
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
