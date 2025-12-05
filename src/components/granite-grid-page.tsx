
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Eye, Trash2, Settings, Menu as MenuIcon, FileDown, X, Share2 } from 'lucide-react';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';


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
export const SETTINGS_KEY = 'priyanka-granite-settings';

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

function GraniteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <rect width="32" height="32" rx="6" fill="#6C757D" />
      <path
        d="M9 8C8.44772 8 8 8.44772 8 9V20C8 20.5523 8.44772 21 9 21H11C11.5523 21 12 20.5523 12 20V9C12 8.44772 11.5523 8 11 8H9Z"
        fill="white"
      />
      <path
        d="M10 10H12"
        stroke="#6C757D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 13H12"
        stroke="#6C757D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 16H12"
        stroke="#6C757D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 19H12"
        stroke="#6C757D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 11.5L19.5 8L20.5 9L17 12.5L20.5 16L19.5 17L16 13.5L15 14.5V20C15 20.5523 15.4477 21 16 21H18C18.5523 21 19 20.5523 19 20V18H23V20C23 20.5523 23.4477 21 24 21H25C25.5523 21 26 20.5523 26 20V14.5L25 13.5L21.5 17L18 13.5L21.5 10L25 13.5L26 12.5V9C26 8.44772 25.5523 8 25 8H24C23.4477 8 23 8.44772 23 9V11H19V9C19 8.44772 18.5523 8 18 8H16C15.4477 8 15 8.44772 15 9V12.5L16 11.5Z"
        fill="white"
      />
      <text
        x="50%"
        y="27"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontSize="5.5"
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        GRANITE
      </text>
    </svg>
  );
}


