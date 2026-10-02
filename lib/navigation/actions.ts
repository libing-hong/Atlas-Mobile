import type { MobileAction } from '../api/contracts';
import { isUuid } from '../api/selection-contract';

export function resolveNativeAction(action: MobileAction):
  | { screen: 'profile' | 'schools' | 'applications' | 'journey' }
  | { screen: 'application'; id: string } | null {
  if (!action.enabled) return null;
  if ((action.kind === 'OPEN_APPLICATION' || action.kind === 'OPEN_MATERIALS') && isUuid(action.resourceId)) {
    return { screen: 'application', id: action.resourceId };
  }
  if (action.resourceId !== null) return null;
  switch (action.kind) {
    case 'OPEN_PROFILE': return { screen: 'profile' };
    case 'OPEN_SCHOOL_PLAN': return { screen: 'schools' };
    case 'OPEN_APPLICATIONS': return { screen: 'applications' };
    case 'OPEN_JOURNEY': return { screen: 'journey' };
    default: return null;
  }
}
