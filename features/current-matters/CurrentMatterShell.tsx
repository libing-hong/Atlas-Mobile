import { Body, Heading, Panel } from '../../components/ui';
import { NativeAction } from '../../components/NativeAction';
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
      <NativeAction action={data.primary.action} /></> :
      <Body>{data.completed ? t('journeyComplete') : t('nextStepPending')}</Body>}
  </Panel>}</RemoteContent>;
}
