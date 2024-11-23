import * as React from 'react';

interface EmailTemplateProps {
  userEmail: string;
  scheduledDate: string;
  meetingLink: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  userEmail,
  scheduledDate,
  meetingLink,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
    <h2 style={{ color: '#2D3748' }}>Your Session with Dona is Scheduled</h2>
    <p>Hello {userEmail}!</p>
    <p>Your follow-up session with Dona has been scheduled for:</p>
    <p style={{ 
      fontSize: '18px', 
      fontWeight: 'bold', 
      color: '#4A5568', 
      margin: '20px 0',
      padding: '15px',
      backgroundColor: '#F7FAFC',
      borderRadius: '5px'
    }}>
      {scheduledDate}
    </p>
    <p>During this session, we'll discuss your progress and help you stay on track with your goals.</p>
    <p>The calendar invitation has been sent to your email. You can manage the event directly from your calendar.</p>
    <a 
      href={meetingLink} 
      style={{
        display: 'inline-block',
        backgroundColor: '#4A5568',
        color: 'white',
        padding: '10px 20px',
        textDecoration: 'none',
        borderRadius: '5px',
        marginTop: '15px'
      }}
    >
      View in Calendar
    </a>
    <p style={{ color: '#718096', fontSize: '14px', marginTop: '30px' }}>
      - Dona AI Assistant
    </p>
  </div>
);
