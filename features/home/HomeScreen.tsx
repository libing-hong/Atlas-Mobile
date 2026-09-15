import { Body, Heading, Panel, Screen } from '../../components/ui';
import { CurrentMatterShell } from '../current-matters/CurrentMatterShell';
import { useI18n } from '../../lib/i18n/I18nProvider';
export default function HomeScreen() {
  const { t } = useI18n();
  return <Screen title={t('nextStep')} subtitle={t('oneAtATime')}>
    <CurrentMatterShell />
    <Panel><Heading>{t('previewNotice')}</Heading><Body>{t('previewNoticeBody')}</Body></Panel>
  </Screen>;
}
