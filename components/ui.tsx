import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from './tokens';

export function Screen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.wordmark}>ATLAS</Text>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}
      {children}
    </ScrollView>
  </SafeAreaView>;
}
export function Heading({ children }: PropsWithChildren) {
  return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>;
}
export function Body({ children }: PropsWithChildren) {
  return <Text style={styles.body}>{children}</Text>;
}
export function Panel({ children }: PropsWithChildren) {
  return <View style={styles.panel}>{children}</View>;
}
export function Button({ label, onPress, disabled = false }: {
  label: string; onPress?: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.background },
  content: { padding: tokens.space.lg, paddingBottom: tokens.space.xxl, gap: tokens.space.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  wordmark: { color: tokens.color.primary, fontSize: 12, fontWeight: '800', letterSpacing: 3, marginTop: tokens.space.md },
  title: { color: tokens.color.ink, fontSize: 34, fontWeight: '700', lineHeight: 42 },
  heading: { color: tokens.color.ink, fontSize: 21, fontWeight: '600', lineHeight: 28 },
  body: { color: tokens.color.muted, fontSize: 16, lineHeight: 25 },
  panel: { backgroundColor: tokens.color.surface, borderColor: tokens.color.line, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.lg, gap: tokens.space.md },
  button: { minHeight: tokens.touchTarget, borderRadius: tokens.radius.sm, backgroundColor: tokens.color.primary, justifyContent: 'center', alignItems: 'center', padding: tokens.space.md },
  disabled: { backgroundColor: tokens.color.muted },
  pressed: { opacity: 0.8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  input: { minHeight: tokens.touchTarget, borderWidth: 1, borderColor: tokens.color.line, borderRadius: tokens.radius.sm, padding: tokens.space.md, fontSize: 16, color: tokens.color.ink, backgroundColor: tokens.color.surface },
  row: { paddingVertical: tokens.space.md, borderBottomWidth: 1, borderBottomColor: tokens.color.line, gap: tokens.space.sm },
});
