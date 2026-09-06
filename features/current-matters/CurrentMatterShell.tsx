import { Body, Button, Heading, Panel } from '../../components/ui';
export function CurrentMatterShell() {
  return <Panel><Heading>Current Matter</Heading>
    <Body>Your next action will appear here when your journey is connected.</Body>
    <Body>No action is available in this preview.</Body>
    <Button label="Continue" disabled />
  </Panel>;
}
