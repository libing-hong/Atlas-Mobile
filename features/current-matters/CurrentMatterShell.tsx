import { router } from 'expo-router';
import { Body, Button, Heading, Panel } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeCurrentMatters } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
import { matterStatusLabel } from '../../lib/i18n/business-labels';
const neverEmpty = () => false;
export function CurrentMatterShell() {
  const { t, locale } = useI18n();
  const { state, retry } = useMobileResource('/api/mobile/v1/current-matters', decodeCurrentMatters, neverEmpty);
  return <RemoteContent state={state} retry={retry}>{data => <Panel><Heading>{t('currentMatter')}</Heading>
    {data.primary ? <><Heading>{data.primary.title}</Heading><Body>{data.primary.description}</Body>
      <Body>{t('status')}: {matterStatusLabel(data.primary.status, locale)}</Body>
      {data.primary.action.enabled && data.primary.action.kind === 'OPEN_PROFILE' && data.primary.action.resourceId === null ?
        <Button label={t('goProfile')} onPress={() => router.push('/profile')} /> : <Body>{t('readOnlyStep')}</Body>}</> :
      <Body>{data.completed ? t('journeyComplete') : t('nextStepPending')}</Body>}
  </Panel>}</RemoteContent>;
}
