import { router } from 'expo-router';
import { Body, Button, Screen } from '../components/ui';
import { useI18n } from '../lib/i18n/I18nProvider';
export default function NotFound() {
  const { t } = useI18n();
  return <Screen title={t('pageNotFound')}><Body>{t('pageUnavailable')}</Body>
    <Button label={t('goHome')} onPress={() => router.replace('/')} /></Screen>;
}
