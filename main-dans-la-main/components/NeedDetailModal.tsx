import React, { useState, useEffect } from 'react';
import { NeedCard, User, ActionPlan } from '../types';
import { SparklesIcon, CheckCircleIcon, TrashIcon } from './icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NeedDetailPageProps {
  need: NeedCard;
  currentUser: User;
  partner: User;
  onBack: () => void;
  onUpdateNeed: (needId: string, updates: Partial<NeedCard>) => void;
  onApiKeyInvalid: () => void;
  onCancelNeed: (needId: string) => void;
}

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const NeedResponseForm: React.FC<{ need: NeedCard; currentUser: User; onUpdateNeed: NeedDetailPageProps['onUpdateNeed']; onApiKeyInvalid: () => void; onBack: () => void; }> = ({ need, currentUser, onUpdateNeed, onApiKeyInvalid, onBack }) => {
    const [actions, setActions] = useState(['']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleActionChange = (index: number, value: string) => {
        const newActions = [...actions];
        newActions[index] = value;
        setActions(newActions);
    };

    const addActionInput = () => setActions([...actions, '']);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const proposed = actions.map(a => a.trim()).filter(Boolean);
        if (proposed.length === 0) return;

        setIsSubmitting(true);
        setSubmitSuccess(false);

        const newActionPlans: ActionPlan[] = proposed.map((text) => ({
            id: generateUUID(),
            text,
            author: currentUser,
            isCompleted: false,
        }));
        
        onUpdateNeed(need.id, {
            actionPlans: [...(need.actionPlans || []), ...newActionPlans],
            status: 'discussed',
            authorHasSeenUpdate: false, // Notify the author of the update
        });
        
        setActions(['']);
        setIsSubmitting(false);
        setSubmitSuccess(true);
        
        setTimeout(() => {
            setSubmitSuccess(false);
            onBack(); // Go back to dashboard after successful submission
        }, 2000);
    };
    
    return (
        <form onSubmit={handleSubmit} className="mt-6 animate-fade-in border-t border-dark-border pt-6">
            <div>
                 <h4 className="font-semibold text-dark-text-primary mb-2">Proposez une ou plusieurs actions concrètes :</h4>
                 <p className="text-sm text-dark-text-secondary mb-4">Cela montrera que vous avez pris en compte son besoin. Ces actions ne seront pas visibles par {need.author}.</p>
                <div className="space-y-3">
                    {actions.map((action, index) => (
                        <input
                            key={index}
                            type="text"
                            value={action}
                            onChange={(e) => handleActionChange(index, e.target.value)}
                            placeholder={`Action concrète ${index + 1}`}
                            className="w-full p-2 border border-dark-border bg-dark-surface-soft text-dark-text-primary rounded-md focus:ring-2 focus:ring-brand-primary"
                            aria-label={`Action ${index + 1}`}
                        />
                    ))}
                </div>
                 <button type="button" onClick={addActionInput} className="text-sm mt-3 text-brand-secondary hover:text-yellow-300 transition-colors">
                    + Ajouter une action
                </button>
            </div>
             <div className="mt-6 flex flex-col sm:flex-row-reverse gap-4">
                <button type="submit" disabled={isSubmitting || submitSuccess} className={`w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center transition duration-300 ${submitSuccess ? 'bg-brand-accent' : 'bg-brand-primary hover:bg-blue-600'} text-white disabled:bg-gray-600`}>
                    {isSubmitting ? (
                        'Enregistrement...'
                    ) : submitSuccess ? (
                        <span className="flex items-center">
                            <CheckCircleIcon className="w-5 h-5 mr-2" />
                            C'est noté !
                        </span>
                    ) : (
                        "Marquer comme 'Considéré'"
                    )}
                </button>
                <button 
                    type="button" 
                    onClick={onBack} 
                    className="w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center transition duration-300 bg-dark-surface-soft border border-dark-border hover:bg-zinc-600 text-dark-text-primary"
                >
                    Revenir sur mon profil
                </button>
            </div>
        </form>
    );
};

