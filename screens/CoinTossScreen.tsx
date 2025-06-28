import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RouteParams {
  matchId: string;
  teamA: string;
  teamB: string;
  onTossComplete?: (result: { winner: string; decision: 'bat' | 'bowl' }) => void;
}

export default function CoinTossScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  const [isFlipping, setIsFlipping] = useState(false);
  const [tossResult, setTossResult] = useState<{ winner: string; decision: 'bat' | 'bowl' } | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<'bat' | 'bowl'>('bat');
  
  // Animation refs
  const coinRotateX = useRef(new Animated.Value(0)).current;
  const coinRotateY = useRef(new Animated.Value(0)).current;
  const coinScale = useRef(new Animated.Value(1)).current;
  const coinOpacity = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial coin animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(coinRotateY, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(coinRotateY, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const performCoinToss = () => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    setTossResult(null);

    // Reset animations
    coinRotateX.setValue(0);
    coinScale.setValue(1);
    sparkleAnim.setValue(0);
    resultAnim.setValue(0);

    // Complex 3D flip animation
    const flipAnimation = Animated.parallel([
      // Main flip rotation
      Animated.timing(coinRotateX, {
        toValue: 10, // 10 full rotations
        duration: 2000,
        useNativeDriver: true,
      }),
      // Y-axis rotation for 3D effect
      Animated.timing(coinRotateY, {
        toValue: 5,
        duration: 2000,
        useNativeDriver: true,
      }),
      // Scale animation for depth
      Animated.sequence([
        Animated.timing(coinScale, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(coinScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      // Opacity pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(coinOpacity, {
            toValue: 0.7,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(coinOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 10 }
      ),
    ]);

    flipAnimation.start(() => {
      // Determine winner
      const winner = Math.random() > 0.5 ? params.teamA : params.teamB;
      setTossResult({ winner, decision: selectedDecision });
      
      // Sparkle effect
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Result animation
      Animated.spring(resultAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      setIsFlipping(false);
    });
  };

  const confirmToss = () => {
    if (!tossResult) return;

    const finalResult = { ...tossResult, decision: selectedDecision };
    
    if (params.onTossComplete) {
      params.onTossComplete(finalResult);
    }

    Alert.alert(
      'Toss Complete! 🏏',
      `${finalResult.winner} wins the toss and chooses to ${finalResult.decision} first!`,
      [
        {
          text: 'Start Match',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderSparkles = () => {
    const sparkles = Array.from({ length: 8 }, (_, i) => (
      <Animated.View
        key={i}
        style={[
          styles.sparkle,
          {
            transform: [
              {
                rotate: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${i * 45}deg`],
                }),
              },
              {
                translateX: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 50],
                }),
              },
            ],
            opacity: sparkleAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1, 0],
            }),
          },
        ]}
      >
        <MaterialIcons name="star" size={16} color="#FFD700" />
      </Animated.View>
    ));

    return <View style={styles.sparkleContainer}>{sparkles}</View>;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coin Toss</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Teams Display */}
      <View style={styles.teamsContainer}>
        <View style={styles.teamCard}>
          <Text style={styles.teamName}>{params.teamA}</Text>
          <MaterialIcons name="sports-cricket" size={32} color="#FFD700" />
        </View>
        
        <Text style={styles.vsText}>VS</Text>
        
        <View style={styles.teamCard}>
          <Text style={styles.teamName}>{params.teamB}</Text>
          <MaterialIcons name="sports-cricket" size={32} color="#FFD700" />
        </View>
      </View>

      {/* Coin Animation Area */}
      <View style={styles.coinArea}>
        <Animated.View
          style={[
            styles.coinContainer,
            {
              transform: [
                {
                  rotateX: coinRotateX.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                {
                  rotateY: coinRotateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                { scale: coinScale },
              ],
              opacity: coinOpacity,
            },
          ]}
        >
          <View style={styles.coin}>
            <MaterialIcons name="monetization-on" size={120} color="#FFD700" />
          </View>
        </Animated.View>

        {/* Sparkles */}
        {renderSparkles()}

        {/* Toss Result */}
        {tossResult && (
          <Animated.View
            style={[
              styles.resultContainer,
              {
                transform: [
                  {
                    scale: resultAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ],
                opacity: resultAnim,
              },
            ]}
          >
            <Text style={styles.winnerText}>{tossResult.winner}</Text>
            <Text style={styles.winnerSubtext}>wins the toss!</Text>
          </Animated.View>
        )}
      </View>

      {/* Decision Selection */}
      {tossResult && (
        <Animated.View
          style={[
            styles.decisionContainer,
            {
              opacity: resultAnim,
              transform: [
                {
                  translateY: resultAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.decisionTitle}>Choose to:</Text>
          <View style={styles.decisionButtons}>
            <TouchableOpacity
              style={[
                styles.decisionButton,
                selectedDecision === 'bat' && styles.selectedDecisionButton,
              ]}
              onPress={() => setSelectedDecision('bat')}
            >
              <MaterialIcons 
                name="sports-cricket" 
                size={24} 
                color={selectedDecision === 'bat' ? '#1B5E20' : '#FFFFFF'} 
              />
              <Text
                style={[
                  styles.decisionButtonText,
                  selectedDecision === 'bat' && styles.selectedDecisionText,
                ]}
              >
                Bat First
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.decisionButton,
                selectedDecision === 'bowl' && styles.selectedDecisionButton,
              ]}
              onPress={() => setSelectedDecision('bowl')}
            >
              <MaterialIcons 
                name="sports-baseball" 
                size={24} 
                color={selectedDecision === 'bowl' ? '#1B5E20' : '#FFFFFF'} 
              />
              <Text
                style={[
                  styles.decisionButtonText,
                  selectedDecision === 'bowl' && styles.selectedDecisionText,
                ]}
              >
                Bowl First
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={confirmToss}>
            <Text style={styles.confirmButtonText}>Confirm & Start Match</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Toss Button */}
      {!tossResult && (
        <View style={styles.tossButtonContainer}>
          <TouchableOpacity
            style={[styles.tossButton, isFlipping && styles.disabledButton]}
            onPress={performCoinToss}
            disabled={isFlipping}
          >
            <MaterialIcons 
              name={isFlipping ? "hourglass-empty" : "monetization-on"} 
              size={32} 
              color="#1B5E20" 
            />
            <Text style={styles.tossButtonText}>
              {isFlipping ? 'Flipping...' : 'Flip Coin'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {!tossResult 
            ? "Tap 'Flip Coin' to determine which team wins the toss"
            : "The winning team can choose to bat or bowl first"
          }
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  teamCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    minWidth: 120,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  coinArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  coinContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coin: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  sparkleContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
  resultContainer: {
    position: 'absolute',
    bottom: -100,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  winnerSubtext: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 4,
  },
  decisionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  decisionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  decisionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  decisionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDecisionButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  decisionButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedDecisionText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  tossButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  tossButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  tossButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  instructionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  instructionsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});