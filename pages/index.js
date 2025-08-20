import React from 'react';

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div>
        <h2>Loading Maritime Onboarding System...</h2>
        <p>Redirecting to application...</p>
        <script dangerouslySetInnerHTML={{
          __html: `
            setTimeout(function() {
              window.location.href = '/index.html';
            }, 1000);
          `
        }} />
      </div>
    </div>
  );
}
