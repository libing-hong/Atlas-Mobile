import { View } from 'react-native';
import { Body, Heading, Screen, styles } from '../../components/ui';
// These are navigation labels from the V0.1 brief, not a computed user journey.
const sections = ['Study Profile', 'School Plan', 'Applications', 'Offer', 'Visa', 'Pre-departure', 'Arrival', 'Settling in'];
export default function JourneyScreen() {
  return <Screen title="Your journey" subtitle="From your first plan to settling in.">
    <Body>This is an overview. Your current stage and progress are not connected yet.</Body>
    {sections.map(section => <View key={section} style={styles.row}>
      <Heading>{section}</Heading>
      <Body>Status unavailable</Body>
    </View>)}
  </Screen>;
}
