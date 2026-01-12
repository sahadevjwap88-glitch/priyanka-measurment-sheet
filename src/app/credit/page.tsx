
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDoc, doc, updateDoc, arrayUnion, Timestamp, setDoc, getDocs, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
}

interface CustomerSummary {
    partyName: string;
    totalDue: number;
    sales: any[];
}


function CreditPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editingPayment, setEditingPayment] = useState<any | null>(null);
    const [editingPaymentAmount, setEditingPaymentAmount] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (selectedSaleForPayment) {
            setPaymentAmount(Math.round(selectedSaleForPayment.balance).toString() || '');
        }
    }, [selectedSaleForPayment]);


    const salesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'sales'),
            orderBy('createdAt', 'desc')
        );
    }, [user, firestore]);
    

    const { data: sales, isLoading } = useCollection(salesQuery);

    const customerSummaries = useMemo(() => {
        if (!sales) return [];
        const summaries: { [key: string]: CustomerSummary } = {};

        sales.forEach(sale => {
            if (sale.paymentType === 'credit' && sale.balance > 0) {
                const partyName = sale.partyName || 'Unknown Customer';
                if (!summaries[partyName]) {
                    summaries[partyName] = { partyName, totalDue: 0, sales: [] };
                }
                summaries[partyName].totalDue += sale.balance;
                summaries[partyName].sales.push(sale);
            }
        });

        return Object.values(summaries).sort((a, b) => b.totalDue - a.totalDue);
    }, [sales]);
    
    const allPaymentsQuery = useMemoFirebase(() => {
        if (!user) return null;
        // This is a collection group query to get all payments across all sales for a user
        // Note: This requires a Firestore index. 
        // The error message from Firestore will contain a link to create it if it's missing.
        return query(collection(firestore, `users/${user.uid}/sales`));
    }, [user, firestore]);

    const { data: allSalesWithPayments, isLoading: isLoadingPayments } = useCollection(allPaymentsQuery);
    
    const paymentHistory = useMemo(() => {
        if (!allSalesWithPayments) return [];
        const payments: any[] = [];
        allSalesWithPayments.forEach(sale => {
            if (sale.payments && sale.payments.length > 0) {
                sale.payments.forEach((p: any) => {
                    payments.push({
                        ...p,
                        saleId: sale.id,
                        partyName: sale.partyName,
                        saleDate: sale.createdAt.toDate()
                    });
                });
            }
        });
        return payments.sort((a, b) => b.date.toDate() - a.date.toDate());
    }, [allSalesWithPayments]);

    const filteredPaymentHistory = useMemo(() => {
        if (!paymentHistory) return [];
        return paymentHistory.filter(p => 
            p.partyName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [paymentHistory, searchTerm]);


    const handleRecordPayment = async () => {
        if (!selectedSaleForPayment || !paymentAmount || isSubmitting) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid payment amount.' });
            return;
        }

        if (amount > selectedSaleForPayment.balance) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: `Payment cannot exceed the outstanding balance of ₹${Math.round(selectedSaleForPayment.balance)}.` });
            return;
        }
        
        setIsSubmitting(true);
        const saleDocRef = doc(firestore, 'users', user.uid, 'sales', selectedSaleForPayment.id);

        try {
            const newBalance = selectedSaleForPayment.balance - amount;
            const newAmountPaid = selectedSaleForPayment.amountPaid + amount;

            const newPayment = {
                id: `payment_${Date.now()}`,
                amount: Math.round(amount),
                date: Timestamp.now()
            };

            await updateDoc(saleDocRef, {
                balance: newBalance,
                amountPaid: newAmountPaid,
                payments: arrayUnion(newPayment)
            });

            toast({ title: 'Success', description: 'Payment recorded successfully!' });
            setSelectedSaleForPayment(null);
            setPaymentAmount('');

        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to record payment.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStartEditPayment = (payment: any) => {
        setEditingPayment(payment);
        setEditingPaymentAmount(Math.round(payment.amount).toString());
    };

    const handleCancelEdit = () => {
        setEditingPayment(null);
        setEditingPaymentAmount('');
    };
    
    const handleUpdatePayment = async () => {
        if (!editingPayment || !user) return;

        const updatedAmount = parseFloat(editingPaymentAmount);
        if (isNaN(updatedAmount) || updatedAmount < 0) {
            toast({ title: 'Invalid amount', variant: 'destructive' });
            return;
        }

        const saleDocRef = doc(firestore, `users/${user.uid}/sales/${editingPayment.saleId}`);
        
        try {
            const saleDoc = await getDoc(saleDocRef);
            if (!saleDoc.exists()) {
                toast({ title: 'Sale not found', variant: 'destructive' });
                return;
            }

            const saleData = saleDoc.data();
            const originalPayment = saleData.payments.find((p: any) => p.id === editingPayment.id);
            if (!originalPayment) {
                 toast({ title: 'Original payment not found', variant: 'destructive' });
                return;
            }
            
            const amountDifference = updatedAmount - originalPayment.amount;

            // Prevent updating if it makes balance negative
            if (saleData.balance - amountDifference < 0) {
                toast({ title: 'Invalid amount', description: 'Update would result in a negative balance for the sale.', variant: 'destructive'});
                return;
            }

            const updatedPayments = saleData.payments.map((p: any) => 
                p.id === editingPayment.id ? { ...p, amount: Math.round(updatedAmount) } : p
            );

            await updateDoc(saleDocRef, {
                payments: updatedPayments,
                amountPaid: saleData.amountPaid + amountDifference,
                balance: saleData.balance - amountDifference,
            });

            toast({ title: 'Payment updated' });
            setEditingPayment(null);

        } catch (error) {
            console.error("Error updating payment: ", error);
            toast({ title: 'Error updating payment', variant: 'destructive' });
        }
    };

    const handleDeletePayment = async (paymentToDelete: any) => {
        if (!paymentToDelete || !user) return;

        const saleDocRef = doc(firestore, `users/${user.uid}/sales/${paymentToDelete.saleId}`);
         try {
            const saleDoc = await getDoc(saleDocRef);
            if (!saleDoc.exists()) {
                toast({ title: 'Sale not found', variant: 'destructive' });
                return;
            }
            const saleData = saleDoc.data();
            const paymentExists = saleData.payments.find((p: any) => p.id === paymentToDelete.id);
             if (!paymentExists) {
                toast({ title: 'Payment not found in sale', variant: 'destructive' });
                return;
            }
            
            const remainingPayments = saleData.payments.filter((p: any) => p.id !== paymentToDelete.id);
            const amountDifference = -paymentToDelete.amount;

            await updateDoc(saleDocRef, {
                payments: remainingPayments,
                amountPaid: saleData.amountPaid + amountDifference,
                balance: saleData.balance - amountDifference,
            });

            toast({ title: 'Payment deleted' });
        } catch (error) {
            console.error("Error deleting payment: ", error);
            toast({ title: 'Error deleting payment', variant: 'destructive' });
        }
    };

    const handleExportCreditReport = () => {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        doc.setFontSize(18);
        doc.text("Credit Report", 14, 22);

        // Customer Dues Summary
        doc.setFontSize(14);
        doc.text("Customer Dues Summary", 14, 32);
        
        let tableRows = customerSummaries.map(summary => [summary.partyName, `₹${Math.round(summary.totalDue)}`]);
        
        doc.autoTable({
            head: [['Customer', 'Total Due']],
            body: tableRows,
            startY: 35,
        });

        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        doc.save(`credit_report_${timestamp}.pdf`);
    };

    const handleExportPaymentHistory = () => {
        if (paymentHistory.length === 0) {
            toast({variant: 'destructive', title: 'No History', description: 'There is no payment history to export.'});
            return;
        }
        const doc = new jsPDF() as jsPDFWithAutoTable;
        doc.setFontSize(18);
        doc.text("Full Payment History", 14, 22);
        
        const tableRows = paymentHistory.map(p => [
            p.partyName, 
            `₹${Math.round(p.amount)}`, 
            format(p.date.toDate(), 'dd/MM/yyyy'),
            format(p.saleDate, 'dd/MM/yyyy'),
        ]);

        doc.autoTable({
            head: [['Customer', 'Amount Paid', 'Payment Date', 'Original Sale Date']],
            body: tableRows,
            startY: 25,
        });
        
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        doc.save(`payment_history_${timestamp}.pdf`);
    };


    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <h1 className="text-3xl font-bold">Credit Summary</h1>
                     <div className="flex flex-wrap gap-2">
                        <Link href="/" passHref>
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                        <Button onClick={handleExportCreditReport} size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export Report
                        </Button>
                         <Button onClick={handleExportPaymentHistory} size="sm" variant="default">
                            <Download className="mr-2 h-4 w-4" />
                            Export Payment History
                        </Button>
                    </div>
                </header>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Customer Dues Summary</CardTitle>
                        <CardDescription>Overview of all customers with outstanding credit balances.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {customerSummaries.length > 0 ? (
                             <Accordion type="single" collapsible className="w-full">
                                {customerSummaries.map(summary => (
                                    <AccordionItem value={summary.partyName} key={summary.partyName}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between w-full pr-4">
                                                <span className="font-semibold">{summary.partyName}</span>
                                                <span className="text-red-600 font-bold">₹{Math.round(summary.totalDue)}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Bill Date</TableHead>
                                                        <TableHead>Total</TableHead>
                                                        <TableHead>Paid</TableHead>
                                                        <TableHead className="text-right">Balance</TableHead>
                                                        <TableHead className="text-center">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {summary.sales.map(sale => (
                                                        <TableRow key={sale.id}>
                                                            <TableCell>
                                                                <Link href={`/sales/${sale.id}`} className="underline hover:text-primary">
                                                                    {format(sale.createdAt.toDate(), 'dd/MM/yyyy')}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>₹{Math.round(sale.grandTotal)}</TableCell>
                                                            <TableCell>₹{Math.round(sale.amountPaid)}</TableCell>
                                                            <TableCell className="text-right text-red-600 font-medium">₹{Math.round(sale.balance)}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Button size="sm" variant="outline" onClick={() => setSelectedSaleForPayment(sale)}>
                                                                    Record Payment
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <p className="text-muted-foreground text-center">No outstanding credit balances.</p>
                        )}
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Full Payment History</CardTitle>
                         <CardDescription>A log of all payments received across all sales.</CardDescription>
                         <div className="pt-2">
                             <Input
                                placeholder="Search by customer name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                         </div>
                    </CardHeader>
                    <CardContent>
                         {isLoadingPayments ? (
                            <p>Loading payment history...</p>
                         ) : filteredPaymentHistory.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payment Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Original Bill Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPaymentHistory.map((payment, index) => (
                                        editingPayment && editingPayment.id === payment.id && editingPayment.saleId === payment.saleId ? (
                                            <TableRow key={`${payment.saleId}-${payment.id || index}`}>
                                                <TableCell>{format(payment.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{payment.partyName}</TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number"
                                                        value={editingPaymentAmount}
                                                        onChange={(e) => setEditingPaymentAmount(e.target.value)}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>{format(payment.saleDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right">
                                                     <Button size="sm" onClick={handleUpdatePayment} className="mr-2">Save</Button>
                                                     <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <TableRow key={`${payment.saleId}-${payment.id || index}`}>
                                                <TableCell>{format(payment.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{payment.partyName}</TableCell>
                                                <TableCell>₹{Math.round(payment.amount)}</TableCell>
                                                <TableCell>{format(payment.saleDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleStartEditPayment(payment)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete the payment of ₹{Math.round(payment.amount)} from {payment.partyName}. This will also increase their balance due. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeletePayment(payment)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    ))}
                                </TableBody>
                            </Table>
                         ) : (
                             <p className="text-muted-foreground text-center">No payment history found.</p>
                         )}
                    </CardContent>
                </Card>

                {selectedSaleForPayment && (
                     <AlertDialog open={!!selectedSaleForPayment} onOpenChange={() => setSelectedSaleForPayment(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Record Payment for {selectedSaleForPayment.partyName}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bill Date: {format(selectedSaleForPayment.createdAt.toDate(), 'PPP')} <br/>
                                    Outstanding Balance: ₹{Math.round(selectedSaleForPayment.balance)}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4 space-y-2">
                                <Label htmlFor="payment-amount">Payment Amount</Label>
                                <Input 
                                    id="payment-amount"
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRecordPayment} disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Record Payment'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
    );
}

export default function CreditPageWithAuth() {
    return (
        <AuthGuard>
            <CreditPage />
        </AuthGuard>
    );
}
