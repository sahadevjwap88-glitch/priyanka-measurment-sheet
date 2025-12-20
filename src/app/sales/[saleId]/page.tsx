
'use client';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/auth-guard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
import { useEffect, useState } from 'react';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

function SaleDetailPage({ saleId }: { saleId: string }) {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();

    const [businessName, setBusinessName] = useState('');
    const [contactName, setContactName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');

    const saleDocRef = useMemoFirebase(() => {
        if (!user || !saleId) return null;
        return doc(firestore, 'users', user.uid, 'sales', saleId);
    }, [user, firestore, saleId]);

    const { data: sale, isLoading } = useDoc(saleDocRef);

    useEffect(() => {
        if (user && firestore) {
          const userDocRef = doc(firestore, 'users', user.uid);
          getDoc(userDocRef).then((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setBusinessName(data.businessName || '');
              setContactName(data.displayName || '');
              setPhoneNumber(data.phoneNumber || '');
              setAddress(data.address || '');
            }
          });
        }
    }, [user, firestore]);
    
    const calculateTotalSquareFeetForSheet = (sheet: any) => {
        if (!sheet || !sheet.measurements) return 0;
        const totalAreaInches = sheet.measurements
            .map((m: any) => ({ length: parseFloat(m.length), width: parseFloat(m.width) }))
            .filter((m: any) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0)
            .reduce((acc: number, m: any) => acc + m.length * m.width, 0);
        return totalAreaInches / 144;
    };
    
    const generatePdfDoc = () => {
        if (!sale) return null;
        const doc = new jsPDF() as jsPDFWithAutoTable;
        const saleDate = sale.createdAt?.toDate() || new Date();
        const formattedDate = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()}`;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contactInfo = [contactName, phoneNumber, address].filter(Boolean).join(' | ');
        doc.text(contactInfo, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        
        const details = [
            [{content: 'Party Name:', styles: {fontStyle: 'bold'}}, sale.partyName || 'N/A', {content: 'Date:', styles: {fontStyle: 'bold'}}, formattedDate],
            [{content: 'Party Phone:', styles: {fontStyle: 'bold'}}, sale.partyPhoneNumber || 'N.A', '', ''],
        ];

        doc.autoTable({
            body: details,
            startY: 30,
            theme: 'plain',
            styles: { fontSize: 11, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 60}, 2: { cellWidth: 35 } }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 10;
        
        const summaryBody = sale.sheets.map((sheet: any) => {
          const area = calculateTotalSquareFeetForSheet(sheet);
          const rate = sheet.rate ? parseFloat(sheet.rate) : 0;
          const total = area * rate;
          return [
            sheet.color || 'N/A',
            area.toFixed(2),
            `Rs. ${rate.toFixed(2)}`,
            `Rs. ${total.toFixed(2)}`
          ];
        });

        doc.autoTable({
          head: [['Color', 'SFT', 'Rate', 'Total Amount']],
          body: summaryBody,
          startY: finalY,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 3: { halign: 'right' } }
        });

        finalY = (doc as any).lastAutoTable.finalY;

        const summaryRows = [
          [{ content: 'Subtotal', styles: { fontStyle: 'bold' } }, { content: `Rs. ${sale.subtotal.toFixed(2)}`, styles: { fontStyle: 'bold' } }],
        ];
        if (sale.labourCharges > 0) summaryRows.push(['Labour Charges', `Rs. ${sale.labourCharges.toFixed(2)}`]);
        if (sale.transportCharges > 0) summaryRows.push(['Transport Charges', `Rs. ${sale.transportCharges.toFixed(2)}`]);
        if (sale.discount > 0) summaryRows.push(['Discount', `- Rs. ${sale.discount.toFixed(2)}`]);
        summaryRows.push([{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 14 } }, { content: `Rs. ${Math.round(sale.grandTotal).toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fontSize: 14 } }]);
        
        doc.autoTable({
            body: summaryRows,
            startY: finalY + 10,
            theme: 'plain',
            columnStyles: { 0: {cellWidth: 145, fontStyle: 'bold'}, 1: { halign: 'right' } },
            styles: { fontSize: 12, cellPadding: 2 },
        });

        finalY = (doc as any).lastAutoTable.finalY;

        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Thank you for your business!", pageWidth / 2, finalY + 20, { align: 'center' });
        doc.text("sahadev jaat", pageWidth / 2, finalY + 25, { align: 'center' });

        return doc;
      };

    const handleExportPdf = () => {
        const doc = generatePdfDoc();
        if (doc) {
            const date = new Date();
            const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
            const filename = `bill_${timestamp}.pdf`;
            doc.save(filename);
        }
    };
    
    const handleDeleteSale = async () => {
        if (!saleDocRef) return;
        try {
            await deleteDoc(saleDocRef);
            toast({ title: 'Success', description: 'Sale record deleted successfully.' });
            router.push('/sales');
        } catch (error) {
            console.error('Error deleting sale:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete sale record.' });
        }
    }


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
                    <div className="flex gap-2">
                        <Link href="/sales" passHref>
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="mr-2" />
                                Back
                            </Button>
                        </Link>
                         <Link href={`/sales/${sale.id}/edit`} passHref>
                            <Button variant="outline" size="sm">
                                <Edit className="mr-2" />
                                Edit
                            </Button>
                        </Link>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this sales record.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSale}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button onClick={handleExportPdf} size="sm">
                            <Download className="mr-2" />
                            Download PDF
                        </Button>
                    </div>
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
                                    {sale.sheets.map((sheet: any, index: number) => {
                                        const area = calculateTotalSquareFeetForSheet(sheet);
                                        const rate = sheet.rate ? parseFloat(sheet.rate) : 0;
                                        const total = area * rate;
                                        return (
                                            <TableRow key={sheet.id || index}>
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
                                    {sale.discount > 0 && (
                                        <div className="flex justify-between items-center text-sm text-green-600">
                                            <span className="text-muted-foreground">Discount</span>
                                            <span className="font-medium">- ₹{sale.discount.toFixed(2)}</span>
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

export default function SaleDetailPageWithAuth({ params }: { params: { saleId: string } }) {
    return (
        <AuthGuard>
            <SaleDetailPage saleId={params.saleId}/>
        </AuthGuard>
    );
}

    
    