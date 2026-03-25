'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Eye, Trash2, Settings, FileDown, BookCopy, CreditCard, Calculator } from 'lucide-react';
import { GraniteTable } from '@/components/granite-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';


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
  sheets: z.array(sheetSchema),
  activeSheetId: z.string().optional(),
  labourCharges: z.string().optional(),
  transportCharges: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type Sheet = z.infer<typeof sheetSchema>;
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


const INITIAL_ROWS = 20;
const MAX_ROWS = 500;
const MAX_SHEETS = 5;
export const LOCAL_STORAGE_KEY = 'priyanka-granite-sheet-data';

const createNewSheet = (id: string, name: string): Sheet => ({
  id,
  name,
  color: '',
  rate: '',
  measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' }),
});

const defaultInitialSheet = createNewSheet(Date.now().toString(), 'Sheet 1');

const defaultValues: FormValues = {
  sheets: [defaultInitialSheet],
  activeSheetId: defaultInitialSheet.id,
  labourCharges: '',
  transportCharges: '',
};

export default function GraniteGridPage() {
  const [rowsToAdd, setRowsToAdd] = useState<number | string>(1);
  const [isClient, setIsClient] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  // Settings state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [labourRate, setLabourRate] = useState(3);
  const [minLabourCharges, setMinLabourCharges] = useState(200);

  // Estimation Dialog State
  const [isEstimationDialogOpen, setIsEstimationDialogOpen] = useState(false);
  const [manualSft, setManualSft] = useState('');
  const [manualColor, setManualColor] = useState('');
  const [manualRate, setManualRate] = useState('');
  const [manualLabour, setManualLabour] = useState('');
  const [manualTransport, setManualTransport] = useState('');
  const [isLabourManuallyEdited, setIsLabourManuallyEdited] = useState(false);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "sheets",
  });

  const watchedData = useWatch({ control: form.control });
  const watchedSheets = watchedData.sheets || [];
  const activeSheetId = watchedData.activeSheetId || watchedSheets[0]?.id;
  
  const activeSheetIndex = fields.findIndex(s => s.id === activeSheetId);
  const activeSheet = activeSheetIndex !== -1 ? watchedSheets?.[activeSheetIndex] : undefined;

  // Auto-calculate labour in estimation dialog based on SFT
  useEffect(() => {
    if (!isLabourManuallyEdited && isEstimationDialogOpen) {
      const sft = parseFloat(manualSft);
      
      if (!isNaN(sft) && sft > 0) {
        const calcLabour = Math.max(minLabourCharges, sft * labourRate);
        setManualLabour(Math.round(calcLabour).toString());
      } else {
        setManualLabour('');
      }
    }
  }, [manualSft, labourRate, minLabourCharges, isLabourManuallyEdited, isEstimationDialogOpen]);
  
  useEffect(() => {
    setIsClient(true);
    let isDataLoaded = false;
  
    const loadFromLocalStorage = () => {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          if (parsedData && parsedData.sheets && parsedData.sheets.length > 0) {
            form.reset(parsedData);
            isDataLoaded = true;
            return true;
          }
        } catch (e) {
          // Silent local storage error
        }
      }
      return false;
    };
  
    loadFromLocalStorage();

    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBusinessName(data.businessName || '');
          setContactName(data.displayName || '');
          setPhoneNumber(data.phoneNumber || '');
          setAddress(data.address || '');
          setLabourRate(data.labourRate ?? 3);
          setMinLabourCharges(data.minLabourCharges ?? 200);

          if (!isDataLoaded && data.sheets && data.sheets.length > 0) {
            const cleanedSheets = data.sheets.map((sheet: any) => ({
              ...sheet,
              measurements: sheet.measurements || Array(INITIAL_ROWS).fill({ length: '', width: '' }),
            }));
            const initialActiveId = data.activeSheetId || cleanedSheets[0]?.id;
            form.reset({ 
                sheets: cleanedSheets, 
                activeSheetId: initialActiveId,
                labourCharges: data.labourCharges || '',
                transportCharges: data.transportCharges || '',
            });
            isDataLoaded = true;
          }
        }
      }).catch(err => {
        // Handled centrally
      }).finally(() => {
        if (!isDataLoaded) {
          handleClearAll(false);
        }
      });
    } else {
      if (!isDataLoaded) {
        handleClearAll(false);
      }
    }
  }, [user, firestore]);


  useEffect(() => {
    if (isClient) {
      const subscription = form.watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
        if (user && firestore) {
          const userDocRef = doc(firestore, 'users', user.uid);
          const updatePayload = { 
              sheets: value.sheets ?? [],
              activeSheetId: value.activeSheetId ?? '',
              labourCharges: value.labourCharges ?? '',
              transportCharges: value.transportCharges ?? '',
              updatedAt: serverTimestamp(),
          };
          setDoc(userDocRef, updatePayload, { merge: true })
            .catch(async (serverError) => {
              const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updatePayload,
              });
              errorEmitter.emit('permission-error', permissionError);
            });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [isClient, form, user, firestore]);
  

  const getValidDataForSheet = useCallback((sheet: Sheet | undefined) => {
    if (!sheet || !sheet.measurements) return [];
    return sheet.measurements
      .map((m, index) => ({
        sno: index + 1,
        length: parseFloat(m.length),
        width: parseFloat(m.width),
        area: ((parseFloat(m.length) * parseFloat(m.width)) / 144) || 0
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0) || [];
  }, []);

  const calculateTotalSquareFeetForSheet = useCallback((sheet: Sheet | undefined) => {
    if (!isClient || !sheet) return 0;
    const validData = getValidDataForSheet(sheet);
    if (validData.length === 0) {
      return 0;
    }
    const totalArea = validData.reduce((acc, m) => acc + m.area, 0);
    return totalArea;
  }, [isClient, getValidDataForSheet]);

  const generateSheetPdfDoc = useCallback(() => {
    const allSheets = watchedData.sheets || [];
    if (allSheets.length === 0) return null;

    const doc = new jsPDF() as jsPDFWithAutoTable;
    let isFirstPage = true;
    let hasData = false;

    const formatNumber = (num: number) => {
      if (num % 1 === 0) {
        return num.toString();
      }
      return num.toFixed(2);
    };

    allSheets.forEach(sheet => {
      const validData = getValidDataForSheet(sheet);
      if (validData.length === 0) return;

      hasData = true;
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(businessName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const contactInfo = [contactName, phoneNumber, address].filter(Boolean).join(' | ');
      doc.text(contactInfo, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const sheetTitle = `${sheet.name} - ${sheet.color || 'N/A'}`;
      doc.text(sheetTitle, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
      
      const totalArea = calculateTotalSquareFeetForSheet(sheet);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`SFT: ${totalArea.toFixed(2)}`, 14, 45);
      
      doc.autoTable({
        head: [['S.No', 'Length (in)', 'Width (in)', 'Area (sq ft)']],
        body: validData.map(m => [m.sno, formatNumber(m.length), formatNumber(m.width), formatNumber(m.area)]),
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        didDrawPage: (data) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Priyanka Granite', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
      });
    });

    return hasData ? doc : null;
  }, [watchedData.sheets, getValidDataForSheet, calculateTotalSquareFeetForSheet, businessName, contactName, phoneNumber, address]);

  const handleDownloadSheetPdf = useCallback(() => {
    const doc = generateSheetPdfDoc();
    if (doc) {
      const date = new Date();
      const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
      const filename = `sheets_${timestamp}.pdf`;
      doc.save(filename);
    } else {
        toast({
            variant: "destructive",
            title: "No Data",
            description: "There is no measurement data to export.",
        });
    }
  }, [generateSheetPdfDoc]);

  const handleClearAll = (saveToDb = true) => {
    const newSheet = createNewSheet(Date.now().toString(), 'Sheet 1');
    const newFormState = {
      sheets: [newSheet],
      activeSheetId: newSheet.id,
      labourCharges: '',
      transportCharges: '',
    };
    form.reset(newFormState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newFormState));

    if (user && firestore && saveToDb) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const updatePayload = { 
            sheets: newFormState.sheets,
            activeSheetId: newFormState.activeSheetId,
            labourCharges: '',
            transportCharges: '',
            updatedAt: serverTimestamp(),
        };
        setDoc(userDocRef, updatePayload, { merge: true })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'update',
              requestResourceData: updatePayload,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
    }
  };

  const handleProtectedAction = (action?: () => void) => {
    if (!user) {
        toast({
            title: "Login Required",
            description: "Please log in to access this feature.",
            variant: "destructive"
        });
    } else if (action) {
        action();
    }
  };
  
  const addSheet = () => {
    if (fields.length >= MAX_SHEETS) {
      toast({
          title: "Sheet Limit Reached",
          description: `You can only add up to ${MAX_SHEETS} sheets.`,
          variant: "destructive"
      });
      return;
    }
    const newSheetId = Date.now().toString();
    const newSheet = createNewSheet(newSheetId, `Sheet ${fields.length + 1}`);
    append(newSheet);
    form.setValue('activeSheetId', newSheetId);
  };

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

  const handleAddManualEstimation = () => {
    if (!activeSheet) return;
    const sft = parseFloat(manualSft);

    if (isNaN(sft) || sft <= 0) {
      toast({ variant: 'destructive', title: 'Invalid SFT', description: 'Please enter a valid total area greater than 0.' });
      return;
    }

    // Since we only have SFT now, we add one representative row that equals that SFT.
    // L * W / 144 = SFT. If we set W = 144, then L = SFT.
    const newPiece = { length: sft.toString(), width: "144" };
    const currentMeasurements = activeSheet.measurements || [];

    if (currentMeasurements.length + 1 > MAX_ROWS) {
      toast({
        variant: 'destructive',
        title: 'Limit Reached',
        description: `Too many rows. Maximum is ${MAX_ROWS}.`
      });
      return;
    }

    // Apply estimation to active sheet
    const updatedMeasurements = [...currentMeasurements, newPiece];
    update(activeSheetIndex, { 
        ...activeSheet, 
        measurements: updatedMeasurements,
        color: manualColor || activeSheet.color,
        rate: manualRate || activeSheet.rate,
    });

    // Save charges to form
    if (manualLabour) form.setValue('labourCharges', manualLabour);
    if (manualTransport) form.setValue('transportCharges', manualTransport);

    setIsEstimationDialogOpen(false);
    setManualSft('');
    setManualColor('');
    setManualRate('');
    setManualLabour('');
    setManualTransport('');
    setIsLabourManuallyEdited(false);
    toast({ title: 'Estimation Applied', description: `Applied estimation to ${activeSheet.name}.` });
  };
  
  if (!isClient) {
    return null; 
  }
  
  return (
    <div className="space-y-4 pt-4">
      <Card>
        <div className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-start gap-2">
                <Button variant="default" onClick={handleDownloadSheetPdf} className="flex-1 h-10 px-1">
                    <FileDown className="mr-2" />
                    Download
                </Button>
                <Button variant="default" onClick={() => handleProtectedAction(addSheet)} className="flex-1 h-10 px-1">
                    <Plus className="mr-2" />
                    Add Color
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" className="flex-1 h-10 px-1">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear All
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will permanently delete all your data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleClearAll()}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex items-center justify-start gap-2 mt-2">
                 <Button variant="default" className="w-full h-10 px-1 flex-1" onClick={() => handleProtectedAction(() => router.push('/sales'))}>
                    <BookCopy className="mr-2" />
                    All Sales
                </Button>
                <Link href="/account" passHref className="flex-1">
                    <Button variant="default" className="w-full h-10 px-1">
                        <Settings className="mr-2" />
                        Settings
                    </Button>
                </Link>
                <Button variant="default" className="w-full h-10 px-1 flex-1" onClick={() => handleProtectedAction(() => router.push('/credit'))}>
                    <CreditCard className="mr-2" />
                    Credit
                </Button>
            </div>
            <div className="flex items-center justify-start gap-2 mt-2">
                 <Button variant="default" className="w-full h-10 px-1 flex-1" onClick={() => handleProtectedAction(() => router.push('/bill'))}>
                    <Eye className="mr-2" />
                    Bill
                </Button>
                 <Button variant="default" className="w-full h-10 px-1 flex-1" onClick={() => handleProtectedAction(() => setIsEstimationDialogOpen(true))}>
                    <Calculator className="mr-2" />
                    Estimation
                </Button>
            </div>
          </div>
          
          {fields.length > 0 && (
            <Tabs value={activeSheetId} onValueChange={(id) => form.setValue('activeSheetId', id)} className="mt-4">
                <TabsList>
                  {fields.map((sheet) => (
                    <TabsTrigger key={sheet.id} value={sheet.id} className={cn("relative", activeSheetId === sheet.id && "bg-primary text-primary-foreground")}  onClick={() => { if (!user && sheet.name !== 'Sheet 1') { handleProtectedAction(); } }}>
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
        </div>
      </Card>

      <Dialog open={isEstimationDialogOpen} onOpenChange={setIsEstimationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Quick Estimation</DialogTitle>
                <DialogDescription>
                    Enter total area to calculate labour and transport.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="est-sft">Total SFT</Label>
                      <Input 
                        id="est-sft" 
                        type="number" 
                        value={manualSft} 
                        onChange={(e) => setManualSft(e.target.value)} 
                        placeholder="e.g. 150.5" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="est-rate">Rate (₹)</Label>
                      <Input id="est-rate" type="number" value={manualRate} onChange={(e) => setManualRate(e.target.value)} placeholder="Rate per SFT" />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="est-color">Color Name</Label>
                  <Input id="est-color" value={manualColor} onChange={(e) => setManualColor(e.target.value)} placeholder="Enter color name" />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="est-labour">Labour Charges (₹)</Label>
                      <Input 
                        id="est-labour" 
                        type="number" 
                        value={manualLabour} 
                        onChange={(e) => {
                            setManualLabour(e.target.value);
                            setIsLabourManuallyEdited(true);
                        }} 
                        placeholder="Automatic..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="est-transport">Transport (₹)</Label>
                      <Input id="est-transport" type="number" value={manualTransport} onChange={(e) => setManualTransport(e.target.value)} placeholder="Transport cost" />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEstimationDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddManualEstimation}>Apply to {activeSheet?.name}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      <footer className="text-center text-sm text-muted-foreground py-4">
        Priyanka Granites
      </footer>
    </div>
  );
}
