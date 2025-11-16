import React from 'react';
import { NeedCard, User } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SharedNeedsListProps {
  needs: NeedCard[];
  currentUser: User;
}

const SharedNeedsList: React.FC<SharedNeedsListProps> = ({ needs, currentUser }) => {
  const sortedNeeds = [...needs].sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  if (needs.length === 0) {
    return (
        <div className="text-center p-12 bg-dark-surface rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold text-dark-text-primary">Aucun besoin partagé pour le moment.</h3>
            <p className="text-dark-text-secondary mt-2">Utilisez l'onglet "Partager" pour commencer à communiquer.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {sortedNeeds.map(need => (
        <div key={need.id} className={`p-6 rounded-2xl shadow-lg ${need.author === currentUser ? 'bg-blue-950/50' : 'bg-dark-surface'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg text-dark-text-primary">Besoin de {need.author}</p>
              <p className="text-sm text-gray-500">
                {format(parseISO(need.timestamp), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                need.status === 'shared' ? 'bg-yellow-500/10 text-yellow-300' :
                need.status === 'discussed' ? 'bg-green-500/10 text-green-300' :
                'bg-gray-500/10 text-gray-300'
              }`}
            >
              {need.status === 'shared' ? 'À discuter' : 'Discuté'}
            </span>
          </div>
          <div className="mt-4 border-t border-dark-border pt-4 space-y-4">
            <div>
              <h4 className="font-semibold text-dark-text-secondary">Le besoin exprimé :</h4>
              <p className="text-dark-text-primary mt-1">{need.translatedNeed}</p>
            </div>
            <div>
              <h4 className="font-semibold text-dark-text-secondary">Propositions d'actions :</h4>
              <ul className="list-disc list-inside mt-1 text-dark-text-primary space-y-1">
                {/* FIX: Changed {plan} to {plan.text} to render the text property of the ActionPlan object. */}
                {need.actionPlans.map((plan, index) => <li key={index}>{plan.text}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SharedNeedsList;