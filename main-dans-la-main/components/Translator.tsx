import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateDeepIntrospection, translateAnnoyance, analyzeAnnoyanceDepth, generateNeedTitle } from '../services/geminiService';
import { User, NeedCard, AITranslation, AnnoyanceDepthAnalysis, DeepIntrospectionAnalysis, AnalysisSection } from '../types';
import { SendIcon, SparklesIcon, BookOpenIcon, EmojiSadIcon, KeyIcon, LightBulbIcon, InformationCircleIcon, CheckCircleIcon, UserCircleIcon } from './icons';

interface TranslatorProps {
  currentUser: User;
  partner: User;
  onNeedShared: (needCard: Omit<NeedCard, 'id'>) => void;
  onApiKeyInvalid: () => void;
}

type Step = 'annoyance' | 'introspection' | 'translation' | 'complete';
const DEPTH_THRESHOLD = 100;

const introspectionPoints = [
    { id: 'situation', label: '1. La situation factuelle (les faits bruts)' },
    { id: 'sensation', label: '2. Ma sensation corporelle (gorge, ventre...)' },
    { id: 'emotion', label: '3. Mon émotion principale ("Je me suis senti...")' },
    { id: 'thoughts', label: '4. Mes pensées automatiques ("Il est..., Je suis...")' },
    { id: 'story', label: "5. L'histoire que je me suis racontée" },
    { id: 'echo', label: '6. L\'écho avec mon passé / mon enfance' },
    { id: 'need', label: '7. Mon besoin fondamental non-comblé' },
    { id: 'responsibility', label: '8. Ma part de pouvoir ou de responsabilité' }
];

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-primary"></div>
        <p className="text-dark-text-primary font-semibold">{text}</p>
        <p className="text-zinc-400 text-sm">Veuillez patienter...</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="p-6 bg-red-500/10 border-l-4 border-red-500 min-h-[400px] flex flex-col justify-center">
        <h3 className="font-bold text-red-300">Erreur</h3>
        <p className="text-red-400">{message}</p>
        <button onClick={onRetry} className="mt-4 text-sm font-semibold text-red-300 hover:underline text-left">Recommencer depuis le début</button>
    </div>
);

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const IntroScreen: React.FC<{ title: string; text: string; buttonText: string; onNext: () => void; icon?: React.ReactNode }> = ({ title, text, buttonText, onNext, icon }) => (
    <div className="text-center p-4 animate-fade-in flex flex-col items-center justify-center min-h-[400px]">
        {icon && <div className="w-16 h-16 text-brand-primary mx-auto mb-6">{icon}</div>}
        <h2 className="text-2xl font-bold text-dark-text-primary mb-4">{title}</h2>
        <p className="text-zinc-300 mb-8 max-w-md mx-auto">{text}</p>
        <button
            onClick={onNext}
            className="w-full max-w-xs mx-auto bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
        >
            {buttonText}
        </button>
    </div>
);

