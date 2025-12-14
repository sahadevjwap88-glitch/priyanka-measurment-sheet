'use client';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/auth-guard';

function SaleDetailPage() {
    const { saleId } = useParams();
    const { user } = useUser();
    const firestore = useFirestore();

    const saleDocRef = useMemoFirebase(() => {
        if (!user || !saleId) return null;
        return doc(firestore, 'users', user.uid, 'sales', Array.isArray(saleId) ? saleId[0] : saleId);
    }, [user, firestore, saleId]);

    const { data: sale, isLoading } = useDoc(saleDocRef);
    
    const calculateTotalSquareFeetForSheet = (sheet: any) => {
        if (!sheet || !sheet.measurements) return 0;
        const totalAreaInches = sheet.measurements
            .map((m: any) => ({ length: parseFloat(m.length), width: parseFloat(m.width) }))
            .filter((m: any) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0)
            .reduce((acc: number, m: any) => acc + m.length * m.width, 0);
        return totalAreaInches / 144;
    };


    if (isLoading) return <p className="text-center p-8">Loading sale details...</p>;
    if (!sale) return <p className="text-center p-8">Sale not found.</p>;

    const saleDate = sale.createdAt?.toDate().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    return (
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <h1 className="text-3xl font-bold">Sale Details</h1>
                    <Link href="/sales" passHref>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2" />
                            Back to Sales
                        </Button>
                    </Link>
                </header>

                <div className="py-8 border rounded-lg" id="bill-content">
                    <Card className="mb-6">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><span className="font-semibold">Party Name:</span> {sale.partyName || 'N/A'}</div>
                                <div><span className="font-semibold">Date:</span> {saleDate}</div>
                                <div><span className="font-semibold">Party Phone:</span> {sale.partyPhoneNumber || 'N/A'}</div>
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
                                    {sale.sheets.map((sheet: any) => {
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
                                    <span>₹{Math.round(sale.subtotal).toLocaleString('en-IN')}</span>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    {sale.labourCharges > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Labour Charges</span>
                                            <span className="font-medium">₹{sale.labourCharges.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {sale.transportCharges > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Transport Charges</span>
                                            <span className="font-medium">₹{sale.transportCharges.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-xl font-bold p-4 bg-primary/10 rounded-lg">
                                    <span>Grand Total</span>
                                    <span>₹{Math.round(sale.grandTotal).toLocaleString('en-IN')}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SaleDetailPageWithAuth() {
    return (
        <AuthGuard>
            <SaleDetailPage />
        </AuthGuard>
    );
}
