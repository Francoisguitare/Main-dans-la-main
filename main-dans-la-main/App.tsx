import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, NeedCard, ActionPlan } from './types';
import Dashboard from './components/Dashboard';
import Translator from './components/Translator';
import { HeartIcon, PlusCircleIcon, ChartBarIcon, KeyIcon, InformationCircleIcon } from './components/icons';
import AboutModal from './components/AboutModal';
import NeedDetailPage from './components/NeedDetailModal';
import { onNeedsUpdate, addNeed, updateNeed, deleteNeed } from './services/firebaseService';


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User>('Wissam');
    const [needs, setNeeds] = useState<NeedCard[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isKeySelected, setIsKeySelected] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);
    const [setupStep, setSetupStep] = useState(1);
    const [isAwaitingKeySelection, setIsAwaitingKeySelection] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [activeView, setActiveView] = useState<'dashboard' | 'detail'>('dashboard');
    const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);

    const needsRef = useRef(needs);
    useEffect(() => { needsRef.current = needs; }, [needs]);

    type Tab = 'share' | 'dashboard';

    useEffect(() => {
        const checkKeyAndInitialize = async () => {
            let hasKey = false;
            if (window.aistudio) {
                try {
                    hasKey = await window.aistudio.hasSelectedApiKey();
                } catch (e) {
                    console.error("Error checking aistudio API key presence:", e);
                    hasKey = false;
                }
            }
            setIsKeySelected(hasKey);
            setIsCheckingKey(false);
        };
        checkKeyAndInitialize();
    }, []);

    useEffect(() => {
        if (!isKeySelected) return;

        const unsubscribeNeeds = onNeedsUpdate((needs) => {
            setNeeds(needs);
            if (isDataLoading) setIsDataLoading(false);
        });

        return () => {
            unsubscribeNeeds();
        };
    }, [isKeySelected, isDataLoading]);


    const handleSelectKey = async () => {
        if (window.aistudio) {
            setIsAwaitingKeySelection(true);
            try {
                await window.aistudio.openSelectKey();
                setIsKeySelected(true);
            } catch (e) {
                console.error("Error during key selection process:", e);
                setIsAwaitingKeySelection(false);
            }
        }
    };

    const handleInvalidApiKey = () => {
        alert("Votre clé API semble invalide ou ne dispose pas des autorisations nécessaires. Veuillez en sélectionner une autre.");
        setIsKeySelected(false);
        setIsAwaitingKeySelection(false);
        setSetupStep(2);
    };


    const partner = currentUser === 'Wissam' ? 'Sylvie' : 'Wissam';

    const handleNeedShared = useCallback(async (needCard: Omit<NeedCard, 'id'>) => {
        await addNeed(needCard);
        setActiveTab('dashboard');
    }, []);
    
    const handleUpdateNeed = useCallback((needId: string, updates: Partial<NeedCard>) => {
        updateNeed(needId, updates);
    }, []);
    
    const handleSelectNeed = useCallback((needId: string) => {
        const need = needsRef.current.find(n => n.id === needId);
        if (need) {
            // If current user is the partner and hasn't seen it, mark as seen.
            if (need.author !== currentUser && !need.seenByPartner) {
                updateNeed(needId, { seenByPartner: true });
            }
            // If current user is the author and the status was updated, mark as seen.
            if (need.author === currentUser && need.status === 'discussed' && !need.authorHasSeenUpdate) {
                updateNeed(needId, { authorHasSeenUpdate: true });
            }
        }
        setSelectedNeedId(needId);
        setActiveView('detail');
    }, [currentUser]);

    const handleBackToDashboard = useCallback(() => {
        setSelectedNeedId(null);
        setActiveView('dashboard');
    }, []);
    
    const handleCancelNeed = useCallback(async (needId: string) => {
        await deleteNeed(needId);
        handleBackToDashboard();
    }, [handleBackToDashboard]);


    useEffect(() => {
        handleBackToDashboard();
    }, [currentUser, handleBackToDashboard]);


    const TabButton: React.FC<{ tabName: Tab; icon: React.ReactNode; label: string }> = ({ tabName, icon, label }) => (
        <button
            onClick={() => {
                setActiveTab(tabName);
                handleBackToDashboard();
            }}
            className={`flex-1 flex flex-col items-center justify-center p-3 text-sm font-medium transition-colors duration-300 ${activeTab === tabName ? 'text-brand-primary' : 'text-dark-text-secondary hover:text-brand-primary'}`}
        >
            {icon}
            <span className="mt-1">{label}</span>
        </button>
    );
    
    const renderLoadingScreen = () => (
        <div className="min-h-screen font-sans bg-dark-bg text-dark-text-primary flex items-center justify-center">
            <div className="text-center animate-fade-in">
                <HeartIcon className="w-20 h-20 text-brand-primary mx-auto animate-pulse"/>
                <h1 className="text-3xl font-bold mt-6">Main dans la Main</h1>
                <p className="text-dark-text-secondary mt-2">Initialisation de la connexion...</p>
            </div>
        </div>
    );
    
    const notificationCounts = useMemo(() => {
        const counts: { [key in User]: number } = { Wissam: 0, Sylvie: 0 };
        for (const need of needs) {
            const partnerOfAuthor = need.author === 'Wissam' ? 'Sylvie' : 'Wissam';
            // Notification for the partner (recipient of the need)
            if (!need.seenByPartner) {
                counts[partnerOfAuthor]++;
            }
            // Notification for the author about a status update
            if (need.status === 'discussed' && !need.authorHasSeenUpdate) {
                counts[need.author]++;
            }
        }
        return counts;
    }, [needs]);


    if (isCheckingKey) {
        return renderLoadingScreen();
    }
    
    if (!isKeySelected) {
        return (
            <div className="min-h-screen font-sans bg-dark-bg text-dark-text-primary flex flex-col items-center justify-center p-4">
                <div className="max-w-xl w-full bg-dark-surface p-8 rounded-2xl shadow-lg text-center">
                     <HeartIcon className="w-16 h-16 text-brand-primary mx-auto mb-6"/>
                     <h1 className="text-3xl font-bold text-dark-text-primary mb-4">Configuration requise</h1>

                    {setupStep === 1 && (
                        <div className="animate-fade-in">
                            <p className="text-dark-text-secondary mb-6">
                                Pour vous offrir une expérience sans limite, Main dans la Main utilise votre propre quota d'API Google Gemini. C'est comme avoir votre propre ligne directe avec l'IA.
                            </p>
                            <div className="text-left bg-dark-surface-soft p-4 rounded-lg mb-6 border border-dark-border">
                                <div className="flex items-start">
                                    <InformationCircleIcon className="w-6 h-6 text-brand-secondary mr-3 mt-1 flex-shrink-0"/>
                                    <div>
                                        <h3 className="font-semibold text-dark-text-primary">Qu'est-ce qu'une clé API ?</h3>
                                        <p className="text-sm text-dark-text-secondary mt-1">
                                            C'est simplement un mot de passe personnel qui permet à cette application d'utiliser les services de Google AI en votre nom. La facturation est liée à cette clé, vous donnant un contrôle total.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSetupStep(2)}
                                className="w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
                            >
                                J'ai compris, suivant
                            </button>
                        </div>
                    )}
                    
                    {setupStep === 2 && (
                        <div className="animate-fade-in">
                            {!isAwaitingKeySelection ? (
                                <>
                                    <p className="text-dark-text-secondary mb-6">
                                        Obtenez votre clé API personnelle sur Google AI Studio. C'est gratuit pour commencer, et vous ne payez que ce que vous utilisez ensuite.
                                    </p>
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" 
                                        className="block w-full text-center bg-dark-surface-soft border border-dark-border hover:bg-zinc-600 text-dark-text-primary font-bold py-3 px-4 rounded-lg transition duration-300 mb-4"
                                    >
                                        1. Obtenir ma Clé API sur Google AI Studio
                                    </a>
                                    <button
                                        onClick={handleSelectKey}
                                        className="w-full flex items-center justify-center bg-brand-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
                                    >
                                        <KeyIcon className="w-5 h-5 mr-2"/>
                                        2. Configurer l'application avec ma clé
                                    </button>
                                    <p className="text-xs text-dark-text-secondary mt-4">
                                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-primary">Consulter les informations sur la facturation de l'API Gemini</a>.
                                    </p>
                                    <button onClick={() => setSetupStep(1)} className="text-sm text-dark-text-secondary mt-6 hover:underline">Retour</button>
                                </>
                            ) : (
                                <div className="p-8 text-center animate-fade-in">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
                                    <h2 className="text-xl font-semibold text-dark-text-primary mt-6">Sélection en cours...</h2>
                                    <p className="mt-4 text-dark-text-secondary">
                                        Veuillez choisir votre clé API dans la fenêtre qui s'est ouverte.
                                    </p>
                                    <div className="mt-4 text-sm bg-dark-surface-soft p-3 rounded-md border border-dark-border">
                                        <p>
                                            Une fois votre clé sélectionnée, la fenêtre se fermera et l'application se lancera automatiquement. <strong className="text-brand-secondary">Il n'y a pas de bouton "Valider" à chercher.</strong>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isDataLoading) {
        return renderLoadingScreen();
    }

    const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
        if (count === 0) return null;
        return (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-dark-surface">
                {count}
            </span>
        );
    };

    const UserPill: React.FC<{ name: User, isActive: boolean, notifCount: number }> = ({ name, isActive, notifCount }) => (
        <div className="relative">
            <button
                onClick={() => setCurrentUser(name)}
                className={`font-semibold rounded-full py-1.5 px-5 transition-all duration-300 ${isActive ? 'bg-brand-primary text-white shadow-md' : 'bg-dark-surface-soft text-dark-text-secondary hover:bg-zinc-600'}`}
            >
                {name}
            </button>
            <NotificationBadge count={notifCount} />
        </div>
    );

    return (
        <div className="min-h-screen font-sans text-dark-text-primary flex flex-col">
            <header className="bg-dark-surface shadow-lg shadow-black/20 sticky top-0 z-10 border-b border-dark-border">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                     <div className="flex items-center space-x-3">
                        <HeartIcon className="w-8 h-8 text-brand-primary"/>
                        <h1 className="text-2xl font-bold text-dark-text-primary hidden sm:block">Main dans la Main</h1>
                        <button onClick={() => setIsAboutModalOpen(true)} className="text-dark-text-secondary hover:text-brand-primary transition-colors">
                            <InformationCircleIcon className="w-6 h-6"/>
                        </button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <UserPill name="Wissam" isActive={currentUser === 'Wissam'} notifCount={notificationCounts.Wissam} />
                        <UserPill name="Sylvie" isActive={currentUser === 'Sylvie'} notifCount={notificationCounts.Sylvie} />
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto max-w-4xl pb-24">
                {activeTab === 'share' && (
                    <Translator 
                        currentUser={currentUser} 
                        partner={partner} 
                        onNeedShared={handleNeedShared} 
                        onApiKeyInvalid={handleInvalidApiKey} 
                    />
                )}
                {activeTab === 'dashboard' && (
                    <>
                        {activeView === 'dashboard' && (
                            <Dashboard 
                                currentUser={currentUser} 
                                partner={partner} 
                                needs={needs} 
                                onSelectNeed={handleSelectNeed}
                                onUpdateNeed={handleUpdateNeed}
                            />
                        )}
                        {activeView === 'detail' && selectedNeedId && (
                            <NeedDetailPage
                                need={needs.find(n => n.id === selectedNeedId)!}
                                currentUser={currentUser}
                                partner={partner}
                                onBack={handleBackToDashboard}
                                onUpdateNeed={handleUpdateNeed}
                                onApiKeyInvalid={handleInvalidApiKey}
                                onCancelNeed={handleCancelNeed}
                            />
                        )}
                    </>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-dark-surface border-t border-dark-border shadow-lg z-10 flex justify-around">
                <TabButton tabName="dashboard" icon={<ChartBarIcon className="w-6 h-6" />} label="Tableau de bord" />
                <TabButton tabName="share" icon={<PlusCircleIcon className="w-6 h-6" />} label="Partager un besoin" />
            </nav>
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </div>
    );
};

export default App;