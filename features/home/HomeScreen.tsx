import { Body, Heading, Screen } from '../../components/ui';
import { CurrentMatterShell } from '../current-matters/CurrentMatterShell';
export default function HomeScreen() {
  return <Screen title="Your next step" subtitle="One thing at a time.">
    <CurrentMatterShell />
    <Heading>Next</Heading><Body>Upcoming steps will follow your current matter.</Body>
    <Heading>Progress</Heading><Body>Your journey is not connected yet.</Body>
    <Heading>Notifications</Heading><Body>Notifications are not available in this preview.</Body>
  </Screen>;
}
