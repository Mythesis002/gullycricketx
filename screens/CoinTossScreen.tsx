import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function CoinTossScreen() {
  const { db } = useBasic();
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId } = route.params as { matchId: string };
  
  const [selectedCall, setSelectedCall] = useState<'heads' | 'tails' | null>(null);
  const [tossResult, setTossResult] = useState<'heads' | 'tails' | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [match, setMatch] = useState<any>(null);
  
  const coinRotation = useRef(new Animated.Value(0)).current;
  const coinScale = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    fetchMatchDetails();
  }, []);

  const fetchMatchDetails = async () => {
    try {
      const fetchedMatch = await db?.from('matches').get(matchId);
      if (fetchedMatch) {
        setMatch(fetchedMatch);
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      Alert.alert('Error', 'Failed to load match details');
    }
  };

  const flipCoin = () => {
    if (!selectedCall) {
      Alert.alert('Select Your Call', 'Please choose Heads or Tails before flipping the coin.');
      return;
    }

    setIsFlipping(true);
    setShowResult(false);
    
    // Reset animations
    coinRotation.setValue(0);
    coinScale.setValue(1);
    resultOpacity.setValue(0);

    // Coin flip animation
    Animated.sequence([
      // Scale up and start spinning
      Animated.parallel([
        Animated.timing(coinScale, {
          toValue: 1.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(coinRotation, {
          toValue: 10, // 10 full rotations
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
      // Scale back down
      Animated.timing(coinScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Determine result
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setTossResult(result);
      
      // Determine winner
      const isWinner = selectedCall === result;
      setWinner(isWinner ? 'You' : 'Opponent');
      
      setIsFlipping(false);
      setShowResult(true);
      
      // Show result animation
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleDecision = async (choice: 'bat' | 'bowl') => {
    setDecision(choice);
    
    try {
      // Update match with toss result
      const tossWinner = winner === 'You' ? match?.teamAName : match?.teamBName;
      const tossDecision = choice === 'bat' ? 'bat first' : 'bowl first';
      
      await db?.from('matches').update(matchId, {
        tossWinner: tossWinner,
        tossDecision: tossDecision,
        status: 'ready_to_start'
      });

      // Send notifications
      const notifications = [
        {
          userId: match?.teamAId,
          title: 'Toss Result! 🪙',
          message: `${tossWinner} won the toss and chose to ${tossDecision}. Match is ready to begin!`,
          type: 'toss_result',
          read: false,
          createdAt: Date.now(),
        },
        {
          userId: match?.teamBId,
          title: 'Toss Result! 🪙',
          message: `${tossWinner} won the toss and chose to ${tossDecision}. Match is ready to begin!`,
          type: 'toss_result',
          read: false,
          createdAt: Date.now(),
        }
      ];

      for (const notification of notifications) {
        await db?.from('notifications').add(notification);
      }

      Alert.alert(
        'Toss Complete! 🎉',
        `${tossWinner} won the toss and chose to ${tossDecision}. Good luck with the match!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating toss result:', error);
      Alert.alert('Error', 'Failed to save toss result');
    }
  };

  const resetToss = () => {
    setSelectedCall(null);
    setTossResult(null);
    setWinner(null);
    setDecision(null);
    setShowResult(false);
    coinRotation.setValue(0);
    coinScale.setValue(1);
    resultOpacity.setValue(0);
  };

  const coinRotationInterpolate = coinRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="monetization-on" size={32} color="#FFD700" />
          <Text style={styles.headerTitle}>Cricket Toss</Text>
          <Text style={styles.headerSubtitle}>
            {match ? `${match.teamAName} vs ${match.teamBName}` : 'Loading...'}
          </Text>
        </View>

        {/* Coin */}
        <View style={styles.coinContainer}>
          <Animated.View
            style={[
              styles.coin,
              {
                transform: [
                  { rotate: coinRotationInterpolate },
                  { scale: coinScale },
                ],
              },
            ]}
          >
            <MaterialIcons 
              name="monetization-on" 
              size={120} 
              color="#FFD700" 
            />
          </Animated.View>
        </View>

        {/* Call Selection */}
        {!showResult && (
          <View style={styles.callSection}>
            <Text style={styles.callTitle}>Make Your Call</Text>
            <View style={styles.callButtons}>
              <TouchableOpacity
                style={[
                  styles.callButton,
                  selectedCall === 'heads' && styles.selectedCall
                ]}
                onPress={() => setSelectedCall('heads')}
              >
                <MaterialIcons 
                  name="face" 
                  size={32} 
                  color={selectedCall === 'heads' ? '#1B5E20' : '#FFD700'} 
                />
                <Text style={[
                  styles.callButtonText,
                  selectedCall === 'heads' && styles.selectedCallText
                ]}>
                  HEADS
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.callButton,
                  selectedCall === 'tails' && styles.selectedCall
                ]}
                onPress={() => setSelectedCall('tails')}
              >
                <MaterialIcons 
                  name="pets" 
                  size={32} 
                  color={selectedCall === 'tails' ? '#1B5E20' : '#FFD700'} 
                />
                <Text style={[
                  styles.callButtonText,
                  selectedCall === 'tails' && styles.selectedCallText
                ]}>
                  TAILS
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Flip Button */}
        {!showResult && (
          <TouchableOpacity
            style={[
              styles.flipButton,
              { opacity: (!selectedCall || isFlipping) ? 0.5 : 1 }
            ]}
            onPress={flipCoin}
            disabled={!selectedCall || isFlipping}
          >
            <MaterialIcons 
              name={isFlipping ? "hourglass-empty" : "refresh"} 
              size={24} 
              color="#1B5E20" 
            />
            <Text style={styles.flipButtonText}>
              {isFlipping ? 'Flipping...' : 'Flip Coin'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Result */}
        {showResult && (
          <Animated.View style={[styles.resultSection, { opacity: resultOpacity }]}>
            <View style={styles.resultCard}>
              <MaterialIcons 
                name={tossResult === 'heads' ? 'face' : 'pets'} 
                size={48} 
                color="#FFD700" 
              />
              <Text style={styles.resultText}>
                It's {tossResult?.toUpperCase()}!
              </Text>
              <Text style={styles.winnerText}>
                {winner} {winner === 'You' ? 'won' : 'wins'} the toss!
              </Text>
            </View>

            {winner === 'You' && !decision && (
              <View style={styles.decisionSection}>
                <Text style={styles.decisionTitle}>Choose to bat or bowl first:</Text>
                <View style={styles.decisionButtons}>
                  <TouchableOpacity
                    style={styles.decisionButton}
                    onPress={() => handleDecision('bat')}
                  >
                    <MaterialIcons name="sports-cricket" size={24} color="#1B5E20" />
                    <Text style={styles.decisionButtonText}>Bat First</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.decisionButton}
                    onPress={() => handleDecision('bowl')}
                  >
                    <MaterialIcons name="sports-baseball" size={24} color="#1B5E20" />
                    <Text style={styles.decisionButtonText}>Bowl First</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {(winner === 'Opponent' || decision) && (
              <TouchableOpacity style={styles.resetButton} onPress={resetToss}>
                <MaterialIcons name="refresh" size={20} color="#FFD700" />
                <Text style={styles.resetButtonText}>Toss Again</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>🏏 Toss Instructions:</Text>
          <Text style={styles.instructionText}>• Choose Heads or Tails</Text>
          <Text style={styles.instructionText}>• Tap "Flip Coin" to start the toss</Text>
          <Text style={styles.instructionText}>• Winner decides to bat or bowl first</Text>
          <Text style={styles.instructionText}>• Both teams will be notified of the result</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginTop: 8,
    textAlign: 'center',
  },
  coinContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  coin: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  callSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  callTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
  },
  callButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  callButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    minWidth: 120,
  },
  selectedCall: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
  },
  selectedCallText: {
    color: '#1B5E20',
  },
  flipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  flipButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  resultSection: {
    alignItems: 'center',
    width: '100%',
  },
  resultCard: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    width: '100%',
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 12,
  },
  winnerText: {
    fontSize: 18,
    color: '#E8F5E8',
    marginTop: 8,
  },
  decisionSection: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  decisionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
    textAlign: 'center',
  },
  decisionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  decisionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 120,
    justifyContent: 'center',
  },
  decisionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 6,
  },
  instructions: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    width: '100%',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 6,
    lineHeight: 20,
  },
});