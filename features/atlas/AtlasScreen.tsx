import { Body, Button, Heading, Panel, Screen } from '../../components/ui';
export default function AtlasScreen() {
  return <Screen title="Ask Atlas" subtitle="A little clarity for your next step.">
    <Panel><Heading>Your assistant, in one place</Heading>
      <Body>Atlas will help you understand your journey and what to do next.</Body>
      <Body>Conversations are not available in this preview.</Body>
      <Button label="Start a conversation" disabled />
    </Panel>
  </Screen>;
}
