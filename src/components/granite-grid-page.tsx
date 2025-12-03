
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Eye, Download, Trash2, Copy, Settings, Menu as MenuIcon } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

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
  activeSheetId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
type Sheet = z.infer<typeof sheetSchema>;

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

const defaultValues: FormValues = {
  sheets: [createNewSheet(Date.now().toString(), 'Sheet 1')],
  activeSheetId: '',
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "sheets",
  });

  const watchedSheets = useWatch({ control: form.control, name: 'sheets' });
  const activeSheetId = useWatch({ control: form.control, name: 'activeSheetId' });
  const activeSheetIndex = watchedSheets.findIndex(s => s.id === activeSheetId);
  const activeSheet = watchedSheets[activeSheetIndex];
  
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
          form.reset({ ...parsedData, sheets: cleanedSheets });
        } else {
           form.reset(defaultValues);
           form.setValue('activeSheetId', defaultValues.sheets[0].id);
        }
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        form.reset(defaultValues);
        form.setValue('activeSheetId', defaultValues.sheets[0].id);
      }
    } else {
        form.setValue('activeSheetId', defaultValues.sheets[0].id);
    }
  }, [form]);

  useEffect(() => {
    if (isClient) {
      const subscription = form.watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [isClient, form]);


  const getValidDataForSheet = useCallback((sheet: Sheet | undefined) => {
    if (!sheet || !sheet.measurements) return [];
    return sheet.measurements
      .map((m) => ({
        length: parseFloat(m.length),
        width: parseFloat(m.width),
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0) || [];
  }, []);

  const calculateTotalSquareFeetForSheet = useCallback((sheet: Sheet | undefined) => {
    if (!isClient || !sheet) return 0;
    const validData = getValidDataForSheet(sheet);
    if (validData.length === 0) {
      return 0;
    }
    const totalAreaInches = validData.reduce((acc, m) => acc + m.length * m.width, 0);
    return totalAreaInches / 144;
  }, [isClient, getValidDataForSheet]);

  const handleClearAll = () => {
    const newSheet = createNewSheet(Date.now().toString(), 'Sheet 1');
    form.reset({
      sheets: [newSheet],
      activeSheetId: newSheet.id,
    });
    localStorage.removeItem(LOCAL_STORAGE_KEY);
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

  const duplicateSheet = () => {
    if (fields.length >= MAX_SHEETS) {
      alert(`You can only add up to ${MAX_SHEETS} sheets.`);
      return;
    }
    if (!activeSheet) return;
    const newSheetId = Date.now().toString();
    const newSheet = {
      ...activeSheet,
      id: newSheetId,
      name: `${activeSheet.name} (copy)`,
    };
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

  const handleExportMeasurementSheet = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    if (!activeSheet) return;

    const color = activeSheet.color;
    const date = new Date();
    const today = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
    const filename = `measurement-sheet_${timestamp}.pdf`;
    
    const tableData = (activeSheet.measurements || []).map((field, index) => {
      const length = field.length;
      const width = field.width;
      const area = (parseFloat(length) * parseFloat(width)) / 144;
      return [index + 1, length, width, isNaN(area) ? '0.00' : area.toFixed(2)];
    }).filter(row => row[1] && row[2]);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Measurement Sheet - ${activeSheet.name}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${today}`, doc.internal.pageSize.width - 20, 30, { align: 'right' });
    if(color){
      doc.text(`Color: ${color}`, 14, 30);
    }
    
    doc.autoTable({
        head: [['S.No', 'Length (in)', 'Width (in)', 'Area (sq ft)']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 12 },
        styles: { fontSize: 11, cellPadding: 2 },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Square Feet: ${calculateTotalSquareFeetForSheet(activeSheet).toFixed(2)}`, 14, finalY + 15);
    
    doc.save(filename);
  };
  
  if (!isClient) {
    return null; 
  }
  
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <GraniteIcon />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Priyanka Granite</h1>
        </div>
      </header>
      
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MenuIcon className="mr-2 h-4 w-4" />
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
                  <DropdownMenuItem onClick={duplicateSheet} disabled={fields.length >= MAX_SHEETS}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Duplicate Current Sheet</span>
                  </DropdownMenuItem>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Current Sheet</span>
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the current sheet. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => activeSheet && deleteSheet(activeSheet.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                   <DropdownMenuItem asChild>
                    <Link href="/bill" passHref>
                      <Eye className="mr-2 h-4 w-4" />
                      View Bill
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportMeasurementSheet}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export Current Sheet</span>
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
                          <AlertDialogAction onClick={handleClearAll}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                 </DropdownMenuGroup>
                 <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tabs value={activeSheetId} onValueChange={(id) => form.setValue('activeSheetId', id)} className="mt-4">
              <TabsList>
                {fields.map((sheet, index) => (
                  <TabsTrigger key={sheet.id} value={sheet.id} className={cn('pr-2', activeSheetId === sheet.id && "bg-primary text-primary-foreground")}>
                    {sheet.name}
                  </TabsTrigger>
                ))}
              </TabsList>
               {fields.map((sheet, sheetIndex) => (
                  <TabsContent key={sheet.id} value={sheet.id}>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <div className="flex items-center gap-2 flex-grow" style={{maxWidth: '20rem'}}>
                        <Label htmlFor={`color-${sheet.id}`} className="whitespace-nowrap">Color Name</Label>
                        <Input id={`color-${sheet.id}`} placeholder="Enter color name" {...form.register(`sheets.${sheetIndex}.color`)} className="w-full" />
                      </div>
                       <div className="flex items-center gap-2 flex-grow" style={{maxWidth: '20rem'}}>
                        <Label htmlFor={`rate-${sheet.id}`} className="whitespace-nowrap">Rate</Label>
                        <Input id={`rate-${sheet.id}`} type="number" placeholder="Enter rate" {...form.register(`sheets.${sheetIndex}.rate`)} className="w-full" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground">Total Square Feet: </span>
                        <span className="text-2xl font-bold">{calculateTotalSquareFeetForSheet(sheet).toFixed(2)}</span>
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
        </div>
      </Card>
    </div>
  );
}
