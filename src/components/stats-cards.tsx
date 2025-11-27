'use client';

import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, ArrowDown, ArrowUp } from 'lucide-react';
import type { MeasurementRow } from '@/lib/types';

interface StatsCardsProps {
  control: Control<{ measurements: MeasurementRow[] }>;
}

export function StatsCards({ control }: StatsCardsProps) {
  const measurements = useWatch({ control, name: 'measurements' });

  const stats = useMemo(() => {
    const validLengths = measurements
      .map((m) => parseFloat(m.length))
      .filter((l) => !isNaN(l) && l > 0);
    const validWidths = measurements
      .map((m) => parseFloat(m.width))
      .filter((w) => !isNaN(w) && w > 0);

    const calcStats = (arr: number[]) => {
      if (arr.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
      const sum = arr.reduce((a, b) => a + b, 0);
      return {
        avg: sum / arr.length,
        min: Math.min(...arr),
        max: Math.max(...arr),
        count: arr.length,
      };
    };

    return {
      length: calcStats(validLengths),
      width: calcStats(validWidths),
    };
  }, [measurements]);

  const StatCard = ({ title, value, icon, unit }: { title: string, value: number, icon: React.ReactNode, unit: string }) => (
    <Card className="flex-1 min-w-[120px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value.toFixed(2)}
          <span className="text-xs text-muted-foreground ml-1">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
        <h2 className="text-xl font-semibold mb-4">Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Length Stats</CardTitle>
                    <p className="text-sm text-muted-foreground">{stats.length.count} valid entries</p>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <StatCard title="Average" value={stats.length.avg} icon={<BarChart className="h-4 w-4 text-muted-foreground" />} unit="cm" />
                    <StatCard title="Min" value={stats.length.min} icon={<ArrowDown className="h-4 w-4 text-muted-foreground" />} unit="cm" />
                    <StatCard title="Max" value={stats.length.max} icon={<ArrowUp className="h-4 w-4 text-muted-foreground" />} unit="cm" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Width Stats</CardTitle>
                    <p className="text-sm text-muted-foreground">{stats.width.count} valid entries</p>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <StatCard title="Average" value={stats.width.avg} icon={<BarChart className="h-4 w-4 text-muted-foreground" />} unit="cm" />
                    <StatCard title="Min" value={stats.width.min} icon={<ArrowDown className="h-4 w-4 text-muted-foreground" />} unit="cm" />
                    <StatCard title="Max" value={stats.width.max} icon={<ArrowUp className="h-4 w-4 text-muted-foreground" />} unit="cm" />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
