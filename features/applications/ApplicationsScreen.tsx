import { router } from 'expo-router';
import { Body, Button, Heading, Panel, Screen, TextButton } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeApplications } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
import { applicationStatusLabel } from '../../lib/i18n/business-labels';
import { schoolCopy } from '../schools/copy';
import { isUuid } from '../../lib/api/selection-contract';
const neverEmpty = () => false;
export default function ApplicationsScreen() {
  const { t, locale } = useI18n();
  const copy = schoolCopy[locale];
  const { state, retry } = useMobileResource('/api/mobile/v1/applications', decodeApplications, neverEmpty);
  return <Screen title={t('applicationsTitle')} subtitle={t('applicationsSubtitle')}>
    <Heading>{t('yourApplications')}</Heading>
    <RemoteContent state={state} retry={retry}>{data => <>{data.items.length ? <>
      <Button label={copy.start} onPress={() => router.push('/schools')} />{data.items.map(item =>
      <Panel key={item.id}><Heading>{item.schoolName}</Heading><Body>{item.programName}</Body>
        <Body>{t('status')}: {applicationStatusLabel(item.status, locale)}</Body>
        <Body>{item.materialsTotal === 0 ? copy.checklistPending : `${t('materials')}: ${item.materialsReady}/${item.materialsTotal}`}</Body>
        <Button label={copy.viewApplication} disabled={!isUuid(item.id)} onPress={() => router.push({ pathname: '/application/[id]', params: { id: item.id } })} />
      </Panel>)}</> : <Panel><Heading>{copy.noApplications}</Heading><Body>{copy.applicationEmpty}</Body>
        <Button label={copy.start} onPress={() => router.push('/schools')} /></Panel>}
      <TextButton label={copy.refreshApplication} onPress={retry} />
    </>}</RemoteContent>
  </Screen>;
}
