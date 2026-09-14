import { Body, Heading, Panel, Screen } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeApplications } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
const isEmpty = (data: ReturnType<typeof decodeApplications>) => data.items.length === 0;
export default function ApplicationsScreen() {
  const { state, retry } = useMobileResource('/api/mobile/v1/applications', decodeApplications, isEmpty);
  return <Screen title="Applications" subtitle="Keep your next application step in view.">
    <Heading>Your applications</Heading>
    <RemoteContent state={state} retry={retry}>{data => <>{data.items.map(item =>
      <Panel key={item.id}><Heading>{item.schoolName}</Heading><Body>{item.programName}</Body>
        <Body>Status: {item.status}</Body><Body>Materials: {item.materialsReady}/{item.materialsTotal}</Body></Panel>)}</>}</RemoteContent>
  </Screen>;
}
