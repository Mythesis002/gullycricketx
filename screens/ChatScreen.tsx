import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import CommunityChat from '../components/CommunityChat';

export default function ChatScreen() {
  const [isScreenActive, setIsScreenActive] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 ChatScreen came into focus');
      setIsScreenActive(true);
    
    return () => {
        console.log('🔄 ChatScreen lost focus');
        setIsScreenActive(false);
      };
    }, [])
  );

  return (
    <CommunityChat isActive={isScreenActive} />
  );
}
