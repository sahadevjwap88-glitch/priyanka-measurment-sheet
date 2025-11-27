'use client';

import { useState, useTransition } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { generateSummaryAction } from '@/app/actions';
import { Download, Plus, FileText, Loader2, Sparkles, Ruler } from 'lucide-react';
import type { MeasurementRow } from '@/lib/types';
import { GraniteTable } from '@/components/granite-table';

const formSchema = z.object({
  measurements: z.array(
    z.object({
      length: z.string(),
      width: z.string(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const INITIAL_ROWS = 10;
const MAX_ROWS = 100;

export default function GraniteGridPage() {
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, startSummaryTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      measurements: Array(INITIAL_ROWS).fill({ length: '', width: '' }),
    },
    mode: 'onBlur',
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'measurements',
  });

  const measurements = useWatch({ control: form.control, name: 'measurements' });

  const handleAddRow = () => {
    if (fields.length < MAX_ROWS) {
      append({ length: '', width: '' });
    } else {
      toast({
        title: 'Row Limit Reached',
        description: `You cannot add more than ${MAX_ROWS} rows.`,
        variant: 'destructive',
      });
    }
  };

  const getValidData = () => {
    return measurements
      .map((m) => ({
        length: parseFloat(m.length),
        width: parseFloat(m.width),
      }))
      .filter((m) => !isNaN(m.length) && m.length > 0 && !isNaN(m.width) && m.width > 0);
  };
  
  const handleExport = () => {
    const validRows = measurements.filter(row => row.length && row.width);

    if (validRows.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'Please enter some measurements before exporting.',
        variant: 'destructive'
      });
      return;
    }
    
    const headers = ['Length (in)', 'Width (in)', 'Area (sq ft)'];
    const csvContent = [
      headers.join(','),
      ...validRows.map(row => {
        const length = parseFloat(row.length) || 0;
        const width = parseFloat(row.width) || 0;
        const area = (length * width) / 144;
        return `${length},${width},${area.toFixed(2)}`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'granite_measurements.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateSummary = () => {
    const validData = getValidData();
    if (validData.length === 0) {
      toast({
        title: 'Not Enough Data',
        description: 'Please enter valid measurements to generate a summary.',
        variant: 'destructive',
      });
      return;
    }

    startSummaryTransition(async () => {
      const result = await generateSummaryAction({ data: validData });
      if (result.error) {
        toast({
          title: 'Error Generating Summary',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.summary) {
        setSummary(result.summary);
        setIsSummaryDialogOpen(true);
      }
    });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Ruler className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Granite Grid</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Input granite slab measurements in inches, view statistics, and generate AI-powered summaries. You can add up to {MAX_ROWS} rows.
        </p>
      </header>
      
      <Card>
        <div className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <h2 className="text-xl font-semibold">Measurement Data</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-2" />
                        Export CSV
                    </Button>
                    <Button size="sm" onClick={handleGenerateSummary} disabled={isSummaryLoading}>
                        {isSummaryLoading ? (
                            <Loader2 className="mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2" />
                        )}
                        Generate Summary
                    </Button>
                </div>
            </div>
            <GraniteTable
                fields={fields}
                register={form.register}
                errors={form.formState.errors}
                control={form.control}
            />
            <div className="mt-4 flex justify-start">
                <Button variant="secondary" onClick={handleAddRow} disabled={fields.length >= MAX_ROWS}>
                    <Plus className="mr-2" />
                    Add Row
                </Button>
            </div>
        </div>
      </Card>

      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText /> AI Generated Summary</DialogTitle>
            <DialogDescription>
              Here is a text summary of your measurement data.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed">
            {summary}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSummaryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
