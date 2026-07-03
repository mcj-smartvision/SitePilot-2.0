import type { FormLocale } from '@/lib/project-init/i18n/types'

/** UI strings for admin member management (en, fa, fr, de). */
export interface AdminMemberMessages {
  memberManagement: string
  memberManagementDesc: string
  addMember: string
  cancel: string
  totalMembers: string
  activeMembers: string
  passwordPending: string
  project: string
  selectProject: string
  createProjectFirst: string
  createProject: string
  teamDirectory: string
  noMembers: string
  siteRole: string
  selectRole: string
  noPositions: string
  seedPositions: string
  seedingPositions: string
  positionsSeeded: string
  seedFailed: string
  loadingPositions: string
  fullName: string
  username: string
  usernameHint: string
  initialPassword: string
  passwordHint: string
  phoneOptional: string
  activeMember: string
  selectRoleError: string
  passwordMinError: string
  saveMember: string
  saving: string
  editProfile: string
  passwordChanged: string
  noPositionsAssigned: string
}

export const ADMIN_MEMBER: Record<'en' | 'fa' | 'fr' | 'de', AdminMemberMessages> = {
  en: {
    memberManagement: 'Member Management',
    memberManagementDesc: 'Add, edit, and monitor all site team members across projects.',
    addMember: 'Add Member',
    cancel: 'Cancel',
    totalMembers: 'Total members',
    activeMembers: 'Active members',
    passwordPending: 'Password change pending',
    project: 'Project',
    selectProject: 'Select project',
    createProjectFirst: 'Create a project first to add members.',
    createProject: 'Create Project',
    teamDirectory: 'Team Directory',
    noMembers: 'No members yet.',
    siteRole: 'Site Role / Position',
    selectRole: 'Select construction site role...',
    noPositions: 'No positions found for this project. Seed the default site roles to enable the dropdown.',
    seedPositions: 'Seed default positions',
    seedingPositions: 'Seeding...',
    positionsSeeded: 'Default positions added. Select a role below.',
    seedFailed: 'Could not seed positions.',
    loadingPositions: 'Loading positions...',
    fullName: 'Full Name',
    username: 'Username',
    usernameHint: 'Plain username only — no @ needed. Example: sahar',
    initialPassword: 'Initial Password',
    passwordHint: 'Admin can view this password. Member must change it on first login.',
    phoneOptional: 'Phone (optional)',
    activeMember: 'Active member',
    selectRoleError: 'Select a site role.',
    passwordMinError: 'Password must be at least 6 characters.',
    saveMember: 'Add Member',
    saving: 'Saving...',
    editProfile: 'Edit profile',
    passwordChanged: 'changed by member',
    noPositionsAssigned: 'No positions assigned',
  },
  fa: {
    memberManagement: 'مدیریت اعضا',
    memberManagementDesc: 'افزودن، ویرایش و نظارت بر اعضای تیم در همه پروژه‌ها.',
    addMember: 'افزودن عضو',
    cancel: 'انصراف',
    totalMembers: 'کل اعضا',
    activeMembers: 'اعضای فعال',
    passwordPending: 'در انتظار تغییر رمز',
    project: 'پروژه',
    selectProject: 'انتخاب پروژه',
    createProjectFirst: 'ابتدا یک پروژه بسازید.',
    createProject: 'ساخت پروژه',
    teamDirectory: 'فهرست تیم',
    noMembers: 'هنوز عضوی ثبت نشده.',
    siteRole: 'نقش / سمت کارگاه',
    selectRole: 'انتخاب نقش ساختمانی...',
    noPositions: 'برای این پروژه سمتی تعریف نشده. نقش‌های پیش‌فرض را بسازید.',
    seedPositions: 'ایجاد نقش‌های پیش‌فرض',
    seedingPositions: 'در حال ایجاد...',
    positionsSeeded: 'نقش‌های پیش‌فرض اضافه شدند.',
    seedFailed: 'ایجاد نقش‌ها ناموفق بود.',
    loadingPositions: 'بارگذاری نقش‌ها...',
    fullName: 'نام کامل',
    username: 'نام کاربری',
    usernameHint: 'فقط نام کاربری — بدون @. مثال: sahar',
    initialPassword: 'رمز اولیه',
    passwordHint: 'مدیر می‌تواند رمز را ببیند. عضو باید در اولین ورود تغییر دهد.',
    phoneOptional: 'تلفن (اختیاری)',
    activeMember: 'عضو فعال',
    selectRoleError: 'یک نقش انتخاب کنید.',
    passwordMinError: 'رمز باید حداقل ۶ کاراکتر باشد.',
    saveMember: 'افزودن عضو',
    saving: 'در حال ذخیره...',
    editProfile: 'ویرایش پروفایل',
    passwordChanged: 'توسط عضو تغییر کرد',
    noPositionsAssigned: 'سمت تعیین نشده',
  },
  fr: {
    memberManagement: 'Gestion des membres',
    memberManagementDesc: 'Ajouter, modifier et suivre les membres sur tous les projets.',
    addMember: 'Ajouter un membre',
    cancel: 'Annuler',
    totalMembers: 'Membres au total',
    activeMembers: 'Membres actifs',
    passwordPending: 'Changement de mot de passe en attente',
    project: 'Projet',
    selectProject: 'Sélectionner un projet',
    createProjectFirst: 'Créez d\'abord un projet.',
    createProject: 'Créer un projet',
    teamDirectory: 'Annuaire de l\'équipe',
    noMembers: 'Aucun membre pour le moment.',
    siteRole: 'Rôle / Poste sur site',
    selectRole: 'Sélectionner un rôle...',
    noPositions: 'Aucun poste pour ce projet. Initialisez les rôles par défaut.',
    seedPositions: 'Initialiser les postes par défaut',
    seedingPositions: 'Initialisation...',
    positionsSeeded: 'Postes par défaut ajoutés.',
    seedFailed: 'Échec de l\'initialisation.',
    loadingPositions: 'Chargement des postes...',
    fullName: 'Nom complet',
    username: 'Nom d\'utilisateur',
    usernameHint: 'Nom d\'utilisateur simple — sans @. Ex: sahar',
    initialPassword: 'Mot de passe initial',
    passwordHint: 'L\'admin peut voir ce mot de passe.',
    phoneOptional: 'Téléphone (optionnel)',
    activeMember: 'Membre actif',
    selectRoleError: 'Sélectionnez un rôle.',
    passwordMinError: 'Le mot de passe doit contenir au moins 6 caractères.',
    saveMember: 'Ajouter le membre',
    saving: 'Enregistrement...',
    editProfile: 'Modifier le profil',
    passwordChanged: 'modifié par le membre',
    noPositionsAssigned: 'Aucun poste assigné',
  },
  de: {
    memberManagement: 'Mitgliederverwaltung',
    memberManagementDesc: 'Mitglieder hinzufügen, bearbeiten und überwachen.',
    addMember: 'Mitglied hinzufügen',
    cancel: 'Abbrechen',
    totalMembers: 'Mitglieder gesamt',
    activeMembers: 'Aktive Mitglieder',
    passwordPending: 'Passwortänderung ausstehend',
    project: 'Projekt',
    selectProject: 'Projekt wählen',
    createProjectFirst: 'Erstellen Sie zuerst ein Projekt.',
    createProject: 'Projekt erstellen',
    teamDirectory: 'Teamverzeichnis',
    noMembers: 'Noch keine Mitglieder.',
    siteRole: 'Standortrolle / Position',
    selectRole: 'Baustellenrolle wählen...',
    noPositions: 'Keine Positionen für dieses Projekt. Standardrollen anlegen.',
    seedPositions: 'Standardpositionen anlegen',
    seedingPositions: 'Wird angelegt...',
    positionsSeeded: 'Standardpositionen hinzugefügt.',
    seedFailed: 'Anlegen fehlgeschlagen.',
    loadingPositions: 'Positionen werden geladen...',
    fullName: 'Vollständiger Name',
    username: 'Benutzername',
    usernameHint: 'Nur Benutzername — ohne @. z.B. sahar',
    initialPassword: 'Anfangspasswort',
    passwordHint: 'Admin kann dieses Passwort sehen.',
    phoneOptional: 'Telefon (optional)',
    activeMember: 'Aktives Mitglied',
    selectRoleError: 'Wählen Sie eine Rolle.',
    passwordMinError: 'Passwort muss mindestens 6 Zeichen haben.',
    saveMember: 'Mitglied hinzufügen',
    saving: 'Speichern...',
    editProfile: 'Profil bearbeiten',
    passwordChanged: 'vom Mitglied geändert',
    noPositionsAssigned: 'Keine Positionen zugewiesen',
  },
}

export function getAdminMemberMessages(locale: string): AdminMemberMessages {
  if (locale === 'fa' || locale === 'fr' || locale === 'de') {
    return ADMIN_MEMBER[locale]
  }
  return ADMIN_MEMBER.en
}
