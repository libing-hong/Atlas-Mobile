import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Body, Button, Heading, Panel, Screen, styles, TextButton } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { NativeAction } from '../../components/NativeAction';
import { decodeApplicationDetail, type ApplicationDetail } from '../../lib/api/school-contract';
import { isUuid } from '../../lib/api/selection-contract';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
import { useAuth } from '../../lib/auth/AuthProvider';
import { applicationStatusLabel } from '../../lib/i18n/business-labels';
import { countryLabel, schoolCopy, schoolLabel } from '../schools/copy';
import { ProgrammeInformation } from '../schools/ProgrammeInformation';

const neverEmpty = () => false;
function Requirements({ data }: { data: ApplicationDetail }) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  return <>
    <Heading>{copy.readiness}</Heading>
    <Body>{data.application.materialsTotal === 0 ? copy.checklistPending : `${data.application.materialsReady} / ${data.application.materialsTotal}`}</Body>
    {data.decision.materials.map((material, index) => <Body key={`${material.type}-${index}`}>{material.label}：{schoolLabel(material.status, locale)}</Body>)}
    <Body>{copy.materialsReadOnly}</Body>
    <Heading>{copy.requirements}</Heading>
    {data.application.requirements.length ? data.application.requirements.map((requirement, index) => <View key={`${requirement.key}-${index}`} style={styles.row}>
      <Body>{requirement.requirement}</Body><Body>{schoolLabel(requirement.status, locale)}</Body>
    </View>) : <Body>{copy.noRequirements}</Body>}
  </>;
}
function DetailContent({ data }: { data: ApplicationDetail }) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const [showRequirements, setShowRequirements] = useState(false);
  return <>
    <Panel><Heading>{data.application.schoolName}</Heading><Body>{data.application.programName}</Body>
      <Body>{[countryLabel(data.application.countryCode, locale), data.application.degreeLevel].filter(Boolean).join(' · ')}</Body>
      <Body>{copy.applicationStatus}：{applicationStatusLabel(data.application.status, locale)}</Body>
    </Panel>
    <Panel><Heading>{copy.next}</Heading>
      {data.nextStep ? <>
        <Heading>{data.nextStep.matter.title}</Heading><Body>{data.nextStep.matter.description}</Body>
        {data.nextStep.displayStatus ? <Body>{data.nextStep.displayStatus}</Body> : null}
        {data.nextStep.progressIndeterminate || data.nextStep.progress === null ? <Body>{copy.progressUnknown}</Body> : null}
        <NativeAction action={data.nextStep.matter.action} currentApplicationId={data.application.id} />
      </> : <Body>{copy.pendingStep}</Body>}
      <Button label={showRequirements ? copy.hide : copy.showRequirements} onPress={() => setShowRequirements(value => !value)} />
      {showRequirements ? <Requirements data={data} /> : null}
    </Panel>
    <ProgrammeInformation decision={data.decision} />
  </>;
}
function ApplicationDetailLoader({ id, added, deferred }: { id: string; added: boolean; deferred: boolean }) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const { state, retry } = useMobileResource(`/api/mobile/v1/applications/${id}`, decodeApplicationDetail, neverEmpty);
  return <Screen title={copy.applicationTitle}>
    {added ? <Body>{copy.added}</Body> : null}
    {deferred ? <Panel><Body>{copy.initializationDeferred}</Body></Panel> : null}
    <RemoteContent state={state} retry={retry}>{data => <DetailContent key={data.application.id} data={data} />}</RemoteContent>
    {state.status === 'ready' ? <TextButton label={copy.refreshApplication} onPress={retry} /> : null}
    <TextButton label={copy.back} onPress={() => router.replace('/(tabs)/applications')} />
  </Screen>;
}
export default function ApplicationDetailScreen() {
  const { id, added, deferred } = useLocalSearchParams<{ id?: string | string[]; added?: string; deferred?: string }>();
  const { status, session } = useAuth(); const { locale } = useI18n(); const copy = schoolCopy[locale];
  if (status !== 'signed-in' || !session) return <Screen title={copy.applicationTitle}><Body>{copy.sessionChanged}</Body></Screen>;
  if (!isUuid(id)) return <Screen title={copy.applicationTitle}><Body>{copy.pendingStep}</Body>
    <TextButton label={copy.back} onPress={() => router.replace('/(tabs)/applications')} /></Screen>;
  return <ApplicationDetailLoader key={`${session.user.id}-${id}`} id={id} added={added === '1'} deferred={deferred === '1'} />;
}
