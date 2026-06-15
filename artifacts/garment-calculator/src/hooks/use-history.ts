import { useState, useEffect } from 'react';

export interface HistoryRecord {
  id: string;
  date: string;
  calcType: 'shrinkage' | 'percentage_increase';
  unit: 'CM' | 'INCH';
  chartValue: number;
  patternMeasurement: number;
  patternShrinkage: number;
  finalMeasurement: number;
  requiredShrinkage: number;
  percentageIncrease: number;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('garment-calc-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  const addRecord = (record: Omit<HistoryRecord, 'id' | 'date'>) => {
    const newRecord: HistoryRecord = {
      ...record,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    const newHistory = [newRecord, ...history];
    setHistory(newHistory);
    localStorage.setItem('garment-calc-history', JSON.stringify(newHistory));
  };

  const deleteRecord = (id: string) => {
    const newHistory = history.filter(r => r.id !== id);
    setHistory(newHistory);
    localStorage.setItem('garment-calc-history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('garment-calc-history');
  };

  const exportCsv = () => {
    const headers = [
      'Date', 'Time', 'Calculator', 'Unit',
      'Measurement Chart Value', 'Pattern Measurement Value',
      'Pattern Shrinkage %', 'Final Pattern Measurement',
      'Required Shrinkage %', 'Percentage Increase %'
    ];
    const rows = history.map(r => {
      const d = new Date(r.date);
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        r.calcType === 'percentage_increase' ? 'Percentage Increase' : 'Pattern Shrinkage',
        r.unit,
        r.chartValue.toString(),
        r.patternMeasurement.toString(),
        r.patternShrinkage.toString(),
        r.finalMeasurement.toString(),
        r.requiredShrinkage.toString(),
        r.percentageIncrease.toString(),
      ];
    });
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garment-calc-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { history, addRecord, deleteRecord, clearHistory, exportCsv };
}
