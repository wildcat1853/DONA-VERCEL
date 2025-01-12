import * as React from 'react';

interface EmailTemplateProps {
  userEmail: string;
  taskName: string;
  taskDescription: string;
  deadline: string;
  meetingLink: string;
  emailType: 'creation' | 'deadline';
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  userEmail,
  taskName,
  taskDescription,
  deadline,
  meetingLink,
  emailType,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
    <h2 style={{ color: '#2D3748' }}>
      {emailType === 'creation' ? 
        '✅ Task Created' : 
        '⏰ Task Deadline: Review progress with Dona'}
    </h2>
    <p>Hey {userEmail}!</p>
    
    {emailType === 'creation' ? (
      <p>Your task <strong>{taskName}</strong> has been created. On the deadline, Dona is going to send you a link to review progress.</p>
    ) : (
      <p>It&apos;s time to review your progress on task <strong>{taskName}</strong>. Please visit the link and report your progress to Dona.</p>
    )}

    <div style={{ 
      backgroundColor: '#F7FAFC', 
      padding: '15px', 
      borderRadius: '5px',
      margin: '20px 0'
    }}>
      <p><strong>Task Details:</strong></p>
      <p>Description: {taskDescription || 'No description provided'}</p>
      <p>Due: {deadline}</p>
    </div>

    <div style={{ 
      display: 'flex', 
      gap: '24px',
      marginTop: '20px'
    }}>
      <a 
        href={meetingLink} 
        style={{
          display: 'inline-block',
          backgroundColor: '#3B82F6',
          color: 'white',
          padding: '10px 20px',
          textDecoration: 'none',
          borderRadius: '5px',
        }}
      >
        {emailType === 'creation' ? 'View Task' : 'Review Progress with Dona'}
      </a>
    </div>
    
    <p style={{ color: '#718096', fontSize: '14px', marginTop: '30px' }}>
      - Dona AI Assistant
    </p>
  </div>
);

