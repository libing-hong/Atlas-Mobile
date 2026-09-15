import { Body, Button, Heading, Panel } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeCurrentMatters } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
const neverEmpty = () => false;
export function CurrentMatterShell() {
  const { t } = useI18n();
  const { state, retry } = useMobileResource('/api/mobile/v1/current-matters', decodeCurrentMatters, neverEmpty);
  return <RemoteContent state={state} retry={retry}>{data => <Panel><Heading>{t('currentMatter')}</Heading>
    {data.primary ? <><Heading>{data.primary.title}</Heading><Body>{data.primary.description}</Body>
      <Body>{t('status')}: {data.primary.status}</Body><Button label={data.primary.action.enabled ? t('continue') : t('unavailable')} disabled /></> :
      <Body>{t('noCurrentMatter')}</Body>}
  </Panel>}</RemoteContent>;
}
