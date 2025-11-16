import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-dark-surface rounded-2xl shadow-lg p-6 md:p-8 max-w-2xl w-full mx-auto border border-dark-border relative flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <h2 className="text-2xl font-bold text-dark-text-primary mb-4 flex-shrink-0">La Philosophie de "Main dans la Main"</h2>
        
        <div className="space-y-4 text-dark-text-secondary leading-relaxed overflow-y-auto pr-2">
            <p>
                Cet outil n'est pas un simple traducteur d'émotions. Il repose sur un principe fondamental de la psychologie relationnelle : 
                <strong className="text-dark-text-primary"> une alliance de couple se construit activement en apprenant à accueillir et à prendre soin des vulnérabilités de l'un et de l'autre.</strong>
            </p>
            <p>
                Chaque "agacement" du quotidien est comme la partie visible d'un iceberg. En surface, on voit de la frustration ou de la colère. Mais en dessous se cachent des besoins fondamentaux et des émotions plus profondes (un besoin de sécurité, de reconnaissance, une peur de l'abandon, etc.).
            </p>
             <p>
                Inspiré par des approches comme la <strong className="text-dark-text-primary">Théorie de l'Attachement</strong> et les travaux du <strong className="text-dark-text-primary">Dr. John Gottman</strong>, "Main dans la Main" vous guide pour :
            </p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong className="text-dark-text-primary">Identifier le besoin réel</strong> caché derrière le reproche.</li>
                <li><strong className="text-dark-text-primary">Transformer une plainte en une demande claire</strong> et positive.</li>
                <li><strong className="text-dark-text-primary">Créer un "plan d'action"</strong> concret qui n'est pas une corvée, but une manière de prendre soin du besoin de l'autre, et donc, de l'alliance.</li>
            </ul>
            <p>
                En transformant un moment de friction en une opportunité de mieux se comprendre et de se soutenir, vous ne "gérez" pas un conflit : vous <strong className="text-dark-text-primary">bâtissez activement la sécurité et la confiance</strong> au sein de votre couple.
            </p>
        </div>

        <button 
          onClick={onClose} 
          className="mt-8 w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex-shrink-0"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default AboutModal;