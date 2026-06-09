import React from 'react';
import ReactDOM from 'react-dom/client';
import { ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';
import './style.css';

const WarningPage = () => {
  const params = new URLSearchParams(window.location.search);
  const blockedUrl = params.get('url') || 'página protegida';
  const reason = params.get('reason') || 'phishing';
  const source = params.get('source');

  const isCustomBlacklist = reason === 'blacklist';
  const isFamilyBlacklist = isCustomBlacklist && source === 'family';
  const isDefaultBlocklist = reason === 'blocklist';
  const isBlocked = isCustomBlacklist || isDefaultBlocklist;

  let badgeClass: string;
  let badgeText: string;
  let description: string;

  if (isCustomBlacklist) {
    badgeClass = 'custom-blacklist';
    badgeText = isFamilyBlacklist ? 'BLOQUEADO PELA LISTA FAMILIAR' : 'BLOQUEADO POR SUA LISTA PESSOAL';
    description = isFamilyBlacklist
      ? 'Este site foi bloqueado por uma regra compartilhada da sua família.'
      : 'Você adicionou este site manualmente à sua lista de bloqueios.';
  } else if (isDefaultBlocklist) {
    badgeClass = 'default-blocklist';
    badgeText = 'BLOQUEADO POR LISTA DE CATEGORIA';
    description = 'Este site foi bloqueado por uma lista de bloqueio padrão.';
  } else {
    badgeClass = 'phishing';
    badgeText = 'DETECTADO COMO AMEAÇA DE PHISHING';
    description = 'Este site foi identificado como uma ameaça à sua segurança digital.';
  }

  return (
    <div className="warning-page-wrapper">
      <div className="card-container">
        <div className="shield-box">
          <ShieldAlert size={80} color={isBlocked ? '#f59e0b' : '#ef4444'} />
        </div>
        
        <h1>Acesso Bloqueado</h1>
        
        <div className="info-box">
          <p>
            O <strong>Zero Phishing</strong> interrompeu o acesso a este site para garantir sua integridade digital.
          </p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '-8px', marginBottom: '20px' }}>
            {description}
          </p>
          
          <div className="url-display">
            <span>SITE BLOQUEADO:</span>
            <code>{blockedUrl}</code>
          </div>

          <div className={`status-badge ${badgeClass}`}>
            {badgeText}
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
