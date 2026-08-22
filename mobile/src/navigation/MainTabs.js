import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, moderateScale } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import RidesListScreen from '../screens/RidesListScreen';
import MapScreen from '../screens/MapScreen';

const Tab = createBottomTabNavigator();

function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16;

  return (
    <View style={[styles.tabBarWrapper, { bottom: bottomOffset }]}>
      <View style={styles.glassContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName = 'home';
          if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
          else if (route.name === 'Explore') iconName = isFocused ? 'compass' : 'compass-outline';
          else if (route.name === 'Rides') iconName = isFocused ? 'bicycle' : 'bicycle-outline';
          else if (route.name === 'Map') iconName = isFocused ? 'map' : 'map-outline';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Explore" component={DiscoveryScreen} />
      <Tab.Screen name="Rides" component={RidesListScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    backgroundColor: 'rgba(22, 24, 29, 0.92)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    marginHorizontal: 2,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryContainer,
  },
  tabLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(10),
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primaryContainer,
    fontWeight: '700',
  },
});
