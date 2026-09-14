import { Body, Button, Heading, Panel } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeCurrentMatters } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
const neverEmpty = () => false;
export function CurrentMatterShell() {
  const { state, retry } = useMobileResource('/api/mobile/v1/current-matters', decodeCurrentMatters, neverEmpty);
  return <RemoteContent state={state} retry={retry}>{data => <Panel><Heading>Current Matter</Heading>
    {data.primary ? <><Heading>{data.primary.title}</Heading><Body>{data.primary.description}</Body>
      <Body>Status: {data.primary.status}</Body><Button label={data.primary.action.enabled ? 'Continue' : 'Unavailable'} disabled /></> :
      <Body>Your journey has no current matter.</Body>}
  </Panel>}</RemoteContent>;
}
