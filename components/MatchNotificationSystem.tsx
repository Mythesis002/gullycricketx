import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useBasic } from '@basictech/expo';

interface MatchNotificationSystemProps {
  children: React.ReactNode;
}

export default function MatchNotificationSystem({ children }: MatchNotificationSystemProps) {
  const { db, user } = useBasic();

  useEffect(() => {
    if (!user || !db) return;

    const checkUpcomingMatches = async () => {
      try {
        const matches = await db.from('matches').getAll();
        if (!matches) return;

        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        for (const match of matches as any[]) {
          if (match.status !== 'scheduled') continue;

          const matchDateTime = new Date(`${match.date}T${match.time}`);
          
          // Check if match is starting in 30 minutes
          if (matchDateTime <= thirtyMinutesFromNow && matchDateTime > now) {
            const teamAPlayers = JSON.parse(match.teamAPlayers || '[]');
            const teamBPlayers = JSON.parse(match.teamBPlayers || '[]');
            const allPlayers = [...teamAPlayers, ...teamBPlayers];
            
            const isPlayerInMatch = allPlayers.some((player: any) => player.id === user.id);
            
            if (isPlayerInMatch) {
              // Send reminder notification
              const notification = {
                userId: user.id,
                title: '🏏 Match Starting Soon!',
                message: `${match.title} starts in 30 minutes at ${match.venue}. Get ready!`,
                type: 'match_reminder',
                read: false,
                matchId: match.id,
                createdAt: Date.now(),
              };
              
              await db.from('notifications').add(notification);
              
              // Show local alert
              Alert.alert(
                '🏏 Match Reminder',
                `${match.title} starts in 30 minutes!\n\n${match.teamAName} vs ${match.teamBName}\n📍 ${match.venue}`,
                [
                  { text: 'OK', style: 'default' },
                  { 
                    text: 'View Match', 
                    onPress: () => {
                      // Navigate to match details
                      // This would be handled by the parent component
                    }
                  }
                ]
              );
            }
          }
        }
      } catch (error) {
        console.error('Error checking upcoming matches:', error);
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkUpcomingMatches, 5 * 60 * 1000);
    
    // Initial check
    checkUpcomingMatches();

    return () => clearInterval(interval);
  }, [user, db]);

  return <>{children}</>;
}