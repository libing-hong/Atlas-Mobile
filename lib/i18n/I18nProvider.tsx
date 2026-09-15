import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type Locale = 'zh' | 'en';

const messages = {
  zh: {
    loading: '加载中…', errorTitle: '暂时无法完成操作', retry: '重试', emptyTitle: '暂时没有内容',
    emptyBody: '当前没有可显示的信息。', serviceNotConnected: '移动端测试服务尚未连接，暂时无法读取资料。',
    goAccount: '前往账户', diagnosticCode: '反馈时请附上此错误编号',
    showErrorDetails: '查看错误编号', hideErrorDetails: '收起错误编号',
    previewNotice: '内部测试版', previewNoticeBody: '当前仅可查看部分测试数据，还不能在 App 内新建档案、上传材料或办理申请。暂不适合开始完整的留学申请。',
    testAccountNotice: '此版本使用独立测试账号，与 goingatlas.com 的正式账号和资料不互通。请勿上传或填写真实证件等敏感信息。',
    nextStepPending: '暂时还没有生成下一步。当前信息不足以确认是否需要建档或已经完成，请勿将此页面视为流程完成。',
    journeyComplete: '当前事项已完成。', readOnlyStep: '此步骤暂不能在 App 内办理。当前版本只支持查看，不会保存或推进此事项。',
    applicationsEmpty: '这个测试账号暂时没有申请。当前 App 还不能新建档案或添加申请，完整流程尚未开放。',
    accountReadOnly: '当前仅显示测试账号信息，档案查看与编辑流程尚未开放。',
    statusUnknown: '状态暂无法显示', foundationSignIn: '登录尚未在此基础预览中开放。', returnToPreview: '返回预览',
    profileRequired: '此测试账号需要先建立留学档案，但当前 App 尚未提供建档流程，因此暂时无法继续。这不是密码或网络问题。',
    comingSoon: '暂未开放', welcome: '欢迎使用 Atlas', welcomeSubtitle: '登录独立测试账号，查看测试旅程。',
    email: '邮箱', password: '密码', confirmPassword: '确认密码', signIn: '登录', signingIn: '正在登录…',
    signUp: '注册新账号', signingUp: '正在注册…', haveAccount: '已有账号？返回登录',
    noAccount: '还没有账号？注册新账号', passwordsMismatch: '两次输入的密码不一致。',
    passwordTooShort: '密码至少需要 10 位。', passwordTooLong: '密码不能超过 128 位。',
    passwordRequirements: '密码需要 10–128 位。',
    confirmationSent: '注册请求已提交。请检查邮箱（包括垃圾邮件），按收到的邮件提示完成验证，再手动返回 Atlas App，用同一邮箱和密码登录。',
    home: '首页', applications: '申请', journey: '旅程', account: '账户',
    nextStep: '你的下一步', oneAtATime: '一次专注完成一件事。',
    next: '接下来', upcoming: '后续步骤会根据当前事项依次出现。',
    progress: '进度', progressBody: '进度仅在成功读取服务数据后显示。',
    notifications: '通知', notificationsBody: '测试版暂未开放通知功能。',
    currentMatter: '当前事项', status: '状态', continue: '继续', unavailable: '暂不可用',
    noCurrentMatter: '你的旅程目前没有待处理事项。',
    applicationsTitle: '我的申请', applicationsSubtitle: '随时掌握每个申请的下一步。',
    yourApplications: '申请列表', materials: '材料',
    journeyTitle: '我的旅程', journeySubtitle: '从规划选校到落地安顿，全程清晰可见。', currentStage: '当前阶段',
    askAtlas: '问问 Atlas', askSubtitle: '为你的下一步找到清晰答案。',
    assistantTitle: '你的专属留学助手', assistantBody: 'Atlas 会帮你理解整个旅程，并告诉你下一步该做什么。',
    conversationUnavailable: '对话功能暂未在此测试版开放。', startConversation: '开始对话',
    accountTitle: '账户', accountSubtitle: '管理你的资料与偏好。', notSignedIn: '尚未登录',
    previewMode: '你正在浏览基础测试版。', signedInDevice: '已在此设备登录。', viewSignIn: '前往登录',
    atlasStudent: 'Atlas 学生', apiConnected: '移动端服务已连接', language: '语言',
    languageValue: '简体中文', privacy: '隐私', privacyInfo: '查看隐私说明', appVersion: 'App 版本',
    signOut: '退出登录', signingOut: '正在退出…', signOutError: '退出失败，请重试。',
    pageNotFound: '找不到页面', pageUnavailable: '此页面暂不可用。', goHome: '返回首页',
    privacyTitle: '隐私说明', yourInfo: '你的信息',
    yourInfoBody: '此测试版仅连接隔离的 Student Preview，不会读取你在正式网站中的申请资料。',
    storage: '登录信息存储', storageBody: '登录状态会安全保存在此设备上；退出登录会移除此设备的会话。',
    beforeRelease: '正式发布前', beforeReleaseBody: '正式服务上线前将提供完整隐私政策和账户数据管理功能。',
    restoreTitle: '欢迎回来', restoreError: '无法恢复登录状态，请重试。', screenError: '此页面无法打开。',
  },
  en: {
    loading: 'Loading…', errorTitle: 'Unable to complete this action', retry: 'Try again', emptyTitle: 'Nothing to show yet',
    emptyBody: 'There is no information to display yet.', serviceNotConnected: 'Mobile preview services are not connected. Your information cannot be loaded yet.',
    goAccount: 'Go to Account', diagnosticCode: 'Include this error code when reporting the issue',
    showErrorDetails: 'Show error details', hideErrorDetails: 'Hide error details',
    previewNotice: 'Internal preview', previewNoticeBody: 'You can only view some test data in this version. Creating a profile, uploading documents, and managing applications are not available in the app yet. It is not ready for a complete application journey.',
    testAccountNotice: 'This version uses a separate test account. Accounts and information from goingatlas.com are not shared. Do not enter real identity documents or other sensitive information.',
    nextStepPending: 'A next step has not been generated yet. This does not confirm whether a profile is needed or the journey is complete.',
    journeyComplete: 'Current matters are complete.', readOnlyStep: 'This step cannot be completed in the app yet. This version only displays information and will not save or advance this matter.',
    applicationsEmpty: 'This test account has no applications yet. Creating profiles and adding applications are not available in the app. The full workflow is not open yet.',
    accountReadOnly: 'Only test account information is shown. Profile viewing and editing are not available yet.',
    statusUnknown: 'Status is not available', foundationSignIn: 'Sign-in is not available in this foundation preview.', returnToPreview: 'Return to preview',
    profileRequired: 'This test account needs a study profile, but the app does not yet provide a profile creation flow. You cannot continue here yet. This is not a password or network issue.',
    comingSoon: 'Not available yet', welcome: 'Welcome to Atlas', welcomeSubtitle: 'Sign in with your separate preview account.',
    email: 'Email', password: 'Password', confirmPassword: 'Confirm password', signIn: 'Sign in', signingIn: 'Signing in…',
    signUp: 'Create account', signingUp: 'Creating account…', haveAccount: 'Already have an account? Sign in',
    noAccount: 'New to Atlas? Create account', passwordsMismatch: 'The passwords do not match.',
    passwordTooShort: 'Password must be at least 10 characters.', passwordTooLong: 'Password must not exceed 128 characters.',
    passwordRequirements: 'Use a password of 10–128 characters.',
    confirmationSent: 'Registration request submitted. Check your inbox and spam folder, follow any confirmation instructions you receive, then manually return to Atlas App and sign in with the same email and password.',
    home: 'Home', applications: 'Applications', journey: 'Journey', account: 'Account',
    nextStep: 'Your next step', oneAtATime: 'One thing at a time.', next: 'Next',
    upcoming: 'Upcoming steps will follow your current matter.', progress: 'Progress',
    progressBody: 'Progress is displayed only after service data is successfully loaded.', notifications: 'Notifications',
    notificationsBody: 'Notifications are not available in this preview.', currentMatter: 'Current Matter',
    status: 'Status', continue: 'Continue', unavailable: 'Unavailable', noCurrentMatter: 'Your journey has no current matter.',
    applicationsTitle: 'Applications', applicationsSubtitle: 'Keep your next application step in view.',
    yourApplications: 'Your applications', materials: 'Materials', journeyTitle: 'Your journey',
    journeySubtitle: 'From your first plan to settling in.', currentStage: 'Current stage', askAtlas: 'Ask Atlas',
    askSubtitle: 'A little clarity for your next step.', assistantTitle: 'Your assistant, in one place',
    assistantBody: 'Atlas will help you understand your journey and what to do next.',
    conversationUnavailable: 'Conversations are not available in this preview.', startConversation: 'Start a conversation',
    accountTitle: 'Account', accountSubtitle: 'Your details and preferences.', notSignedIn: 'Not signed in',
    previewMode: 'You are viewing the foundation preview.', signedInDevice: 'Signed in on this device.',
    viewSignIn: 'View sign in', atlasStudent: 'Atlas student', apiConnected: 'Mobile API connected',
    language: 'Language', languageValue: 'English', privacy: 'Privacy', privacyInfo: 'Privacy information',
    appVersion: 'App version', signOut: 'Sign out', signingOut: 'Signing out…',
    signOutError: 'Unable to sign out. Please try again.', pageNotFound: 'Page not found',
    pageUnavailable: 'This page is unavailable.', goHome: 'Go home', privacyTitle: 'Privacy',
    yourInfo: 'Your information', yourInfoBody: 'This preview only connects to the isolated Student Preview and does not read your production website applications.',
    storage: 'Sign-in storage', storageBody: 'Your session is stored securely on this device. Signing out removes this device’s session.',
    beforeRelease: 'Before wider release', beforeReleaseBody: 'A published privacy policy and account data controls will be available before live services are introduced.',
    restoreTitle: 'Welcome back', restoreError: 'Unable to restore your session.', screenError: 'This screen could not be opened.',
  },
} as const;

type Key = keyof typeof messages.zh;
type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: Key) => string };
const I18nContext = createContext<I18nValue | null>(null);
export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>('zh');
  const value = useMemo(() => ({ locale, setLocale, t: (key: Key) => messages[locale][key] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('I18nProvider is missing.');
  return value;
}