export default function GraniteGridPage() {
  const [rowsToAdd, setRowsToAdd] = useState<number | string>(1);
  const [isClient, setIsClient] = useState(false);
  const [showLabourCharges, setShowLabourCharges] = useState(true);
  const [showTransportCharges, setShowTransportCharges] = useState(true);
  const [labourRate, setLabourRate] = useState(3);
  const [minLabourCharges, setMinLabourCharges] = useState(200);

  // New settings state
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
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData && parsedData.sheets && parsedData.sheets.length > 0) {
           const cleanedSheets = parsedData.sheets.map((sheet: any) => ({
            ...sheet,
            measurements: sheet.measurements || Array(INITIAL_ROWS).fill({ length: '', width: '' }),
          }));
          const initialActiveId = parsedData.activeSheetId || cleanedSheets[0]?.id;
          form.reset({ ...parsedData, sheets: cleanedSheets, activeSheetId: initialActiveId });
        } else {
           handleClearAll(false);
        }
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        handleClearAll(false);
      }
    } else {
        handleClearAll(false);
    }

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setShowLabourCharges(parsedSettings.showLabourCharges);
        setShowTransportCharges(parsedSettings.showTransportCharges);
        if (parsedSettings.labourRate) setLabourRate(parsedSettings.labourRate);
        if (parsedSettings.minLabourCharges) setMinLabourCharges(parsedSettings.minLabourCharges);
        if (parsedSettings.businessName) setBusinessName(parsedSettings.businessName);
        if (parsedSettings.contactName) setContactName(parsedSettings.contactName);
        if (parsedSettings.phoneNumber) setPhoneNumber(parsedSettings.phoneNumber);
        if (parsedSettings.address) setAddress(parsedSettings.address);
      } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      const subscription = form.watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [isClient, form]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ 
        showLabourCharges, 
        showTransportCharges, 
        labourRate, 
        minLabourCharges,
        businessName,
        contactName,
        phoneNumber,
        address
      }));
    }
  }, [showLabourCharges, showTransportCharges, labourRate, minLabourCharges, businessName, contactName, phoneNumber, address, isClient]);


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
            doc.text('sahadev jaat', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
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
  
  const handleShareSheetPdf = async () => {
    const doc = generateSheetPdfDoc();
    if (!doc) {
      alert("No measurement data to share.");
      return;
    }
    
    const date = new Date();
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
    const filename = `sheets_${timestamp}.pdf`;
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (window.isSecureContext && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: 'Granite Measurement Sheets',
          text: 'Here are the granite measurement sheets.',
        });
      } catch (error) {
        console.error('Error sharing:', error);
        alert('Could not share the file. Please try downloading instead.');
      }
    } else {
      alert('Sharing is not supported on this browser or you are on an insecure connection (HTTP). Please use a mobile browser like Chrome or Safari on HTTPS, or download the file.');
    }
  };

  const handleClearAll = (removeFromStorage = true) => {
    const newSheet = createNewSheet(Date.now().toString(), 'Sheet 1');
    form.reset({
      sheets: [newSheet],
      activeSheetId: newSheet.id,
    });
    if (removeFromStorage) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };
  
  const addSheet = () => {
    if (fields.length >= MAX_SHEETS) {
      alert(`You can only add up to ${MAX_SHEETS} sheets.`);
      return;
    }
    const newSheetId = Date.now().toString();
    const newSheet = createNewSheet(newSheetId, `Sheet ${fields.length + 1}`);
    append(newSheet);
    form.setValue('activeSheetId', newSheetId);
  };

  const deleteSheet = (sheetId: string) => {
    if (fields.length <= 1) {
      alert("You cannot delete the last sheet.");
      return;
    }
    const sheetIndex = fields.findIndex(s => s.id === sheetId);
    if (sheetIndex > -1) {
      remove(sheetIndex);
      if (activeSheetId === sheetId) {
        const newActiveIndex = Math.max(0, sheetIndex - 1);
        form.setValue('activeSheetId', fields[newActiveIndex].id);
      }
    }
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
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <GraniteIcon />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-destructive">{businessName}</h1>
        </div>
      </header>
      
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" className="h-7 px-1.5 text-xs">
                      <MenuIcon className="mr-1 h-3 w-3" />
                      Menu
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Sheet Actions</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={addSheet} disabled={fields.length >= MAX_SHEETS}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Add New Sheet</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                     <DropdownMenuSeparator />
                     <DropdownMenuGroup>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Clear All Data</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all your data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleClearAll()}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                     </DropdownMenuGroup>
                     <DropdownMenuSeparator />
                      <Dialog>
                        <DialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Settings</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <div className="space-y-2">
                               <Label htmlFor="business-name">Business Name</Label>
                               <Input
                                id="business-name"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="e.g., Priyanka Granite"
                               />
                            </div>
                             <div className="space-y-2">
                               <Label htmlFor="contact-name">Name</Label>
                               <Input
                                id="contact-name"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                placeholder="Enter your name"
                               />
                            </div>
                             <div className="space-y-2">
                               <Label htmlFor="phone-number">Phone Number</Label>
                               <Input
                                id="phone-number"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="Enter phone number"
                               />
                            </div>
                            <div className="space-y-2">
                               <Label htmlFor="address">Address</Label>
                               <Textarea
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter business address"
                               />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="show-labour" className="flex flex-col space-y-1">
                                <span>Show Labour Charges</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                  Enable or disable the labour charges field on the bill page.
                                </span>
                              </Label>
                              <Switch
                                id="show-labour"
                                checked={showLabourCharges}
                                onCheckedChange={setShowLabourCharges}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="show-transport" className="flex flex-col space-y-1">
                                <span>Show Transport Charges</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                  Enable or disable the transport charges field on the bill page.
                                </span>
                              </Label>
                              <Switch
                                id="show-transport"
                                checked={showTransportCharges}
                                onCheckedChange={setShowTransportCharges}
                              />
                            </div>
                            <div className="space-y-2">
                               <Label htmlFor="labour-rate">Labour Rate (per SFT)</Label>
                               <Input
                                id="labour-rate"
                                type="number"
                                value={labourRate}
                                onChange={(e) => setLabourRate(Number(e.target.value))}
                                placeholder="e.g., 3"
                               />
                            </div>
                            <div className="space-y-2">
                               <Label htmlFor="min-labour-charges">Minimum Labour Charges</Label>
                               <Input
                                id="min-labour-charges"
                                type="number"
                                value={minLabourCharges}
                                onChange={(e) => setMinLabourCharges(Number(e.target.value))}
                                placeholder="e.g., 200"
                               />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="default" onClick={handleDownloadSheetPdf} className="h-7 px-1.5 text-xs">
                  <FileDown className="mr-1 h-3 w-3" />
                  Download
                </Button>
                <Button variant="default" onClick={handleShareSheetPdf} className="h-7 px-1.5 text-xs">
                  <Share2 className="mr-1 h-3 w-3" />
                  Share
                </Button>
                <Link href="/bill" passHref>
                  <Button variant="default" className="h-7 px-1.5 text-xs">
                    <Eye className="mr-1 h-3 w-3" />
                    Bill
                  </Button>
                </Link>
            </div>
          </div>

          <Tabs value={activeSheetId} onValueChange={(id) => form.setValue('activeSheetId', id)} className="mt-4">
              <TabsList>
                {fields.map((sheet, index) => (
                  <TabsTrigger key={sheet.id} value={sheet.id} className={cn("relative pr-8", activeSheetId === sheet.id && "bg-primary text-primary-foreground")}>
                    {sheet.name}
                    {fields.length > 1 && (
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="absolute right-0.5 h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                  <X className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {sheet.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Are you sure you want to delete this sheet? This action cannot be undone.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSheet(sheet.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    )}
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
    </div>
  );
}




    

    