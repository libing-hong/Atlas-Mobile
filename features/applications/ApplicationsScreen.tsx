import { Body, Heading, Screen } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import type { RemoteState } from '../../types/remote-state';
const state: RemoteState<never> = {
  status: 'unavailable',
  message: 'Your applications and their latest status will appear here once connected.',
};
export default function ApplicationsScreen() {
  return <Screen title="Applications" subtitle="Keep your next application step in view.">
    <Heading>Your applications</Heading>
    <RemoteContent state={state}>{() => null}</RemoteContent>
    <Body>Application status is not available in this preview.</Body>
  </Screen>;
}
