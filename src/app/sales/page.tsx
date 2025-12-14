'use client';
import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

function SalesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const salesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'sales'),
            orderBy('createdAt', 'desc')
        );
    }, [user, firestore]);
    

    const { data: sales, isLoading } = useCollection(salesQuery);

    const handleRowClick = (saleId: string) => {
        router.push(`/sales/${saleId}`);
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
                
                {isLoading && (
                    <div className="text-center">Loading sales records...</div>
                )}

                {!isLoading && sales?.length === 0 && (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No sales records found.
                        </CardContent>
                    </Card>
                )}

                {!isLoading && sales && sales.length > 0 && (
                    <div className="space-y-6">
                        {sales.map(sale => (
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
                                         <div className="flex gap-4">
                                            <span>Subtotal: <span className="font-medium">₹{sale.subtotal.toFixed(2)}</span></span>
                                            <Separator orientation="vertical" className="h-5"/>
                                            <span>Labour: <span className="font-medium">₹{sale.labourCharges.toFixed(2)}</span></span>
                                            <Separator orientation="vertical" className="h-5"/>
                                            <span>Transport: <span className="font-medium">₹{sale.transportCharges.toFixed(2)}</span></span>
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
