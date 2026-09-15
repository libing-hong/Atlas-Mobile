import { Body, Heading, Panel, Screen } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeApplications } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
const isEmpty = (data: ReturnType<typeof decodeApplications>) => data.items.length === 0;
export default function ApplicationsScreen() {
  const { t } = useI18n();
  const { state, retry } = useMobileResource('/api/mobile/v1/applications', decodeApplications, isEmpty);
  return <Screen title={t('applicationsTitle')} subtitle={t('applicationsSubtitle')}>
    <Heading>{t('yourApplications')}</Heading>
    <RemoteContent state={state} retry={retry}>{data => <>{data.items.map(item =>
      <Panel key={item.id}><Heading>{item.schoolName}</Heading><Body>{item.programName}</Body>
        <Body>{t('status')}: {item.status}</Body><Body>{t('materials')}: {item.materialsReady}/{item.materialsTotal}</Body></Panel>)}</>}</RemoteContent>
  </Screen>;
}
