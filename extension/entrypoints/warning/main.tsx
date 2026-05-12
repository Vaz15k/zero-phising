import React from 'react';
import ReactDOM from 'react-dom/client';
import { ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';
import './style.css';

const WarningPage = () => {
  const params = new URLSearchParams(window.location.search);
  const blockedUrl = params.get('url') || 'página protegida';
  const reason = params.get('reason') || 'phishing';

  const isBlacklist = reason === 'blacklist';

  return (
    <div className="warning-page-wrapper">
      <div className="card-container">
        <div className="shield-box">
          <ShieldAlert size={80} color="#3b82f6" />
        </div>
        
        <h1>Acesso Bloqueado</h1>
        
        <div className="info-box">
          <p>
            O <strong>Zero Phishing</strong> interrompeu o acesso a este site para garantir sua integridade digital.
          </p>
          
          <div className="url-display">
            <span>SITE TENTADO:</span>
            <code>{blockedUrl}</code>
          </div>

          <div className={`status-badge ${isBlacklist ? 'blacklist' : 'phishing'}`}>
            {isBlacklist 
              ? '🚫 BLOQUEADO POR SUA LISTA PERSONALIZADA' 
              : '⚠️ DETECTADO COMO AMEAÇA DE PHISHING'}
          </div>
        </div>

        <button className="back-button" onClick={() => window.history.back()}>
          <ArrowLeft size={20} /> Voltar para Segurança
        </button>

        <footer>
          <ShieldCheck size={18} />
          <span>Zero Phishing · IFMT-CBA</span>
        </footer>
      </div>
    </div>
  );
};

// Garantir que o DOM está pronto antes de montar
const mountNode = document.getElementById('app');
if (mountNode) {
  const root = ReactDOM.createRoot(mountNode);
  root.render(<WarningPage />);
}
