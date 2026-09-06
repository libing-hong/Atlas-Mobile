import { Body, Heading, Screen } from '../components/ui';
export default function PrivacyScreen() {
  return <Screen title="Privacy" subtitle="Atlas Mobile V0.1">
    <Heading>Your information</Heading>
    <Body>This foundation preview does not connect to your applications, journey or Atlas assistant. No analytics or advertising services are included.</Body>
    <Heading>Sign-in storage</Heading>
    <Body>When preview sign-in is enabled, your session is stored securely on this device. Signing out removes this device’s session.</Body>
    <Heading>Before wider release</Heading>
    <Body>A published privacy policy and account data controls will be available before live services are introduced.</Body>
  </Screen>;
}
