import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { parseISO, format, subDays, isAfter, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
// FIX: Changed import path for ScoreHistoryEntry to types.ts
import { ScoreHistoryEntry } from '../types';

interface CoupleScoreChartProps {
    history: ScoreHistoryEntry[];
}

type TimeRange = '7d' | '14d' | '30d' | '90d' | 'all';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-surface p-3 rounded-lg border border-dark-border shadow-lg">
        <p className="label text-dark-text-secondary text-sm">{`Le ${label}`}</p>
        <p className="intro text-dark-text-primary font-bold">{`Score : ${payload[0].value}%`}</p>
      </div>
    );
  }
  return null;
};

const CoupleScoreChart: React.FC<CoupleScoreChartProps> = ({ history }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');

    const processedData = useMemo(() => {
        if (!history || history.length < 1) return [];

        const now = new Date();
        let startDate: Date;
        const sortedHistory = history
            .map(d => ({ ...d, date: parseISO(d.date) }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        switch(timeRange) {
            case '7d': startDate = subDays(now, 7); break;
            case '14d': startDate = subDays(now, 14); break;
            case '30d': startDate = subDays(now, 30); break;
            case '90d': startDate = subDays(now, 90); break;
            case 'all': startDate = sortedHistory[0]?.date || now; break;
            default: startDate = subDays(now, 30);
        }

        const lastScoreBeforeRange = sortedHistory.filter(d => d.date < startDate).pop()?.score;
        const firstScoreInHistory = sortedHistory[0]?.score;
        let currentScore = lastScoreBeforeRange ?? firstScoreInHistory ?? 100;

        const range = eachDayOfInterval({ start: startDate, end: now });

        const historyByDay = new Map<string, number>();
        sortedHistory.forEach(entry => {
            historyByDay.set(format(entry.date, 'yyyy-MM-dd'), entry.score);
        });

        return range.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            if (historyByDay.has(dayKey)) {
                currentScore = historyByDay.get(dayKey)!;
            }
            return {
                date: day,
                score: currentScore,
                formattedDate: format(day, 'd MMM', { locale: fr })
            };
        });
    }, [history, timeRange]);
    
    const TimeRangeButton: React.FC<{ range: TimeRange; label: string }> = ({ range, label }) => (
        <button
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
                timeRange === range
                ? 'bg-brand-primary text-white font-semibold'
                : 'bg-dark-surface-soft text-dark-text-secondary hover:bg-zinc-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-dark-surface p-4 md:p-6 rounded-2xl shadow-lg mb-8">
            <h3 className="text-xl font-bold text-dark-text-primary mb-4">Évolution de l'Alliance</h3>
            <div className="flex justify-center space-x-2 mb-4">
                <TimeRangeButton range="7d" label="7j" />
                <TimeRangeButton range="14d" label="14j" />
                <TimeRangeButton range="30d" label="30j" />
                <TimeRangeButton range="90d" label="90j" />
                <TimeRangeButton range="all" label="Tout" />
            </div>
            <div style={{ width: '100%', height: 300 }} className="relative">
                <ResponsiveContainer>
                    {processedData.length >= 2 ? (
                        <LineChart data={processedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                            <XAxis dataKey="formattedDate" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ stroke: '#52525B', strokeWidth: 1 }}
                                content={<CustomTooltip />}
                            />
                            <Line type="monotone" dataKey="score" name="Score d'Alliance" stroke="#4A90E2" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    ) : (
                         <div className="absolute inset-0 flex items-center justify-center h-full w-full">
                            <p className="text-dark-text-secondary text-center px-4">Pas assez de données pour afficher un graphique sur cette période.</p>
                        </div>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CoupleScoreChart;