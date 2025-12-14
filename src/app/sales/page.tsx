'use client';
import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

                <Card>
                    <CardHeader>
                        <CardTitle>All Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Party Name</TableHead>
                                    <TableHead className="text-right">Grand Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && sales?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">No sales records found.</TableCell>
                                    </TableRow>
                                )}
                                {sales?.map((sale) => (
                                    <TableRow key={sale.id} onClick={() => handleRowClick(sale.id)} className="cursor-pointer">
                                        <TableCell>
                                            {sale.createdAt?.toDate().toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{sale.partyName || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{Math.round(sale.grandTotal).toLocaleString('en-IN')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
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
