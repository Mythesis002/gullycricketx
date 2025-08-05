import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../utils/supabaseClient';

interface MatchNotificationSystemProps {
  children: React.ReactNode;
}

export default function MatchNotificationSystem({ children }: MatchNotificationSystemProps) {
  // Remove all notification logic
  return <>{children}</>;
}