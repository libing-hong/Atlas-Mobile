import { View } from 'react-native';
import { Body, Heading, Screen, styles } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeJourney } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
const neverEmpty = () => false;
export default function JourneyScreen() {
  const { state, retry } = useMobileResource('/api/mobile/v1/journey', decodeJourney, neverEmpty);
  return <Screen title="Your journey" subtitle="From your first plan to settling in.">
    <RemoteContent state={state} retry={retry}>{data => <>
      <Body>Current stage: {data.currentStage}</Body>
      {data.stages.map(stage => <View key={stage.id} style={styles.row}>
        <Heading>{stage.id.replaceAll('_', ' ')}</Heading><Body>{stage.state}</Body>
      </View>)}
    </>}</RemoteContent>
  </Screen>;
}
