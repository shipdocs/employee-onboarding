import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';
import './HelpWidget.css';

const HelpWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('quick');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  // Fetch contact settings from database - only when user is authenticated
  const { data: contactSettings } = useQuery(
    'contact-settings',
    () => adminService.getSystemSettings(),
    {
      enabled: !!user, // Only fetch when user is authenticated
      select: (data) => {
        const settings = data?.settings || {};
        return {
          supportEmail: settings.contact?.support_email?.value || 'support@company.com',
          adminEmail: settings.contact?.admin_email?.value || 'admin@company.com',
          docsUrl: settings.contact?.docs_url?.value || '/help',
          itPhone: settings.contact?.it_phone?.value || '+1-555-0123',
          chatEnabled: settings.contact?.chat_enabled?.value || false,
          chatUrl: settings.contact?.chat_url?.value || '',
          chatHours: settings.contact?.chat_hours?.value || 'Mon-Fri, 9 AM - 5 PM CET'
        };
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: () => {
        // Silently fail - use defaults
      }
    }
  );

  // Handle chat button click
  const handleStartChat = () => {
    if (contactSettings?.chatEnabled && contactSettings?.chatUrl) {
      // Responsive chat window dimensions based on screen size
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const chatWidth = Math.min(500, Math.floor(screenWidth * 0.4));
      const chatHeight = Math.min(700, Math.floor(screenHeight * 0.7));
      const left = Math.floor((screenWidth - chatWidth) / 2);
      const top = Math.floor((screenHeight - chatHeight) / 2);

      window.open(
        contactSettings.chatUrl,
        '_blank',
        `width=${chatWidth},height=${chatHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } else {
      toast.error('Live chat is currently unavailable. Please use email support.');
    }
  };

  // Help content based on user role
  const getHelpContent = () => {
    const role = user?.role || 'crew';

    const content = {
      crew: {
        quick: [
          { icon: '📧', title: 'Check Email', desc: 'Find welcome email with login link' },
          { icon: '👤', title: 'Complete Profile', desc: 'Fill all required fields (red dots)' },
          { icon: '📄', title: 'Upload Documents', desc: 'PDF or JPG, max 10MB' },
          { icon: '🎓', title: 'Complete Training', desc: 'Watch all videos 100%' },
          { icon: '📝', title: 'Pass Quiz', desc: 'Score 80% or higher' },
          { icon: '🏆', title: 'Get Certificate', desc: 'Auto-generated after quiz' }
        ],
        common: [
          { q: 'How do I reset my password?', a: 'Click "Forgot Password" on login page' },
          { q: 'What documents do I need?', a: 'Passport, Medical Certificate, Seaman\'s Book' },
          { q: 'How long is training?', a: 'About 2-3 hours total' },
          { q: 'Can I pause and resume?', a: 'Yes, progress saves automatically' },
          { q: 'What if I fail the quiz?', a: 'You can retry up to 3 times' }
        ]
      },
      manager: {
        quick: [
          { icon: '➕', title: 'Add Crew', desc: 'Dashboard → Crew → Add New' },
          { icon: '📊', title: 'Check Progress', desc: 'View dashboard statistics' },
          { icon: '✅', title: 'Approve Training', desc: 'Click red badge numbers' },
          { icon: '📨', title: 'Send Reminders', desc: 'Auto or manual reminders' },
          { icon: '📈', title: 'Export Reports', desc: 'Download CSV reports' },
          { icon: '💬', title: 'Message Crew', desc: 'Direct communication' }
        ],
        common: [
          { q: 'How do I add multiple crew?', a: 'Use CSV upload for bulk import' },
          { q: 'When are reminders sent?', a: 'Automatically every 3 days' },
          { q: 'How do I extend deadlines?', a: 'Edit crew profile → Due Date' },
          { q: 'Can I approve multiple at once?', a: 'Yes, select multiple and approve' },
          { q: 'Where are compliance reports?', a: 'Reports → Compliance → Export' }
        ]
      },
      admin: {
        quick: [
          { icon: '👥', title: 'Manage Users', desc: 'Create managers and admins' },
          { icon: '🔧', title: 'System Settings', desc: 'Configure company settings' },
          { icon: '📋', title: 'Audit Logs', desc: 'Review all system activity' },
          { icon: '📄', title: 'Templates', desc: 'Customize certificates' },
          { icon: '🔒', title: 'Security', desc: 'MFA and access control' },
          { icon: '📊', title: 'Analytics', desc: 'System-wide metrics' }
        ],
        common: [
          { q: 'How do I create a manager?', a: 'Admin → Managers → Add New' },
          { q: 'Where are audit logs?', a: 'Admin → Audit Logs' },
          { q: 'How to customize certificates?', a: 'Admin → Templates → Edit' },
          { q: 'How to enable MFA?', a: 'Settings → Security → Enable MFA' },
          { q: 'How to export all data?', a: 'Admin → Data Export → Export All' }
        ]
      }
    };

    return content[role] || content.crew;
  };

  const helpContent = getHelpContent();

  // Filter FAQs based on search
  const filteredFAQs = helpContent.common.filter(faq =>
    faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keyboard shortcut to open help
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Trigger on Ctrl+Shift+/, which produces '?'
      if (e.key === '/' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  return (
    <>
      {/* Help Button */}
      <button
        className="help-widget-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Help"
        title="Help (Ctrl+?)"
      >
        <span className="help-icon">?</span>
      </button>

      {/* Help Panel */}
      {isOpen && (
        <div className="help-widget-panel">
          <div className="help-header">
            <h3>Need Help?</h3>
            <button
              className="help-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="help-tabs">
            <button
              className={activeTab === 'quick' ? 'active' : ''}
              onClick={() => setActiveTab('quick')}
            >
              Quick Guide
            </button>
            <button
              className={activeTab === 'faq' ? 'active' : ''}
              onClick={() => setActiveTab('faq')}
            >
              FAQs
            </button>
            <button
              className={activeTab === 'contact' ? 'active' : ''}
              onClick={() => setActiveTab('contact')}
            >
              Contact
            </button>
          </div>

          {/* Content */}
          <div className="help-content">
            {/* Quick Guide Tab */}
            {activeTab === 'quick' && (
              <div className="quick-guide">
                {helpContent.quick.map((item, index) => (
                  <div key={index} className="quick-item">
                    <span className="quick-icon">{item.icon}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div className="faq-section">
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="faq-search"
                />
                <div className="faq-list">
                  {filteredFAQs.length > 0 ? (
                    filteredFAQs.map((faq, index) => (
                      <details key={index} className="faq-item">
                        <summary>{faq.q}</summary>
                        <p>{faq.a}</p>
                      </details>
                    ))
                  ) : (
                    <p>No FAQs found. Try a different search.</p>
                  )}
                </div>
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <div className="contact-section">
                <div className="contact-item">
                  <strong>📧 Email Support</strong>
                  <p>{contactSettings?.supportEmail || 'support@company.com'}</p>
                  <small>Response within 24 hours</small>
                </div>
                <div className="contact-item">
                  <strong>💬 Live Chat</strong>
                  <p>{contactSettings?.chatHours || 'Mon-Fri, 9 AM - 5 PM CET'}</p>
                  <button
                    className="chat-button"
                    onClick={handleStartChat}
                    disabled={!contactSettings?.chatEnabled}
                    title={contactSettings?.chatEnabled ? 'Start live chat' : 'Chat currently unavailable'}
                  >
                    {contactSettings?.chatEnabled ? 'Start Chat' : 'Chat Unavailable'}
                  </button>
                </div>
                <div className="contact-item">
                  <strong>📱 Your Manager</strong>
                  <p>{(user && user.managerEmail) || contactSettings?.adminEmail || 'manager@company.com'}</p>
                </div>
                <div className="contact-item">
                  <strong>📚 Documentation</strong>
                  <a href={contactSettings?.docsUrl || '/help'} target="_blank" rel="noopener noreferrer">
                    View Full Documentation
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="help-footer">
            <small>Press Ctrl+? to toggle help</small>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="help-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default HelpWidget;
