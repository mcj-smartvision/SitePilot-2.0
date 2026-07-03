import type { FormLocale } from '@/lib/project-init/i18n/types'

export interface AppShellMessages {
  reports: string
  newReport: string
  admin: string
  settings: string
  signOut: string
  language: string
  login: string
  email: string
  password: string
  signIn: string
  forgotPassword: string
}

export const APP_SHELL: Record<FormLocale, AppShellMessages> = {
  en: {
    reports: 'Reports',
    newReport: 'New Report',
    admin: 'Admin',
    settings: 'Settings',
    signOut: 'Sign out',
    language: 'Language',
    login: 'Sign in',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    forgotPassword: 'Forgot password?',
  },
  de: {
    reports: 'Berichte',
    newReport: 'Neuer Bericht',
    admin: 'Administration',
    settings: 'Einstellungen',
    signOut: 'Abmelden',
    language: 'Sprache',
    login: 'Anmelden',
    email: 'E-Mail',
    password: 'Passwort',
    signIn: 'Anmelden',
    forgotPassword: 'Passwort vergessen?',
  },
  fr: {
    reports: 'Rapports',
    newReport: 'Nouveau rapport',
    admin: 'Administration',
    settings: 'Paramètres',
    signOut: 'Déconnexion',
    language: 'Langue',
    login: 'Connexion',
    email: 'E-mail',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    forgotPassword: 'Mot de passe oublié ?',
  },
  ar: {
    reports: 'التقارير',
    newReport: 'تقرير جديد',
    admin: 'الإدارة',
    settings: 'الإعدادات',
    signOut: 'تسجيل الخروج',
    language: 'اللغة',
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'دخول',
    forgotPassword: 'نسيت كلمة المرور؟',
  },
  fa: {
    reports: 'گزارش‌ها',
    newReport: 'گزارش جدید',
    admin: 'مدیریت',
    settings: 'تنظیمات',
    signOut: 'خروج',
    language: 'زبان',
    login: 'ورود',
    email: 'ایمیل',
    password: 'رمز عبور',
    signIn: 'ورود',
    forgotPassword: 'فراموشی رمز؟',
  },
}

export const LOCALE_OPTIONS: { value: FormLocale; label: string; short: string }[] = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'de', label: 'Deutsch', short: 'DE' },
  { value: 'fr', label: 'Français', short: 'FR' },
  { value: 'ar', label: 'العربية', short: 'AR' },
  { value: 'fa', label: 'فارسی', short: 'FA' },
]
