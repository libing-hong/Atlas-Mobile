import { Text } from 'react-native';
import { tokens } from './tokens';

export type DisplayStatus = { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' };
const colors = {
  neutral: tokens.color.muted, info: tokens.color.primary,
  success: tokens.color.success, warning: tokens.color.warning, danger: tokens.color.danger,
};
export function StatusBadge({ status }: { status: DisplayStatus }) {
  // Core supplies the label and semantic tone; Mobile never maps business status codes.
  return <Text style={{ color: colors[status.tone] ?? colors.neutral, fontSize: 14, fontWeight: '600' }}>
    {status.label}
  </Text>;
}
