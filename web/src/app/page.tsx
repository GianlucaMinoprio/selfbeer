'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getUniversalLink } from '@selfxyz/core';
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  type SelfApp,
} from '@selfxyz/qrcode';

export default function Home() {
  // Generate a UUID for the user (client-side only to avoid hydration mismatch)
  // In a real app, this would be your actual user ID from your auth system
  const [userId] = useState(() => 
    typeof window !== 'undefined' ? crypto.randomUUID() : ''
  );

  // Wait for client-side hydration
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // This is intentional for preventing hydration mismatch
    // eslint-disable-next-line
    setIsClient(true);
  }, []);

  const selfApp = useMemo<SelfApp | null>(() => {
    if (!isClient || !userId) return null;
    try {
      return new SelfAppBuilder({
        version: 2,
        appName: 'SelfBeer',
        scope: 'beer',
        endpoint: process.env.NEXT_PUBLIC_ENDPOINT_URL || 'https://selfbeer.ngrok.app/api/verify',
        logoBase64: process.env.NEXT_PUBLIC_LOGO_URL || 'https://i.postimg.cc/kG8KkQCL/temp-Image-Byjart.avif',
        userId: userId,
        endpointType: 'https', // Use 'https' for production
        userIdType: 'uuid',
        userDefinedData: 'beerSession',
        disclosures: {
          minimumAge: 21,
          // Add more disclosure fields as needed:
          // nationality: true,
          // gender: true,
        },
      }).build();
    } catch (error) {
      console.error('Failed to initialize Self app:', error);
      return null;
    }
  }, [isClient, userId]);

  const universalLink = useMemo(() => {
    if (selfApp) {
      const link = getUniversalLink(selfApp);
      console.log('Self app initialized:', link);
      return link;
    }
    return '';
  }, [selfApp]);

  const handleSuccessfulVerification = () => {
    console.log('Verification successful! User is 21+');
    // Handle successful verification here
  };

  const handleError = () => {
    console.error('Error: Failed to verify identity');
    // Handle verification error here
  };

  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: 40,
      minHeight: '100vh',
    }}>
      <h1>SelfBeer - Proof of Age</h1>
      <p>Scan the QR code with the Self app to verify you are 21+</p>
      
      {selfApp ? (
        <div style={{ marginTop: 20 }}>
          <SelfQRcodeWrapper
            selfApp={selfApp}
            type="deeplink"
            onSuccess={handleSuccessfulVerification}
            onError={handleError}
          />
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>Loading QR Code...</div>
      )}

      <p style={{ 
        wordBreak: 'break-all', 
        maxWidth: 500, 
        marginTop: 20,
        fontSize: 12,
        color: '#666',
      }}>
        {universalLink}
      </p>
    </main>
  );
}