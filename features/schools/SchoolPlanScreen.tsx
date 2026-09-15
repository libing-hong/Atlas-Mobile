import { router } from 'expo-router';
import { Body, Button, Heading, Panel, Screen, TextButton } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeRecommendations } from '../../lib/api/school-contract';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
import { countryLabel, schoolCopy } from './copy';
import { ProgrammeSummary } from './ProgrammeInformation';

const neverEmpty = () => false;
export default function SchoolPlanScreen() {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const { state, retry } = useMobileResource('/api/mobile/v1/recommendations', decodeRecommendations, neverEmpty);
  return <Screen title={copy.title} subtitle={copy.subtitle}>
    <RemoteContent state={state} retry={retry}>{data => <>
      {data.generation.runStatus && ['queued', 'filtering', 'generating', 'validating'].includes(data.generation.runStatus) ? <Panel><Body>{copy.running}</Body></Panel> : null}
      {data.generation.runStatus === 'failed' || data.generation.runStatus === 'cancelled' ? <Panel><Body>{copy[data.generation.runStatus]}</Body></Panel> : null}
      {data.generation.profileStale ? <Panel><Body>{copy.stale}</Body></Panel> : null}
      {data.items.length ? data.items.map(item => <Panel key={`${item.selection.kind}-${item.selection.id}`}>
        <Heading>{item.schoolName}</Heading><Body>{item.programName}</Body>
        <Body>{[countryLabel(item.countryCode, locale), item.degreeLevel].filter(Boolean).join(' · ')}</Body>
        <ProgrammeSummary decision={item.decision} />
        {item.applicationId ? <Body>{copy.added}</Body> : null}
        <Button label={copy.view} onPress={() => router.push({ pathname: '/school', params: item.selection })} />
      </Panel>) : <Panel><Heading>{copy.emptyTitle}</Heading><Body>{copy.emptyBody}</Body>
        <Button label={copy.profile} onPress={() => router.push('/profile')} />
      </Panel>}
      <Body>{copy.freeBoundary}</Body><TextButton label={copy.reload} onPress={retry} />
    </>}</RemoteContent>
    <TextButton label={copy.back} onPress={() => router.replace('/(tabs)/applications')} />
  </Screen>;
}
