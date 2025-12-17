
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Eye, Trash2, Settings, FileDown, BookCopy } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';


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
});

type FormValues = z.infer<typeof formSchema>;
type Sheet = z.infer<typeof sheetSchema>;
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


const INITIAL_ROWS = 20;
const MAX_ROWS = 500;
const MAX_SHEETS = 4;
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
};

export default function GraniteGridPage() {
  const [rowsToAdd, setRowsToAdd] = useState<number | string>(1);
  const [isClient, setIsClient] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const [plan, setPlan] = useState('free');
  
  // Settings state
  const [businessName, setBusinessName] = useState('Priyanka Granite');
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

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
  
  useEffect(() => {
    setIsClient(true);
    let isDataLoaded = false;
  
    const loadFromLocalStorage = () => {
      if (isDataLoaded) return;
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          if (parsedData && parsedData.sheets && parsedData.sheets.length > 0) {
            form.reset(parsedData);
            isDataLoaded = true;
          }
        } catch (e) {
          console.error("Failed to parse local storage data", e);
        }
      }
    };
  
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBusinessName(data.businessName || 'Priyanka Granite');
          setContactName(data.displayName || '');
          setPhoneNumber(data.phoneNumber || '');
          setAddress(data.address || '');
          setPlan(data.plan || 'free');
  
          if (data.sheets && data.sheets.length > 0) {
            const cleanedSheets = data.sheets.map((sheet: any) => ({
              ...sheet,
              measurements: sheet.measurements || Array(INITIAL_ROWS).fill({ length: '', width: '' }),
            }));
            const initialActiveId = data.activeSheetId || cleanedSheets[0]?.id;
            form.reset({ sheets: cleanedSheets, activeSheetId: initialActiveId });
            isDataLoaded = true;
          }
        }
      }).catch(err => {
        console.error("Error fetching user document:", err);
        loadFromLocalStorage();
      }).finally(() => {
        if (!isDataLoaded) {
          loadFromLocalStorage();
          if (!isDataLoaded) {
            handleClearAll(false); // Reset to default if nothing is loaded
          }
        }
      });
    } else {
      loadFromLocalStorage();
      if (!isDataLoaded) {
        handleClearAll(false); // Reset to default if not logged in and no local data
      }
    }
  }, [user, firestore, form]);

  useEffect(() => {
    if (isClient) {
      const subscription = form.watch((value) => {
        // Save to local storage for the bill page
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
        
        // Save to Firestore if the user is logged in
        if (user && firestore) {
          const userDocRef = doc(firestore, 'users', user.uid);
          setDoc(userDocRef, { 
              sheets: value.sheets,
              activeSheetId: value.activeSheetId 
          }, { merge: true });
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

    allSheets.forEach(sheet => {
      const validData = getValidDataForSheet(sheet);
      if (validData.length === 0) return;

      hasData = true;
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;
      
      // Business Header
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
        body: validData.map(m => [m.sno, m.length.toFixed(2), m.width.toFixed(2), m.area.toFixed(2)]),
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
            // Footer
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
      alert("No measurement data to export.");
    }
  }, [generateSheetPdfDoc]);

  const handleClearAll = (saveToDb = true) => {
    const newSheet = createNewSheet(Date.now().toString(), 'Sheet 1');
    const newFormState = {
      sheets: [newSheet],
      activeSheetId: newSheet.id,
    };
    form.reset(newFormState);
     // Also update local storage for bill page
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newFormState));

    if (user && firestore && saveToDb) {
        const userDocRef = doc(firestore, 'users', user.uid);
        setDoc(userDocRef, { 
            sheets: newFormState.sheets,
            activeSheetId: newFormState.activeSheetId
        }, { merge: true });
    }
  };
  
  const addSheet = () => {
    if (plan === 'free') {
      alert("Upgrade to a paid plan to add more sheets.");
      return;
    }
    if (fields.length >= MAX_SHEETS) {
      alert(`You can only add up to ${MAX_SHEETS} sheets.`);
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
      alert(`You can only add up to ${MAX_ROWS} rows in total.`);
      return;
    }
    
    const newRows = Array(numRowsToAdd).fill({ length: '', width: '' });
    const updatedMeasurements = [...currentMeasurements, ...newRows];
    
    update(activeSheetIndex, { ...activeSheet, measurements: updatedMeasurements });
  };
  
  if (!isClient) {
    return null; 
  }
  
  return (
    <div className="space-y-4 pt-4">
      <Card>
        <div className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-start gap-2 flex-wrap">
              <Button variant="default" onClick={handleDownloadSheetPdf} size="sm" className="px-2">
                <FileDown className="mr-2" />
                Download
              </Button>
              <Link href="/bill" passHref>
                <Button variant="default" size="sm" className="px-2">
                  <Eye className="mr-2" />
                  Bill
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="px-2">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your data from the database and local storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleClearAll()}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="flex items-center justify-start gap-2 flex-wrap">
               <Link href="/sales" passHref>
                <Button variant="default" size="sm" className="px-1 h-8">
                  <BookCopy className="mr-2" />
                  All Sales
                </Button>
              </Link>
               <Link href="/account" passHref>
                <Button variant="default" size="sm" className="px-1 h-8">
                    <Settings className="mr-2" />
                    Settings
                </Button>
               </Link>

                <Button variant="default" size="sm" onClick={addSheet} disabled={plan === 'free' || fields.length >= MAX_SHEETS} className="h-8 px-1">
                  <Plus className="mr-2" />
                  Add Color
                </Button>
            </div>
          </div>

          {fields.length > 0 && (
            <Tabs value={activeSheetId} onValueChange={(id) => form.setValue('activeSheetId', id)} className="mt-4">
                <TabsList>
                  {fields.map((sheet) => (
                    <TabsTrigger key={sheet.id} value={sheet.id} className={cn("relative", activeSheetId === sheet.id && "bg-primary text-primary-foreground")} disabled={plan === 'free' && sheet.name !== 'Sheet 1'}>
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
                              onChange={(e) => {
                                if (e.target.value.length > 4) {
                                  e.target.value = e.target.value.slice(0, 4);
                                }
                                form.setValue(`sheets.${sheetIndex}.rate`, e.target.value, { shouldValidate: true });
                              }}
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
      <footer className="text-center text-sm text-muted-foreground py-4">
        Priyanka Granites
      </footer>
    </div>
  );
}
