import React, { useEffect, useMemo, useState } from 'react';
import { NeedCard, User, ActionPlan } from '../types';
import { format, parseISO, subWeeks, startOfWeek, endOfWeek, isWithinInterval, subMonths, startOfMonth, endOfMonth, addWeeks, addMonths, addDays, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircleIcon, InformationCircleIcon, CalendarIcon, CheckIcon } from './icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

type AugmentedActionPlan = ActionPlan & {
    needId: string;
    needTitle: string;
    needAuthor: User;
    needTimestamp: string;
};

const MyActionItems: React.FC<{
    actions: AugmentedActionPlan[];
    onUpdateNeed: (needId: string, updates: Partial<NeedCard>) => void;
    needs: NeedCard[];
    partner: User;
}> = ({ actions, onUpdateNeed, needs, partner }) => {

    const [localActions, setLocalActions] = useState<AugmentedActionPlan[]>(actions);

    useEffect(() => {
        setLocalActions(actions);
    }, [actions]);

    const updateActionAndPersist = (
        actionToUpdate: AugmentedActionPlan,
        getUpdates: (action: ActionPlan) => Partial<ActionPlan> | null // Return null to filter/delete
    ) => {
        // --- Optimistic UI Update ---
        const updatedLocalActions: AugmentedActionPlan[] = [];
        for (const action of localActions) {
            if (action.id === actionToUpdate.id) {
                const updates = getUpdates(action);
                if (updates !== null) { // Not deleting
                    updatedLocalActions.push({ ...action, ...updates });
                }
                // if null, we're deleting, so we don't push it to the new array
            } else {
                updatedLocalActions.push(action);
            }
        }
        setLocalActions(updatedLocalActions);

        // --- Background Persistence ---
        const needToUpdate = needs.find(n => n.id === actionToUpdate.needId);
        if (!needToUpdate) return;
        
        const allNeedActions = (needToUpdate.actionPlans || []).map(a => ({...a, id: a.id || generateUUID()}));
        
        let targetFound = false;
        const finalActionPlans: ActionPlan[] = [];

        allNeedActions.forEach(currentAction => {
            const isTarget = currentAction.id === actionToUpdate.id;
            
            if (isTarget) {
                targetFound = true;
                const updates = getUpdates(currentAction);
                if (updates !== null) { // not deleting
                    finalActionPlans.push({ ...currentAction, ...updates });
                }
            } else {
                finalActionPlans.push(currentAction);
            }
        });
        
        onUpdateNeed(actionToUpdate.needId, { actionPlans: finalActionPlans });
    };

    const handleToggleComplete = (action: AugmentedActionPlan) => {
        updateActionAndPersist(action, (current) => ({ isCompleted: !current.isCompleted }));
    };

    const handleSetReminder = (action: AugmentedActionPlan, days: number | null) => {
        const reminderDate = days ? addDays(new Date(), days).toISOString() : undefined;
        updateActionAndPersist(action, () => ({ reminderDate }));
    };
    
    const handleArchiveAction = (action: AugmentedActionPlan) => {
        updateActionAndPersist(action, () => null); // Returning null signifies deletion
    };

    if (actions.length === 0) {
        return (
            <div className="mb-8">
                 <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Mes Actions Engagées</h2>
                <div className="text-center p-8 bg-dark-surface rounded-2xl shadow-lg h-full flex flex-col justify-center items-center">
                    <CheckCircleIcon className="w-12 h-12 text-brand-accent mb-4"/>
                    <h3 className="text-lg font-semibold text-dark-text-primary">Aucune action en cours.</h3>
                    <p className="text-dark-text-secondary mt-1">Les actions que vous vous engagez à prendre apparaîtront ici.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Mes Actions Engagées</h2>
            <div className="space-y-3">
                {localActions.map(action => {
                    const isOverdue = action.reminderDate && isPast(parseISO(action.reminderDate));
                    return (
                        <div key={action.id || action.text} className={`p-4 rounded-2xl shadow-lg bg-dark-surface animate-fade-in flex items-start space-x-4 transition-opacity ${action.isCompleted ? 'opacity-70' : 'opacity-100'}`}>
                            <button 
                                onClick={() => handleToggleComplete(action)}
                                className={`w-6 h-6 mt-1 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all group ${action.isCompleted ? 'bg-brand-accent border-brand-accent' : 'border-dark-border hover:border-brand-accent'}`}
                                aria-label={action.isCompleted ? "Marquer comme non terminée" : "Marquer comme terminée"}
                            >
                                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${action.isCompleted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                            </button>
                            <div className="flex-grow">
                                <p className={`font-semibold text-dark-text-primary transition-all ${action.isCompleted ? 'line-through' : ''}`}>{action.text}</p>
                                <p className="text-sm text-dark-text-secondary mt-1">
                                    Pour le besoin de <span className="font-semibold text-brand-primary">{partner}</span> : "{action.needTitle}"
                                </p>
                                {action.reminderDate && (
                                    <p className={`text-xs mt-1 font-semibold flex items-center ${isOverdue ? 'text-red-400' : 'text-yellow-400'}`}>
                                        <CalendarIcon className="w-4 h-4 mr-1.5" />
                                        Rappel le {format(parseISO(action.reminderDate), 'd MMMM', { locale: fr })}
                                    </p>
                                )}
                            </div>
                            <div className="flex-shrink-0 flex items-center space-x-2">
                                <div className="relative group">
                                    <button className="p-1 text-dark-text-secondary hover:text-dark-text-primary">
                                        <CalendarIcon className="w-5 h-5" />
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-36 bg-dark-surface-soft border border-dark-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                        <button onClick={() => handleSetReminder(action, 3)} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-600">Dans 3 jours</button>
                                        <button onClick={() => handleSetReminder(action, 7)} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-600">Dans 7 jours</button>
                                        <button onClick={() => handleSetReminder(action, 14)} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-600">Dans 14 jours</button>
                                        <button onClick={() => handleSetReminder(action, 30)} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-600">Dans 30 jours</button>
                                        {action.reminderDate && <button onClick={() => handleSetReminder(action, null)} className="block w-full text-left px-3 py-2 text-sm text-red-400 border-t border-dark-border hover:bg-zinc-600">Annuler rappel</button>}
                                    </div>
                                </div>
                               {action.isCompleted && (
                                    <button 
                                        onClick={() => handleArchiveAction(action)} 
                                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                        aria-label="Supprimer définitivement l'action"
                                    >
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </button>
                               )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-surface p-3 rounded-lg border border-dark-border shadow-lg">
        <p className="label text-dark-text-secondary text-sm">{label}</p>
        {payload.map((pld: any) => (
            <p key={pld.dataKey} style={{ color: pld.color }} className="font-semibold">{`${pld.name}: ${pld.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};


const DashboardAnalytics: React.FC<{needs: NeedCard[]}> = ({ needs }) => {
    const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
    const [offset, setOffset] = useState(0);

    const { chartData, rangeLabel } = useMemo(() => {
        const now = new Date();
        if(timeRange === 'week') {
            const weeks = [];
            const refDate = addWeeks(now, -offset);
            for (let i = 0; i < 4; i++) {
                const weekStart = startOfWeek(subWeeks(refDate, 3 - i), { weekStartsOn: 1 });
                weeks.push({
                    name: `S${format(weekStart, 'w', { locale: fr })}`,
                    start: weekStart,
                    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
                    Envoyés: 0,
                    Considérés: 0,
                });
            }

            needs.forEach(need => {
                const needDate = parseISO(need.timestamp);
                const week = weeks.find(w => isWithinInterval(needDate, { start: w.start, end: w.end }));
                if (week) {
                    week.Envoyés += 1;
                    if (need.status === 'discussed') {
                        week.Considérés += 1;
                    }
                }
            });
            const firstWeek = format(weeks[0].start, 'd MMM', { locale: fr });
            const lastWeek = format(weeks[3].end, 'd MMM', { locale: fr });
            return { chartData: weeks, rangeLabel: `${firstWeek} - ${lastWeek}` };
        } else { // month
             const months = [];
             const refDate = addMonths(now, -offset);
            for (let i = 0; i < 6; i++) {
                const monthDate = startOfMonth(subMonths(refDate, 5 - i));
                months.push({
                    name: format(monthDate, 'MMM', { locale: fr }),
                    start: monthDate,
                    end: endOfMonth(monthDate),
                    Envoyés: 0,
                    Considérés: 0,
                });
            }

            needs.forEach(need => {
                const needDate = parseISO(need.timestamp);
                const month = months.find(m => isWithinInterval(needDate, { start: m.start, end: m.end }));
                if (month) {
                    month.Envoyés += 1;
                    if (need.status === 'discussed') {
                        month.Considérés += 1;
                    }
                }
            });
             const firstMonth = format(months[0].start, 'MMMM yyyy', { locale: fr });
             const lastMonth = format(months[5].end, 'MMMM yyyy', { locale: fr });
            return { chartData: months, rangeLabel: `${firstMonth} - ${lastMonth}`};
        }

    }, [needs, timeRange, offset]);

    useEffect(() => {
        setOffset(0);
    }, [timeRange]);

    const TimeRangeButton: React.FC<{ range: 'week' | 'month'; label: string }> = ({ range, label }) => (
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
            <div className="flex justify-between items-center mb-1">
                 <h3 className="text-xl font-bold text-dark-text-primary">Activité du couple</h3>
                 <div className="flex space-x-2">
                    <TimeRangeButton range="week" label="4 Semaines" />
                    <TimeRangeButton range="month" label="6 Mois" />
                 </div>
            </div>
             <div className="flex justify-center items-center mb-4">
                <button onClick={() => setOffset(o => o + 1)} className="p-1 rounded-full hover:bg-dark-surface-soft">
                    <svg className="w-5 h-5 text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm text-dark-text-secondary font-semibold tabular-nums tracking-wider w-48 text-center">{rangeLabel}</span>
                <button onClick={() => setOffset(o => o - 1)} disabled={offset === 0} className="p-1 rounded-full hover:bg-dark-surface-soft disabled:opacity-50 disabled:cursor-not-allowed">
                     <svg className="w-5 h-5 text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <div style={{ width: '100%', height: 250 }}>
                 <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                        <XAxis dataKey="name" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={30}/>
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525B', strokeWidth: 1 }} />
                        <Legend wrapperStyle={{fontSize: "14px", paddingTop: "10px"}}/>
                        <Line type="monotone" dataKey="Envoyés" stroke="#4A90E2" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Considérés" stroke="#7ED321" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

const getStatusInfo = (need: NeedCard) => {
    switch (need.status) {
        case 'shared':
            return { text: 'En attente', className: 'bg-red-500/10 text-red-400' };
        case 'discussed':
            return { text: 'Répondu', className: 'bg-green-500/10 text-green-400' };
        default:
            return { text: 'Inconnu', className: 'bg-gray-500/10 text-gray-300' };
    }
};


const PartnerNeeds: React.FC<{ needs: NeedCard[], onSelectNeed: (id: string) => void; }> = ({ needs, onSelectNeed }) => {
    if (needs.length === 0) {
        return (
            <div className="text-center p-8 bg-dark-surface rounded-2xl h-full flex flex-col justify-center items-center">
                <CheckCircleIcon className="w-12 h-12 text-brand-accent mb-4"/>
                <h3 className="text-lg font-semibold text-dark-text-primary">Tout est au clair !</h3>
                <p className="text-dark-text-secondary mt-1">Aucun nouveau besoin n'a été partagé.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {needs.map(need => (
                <div key={need.id} className="p-5 rounded-2xl shadow-lg bg-dark-surface animate-fade-in transition-all hover:bg-dark-surface-soft cursor-pointer" onClick={() => onSelectNeed(need.id)}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3 min-w-0">
                             {!need.seenByPartner && <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" aria-label="Non lu"></div>}
                            <p className="text-dark-text-primary font-semibold truncate">{need.title || need.translatedNeed}</p>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0">
                            <span className="text-sm text-dark-text-secondary whitespace-nowrap">
                                {format(parseISO(need.timestamp), "d MMM", { locale: fr })}
                            </span>
                             <svg className="w-4 h-4 text-dark-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const MyNeedsHistory: React.FC<{ needs: NeedCard[], onSelectNeed: (id: string) => void; }> = ({ needs, onSelectNeed }) => {
        
    if (needs.length === 0) {
        return (
             <div className="text-center p-8 bg-dark-surface rounded-2xl h-full flex flex-col justify-center items-center">
                <InformationCircleIcon className="w-12 h-12 text-brand-primary mb-4"/>
                <h3 className="text-lg font-semibold text-dark-text-primary">Prêt à partager ?</h3>
                <p className="text-dark-text-secondary mt-1">Utilisez l'onglet "Partager" pour transformer un agacement en dialogue.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {needs.map(need => {
                const statusInfo = getStatusInfo(need);
                const isUnreadUpdate = need.status === 'discussed' && !need.authorHasSeenUpdate;
                return (
                     <div key={need.id} className="p-5 rounded-2xl shadow-lg bg-dark-surface animate-fade-in transition-all hover:bg-dark-surface-soft cursor-pointer" onClick={() => onSelectNeed(need.id)}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3 min-w-0">
                                {isUnreadUpdate && <div className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" aria-label="Nouveau statut"></div>}
                                <p className="text-dark-text-primary font-semibold truncate">{need.title || `"${need.originalAnnoyance}"`}</p>
                            </div>
                            <div className="flex items-center space-x-3 flex-shrink-0">
                                <span className="text-sm text-dark-text-secondary whitespace-nowrap">
                                    {format(parseISO(need.timestamp), "d MMM", { locale: fr })}
                                </span>
                                <span className={`text-xs font-semibold rounded-full px-2 py-1 ${statusInfo.className} hidden sm:inline-block`}>
                                    {statusInfo.text}
                                </span>
                                 <svg className="w-4 h-4 text-dark-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface DashboardProps {
    currentUser: User;
    partner: User;
    needs: NeedCard[];
    onSelectNeed: (id: string) => void;
    onUpdateNeed: (needId: string, updates: Partial<NeedCard>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, partner, needs, onSelectNeed, onUpdateNeed }) => {
    const sortedNeeds = [...needs].sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
    const myNeeds = sortedNeeds.filter(n => n.author === currentUser);
    const partnerNeeds = sortedNeeds.filter(n => n.author === partner);

    const myActionItems = useMemo(() => {
        const allActions: AugmentedActionPlan[] = [];
        needs.forEach(need => {
            if (Array.isArray(need.actionPlans)) {
                need.actionPlans.forEach(action => {
                    if (action && typeof action === 'object' && action.author === currentUser) {
                        allActions.push({
                            ...action,
                            id: action.id || generateUUID(), // Ensure ID for legacy data
                            needId: need.id,
                            needTitle: need.title || need.originalAnnoyance.substring(0, 50) + '...',
                            needAuthor: need.author,
                            needTimestamp: need.timestamp,
                        });
                    }
                });
            }
        });
        // Sort by oldest need first
        allActions.sort((a, b) => parseISO(a.needTimestamp).getTime() - parseISO(b.needTimestamp).getTime());
        return allActions;
    }, [needs, currentUser]);


    return (
        <div className="p-4 md:p-8 animate-fade-in">
             <DashboardAnalytics needs={sortedNeeds} />
             <MyActionItems actions={myActionItems} onUpdateNeed={onUpdateNeed} needs={needs} partner={partner} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section>
                    <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Les besoins de <span className="text-brand-primary">{partner}</span></h2>
                    <PartnerNeeds 
                        needs={partnerNeeds} 
                        onSelectNeed={onSelectNeed}
                    />
                </section>
                <section>
                    <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Mon historique de partages</h2>
                    <MyNeedsHistory 
                        needs={myNeeds} 
                        onSelectNeed={onSelectNeed} 
                    />
                </section>
            </div>
        </div>
    );
};

export default Dashboard;