const MyNeedResolutionDetails: React.FC<Pick<NeedDetailPageProps, 'need' | 'partner' | 'onCancelNeed' | 'onBack'>> = ({ need, partner, onCancelNeed, onBack }) => {
    const handleCancel = () => {
        if (window.confirm("Êtes-vous sûr(e) de vouloir annuler ce partage ? Cette action est définitive.")) {
            onCancelNeed(need.id);
        }
    };

    return (
        <div className="mt-6 border-t border-dark-border pt-6">
             {need.status === 'shared' && (
                <div className="text-center p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
                    <p className="font-semibold text-yellow-300">En attente</p>
                    <p className="text-yellow-400 mt-1">{partner} n'a pas encore indiqué avoir considéré votre besoin.</p>
                </div>
            )}
            {need.status === 'discussed' && (
                 <div className="text-center p-4 bg-green-900/50 border border-green-700 rounded-lg">
                    <p className="font-semibold text-green-300">Considéré</p>
                    <p className="text-green-400 mt-1">{partner} a pris connaissance de votre besoin.</p>
                </div>
            )}
            <div className="mt-8 flex flex-col items-center gap-4">
                <button 
                    onClick={onBack} 
                    className="w-full max-w-xs font-bold py-3 px-4 rounded-lg flex items-center justify-center transition duration-300 bg-dark-surface-soft border border-dark-border hover:bg-zinc-600 text-dark-text-primary"
                >
                    Retour au tableau de bord
                </button>
                <button
                    onClick={handleCancel}
                    className="inline-flex items-center text-sm text-dark-text-secondary hover:text-red-400 transition-colors"
                >
                    <TrashIcon className="w-4 h-4 mr-1.5" />
                    Annuler ce partage
                </button>
            </div>
        </div>
    );
};

const NeedDetailPage: React.FC<NeedDetailPageProps> = ({ need, currentUser, partner, onBack, onUpdateNeed, onApiKeyInvalid, onCancelNeed }) => {
    if (!need) {
        return (
            <div className="p-8 text-center">
                <p>Oups, ce besoin est introuvable.</p>
                <button onClick={onBack} className="mt-4 text-brand-primary hover:underline">Retour</button>
            </div>
        );
    }

    const isMyNeed = need.author === currentUser;
    
    return (
        <div className="p-4 md:p-8 animate-fade-in">
            <button onClick={onBack} className="mb-6 inline-flex items-center text-sm font-semibold text-dark-text-secondary hover:text-dark-text-primary transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour au tableau de bord
            </button>
            <div className="bg-dark-surface w-full max-w-3xl mx-auto rounded-2xl shadow-lg p-6 md:p-8">
                <header className="pb-4 border-b border-dark-border">
                    <h2 className="text-2xl font-bold text-dark-text-primary">
                        {need.title || (isMyNeed ? "Mon besoin partagé" : `Le besoin de ${need.author}`)}
                    </h2>
                    <p className="text-sm text-dark-text-secondary mt-1">
                        Partagé le {format(parseISO(need.timestamp), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                </header>
                
                <main className="py-6 space-y-6">
                    <section>
                        <h3 className="font-semibold text-dark-text-secondary">Le besoin exprimé</h3>
                        <div className="mt-2 p-4 rounded-lg bg-dark-surface-soft border-l-4 border-brand-primary">
                            <p className="text-dark-text-primary text-lg leading-relaxed">{need.translatedNeed}</p>
                        </div>
                    </section>
                    <section>
                        <h3 className="font-semibold text-dark-text-secondary">Contexte original partagé</h3>
                        <div className="mt-2 p-4 rounded-lg bg-dark-surface-soft">
                            <p className="text-dark-text-secondary italic">"{need.originalAnnoyance}"</p>
                        </div>
                    </section>
                </main>

                {isMyNeed ? (
                    <MyNeedResolutionDetails
                        need={need}
                        partner={partner}
                        onCancelNeed={onCancelNeed}
                        onBack={onBack}
                    />
                ) : (
                    <NeedResponseForm
                        need={need}
                        currentUser={currentUser}
                        onUpdateNeed={onUpdateNeed}
                        onApiKeyInvalid={onApiKeyInvalid}
                        onBack={onBack}
                    />
                )}
            </div>
        </div>
    );
};

export default NeedDetailPage;