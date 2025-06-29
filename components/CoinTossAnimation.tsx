import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface CoinTossAnimationProps {
  onComplete: (result: 'heads' | 'tails') => void;
  duration?: number;
}

export default function CoinTossAnimation({ onComplete, duration = 3000 }: CoinTossAnimationProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset animations
      rotateAnim.setValue(0);
      scaleAnim.setValue(1);
      translateYAnim.setValue(0);

      // Create complex coin flip animation
      Animated.parallel([
        // Rotation animation (multiple flips)
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        // Scale animation (coin gets smaller then bigger)
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: duration / 4,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: duration / 4,
            useNativeDriver: true,
          }),
        ]),
        // Vertical movement (coin goes up then down)
        Animated.sequence([
          Animated.timing(translateYAnim, {
            toValue: -100,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Determine random result
        const result = Math.random() > 0.5 ? 'heads' : 'tails';
        setTimeout(() => onComplete(result), 500);
      });
    };

    startAnimation();
  }, [duration, onComplete, rotateAnim, scaleAnim, translateYAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1800deg'], // 5 full rotations
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.coin,
          {
            transform: [
              { translateY: translateYAnim },
              { rotateY: rotateInterpolate },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.coinFace}>
          <Animated.Text style={styles.coinText}>🪙</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  coin: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinFace: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  coinText: {
    fontSize: 40,
  },
});