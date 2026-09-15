import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { tokens } from '../../components/tokens';
import { useI18n } from '../../lib/i18n/I18nProvider';

export default function TabsLayout() {
  const { t } = useI18n();
  return <Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: tokens.color.primary,
    tabBarInactiveTintColor: tokens.color.muted,
    tabBarStyle: { backgroundColor: tokens.color.surface, borderTopColor: tokens.color.line },
    tabBarLabelStyle: { fontSize: 11 }, tabBarItemStyle: { minHeight: 48 },
  }}>
    <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="applications" options={{ title: t('applications'), tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="journey" options={{ title: t('journey'), tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="atlas" options={{ title: 'Atlas', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="account" options={{ title: t('account'), tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
  </Tabs>;
}
