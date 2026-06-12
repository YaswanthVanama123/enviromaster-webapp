import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaClipboardList, FaWrench } from "react-icons/fa";
import {
  shareViaPdf,
  createPdfEmailData
} from '../utils/webmailService';

const EmailTester: React.FC = () => {
  const { t } = useTranslation();
  const [testResult, setTestResult] = useState<string>('');

  const handleTestEmail = () => {
    try {
      const { emailData, attachment } = createPdfEmailData({
        fileName: 'Test Document.pdf',
        status: 'Draft',
        downloadUrl: 'https://example.com/test.pdf',
        isApprovalRequest: false
      });

      shareViaPdf(emailData, attachment);
      setTestResult(t('misc.wtEmailSuccess'));
    } catch (error) {
      setTestResult(t('misc.wtEmailFailed', { error }));
    }
  };

  return (
    <div style={{
      padding: '20px',
      border: '2px solid #007bff',
      borderRadius: '8px',
      margin: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h2><FaEnvelope /> {t('misc.wtTitle')}</h2>
      <p><strong>{t('misc.wtNote')}</strong> {t('misc.wtNoteText')}</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>{t('misc.wtTesting')}</h3>
        <button
          onClick={handleTestEmail}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {t('misc.wtTestEmailCompose')}
        </button>
      </div>

      {testResult && (
        <div>
          <h3>{t('misc.wtResults')}</h3>
          <pre style={{
            backgroundColor: '#e9ecef',
            padding: '10px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {testResult}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
        <h4><FaClipboardList /> {t('misc.wtTestingInstructions')}</h4>
        <ol>
          <li><strong>{t('misc.wtInstr1Title')}</strong> {t('misc.wtInstr1')}</li>
          <li><strong>{t('misc.wtInstr2Title')}</strong> {t('misc.wtInstr2')}</li>
          <li><strong>{t('misc.wtInstr3Title')}</strong> {t('misc.wtInstr3')}</li>
          <li><strong>{t('misc.wtInstr4Title')}</strong> {t('misc.wtInstr4')}</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', backgroundColor: '#d1ecf1', padding: '10px', borderRadius: '4px' }}>
        <h4><FaWrench /> {t('misc.wtHowItWorks')}</h4>
        <ul>
          <li><strong>{t('misc.wtWork1Title')}</strong> {t('misc.wtWork1')}</li>
          <li><strong>{t('misc.wtWork2Title')}</strong> {t('misc.wtWork2')}</li>
          <li><strong>{t('misc.wtWork3Title')}</strong> {t('misc.wtWork3')}</li>
          <li><strong>{t('misc.wtWork4Title')}</strong> {t('misc.wtWork4')}</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailTester;
