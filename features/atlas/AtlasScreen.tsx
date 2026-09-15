import { Body, Button, Heading, Panel, Screen } from '../../components/ui';
import { useI18n } from '../../lib/i18n/I18nProvider';
export default function AtlasScreen() {
  const { t } = useI18n();
  return <Screen title={t('askAtlas')} subtitle={t('askSubtitle')}>
    <Panel><Heading>{t('assistantTitle')}</Heading>
      <Body>{t('assistantBody')}</Body>
      <Body>{t('conversationUnavailable')}</Body>
      <Button label={t('startConversation')} disabled />
    </Panel>
  </Screen>;
}
