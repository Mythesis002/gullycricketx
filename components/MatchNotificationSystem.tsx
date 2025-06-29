import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';

interface MatchNotification {
  id: string;
  matchId: string;
  title: string;
  message: string;
  type: 'match_invitation' | 'match_reminder' | 'match_started' | 'match_completed';
  scheduledTime?: number;
  sent: boolean;
  createdAt: number;
}

interface MatchNotificationSystemProps {
  matchId: string;
  players: Array<{ id: string; name: string }>;
  matchDateTime: string;
  matchTitle: string;
  venue: string;
}

export default function MatchNotificationSystem({
  matchId,
  players,
  matchDateTime,
  matchTitle,
  venue,
}: MatchNotificationSystemProps) {
  const { db } = useBasic();
  const [notifications, setNotifications] = useState<MatchNotification[]>([]);

  useEffect(() => {
    scheduleMatchNotifications();
  }, [matchId, players, matchDateTime]);

  const scheduleMatchNotifications = async () => {
    const matchTime = new Date(matchDateTime).getTime();
    const reminderTime = matchTime - (30 * 60 * 1000); // 30 minutes before
    const now = Date.now();

    // Schedule reminder notifications
    if (reminderTime > now) {
      setTimeout(() => {
        sendReminderNotifications();
      }, reminderTime - now);
    }

    // Schedule match start notifications
    if (matchTime > now) {
      setTimeout(() => {
        sendMatchStartNotifications();
      }, matchTime - now);
    }
  };

  const sendReminderNotifications = async () => {
    for (const player of players) {
      try {
        await db?.from('notifications').add({
          userId: player.id,
          type: 'match_reminder',
          title: '⏰ Match Reminder',
          message: `"${matchTitle}" starts in 30 minutes at ${venue}`,
          read: false,
          createdAt: Date.now(),
        });
      } catch (error) {
        console.error('Error sending reminder notification:', error);
      }
    }
  };

  const sendMatchStartNotifications = async () => {
    for (const player of players) {
      try {
        await db?.from('notifications').add({
          userId: player.id,
          type: 'match_started',
          title: '🏏 Match Started!',
          message: `"${matchTitle}" is starting now! Join your team.`,
          read: false,
          createdAt: Date.now(),
        });
      } catch (error) {
        console.error('Error sending match start notification:', error);
      }
    }
  };

  const sendMatchCompletionNotifications = async (result: string) => {
    for (const player of players) {
      try {
        await db?.from('notifications').add({
          userId: player.id,
          type: 'match_completed',
          title: '🎉 Match Completed!',
          message: `"${matchTitle}" has ended. ${result}`,
          read: false,
          createdAt: Date.now(),
        });
      } catch (error) {
        console.error('Error sending completion notification:', error);
      }
    }
  };

  return null; // This is a background service component
}