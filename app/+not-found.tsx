import { router } from 'expo-router';
import { Body, Button, Screen } from '../components/ui';
export default function NotFound() {
  return <Screen title="Page not found"><Body>This page is unavailable.</Body>
    <Button label="Go home" onPress={() => router.replace('/')} /></Screen>;
}
