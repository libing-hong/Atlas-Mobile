import { Body, Heading, Screen } from '../../components/ui';
import { CurrentMatterShell } from '../current-matters/CurrentMatterShell';
import { useI18n } from '../../lib/i18n/I18nProvider';
export default function HomeScreen() {
  const { t } = useI18n();
  return <Screen title={t('nextStep')} subtitle={t('oneAtATime')}>
    <CurrentMatterShell />
    <Heading>{t('next')}</Heading><Body>{t('upcoming')}</Body>
    <Heading>{t('progress')}</Heading><Body>{t('progressBody')}</Body>
    <Heading>{t('notifications')}</Heading><Body>{t('notificationsBody')}</Body>
  </Screen>;
}