const Translator: React.FC<TranslatorProps> = ({ currentUser, partner, onNeedShared, onApiKeyInvalid }) => {
    const [step, setStep] = useState<Step>('annoyance');
    const [annoyance, setAnnoyance] = useState('');
    const [deepIntrospection, setDeepIntrospection] = useState<DeepIntrospectionAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [depthAnalysis, setDepthAnalysis] = useState<AnnoyanceDepthAnalysis>({ depth_score: 0, feedback: "Commencez par décrire la situation factuellement.", completed_points: [] });
    const [translation, setTranslation] = useState<AITranslation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [introspectionStep, setIntrospectionStep] = useState(0);
    
    const debouncedAnnoyance = useDebounce(annoyance, 1000);

    const resetState = useCallback(() => {
        setAnnoyance('');
        setDeepIntrospection(null);
        setTranslation(null);
        setError(null);
        setDepthAnalysis({ depth_score: 0, feedback: "Commencez par décrire la situation factuellement.", completed_points: [] });
        setIntrospectionStep(0);
        setStep('annoyance');
    }, []);
    
    useEffect(() => {
        if (debouncedAnnoyance && step === 'annoyance') {
            const analyze = async () => {
                setIsAnalyzing(true);
                const result = await analyzeAnnoyanceDepth(debouncedAnnoyance);
                if('error' in result) {
                    if (result.error === 'API_KEY_INVALID') onApiKeyInvalid();
                    else setDepthAnalysis(prev => ({...prev, feedback: "L'analyse est momentanément indisponible."}));
                } else {
                    setDepthAnalysis(result);
                }
                setIsAnalyzing(false);
            };
            analyze();
        }
    }, [debouncedAnnoyance, step, onApiKeyInvalid]);
    
    useEffect(() => {
        if(step === 'introspection' && introspectionStep > 0) {
            window.scrollTo(0, 0);
        }
    }, [introspectionStep, step]);


    const handleStartIntrospection = async () => {
        if (depthAnalysis.depth_score < DEPTH_THRESHOLD) return;
        setIsLoading(true);
        setError(null);
        const result = await generateDeepIntrospection(annoyance, currentUser, partner);
        setIsLoading(false);
        if('error' in result) {
            if (result.error === 'API_KEY_INVALID') onApiKeyInvalid();
            else setError(result.error);
        } else {
            setDeepIntrospection(result);
            setStep('introspection');
        }
    };

    const handleTranslate = async () => {
        if (!deepIntrospection) return;
        setIsLoading(true);
        setError(null);
        const result = await translateAnnoyance(annoyance, deepIntrospection, currentUser, partner);
        setIsLoading(false);
        if ('error' in result) {
            if (result.error === 'API_KEY_INVALID') onApiKeyInvalid();
            else setError(result.error);
        } else {
            setTranslation(result);
            setStep('translation');
        }
    };

    const shareNeed = (title: string) => {
        if (!translation) return;
        const newNeedCard: Omit<NeedCard, 'id'> = {
            author: currentUser,
            title: title,
            originalAnnoyance: annoyance,
            translatedNeed: translation.need,
            actionPlans: [],
            validation: translation.validation,
            timestamp: new Date().toISOString(),
            status: 'shared',
            seenByPartner: false,
            authorHasSeenUpdate: false,
        };
        onNeedShared(newNeedCard);
        setStep('complete');
        setTimeout(() => resetState(), 4000);
    };

    const handleShare = async () => {
        if (!translation) return;
        setIsGeneratingTitle(true);
        const titleResult = await generateNeedTitle(annoyance, translation.need);
        setIsGeneratingTitle(false);

        if ('error' in titleResult) {
            if (titleResult.error === 'API_KEY_INVALID') onApiKeyInvalid();
            const fallbackTitle = annoyance.split(' ').slice(0, 7).join(' ') + '...';
            shareNeed(fallbackTitle);
        } else {
            shareNeed(titleResult.title);
        }
    };
    
    const analysisSections = useMemo(() => {
        if (!deepIntrospection) return [];
        return [
            { section: deepIntrospection.story, icon: <BookOpenIcon className="w-full h-full"/> },
            { section: deepIntrospection.underlyingEmotion, icon: <EmojiSadIcon className="w-full h-full"/> },
            { section: deepIntrospection.unmetNeed, icon: <KeyIcon className="w-full h-full"/> },
            { section: deepIntrospection.mentalMechanism, icon: <LightBulbIcon className="w-full h-full"/> },
            { section: deepIntrospection.childhoodEcho, icon: <UserCircleIcon className="w-full h-full" /> },
            { section: deepIntrospection.personalPower, icon: <SparklesIcon className="w-full h-full" /> },
        ];
    }, [deepIntrospection]);

    const renderStep = () => {
        if (isLoading) {
            return <LoadingSpinner text="L'IA prépare la prochaine étape..." />;
        }
        if (error) {
            return <ErrorDisplay message={error} onRetry={resetState} />;
        }
        
        switch (step) {
            case 'annoyance':
                return (
                    <div className="animate-fade-in">
                        <h2 className="text-xl font-bold text-dark-text-primary mb-2">Étape 1: L'introspection guidée</h2>
                        <p className="text-zinc-300 mb-4">Décrivez votre expérience en suivant les 8 points ci-dessous. L'IA vous guidera à chaque étape.</p>
                        <textarea
                            value={annoyance}
                            onChange={(e) => setAnnoyance(e.target.value)}
                            placeholder="Ex: Hier soir, en rentrant, j'ai vu... Mon ventre s'est noué, je me suis sentie... et je me suis dit que... Ça m'a rappelé quand, enfant..."
                            className="w-full p-3 border border-dark-border bg-dark-surface-soft text-dark-text-primary placeholder:text-dark-text-secondary rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent transition duration-200"
                            rows={8}
                        />
                         <div className="mt-4 p-3 bg-dark-surface-soft rounded-lg min-h-[60px] flex items-center">
                            <SparklesIcon className="w-5 h-5 text-brand-secondary mr-3 flex-shrink-0" />
                            <p className="text-zinc-300">
                                {isAnalyzing ? <span className="italic">Analyse en cours...</span> : depthAnalysis.feedback}
                            </p>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                             {introspectionPoints.map(point => (
                                <div key={point.id} className="flex items-center transition-colors duration-500">
                                    {depthAnalysis.completed_points.includes(point.id) ? (
                                        <CheckCircleIcon className="w-5 h-5 text-brand-accent mr-2 flex-shrink-0" />
                                    ) : (
                                        <div className="w-5 h-5 flex-shrink-0 mr-2 flex items-center justify-center">
                                        <div className="w-3 h-3 border-2 border-dark-border rounded-full" />
                                        </div>
                                    )}
                                    <span className={`text-sm ${depthAnalysis.completed_points.includes(point.id) ? 'text-dark-text-primary font-medium' : 'text-dark-text-secondary'}`}>
                                        {point.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                             <div className="w-full bg-dark-surface-soft rounded-full h-2.5">
                                <div className="bg-gradient-to-r from-brand-secondary to-brand-primary h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${depthAnalysis.depth_score}%` }}></div>
                            </div>
                        </div>
                        <button
                            onClick={handleStartIntrospection}
                            disabled={depthAnalysis.depth_score < DEPTH_THRESHOLD || isAnalyzing}
                            className="mt-6 w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            Étape suivante : Analyse Guidée
                        </button>
                    </div>
                );

            case 'introspection':
                if (!deepIntrospection) return null;
                const currentAnalysis = analysisSections[introspectionStep - 1];
                if (introspectionStep === 0) {
                    return <IntroScreen 
                        title="Analyse de l'IA terminée"
                        text={`Prêt(e) à découvrir comment transformer cette frustration en une opportunité de croissance ? Nous allons explorer cela en ${analysisSections.length} étapes clés.`}
                        buttonText="Commencer l'analyse"
                        onNext={() => setIntrospectionStep(1)}
                        icon={<SparklesIcon className="w-full h-full" />}
                    />
                }
                
                const isLastStep = introspectionStep === analysisSections.length;

                return (
                    <div className="animate-fade-in">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 mr-4 text-brand-secondary flex-shrink-0">{currentAnalysis.icon}</div>
                            <h2 className="text-xl font-bold text-dark-text-primary">{currentAnalysis.section.title}</h2>
                        </div>
                        <div className="text-dark-text-primary text-base leading-relaxed mb-6 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: currentAnalysis.section.content?.replace(/\n/g, '<br />') ?? '' }}></div>
                        <div className="mt-4 bg-dark-surface-soft p-4 rounded-lg border border-dark-border">
                            <div className="flex items-start">
                                <InformationCircleIcon className="w-6 h-6 text-brand-secondary mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-dark-text-primary">Pourquoi c'est important ?</h4>
                                    <p className="text-zinc-300 mt-2 leading-relaxed">{currentAnalysis.section.explanation}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-4">
                             <button onClick={() => setIntrospectionStep(s => s - 1)} className="w-full bg-dark-surface-soft border border-dark-border hover:bg-zinc-600 text-dark-text-primary font-bold py-3 px-4 rounded-lg transition duration-300">
                                Retour
                            </button>
                             <button 
                                onClick={isLastStep ? handleTranslate : () => setIntrospectionStep(s => s + 1)} 
                                className="w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
                            >
                                {isLastStep ? "Traduire mon besoin" : "Suivant"}
                            </button>
                        </div>
                    </div>
                );
            
            case 'translation':
                 if (!translation) return null;
                 return (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold text-dark-text-primary mb-2">Prêt à partager ?</h2>
                        <p className="text-zinc-300 mb-6">Voici comment votre besoin sera présenté à {partner}. Il/Elle aura alors la place de proposer des actions concrètes.</p>
                        <div className="bg-dark-surface-soft p-6 rounded-lg space-y-6">
                            <div>
                                <h3 className="font-semibold text-blue-400 text-sm uppercase tracking-wide">Validation pour vous (privé)</h3>
                                <p className="text-dark-text-primary italic mt-1">"{translation.validation}"</p>
                            </div>
                            <div className="border-t border-dark-border pt-6">
                                <h3 className="font-semibold text-blue-400 text-sm uppercase tracking-wide">Message qui sera partagé à {partner}</h3>
                                <div className="text-dark-text-primary mt-2 space-y-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: translation.need.replace(/\n/g, '<br />') }} />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row gap-4">
                            <button onClick={resetState} className="w-full flex items-center justify-center bg-dark-surface-soft border border-dark-border hover:bg-zinc-600 text-dark-text-primary font-bold py-3 px-4 rounded-lg transition duration-300">
                                Recommencer
                            </button>
                            <button onClick={handleShare} disabled={isGeneratingTitle} className="w-full flex items-center justify-center bg-brand-accent hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-600">
                                {isGeneratingTitle ? (
                                    'Génération du titre...'
                                ) : (
                                    <>
                                        <SendIcon className="w-5 h-5 mr-2"/>
                                        Partager avec {partner}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                 );
            
            case 'complete':
                return (
                    <div className="text-center p-8 flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
                        <CheckCircleIcon className="w-16 h-16 text-brand-accent mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-dark-text-primary">Besoin partagé !</h2>
                        <p className="text-zinc-300 mt-2">{partner} a été notifié(e) et pourra vous proposer un plan d'action.</p>
                    </div>
                );
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="bg-dark-surface rounded-2xl shadow-lg p-4 sm:p-6 max-w-2xl mx-auto">
               {renderStep()}
            </div>
        </div>
    );
};

export default Translator;