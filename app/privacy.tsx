import { Body, Heading, Screen } from '../components/ui';
import { useI18n } from '../lib/i18n/I18nProvider';
export default function PrivacyScreen() {
  const { t } = useI18n();
  return <Screen title={t('privacyTitle')} subtitle="Atlas Mobile V0.1">
    <Heading>{t('yourInfo')}</Heading><Body>{t('yourInfoBody')}</Body>
    <Heading>{t('storage')}</Heading><Body>{t('storageBody')}</Body>
    <Heading>{t('beforeRelease')}</Heading><Body>{t('beforeReleaseBody')}</Body>
  </Screen>;
}
