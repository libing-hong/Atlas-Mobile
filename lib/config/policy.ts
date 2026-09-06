// Reviewed, exact non-production origins only. Empty until Atlas Core confirms targets.
// Environment variables alone cannot approve a server or enable business integration.
export const approvedNonProductionTargets: readonly {
  environment: 'development' | 'preview';
  supabaseOrigin: string;
}[] = [];
export const mobileBusinessApiEnabled = false;
