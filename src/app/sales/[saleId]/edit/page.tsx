
'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Calendar as CalendarIcon, Plus, CreditCard, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { GraniteTable } from '@/components/granite-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const measurementSchema = z.object({
  length: z.string(),
  width: z.string(),
});

const sheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  rate: z.string().optional(),
  measurements: z.array(measurementSchema),
});

const formSchema = z.object({
  partyName: z.string().optional(),
  partyPhoneNumber: z.string().optional(),
  labourCharges: z.string().optional(),
  transportCharges: z.string().optional(),
  discount: z.string().optional(),
  sheets: z.array(sheetSchema),
  createdAt: z.date().optional(),
  paymentType: z.enum(['cash', 'credit']).default('cash'),
});

type FormValues = z.infer<typeof formSchema>;
type Sheet = z.infer<typeof sheetSchema>;
const MAX_ROWS = 500;


function EditSalePage({ saleId }: { saleId: string }) {
  const [isClient, setIsClient] = useState(false);
  const [labourManuallyEdited, setLabourManuallyEdited] = useState(true); // Default to true on edit
  const [rowsToAdd, setRowsToAdd] = useState<number | string>(1);
  const [activeTab, setActiveTab] = useState('');
  
  // Settings state
  const [showLabourCharges, setShowLabourCharges] = useState(true);
  const [showTransportCharges, setShowTransportCharges] = useState(true);
  const [labourRate, setLabourRate] = useState(3);
  const [minLabourCharges, setMinLabourCharges] = useState(200);

  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const saleDocRef = useMemoFirebase(() => {
    if (!user || !saleId) return null;
    return doc(firestore, 'users', user.uid, 'sales', saleId);
  }, [user, firestore, saleId]);

  const { data: saleData, isLoading: isSaleLoading } = useDoc(saleDocRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partyName: '',
      partyPhoneNumber: '',
      labourCharges: '',
      transportCharges: '',
      discount: '',
      sheets: [],
      createdAt: new Date(),
      paymentType: 'cash',
    },
    mode: 'onBlur',
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "sheets",
  });
  
  const watchedData = useWatch({ control: form.control });
  const watchedSheets = watchedData.sheets || [];

  const activeSheetIndex = fields.findIndex(s => s.id === activeTab);
  const activeSheet = activeSheetIndex !== -1 ? watchedSheets?.[activeSheetIndex] : undefined;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setShowLabourCharges(data.showLabourCharges ?? true);
          setShowTransportCharges(data.showTransportCharges ?? true);
          setLabourRate(data.labourRate ?? 3);
          setMinLabourCharges(data.minLabourCharges ?? 200);
        }
      });
    }
  }, [user, firestore]);

  useEffect(() => {
    if (saleData) {
      const sheets = saleData.sheets.map((s: any) => ({
          ...s, 
          rate: s.rate?.toString(),
          measurements: s.measurements.map((m: any) => ({
              length: m.length?.toString() || '',
              width: m.width?.toString() || ''
          }))
      }));

      form.reset({
        partyName: saleData.partyName,
        partyPhoneNumber: saleData.partyPhoneNumber,
        labourCharges: saleData.labourCharges?.toString(),
        transportCharges: saleData.transportCharges?.toString(),
        discount: saleData.discount?.toString(),
        sheets: sheets,
        createdAt: saleData.createdAt?.toDate(),
        paymentType: saleData.paymentType || 'cash',
      });
      if (sheets.length > 0) {
        setActiveTab(sheets[0].id);
      }
    }
  }, [saleData, form]);
  
  const calculateTotalSquareFeetForSheet = (sheet: Sheet) => {
    if (!sheet || !sheet.measurements) return 0;
    const totalAreaInches = sheet.measurements
      .map(m => ({ length: parseFloat(m.length), width: parseFloat(m.width) }))
      .filter(m => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0)
      .reduce((acc, m) => acc + m.length * m.width, 0);
    return totalAreaInches / 144;
  };

  const totalAreaAllSheets = watchedData.sheets?.reduce((acc, sheet) => acc + calculateTotalSquareFeetForSheet(sheet), 0) || 0;

  useEffect(() => {
    if (!labourManuallyEdited && isClient && showLabourCharges) {
      const calculatedLabour = Math.max(minLabourCharges, totalAreaAllSheets * labourRate);
      form.setValue('labourCharges', calculatedLabour.toFixed(2), { shouldDirty: true });
    }
  }, [totalAreaAllSheets, isClient, labourManuallyEdited, form, showLabourCharges, labourRate, minLabourCharges]);

  const subtotalAllSheets = watchedData.sheets?.reduce((acc, sheet) => {
    const rate = sheet.rate ? parseFloat(sheet.rate) : 0;
    const area = calculateTotalSquareFeetForSheet(sheet);
    return acc + (area * rate);
  }, 0) || 0;

  const labourCharges = showLabourCharges && watchedData?.labourCharges ? parseFloat(watchedData.labourCharges) : 0;
  const transportCharges = showTransportCharges && watchedData?.transportCharges ? parseFloat(watchedData.transportCharges) : 0;
  const discount = watchedData?.discount ? parseFloat(watchedData.discount) : 0;
  const grandTotal = subtotalAllSheets + labourCharges + transportCharges - discount;

  const handleUpdateBill = async () => {
    if (!user || !saleDocRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update the bill.' });
      return;
    }
    
    const amountPaid = watchedData.paymentType === 'cash' ? grandTotal : (saleData.amountPaid || 0);
    const balance = grandTotal - amountPaid;

    const updatedBillData = {
      ...saleData,
      partyName: watchedData.partyName || '',
      partyPhoneNumber: watchedData.partyPhoneNumber || '',
      labourCharges: labourCharges,
      transportCharges: transportCharges,
      discount: discount,
      sheets: watchedData.sheets?.map(s => ({
          ...s,
          rate: s.rate ? parseFloat(s.rate) : 0,
          measurements: s.measurements.filter(m => m.length && m.width).map(m => ({
              length: parseFloat(m.length),
              width: parseFloat(m.width)
          }))
      })) || [],
      subtotal: subtotalAllSheets,
      grandTotal: grandTotal,
      createdAt: watchedData.createdAt ? Timestamp.fromDate(watchedData.createdAt) : saleData.createdAt,
      paymentType: watchedData.paymentType,
      amountPaid: amountPaid,
      balance: balance,
    };
    
    try {
      await setDoc(saleDocRef, updatedBillData);
      toast({ title: 'Success', description: 'Bill updated successfully!' });
      router.push(`/sales/${saleId}`);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update bill.' });
    }
  }

  const handleAddRows = () => {
    if (!activeSheet) return;

    const numRowsToAdd = Number(rowsToAdd) || 1;
    const currentMeasurements = activeSheet.measurements || [];
    
    if (currentMeasurements.length + numRowsToAdd > MAX_ROWS) {
      toast({
          variant: 'destructive',
          title: 'Row Limit Exceeded',
          description: `You can only have up to ${MAX_ROWS} rows in total.`
      });
      return;
    }
    
    const newRows = Array(numRowsToAdd).fill({ length: '', width: '' });
    const updatedMeasurements = [...currentMeasurements, ...newRows];
    
    update(activeSheetIndex, { ...activeSheet, measurements: updatedMeasurements });
  };
  
  if (isSaleLoading) {
    return <div className="text-center p-8">Loading...</div>
  }
  
  if (!isClient) {
    return null;
  }
  
  if (!watchedData) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>No bill data found.</p>
        </div>
    );
  }
  
  const allSheets = watchedData.sheets || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Edit Sale</h1>
          <div className="flex gap-2">
            <Link href={`/sales/${saleId}`} passHref>
              <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2" />
                  Cancel
              </Button>
            </Link>
            <Button onClick={handleUpdateBill} size="sm">
                <Save className="mr-2" />
                Update Bill
            </Button>
          </div>
        </header>

        <div className="space-y-6">
          
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                  <Label>Bill Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !watchedData.createdAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchedData.createdAt ? format(watchedData.createdAt, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={watchedData.createdAt}
                        onSelect={(date) => form.setValue('createdAt', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                    <Label htmlFor="partyName">Party Name</Label>
                    <Input id="partyName" placeholder="Enter party name" {...form.register('partyName')} />
                </div>
                <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                    <Label htmlFor="partyPhoneNumber">Party Phone Number</Label>
                    <Input id="partyPhoneNumber" type="tel" placeholder="Enter phone number" {...form.register('partyPhoneNumber')} />
                </div>
                 <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                    <Label>Payment Type</Label>
                     <RadioGroup
                        value={watchedData.paymentType}
                        onValueChange={(value) => form.setValue('paymentType', value as 'cash' | 'credit')}
                        className="flex items-center space-x-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cash" id="cash" />
                            <Label htmlFor="cash" className="flex items-center gap-2"><DollarSign/> Cash</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="credit" id="credit" />
                            <Label htmlFor="credit" className="flex items-center gap-2"><CreditCard/> Credit</Label>
                        </div>
                    </RadioGroup>
                </div>
                {showLabourCharges && (
                  <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                      <Label htmlFor="labourCharges">Labour Charges</Label>
                      <Input 
                        id="labourCharges" 
                        type="number" 
                        placeholder="Enter labour charges" 
                        {...form.register('labourCharges')}
                        onChange={(e) => {
                          form.setValue('labourCharges', e.target.value);
                          setLabourManuallyEdited(true);
                        }}
                      />
                  </div>
                )}
                {showTransportCharges && (
                  <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                      <Label htmlFor="transportCharges">Transport Charges</Label>
                      <Input id="transportCharges" type="number" placeholder="Enter transport charges" {...form.register('transportCharges')} />
                  </div>
                )}
                <div className="grid grid-cols-[1fr,2fr] items-center gap-4">
                    <Label htmlFor="discount">Discount</Label>
                    <Input id="discount" type="number" placeholder="Enter discount" {...form.register('discount')} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
                {fields.length > 0 && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList>
                    {fields.map((sheet) => (
                        <TabsTrigger key={sheet.id} value={sheet.id} className={cn("relative", activeTab === sheet.id && "bg-primary text-primary-foreground")}>
                        {sheet.name}
                        </TabsTrigger>
                    ))}
                    </TabsList>
                    {fields.map((sheet, sheetIndex) => (
                        <TabsContent key={sheet.id} value={sheet.id}>
                        <div className="flex flex-wrap items-end gap-4 mt-4">
                            <div className="flex items-center gap-2">
                            <Label htmlFor={`color-${sheet.id}`} className="whitespace-nowrap">Color Name</Label>
                            <Input id={`color-${sheet.id}`} placeholder="Enter color name" {...form.register(`sheets.${sheetIndex}.color`)} className="w-[135px]" />
                            </div>
                            <div className="flex items-center gap-2">
                            <Label htmlFor={`rate-${sheet.id}`} className="whitespace-rap">Rate</Label>
                            <Input
                                id={`rate-${sheet.id}`}
                                type="number"
                                placeholder="Enter rate"
                                {...form.register(`sheets.${sheetIndex}.rate`)}
                                className="w-[70px]"
                                />
                            </div>
                            <div className="ml-auto">
                            <span className="text-sm font-bold text-foreground">SFT: </span>
                            <span className="text-2xl font-bold">{calculateTotalSquareFeetForSheet(watchedSheets[sheetIndex]).toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <GraniteTable
                                fields={(sheet.measurements || []).map((m, i) => ({ ...m, id: `${sheet.id}-${i}` }))}
                                register={form.register}
                                errors={form.formState.errors}
                                control={form.control}
                                setValue={form.setValue}
                                sheetIndex={sheetIndex}
                            />
                        </div>
                        </TabsContent>
                    ))}
                </Tabs>
                )}
                
                {activeSheet && (
                <div className="mt-4 flex flex-wrap items-center justify-start gap-4">
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number"
                            value={rowsToAdd}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                    setRowsToAdd('');
                                } else {
                                    const num = parseInt(value, 10);
                                    setRowsToAdd(Math.max(1, isNaN(num) ? 1 : num));
                                }
                            }}
                            className="w-24 h-9"
                            min="1"
                        />
                        <Button variant="secondary" onClick={handleAddRows} disabled={(activeSheet?.measurements?.length ?? 0) >= MAX_ROWS}>
                            <Plus className="mr-2" />
                            Add Row(s)
                        </Button>
                    </div>
                </div>
                )}
            </CardContent>
          </Card>


          <div className="mt-8 flex justify-end">
             <Card className="w-full max-w-md">
                <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center font-semibold">
                        <span>Subtotal</span>
                        <span>₹{Math.round(subtotalAllSheets).toLocaleString('en-IN')}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        {showLabourCharges && (
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Labour Charges</span>
                              <span className="font-medium">₹{labourCharges.toFixed(2)}</span>
                          </div>
                        )}
                        {showTransportCharges && (
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Transport Charges</span>
                              <span className="font-medium">₹{transportCharges.toFixed(2)}</span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex justify-between items-center text-sm text-green-600">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="font-medium">- ₹{discount.toFixed(2)}</span>
                          </div>
                        )}
                    </div>
                    <Separator />
                     <div className="flex justify-between items-center text-xl font-bold p-4 bg-primary/10 rounded-lg">
                        <span>Grand Total</span>
                        <span>₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function EditSalePageWithAuth({ params }: { params: { saleId: string } }) {
    const { saleId } = params;
    return (
        <AuthGuard>
            <EditSalePage saleId={saleId} />
        </AuthGuard>
    );
}
