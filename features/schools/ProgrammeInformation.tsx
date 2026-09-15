import { useState, type PropsWithChildren } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Body, Heading, Panel, styles, TextButton } from '../../components/ui';
import type { ProgrammeDecision } from '../../lib/api/school-contract';
import { useI18n } from '../../lib/i18n/I18nProvider';
import { schoolCopy, schoolLabel } from './copy';

export function Disclosure({ title, children, initiallyOpen = false }: PropsWithChildren<{ title: string; initiallyOpen?: boolean }>) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const [open, setOpen] = useState(initiallyOpen);
  return <Panel><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
    accessibilityLabel={`${open ? copy.hide : copy.show} · ${title}`} onPress={() => setOpen(value => !value)} style={styles.row}>
    <Heading>{title}</Heading><Text style={styles.textButtonText}>{open ? copy.hide : copy.show}</Text>
  </Pressable>{open ? children : null}</Panel>;
}
export function SourceLink({ url, label }: { url: string; label?: string }) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const [failed, setFailed] = useState(false);
  async function open() {
    setFailed(false);
    try {
      const source = new URL(url);
      if (source.protocol !== 'https:' || source.username || source.password) throw new Error('Invalid source.');
      await Linking.openURL(source.toString());
    } catch { setFailed(true); }
  }
  return <><TextButton label={label || copy.openSource} onPress={() => { void open(); }} />
    {failed ? <Body>{copy.sourceError}</Body> : null}</>;
}
export function ProgrammeSummary({ decision }: { decision: ProgrammeDecision }) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const fact = (key: string) => {
    const field = decision.applicationFacts.find(value => value.key === key);
    return field?.value || (field?.evidenceStatus === 'officially_unspecified' ? copy.unspecified : copy.pending);
  };
  const tuition = decision.applicationFacts.find(value => value.key === 'tuition')?.value;
  const currency = decision.applicationFacts.find(value => value.key === 'tuition_currency')?.value;
  const evidence = (key: string) => schoolLabel(decision.applicationFacts.find(value => value.key === key)?.evidenceStatus ?? 'not_searched', locale);
  return <>
    <Body>{copy.fees}：{fact('tuition')}{tuition && currency ? ` ${currency}` : ''}</Body>
    <Body>{evidence('tuition')}</Body>
    <Body>{copy.deadline}：{fact('deadline')}</Body>
    <Body>{evidence('deadline')}</Body>
    <Body>{copy.evidence}：{schoolLabel(decision.evidenceState, locale)}</Body>
  </>;
}
export function ProgrammeInformation({ decision }: { decision: ProgrammeDecision }) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  return <>
    <Disclosure title={copy.overview}>
      <Body>{decision.programmeOverview || copy.noOverview}</Body>
      {decision.recommendationSummary ? <Body>{decision.recommendationSummary}</Body> : null}
    </Disclosure>
    <Disclosure title={copy.fit}>
      <Body>{copy.fitScope}</Body>
      {decision.admissionsFit.length ? decision.admissionsFit.map((row, index) => <View key={`${row.key}-${index}`} style={styles.row}>
        <Heading>{row.label}</Heading>
        <Body>{copy.requirement}：{row.requirement || (row.evidenceStatus === 'officially_unspecified' ? copy.unspecified : copy.pending)}</Body>
        <Body>{copy.situation}：{row.userSituation || copy.pending}</Body>
        <Body>{copy.judgement}：{schoolLabel(row.status, locale)}</Body>
        {row.advice ? <Body>{copy.advice}：{row.advice}</Body> : null}
        <Body>{schoolLabel(row.evidenceStatus, locale)}</Body>
        {row.sourceUrl ? <SourceLink url={row.sourceUrl} label={row.sourceTitle || copy.openSource} /> : null}
      </View>) : <Body>{copy.noFit}</Body>}
    </Disclosure>
    <Disclosure title={copy.facts}>
      {decision.applicationFacts.length ? decision.applicationFacts.map(row => <View key={row.key} style={styles.row}>
        <Heading>{row.label}</Heading><Body>{row.value || (row.evidenceStatus === 'officially_unspecified' ? copy.unspecified : copy.pending)}</Body>
        <Body>{schoolLabel(row.evidenceStatus, locale)}</Body>
        {row.retrievedAt ? <Body>{copy.retrieved}：{row.retrievedAt}</Body> : null}
        {row.sourceUrl ? <SourceLink url={row.sourceUrl} label={row.sourceTitle || copy.openSource} /> : null}
      </View>) : <Body>{copy.pending}</Body>}
    </Disclosure>
    <Disclosure title={copy.sources}>
      {decision.officialSources.length ? decision.officialSources.map((source, index) => <View key={`${source.url}-${index}`} style={styles.row}>
        <SourceLink url={source.url} label={source.label} />
        {source.checkedAt ? <Body>{copy.checked}：{source.checkedAt}</Body> : <Body>{copy.pending}</Body>}
      </View>) : <Body>{copy.noSources}</Body>}
    </Disclosure>
  </>;
}
