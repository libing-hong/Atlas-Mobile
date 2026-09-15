import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Body, Button, Heading, Panel, Screen, TextButton } from '../../components/ui';
import { RemoteContent } from '../../components/RemoteContent';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useI18n } from '../../lib/i18n/I18nProvider';
import { mobileApi } from '../../lib/api';
import { ApiError } from '../../lib/api/client';
import { presentApiError } from '../../lib/api/error-presentation';
import { createApplicationMutation, type ApplicationMutationState } from '../../lib/api/application-mutation';
import { decodeApplicationCreated, decodeRecommendations, type SchoolItem, type SchoolPlan } from '../../lib/api/school-contract';
import type { RemoteState } from '../../types/remote-state';
import { isUuid } from '../../lib/api/selection-contract';
import { invalidateApplicationDependents } from '../../lib/api/invalidation';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { countryLabel, schoolCopy } from './copy';
import { ProgrammeInformation, ProgrammeSummary } from './ProgrammeInformation';

const neverEmpty = () => false;
function SchoolEditor({ item, userId, resourceState, available, retry }: {
  item: SchoolItem; userId: string; resourceState: RemoteState<SchoolPlan>; available: boolean; retry: () => void;
}) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const navigation = useNavigation();
  const [state, setState] = useState<ApplicationMutationState>({ status: 'idle' });
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [scrollEvent, setScrollEvent] = useState(0);
  const mutation = useRef<ReturnType<typeof createApplicationMutation> | null>(null);
  const navigated = useRef(false);
  const currentLocale = useRef(locale);
  useLayoutEffect(() => { currentLocale.current = locale; }, [locale]);
  const { kind, id } = item.selection;
  const unresolved = ['saving', 'uncertain', 'checking'].includes(state.status);
  useLayoutEffect(() => {
    const controller = createApplicationMutation({ ownerId: userId, selection: { kind, id },
      create: (selection, signal, ownerId) => mobileApi.postApplication(selection, decodeApplicationCreated, signal, currentLocale.current, ownerId),
      lookup: async (selection, signal, ownerId) => {
        const plan = await mobileApi.get('/api/mobile/v1/recommendations', decodeRecommendations, signal, currentLocale.current, ownerId);
        const found = plan.items.find(row => row.selection.kind === selection.kind && row.selection.id === selection.id);
        // A vanished selection cannot establish that a write did not happen.
        if (!found) throw new ApiError('invalid-response', 'Selection not available.');
        return found.applicationId;
      },
      onState: value => { setState(value); if (['uncertain', 'refused', 'retry-ready'].includes(value.status)) setScrollEvent(previous => previous + 1); },
    });
    mutation.current = controller;
    return () => { controller.cancel(); mutation.current = null; };
  }, [userId, kind, id]);
  usePreventRemove(unresolved, ({ data }) => {
    setLeaveAction(() => () => navigation.dispatch(data.action)); setScrollEvent(value => value + 1);
  });
  useEffect(() => {
    if (state.status !== 'saved' || navigated.current) return;
    navigated.current = true;
    const deferred = state.result && Object.values(state.result.initialization).includes('deferred');
    router.replace({ pathname: '/application/[id]', params: { id: state.applicationId,
      ...(state.result?.created ? { added: '1' } : {}), ...(deferred ? { deferred: '1' } : {}) } });
    invalidateApplicationDependents(state.applicationId);
  }, [state]);
  const error = state.status === 'refused' ? presentApiError(state.error, locale) : null;
  const selectionRefused = state.status === 'refused' && state.error instanceof ApiError && state.error.serverCode === 'SELECTION_UNAVAILABLE';
  const profileRequired = state.status === 'refused' && state.error instanceof ApiError && state.error.serverCode === 'PROFILE_REQUIRED';
  const leavePrompt = leaveAction ? <Panel><Heading>{copy.leaveTitle}</Heading><Body>{copy.leaveBody}</Body>
      <Button label={copy.stay} onPress={() => setLeaveAction(null)} /><TextButton label={copy.leave} onPress={leaveAction} />
    </Panel> : null;
  // Keep the controller mounted through same-account refreshes and read errors.
  // Hide inaccessible data without forgetting whether the write may have committed.
  if (resourceState.status !== 'loading' && !available) return <Screen title={copy.details} scrollKey={scrollEvent}>
    {leavePrompt}
    <RemoteContent state={resourceState} retry={retry}>{() => <Body>{copy.missingSelection}</Body>}</RemoteContent>
    {unresolved ? <Body>{copy.uncertain}</Body> : null}
    <TextButton label={copy.backPlan} onPress={() => router.replace('/schools')} />
  </Screen>;
  return <Screen title={copy.details} scrollKey={scrollEvent}>
    {leavePrompt}
    {resourceState.status === 'loading' ? <Body>{copy.checking}</Body> : null}
    <Panel><Heading>{item.schoolName}</Heading><Body>{item.programName}</Body>
      <Body>{[countryLabel(item.countryCode, locale), item.degreeLevel].filter(Boolean).join(' · ')}</Body>
      <ProgrammeSummary decision={item.decision} />
      {state.status === 'uncertain' || state.status === 'checking' ? <>
        <View accessibilityRole="alert"><Body>{copy.uncertain}</Body></View>
        <Button label={state.status === 'checking' ? copy.checking : copy.check} disabled={state.status === 'checking'} onPress={() => { void mutation.current?.check(); }} />
        <TextButton label={copy.account} onPress={() => router.navigate('/(tabs)/account')} />
      </> : item.applicationId ? <Button label={copy.viewApplication} onPress={() => router.replace({ pathname: '/application/[id]', params: { id: item.applicationId! } })} /> : <>
        {state.status === 'retry-ready' ? <Body>{copy.retryReady}</Body> : null}
        {error ? <View accessibilityRole="alert"><Body>{selectionRefused ? copy.denied : error.message}</Body></View> : null}
        {profileRequired ? <Button label={copy.profile} onPress={() => router.push('/profile')} /> : null}
        {error?.recovery === 'account' ? <Button label={copy.account} onPress={() => router.navigate('/(tabs)/account')} /> :
          <Button label={state.status === 'saving' ? copy.adding : copy.add} disabled={!available || !item.selectable || state.status === 'saving' || state.status === 'saved' || error?.recovery === 'none' || selectionRefused}
            onPress={() => { void mutation.current?.add(); }} />}
        <Body>{item.selectable ? copy.notSubmitted : copy.unavailable}</Body>
      </>}
    </Panel>
    <ProgrammeInformation decision={item.decision} />
    <TextButton label={copy.backPlan} onPress={() => router.replace('/schools')} />
  </Screen>;
}
function SchoolDetail({ userId, kind, id }: { userId: string; kind: 'recommendation' | 'discovery'; id: string }) {
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  const { state, retry } = useMobileResource('/api/mobile/v1/recommendations', decodeRecommendations, neverEmpty);
  const item = state.status === 'ready' ? state.data.items.find(row => row.selection.kind === kind && row.selection.id === id) : null;
  const [retained, setRetained] = useState<SchoolItem | null>(null);
  if (item && retained !== item) setRetained(item);
  const shown = item || retained;
  if (shown) return <SchoolEditor key={`${userId}-${kind}-${id}`} userId={userId} item={shown} resourceState={state} available={Boolean(item)} retry={retry} />;
  return <Screen title={copy.details}><RemoteContent state={state} retry={retry}>{() => <Body>{copy.missingSelection}</Body>}</RemoteContent>
    <TextButton label={copy.backPlan} onPress={() => router.replace('/schools')} /></Screen>;
}
export default function SchoolDetailScreen() {
  const { id, kind } = useLocalSearchParams<{ id?: string | string[]; kind?: string | string[] }>();
  const { session, status } = useAuth();
  const { locale } = useI18n(); const copy = schoolCopy[locale];
  if (status !== 'signed-in' || !session) return <Screen title={copy.details}><Body>{copy.sessionChanged}</Body></Screen>;
  if (!isUuid(id) || (kind !== 'recommendation' && kind !== 'discovery')) return <Screen title={copy.details}><Body>{copy.missingSelection}</Body>
    <TextButton label={copy.backPlan} onPress={() => router.replace('/schools')} /></Screen>;
  return <SchoolDetail key={`${session.user.id}-${kind}-${id}`} userId={session.user.id} kind={kind} id={id} />;
}
