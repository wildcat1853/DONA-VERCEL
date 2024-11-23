import * as React from 'react';

interface EmailTemplateProps {
  userEmail: string;
  scheduledDate: string;
  meetingLink: string;
  isReminder?: boolean;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  userEmail,
  scheduledDate,
  meetingLink,
  isReminder = false,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
    {isReminder ? (
      // Reminder email template
      <>
        <h2 style={{ color: '#2D3748' }}>Hey from Dona</h2>
        <p>Hey {userEmail}!</p>
        <p>I hope you didn't forget about our session today. Don't worry, you just need to check in and give update about your progress.</p>
        <p>Don't worry if you didn't get much done - I'm here to help, not judge!</p>
        <div style={{ 
          display: 'flex', 
          gap: '24px',
          marginTop: '20px'
        }}>
          <a 
            href={meetingLink} 
            style={{
              display: 'inline-block',
              backgroundColor: '#4A5568',
              color: 'white',
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '5px',
            }}
          >
            View in Calendar
          </a>
          <a 
            href={`${process.env.NEXTAUTH_URL}`}
            style={{
              display: 'inline-block',
              backgroundColor: '#3B82F6',
              color: 'white',
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '5px',
            }}
          >
            Talk to Dona
          </a>
        </div>
      </>
    ) : (
      // Initial confirmation email template
      <>
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
        <div style={{ 
          display: 'flex', 
          gap: '24px',
          marginTop: '20px'
        }}>
          <a 
            href={meetingLink} 
            style={{
              display: 'inline-block',
              backgroundColor: '#4A5568',
              color: 'white',
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '5px',
            }}
          >
            View in Calendar
          </a>
          <a 
            href={`${process.env.NEXTAUTH_URL}`}
            style={{
              display: 'inline-block',
              backgroundColor: '#3B82F6',
              color: 'white',
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '5px',
            }}
          >
            Talk to Dona
          </a>
        </div>
      </>
    )}
    <p style={{ color: '#718096', fontSize: '14px', marginTop: '30px' }}>
      - Dona AI Assistant
    </p>
  </div>
);
