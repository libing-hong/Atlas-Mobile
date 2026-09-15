import { View } from 'react-native';
import { Body, Heading, Screen, styles } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { decodeJourney } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
const neverEmpty = () => false;
export default function JourneyScreen() {
  const { t } = useI18n();
  const { state, retry } = useMobileResource('/api/mobile/v1/journey', decodeJourney, neverEmpty);
  return <Screen title={t('journeyTitle')} subtitle={t('journeySubtitle')}>
    <RemoteContent state={state} retry={retry}>{data => <>
      <Body>{t('currentStage')}: {data.currentStage}</Body>
      {data.stages.map(stage => <View key={stage.id} style={styles.row}>
        <Heading>{stage.id.replaceAll('_', ' ')}</Heading><Body>{stage.state}</Body>
      </View>)}
    </>}</RemoteContent>
  </Screen>;
}
