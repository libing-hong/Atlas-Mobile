import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Body, Button, Heading, Panel, Screen, styles, TextButton } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { tokens } from '../../components/tokens';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useI18n } from '../../lib/i18n/I18nProvider';
import { mobileApi } from '../../lib/api';
import { ApiError } from '../../lib/api/client';
import { decodeProfile, type ProfileData, type ProfileStringField, type ProfileValues } from '../../lib/api/profile-contract';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { invalidateProfileDependents } from '../../lib/api/invalidation';
import { fieldLabels, options, profileCopy } from './copy';

const neverEmpty = () => false;
const path = '/api/mobile/v1/profile';
const copyValues = (values: ProfileValues): ProfileValues => ({ ...values, languages: values.languages.map(row => ({ ...row })) });
const sections: ProfileStringField[][] = [
  ['educationLevel', 'currentInstitution', 'currentMajor', 'gpa', 'gradingScale', 'graduationYear', 'experiences'],
  ['targetDegree', 'targetCountries', 'targetFields', 'intakeYear', 'intakeTerm', 'cityPreferences', 'rankingPriority'],
  ['annualBudgetMin', 'annualBudgetMax', 'budgetCurrency', 'careerGoal'],
];
const multiline = new Set(['experiences', 'targetFields', 'cityPreferences', 'careerGoal', 'rankingPriority']);
const numeric = new Set(['graduationYear', 'intakeYear', 'annualBudgetMin', 'annualBudgetMax']);

function Choice({ label, selected, disabled, onPress, multi = false }: {
  label: string; selected: boolean; disabled: boolean; onPress: () => void; multi?: boolean;
}) {
  return <Pressable accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityLabel={label}
    accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
    style={[local.choice, selected && local.selected, disabled && { opacity: 0.6 }]}>
    <Text style={[local.choiceText, selected && { color: tokens.color.primary }]}>{selected ? '✓ ' : ''}{label}</Text>
  </Pressable>;
}

