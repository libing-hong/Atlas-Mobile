import { router } from 'expo-router';
import { Body, Button } from './ui';
import type { MobileAction } from '../lib/api/contracts';
import { resolveNativeAction } from '../lib/navigation/actions';
import { useI18n } from '../lib/i18n/I18nProvider';
import { schoolCopy } from '../features/schools/copy';

export function NativeAction({ action, currentApplicationId }: { action: MobileAction; currentApplicationId?: string }) {
  const { t, locale } = useI18n(); const copy = schoolCopy[locale];
  const target = resolveNativeAction(action);
  if (!target) return <><Body>{copy.actionReadOnly}</Body>
    {!currentApplicationId ? <Button label={t('applicationsTitle')} onPress={() => router.navigate('/(tabs)/applications')} /> : null}</>;
  if (target.screen === 'application') {
    if (target.id === currentApplicationId) return <Body>{copy.materialsReadOnly}</Body>;
    return <Button label={copy.viewApplication} onPress={() => router.push({ pathname: '/application/[id]', params: { id: target.id } })} />;
  }
  if (target.screen === 'profile') return <Button label={copy.profile} onPress={() => router.push('/profile')} />;
  if (target.screen === 'schools') return <Button label={copy.start} onPress={() => router.push('/schools')} />;
  if (target.screen === 'applications') return <Button label={t('applicationsTitle')} onPress={() => router.navigate('/(tabs)/applications')} />;
  return <Button label={t('journeyTitle')} onPress={() => router.navigate('/(tabs)/journey')} />;
}