function ProfileEditor({ userId }: { userId: string }) {
  const { state, retry } = useMobileResource(path, decodeProfile, neverEmpty);
  const { locale } = useI18n();
  const copy = profileCopy[locale];
  const languageIndex = locale === 'zh' ? 0 : 1;
  const navigation = useNavigation();
  const [values, setValues] = useState<ProfileValues | null>(null);
  const [saved, setSaved] = useState<ProfileData | null>(null);
  const [step, setStep] = useState(0);
  const [scrollEvent, setScrollEvent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [comparison, setComparison] = useState<ProfileData | null>(null);
  const [notice, setNotice] = useState<'saved' | 'validation' | 'uncertain' | 'reloadFailed' | 'sessionChanged' | 'saveUnsupported' | 'tooLarge' | 'rateLimited' | 'noPermission' | null>(null);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const active = useRef(true);
  const inFlight = useRef<AbortController | null>(null);
  const [received, setReceived] = useState<ProfileData | null>(null);
  const incoming = state.status === 'ready' ? state.data : null;
  const dirty = values !== null && saved !== null && JSON.stringify(values) !== JSON.stringify(saved.values);
  const locked = busy || reading || comparison !== null;

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; inFlight.current?.abort(); };
  }, []);
  // Adjust only when a distinct server snapshot arrives; retain dirty input
  // across token refreshes. The guard prevents reapplying the initial snapshot
  // after a successful save or a later edit.
  if (incoming && received !== incoming) {
    setReceived(incoming);
    if (!dirty && !busy && !uncertain) { setSaved(incoming); setValues(copyValues(incoming.values)); }
  }
  usePreventRemove(dirty || busy || uncertain, ({ data }) => {
    setLeaveAction(() => () => navigation.dispatch(data.action));
    setScrollEvent(value => value + 1);
  });

  function notify(value: NonNullable<typeof notice>) { setNotice(value); setScrollEvent(current => current + 1); }
  function update<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues(previous => previous ? { ...previous, [key]: value } : previous);
    setNotice(null); setErrors([]);
  }
  async function save() {
    if (!values || inFlight.current || uncertain) return;
    const controller = new AbortController();
    inFlight.current = controller; setBusy(true); setNotice(null); setErrors([]);
    try {
      const result = await mobileApi.putProfile(values, decodeProfile, controller.signal, locale, userId);
      if (!active.current || controller.signal.aborted) return;
      setSaved(result); setValues(copyValues(result.values)); notify('saved');
      invalidateProfileDependents();
    } catch (error) {
      if (!active.current || controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 422 && error.serverCode === 'VALIDATION_ERROR') {
        notify('validation'); setErrors(error.fields);
        const first = error.fields[0]?.split('.')[0];
        const section = first === 'languages' || first === 'acceptMajorChange' || first === 'acceptPathway' ? 2 : sections.findIndex(fields => fields.includes(first as ProfileStringField));
        if (section >= 0) setStep(section);
      } else if (error instanceof ApiError && error.code === 'unauthenticated') {
        notify('sessionChanged');
      } else if (error instanceof ApiError && error.code === 'forbidden') {
        notify('noPermission');
      } else if (error instanceof ApiError && error.status === 413) {
        notify('tooLarge');
      } else if (error instanceof ApiError && error.status === 429) {
        notify('rateLimited');
      } else if (error instanceof ApiError && (['disabled', 'invalid-path'].includes(error.code) || [400, 404, 405, 415].includes(error.status ?? 0))) {
        notify('saveUnsupported');
      } else {
        // A response failure cannot prove whether the server committed the write.
        setUncertain(true); notify('uncertain');
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
      if (active.current) setBusy(false);
    }
  }
  async function checkSaved() {
    if (inFlight.current) return;
    const controller = new AbortController(); inFlight.current = controller; setReading(true);
    try {
      const result = await mobileApi.get(path, decodeProfile, controller.signal, locale);
      if (active.current && !controller.signal.aborted) { setComparison(result); setScrollEvent(value => value + 1); }
    } catch {
      if (active.current && !controller.signal.aborted) notify('reloadFailed');
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
      if (active.current) setReading(false);
    }
  }
  function leave() { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }

  function display(field: ProfileStringField, value: string) {
    if (!value) return copy.noValue;
    if (field in options) {
      const choices = options[field as keyof typeof options];
      const parts = field === 'targetCountries' ? value.split(/[,\n]/).map(item => item.trim()).filter(Boolean) : [value];
      return parts.map(item => choices.find(choice => choice[0] === item)?.[languageIndex + 1] ?? item).join('、');
    }
    return value;
  }
  function summary(data: ProfileValues) {
    return <>{sections.map((fields, index) => <Panel key={index}>
      <Heading>{copy.steps[index]}</Heading>
      {fields.map(field => <View key={field}><Text style={local.label}>{fieldLabels[field][languageIndex]}</Text><Body>{display(field, data[field])}</Body></View>)}
      {index === 2 ? <>
        <Heading>{copy.languageHeading}</Heading>
        {data.languages.length ? data.languages.map((row, index) => <Body key={index}>{[row.language, row.qualification, row.result].filter(Boolean).join(' · ') || copy.noValue}</Body>) : <Body>{copy.noValue}</Body>}
        <Body>{copy.flexibleMajor}: {data.acceptMajorChange ? copy.yes : copy.no}</Body>
        <Body>{copy.flexiblePathway}: {data.acceptPathway ? copy.yes : copy.no}</Body>
      </> : null}
      {!comparison ? <TextButton label={copy.edit} disabled={locked} onPress={() => setStep(index)} /> : null}
    </Panel>)}</>;
  }
  const leavePrompt = leaveAction ? <Panel><View accessibilityRole="alert"><Heading>{copy.unsaved}</Heading><Body>{busy || uncertain ? copy.uncertain : copy.unsavedBody}</Body></View>
    <Button label={copy.stay} onPress={() => setLeaveAction(null)} />
    <TextButton label={busy || uncertain ? copy.leaveUnconfirmed : copy.discard} onPress={leaveAction} />
  </Panel> : null;
  const accessDenied = state.status === 'error' && ['unauthenticated', 'forbidden'].includes(state.errorCode ?? '');
  if (!values || !saved || accessDenied) return <Screen title={copy.title} scrollKey={scrollEvent}>
    {leavePrompt}
    <RemoteContent state={state} retry={retry}>{() => <Body>{copy.refreshing}</Body>}</RemoteContent>
    <TextButton label={copy.back} onPress={leave} />
  </Screen>;
  return <Screen title={copy.title} subtitle={copy.subtitle} scrollKey={step * 1000000 + scrollEvent}>
    {leavePrompt}
    <Body>{step < 3 ? `${step + 1} / 3 · ${copy.steps[step]}` : copy.review}</Body>
    <Body>{copy.draftHint}</Body>
    <Panel><Heading>{copy.savedFacts} · {saved.summary.completeness}%</Heading><Body>{copy.incomplete}</Body>
      {saved.summary.nextPriority ? <Body>{saved.summary.nextPriority}</Body> : null}
    </Panel>
    {notice ? <Panel><View accessibilityRole="alert"><Body>{notice === 'validation' ? (errors.length ? copy.validation : copy.validationGeneric) : copy[notice]}</Body>
      {notice === 'validation' ? errors.map(field => <Body key={field}>{field.startsWith('languages.') ? `${copy.languageHeading} ${Number(field.split('.')[1]) + 1} · ${copy[field.split('.')[2] as 'language' | 'qualification' | 'result']}` : field in fieldLabels ? fieldLabels[field as ProfileStringField][languageIndex] : field === 'languages' ? copy.languageHeading : field === 'acceptMajorChange' ? copy.flexibleMajor : copy.flexiblePathway}</Body>) : null}
    </View></Panel> : null}
    {notice === 'saved' && !dirty ? <Button label={copy.viewNext} onPress={() => router.replace('/(tabs)')} /> : null}
    {uncertain && !comparison ? <Button label={reading ? copy.refreshing : copy.checkSaved} disabled={reading || busy} onPress={() => { void checkSaved(); }} /> : null}
    {comparison ? <>
      <Body>{copy.compare}</Body>{summary(comparison.values)}
      <Button label={copy.useServer} onPress={() => { setSaved(comparison); setValues(copyValues(comparison.values)); setComparison(null); setUncertain(false); setNotice(null); invalidateProfileDependents(); }} />
      <TextButton label={copy.keepMine} onPress={() => { setSaved(comparison); setComparison(null); setUncertain(false); setNotice(null); }} />
    </> : <>
      {step === 3 ? summary(values) : <Panel>
        <Heading>{copy.steps[step]}</Heading>
        {sections[step]!.map(field => <View key={field} style={local.field}>
          <Text style={local.label}>{fieldLabels[field][languageIndex]}</Text>
          {field in options && values[field] ? <Body>{copy.currentValue}: {display(field, values[field])}</Body> : null}
          {field in options ? <View style={local.choices}>{options[field as keyof typeof options].map(choice => {
            const selected = field === 'targetCountries' ? values.targetCountries.split(/[,\n]/).map(part => part.trim()).includes(choice[0]) : values[field] === choice[0];
            return <Choice key={choice[0]} label={locale === 'zh' ? choice[1] : choice[2]} selected={selected} disabled={locked} multi={field === 'targetCountries'} onPress={() => {
              if (field === 'targetCountries') {
                const countries = new Set(values.targetCountries.split(/[,\n]/).map(part => part.trim()).filter(Boolean));
                if (selected) countries.delete(choice[0]); else countries.add(choice[0]);
                update(field, [...countries].join(', '));
              } else update(field, selected ? '' : choice[0]);
            }} />;
          })}</View> : <TextInput accessibilityLabel={fieldLabels[field][languageIndex]} style={[styles.input, multiline.has(field) && local.multiline]}
            value={values[field]} editable={!locked} onChangeText={value => update(field, value)}
            multiline={multiline.has(field)} keyboardType={numeric.has(field) ? 'decimal-pad' : 'default'} />}
        </View>)}
        {step === 2 ? <>
          <Heading>{copy.languageHeading}</Heading>
          {values.languages.map((row, index) => <View key={index} style={styles.row}>
            {(['language', 'qualification', 'result'] as const).map(field => <View key={field} style={local.field}>
              <Text style={local.label}>{copy[field]}</Text><TextInput accessibilityLabel={`${copy[field]} ${index + 1}`} style={styles.input} editable={!locked} value={row[field]}
                onChangeText={value => update('languages', values.languages.map((item, rowIndex) => rowIndex === index ? { ...item, [field]: value } : item))} />
            </View>)}
            <TextButton label={`${copy.removeLanguage} ${index + 1}`} disabled={locked} onPress={() => update('languages', values.languages.filter((_, rowIndex) => rowIndex !== index))} />
          </View>)}
          <TextButton label={copy.addLanguage} disabled={locked || values.languages.length >= 5} onPress={() => update('languages', [...values.languages, { language: '', qualification: '', result: '' }])} />
          <Choice label={copy.flexibleMajor} selected={values.acceptMajorChange} disabled={locked} multi onPress={() => update('acceptMajorChange', !values.acceptMajorChange)} />
          <Choice label={copy.flexiblePathway} selected={values.acceptPathway} disabled={locked} multi onPress={() => update('acceptPathway', !values.acceptPathway)} />
        </> : null}
      </Panel>}
      {step < 3 ? <Button label={step === 2 ? copy.review : copy.next} disabled={locked} onPress={() => setStep(value => value + 1)} /> : null}
      <Button label={busy ? copy.saving : step === 3 ? copy.save : copy.saveDraft} disabled={locked || uncertain || !dirty} onPress={() => { void save(); }} />
      {step > 0 ? <TextButton label={copy.previous} disabled={locked} onPress={() => setStep(value => value - 1)} /> : null}
      {saved.pendingFacts.length ? <Panel><Heading>{copy.pending}</Heading><Body>{copy.pendingHint}</Body>
        {saved.pendingFacts.map(fact => <Body key={fact.id}>{fact.label}: {fact.value}</Body>)}
      </Panel> : null}
    </>}
    <TextButton label={copy.back} disabled={busy || reading} onPress={leave} />
  </Screen>;
}

export default function ProfileScreen() {
  const { session, status } = useAuth();
  const { locale } = useI18n();
  if (status !== 'signed-in' || !session) return <Screen title={profileCopy[locale].title}><Body>{profileCopy[locale].sessionChanged}</Body></Screen>;
  return <ProfileEditor key={session.user.id} userId={session.user.id} />;
}
const local = StyleSheet.create({
  field: { gap: 8 }, label: { color: tokens.color.ink, fontSize: 16, lineHeight: 24, fontWeight: '500' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: tokens.touchTarget, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: tokens.color.line, borderRadius: tokens.radius.sm },
  selected: { borderColor: tokens.color.primary, backgroundColor: '#eef4ff' }, choiceText: { color: tokens.color.ink, fontSize: 15, lineHeight: 22 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
});
