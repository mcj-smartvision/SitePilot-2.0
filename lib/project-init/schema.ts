import { z } from 'zod'

const optionalString = z.string().optional().or(z.literal(''))
const optionalNumber = z.coerce.number().optional().or(z.nan()).transform((v) => (Number.isNaN(v) ? undefined : v))

/** Section 1 — Project Information */
export const projectInfoSchema = z.object({
  projectName: z.string().min(2, 'Project name is required'),
  projectCode: z.string().min(2, 'Project code is required'),
  projectType: z.string().min(1, 'Project type is required'),
  status: z.string().min(1, 'Status is required'),
  description: optionalString,
  clientName: z.string().min(2, 'Client name is required'),
  clientContact: optionalString,
  clientEmail: z.string().email('Invalid client email').optional().or(z.literal('')),
  clientPhone: optionalString,
  organizationName: optionalString,
  department: optionalString,
  contractType: z.string().min(1, 'Contract type is required'),
  contractNumber: optionalString,
  contractValue: optionalNumber,
  contractStartDate: optionalString,
  contractEndDate: optionalString,
  buildingClassification: z.string().min(1, 'Building classification is required'),
  projectPhase: z.string().min(1, 'Project phase is required'),
  sector: optionalString,
  estimatedWorkforce: optionalNumber,
  peakWorkforce: optionalNumber,
  internalNotes: optionalString,
  publicNotes: optionalString,
  address: z.string().min(3, 'Site address is required'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  latitude: optionalString,
  longitude: optionalString,
  siteArea: optionalNumber,
})

/** Section 2 — Project Team (role names; member IDs resolved server-side) */
export const projectTeamSchema = z.object({
  projectDirector: optionalString,
  projectManager: z.string().min(2, 'Project manager name is required'),
  constructionManager: optionalString,
  leadEngineer: optionalString,
  structuralEngineer: optionalString,
  mepEngineer: optionalString,
  qaManager: optionalString,
  qcInspector: optionalString,
  commercialManager: optionalString,
  procurementLead: optionalString,
})

/** Section 3 — Technical Information */
export const technicalInfoSchema = z.object({
  structureType: z.string().min(1, 'Structure type is required'),
  primaryMaterial: optionalString,
  foundationType: z.string().min(1, 'Foundation type is required'),
  soilClassification: optionalString,
  numberOfFloors: optionalNumber,
  totalBuiltArea: optionalNumber,
  basementLevels: optionalNumber,
  designStage: z.string().min(1, 'Design stage is required'),
  designStandard: optionalString,
  architectFirm: optionalString,
})

/** Section 4 — Schedule & Working Hours (base object for merge / field keys) */
const scheduleHoursObjectSchema = z.object({
  plannedStartDate: z.string().min(1, 'Planned start date is required'),
  plannedFinishDate: z.string().min(1, 'Planned finish date is required'),
  actualStartDate: optionalString,
  workingDaysPerWeek: z.string().min(1, 'Working days per week is required'),
  publicHolidayCalendar: z.string().min(1, 'Holiday calendar is required'),
  shiftPattern: z.string().min(1, 'Shift pattern is required'),
  dailyWorkHours: z.coerce.number().min(1, 'Daily work hours must be at least 1').max(24, 'Cannot exceed 24 hours'),
  nightShiftEnabled: z.boolean().default(false),
  progressMeasurementMethod: z.string().min(1, 'Progress method is required'),
  reportingFrequency: z.string().min(1, 'Reporting frequency is required'),
  delayAnalysisEnabled: z.boolean().default(true),
  criticalPathMonitoring: z.boolean().default(true),
})

const scheduleDateRefine = {
  check: (data: { plannedStartDate?: string; plannedFinishDate?: string }) =>
    !data.plannedStartDate || !data.plannedFinishDate || data.plannedFinishDate >= data.plannedStartDate,
  message: 'Finish date must be on or after start date' as const,
  path: ['plannedFinishDate'] as const,
}

/** Step-level schema includes date-order validation for section 4 */
export const scheduleHoursSchema = scheduleHoursObjectSchema.refine(scheduleDateRefine.check, {
  message: scheduleDateRefine.message,
  path: [...scheduleDateRefine.path],
})

/** Section 5 — Standards & Location */
export const standardsLocationSchema = z.object({
  region: z.string().min(1, 'Region is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  safetyStandard: z.string().min(1, 'Safety standard is required'),
  qualityStandard: optionalString,
  environmentalStandard: optionalString,
  bimEnabled: z.boolean().default(false),
  bimLevel: optionalString,
  modelCoordinationRequired: z.boolean().default(false),
})

/** Section 6 — Schedule Upload */
export const scheduleUploadSchema = z.object({
  scheduleFileName: optionalString,
  validateScheduleOnUpload: z.boolean().default(true),
  autoLinkActivities: z.boolean().default(false),
  requireBaselineApproval: z.boolean().default(true),
})

/** Section 7 — Project Documents */
export const projectDocumentsSchema = z.object({
  contractDocumentsFile: optionalString,
  contractDocumentsNote: optionalString,
  drawingsFile: optionalString,
  drawingsNote: optionalString,
  specificationsFile: optionalString,
  specificationsNote: optionalString,
  permitsFile: optionalString,
  permitsNote: optionalString,
})

/** Section 8 — Project Settings */
export const projectSettingsSchema = z.object({
  currency: z.string().min(1, 'Currency is required'),
  language: z.string().min(1, 'Language is required'),
  dateFormat: z.string().min(1, 'Date format is required'),
  weatherProvider: z.string().min(1, 'Weather provider is required'),
  enableWeatherAlerts: z.boolean().default(true),
  enableSafetyDashboard: z.boolean().default(true),
  enableProgressDashboard: z.boolean().default(true),
  enableCostDashboard: z.boolean().default(false),
  allowFieldReporting: z.boolean().default(true),
  allowPhotoUpload: z.boolean().default(true),
  requireApprovalForReports: z.boolean().default(false),
})

/** Full form schema — hidden UUID/template IDs are assigned server-side on submit */
export const projectInitializationSchema = projectInfoSchema
  .merge(projectTeamSchema)
  .merge(technicalInfoSchema)
  .merge(scheduleHoursObjectSchema)
  .merge(standardsLocationSchema)
  .merge(scheduleUploadSchema)
  .merge(projectDocumentsSchema)
  .merge(projectSettingsSchema)
  .refine(scheduleDateRefine.check, {
    message: scheduleDateRefine.message,
    path: [...scheduleDateRefine.path],
  })

export type ProjectInitializationFormValues = z.infer<typeof projectInitializationSchema>

export const STEP_SCHEMAS = [
  projectInfoSchema,
  projectTeamSchema,
  technicalInfoSchema,
  scheduleHoursSchema,
  standardsLocationSchema,
  scheduleUploadSchema,
  projectDocumentsSchema,
  projectSettingsSchema,
] as const

export const STEP_FIELD_NAMES: (keyof ProjectInitializationFormValues)[][] = [
  Object.keys(projectInfoSchema.shape) as (keyof ProjectInitializationFormValues)[],
  Object.keys(projectTeamSchema.shape) as (keyof ProjectInitializationFormValues)[],
  Object.keys(technicalInfoSchema.shape) as (keyof ProjectInitializationFormValues)[],
  Object.keys(scheduleHoursObjectSchema.shape) as (keyof ProjectInitializationFormValues)[],
  Object.keys(standardsLocationSchema.shape) as (keyof ProjectInitializationFormValues)[],
  Object.keys(scheduleUploadSchema.shape) as (keyof ProjectInitializationFormValues)[],
  Object.keys(projectDocumentsSchema.shape) as (keyof ProjectInitializationFormValues)[],
  Object.keys(projectSettingsSchema.shape) as (keyof ProjectInitializationFormValues)[],
]

export const defaultFormValues: ProjectInitializationFormValues = {
  projectName: '',
  projectCode: '',
  projectType: '',
  status: 'planning',
  description: '',
  clientName: '',
  clientContact: '',
  clientEmail: '',
  clientPhone: '',
  organizationName: '',
  department: '',
  contractType: '',
  contractNumber: '',
  contractValue: undefined,
  contractStartDate: '',
  contractEndDate: '',
  buildingClassification: '',
  projectPhase: 'pre_construction',
  sector: '',
  estimatedWorkforce: undefined,
  peakWorkforce: undefined,
  internalNotes: '',
  publicNotes: '',
  address: '',
  city: '',
  country: 'IR',
  latitude: '',
  longitude: '',
  siteArea: undefined,
  projectDirector: '',
  projectManager: '',
  constructionManager: '',
  leadEngineer: '',
  structuralEngineer: '',
  mepEngineer: '',
  qaManager: '',
  qcInspector: '',
  commercialManager: '',
  procurementLead: '',
  structureType: '',
  primaryMaterial: '',
  foundationType: '',
  soilClassification: '',
  numberOfFloors: undefined,
  totalBuiltArea: undefined,
  basementLevels: undefined,
  designStage: '',
  designStandard: '',
  architectFirm: '',
  plannedStartDate: '',
  plannedFinishDate: '',
  actualStartDate: '',
  workingDaysPerWeek: '6',
  publicHolidayCalendar: 'national',
  shiftPattern: 'single',
  dailyWorkHours: 8,
  nightShiftEnabled: false,
  progressMeasurementMethod: 'physical',
  reportingFrequency: 'weekly',
  delayAnalysisEnabled: true,
  criticalPathMonitoring: true,
  region: 'middle_east',
  timezone: 'Asia/Tehran',
  safetyStandard: 'local_hse',
  qualityStandard: '',
  environmentalStandard: '',
  bimEnabled: false,
  bimLevel: 'none',
  modelCoordinationRequired: false,
  scheduleFileName: '',
  validateScheduleOnUpload: true,
  autoLinkActivities: false,
  requireBaselineApproval: true,
  contractDocumentsFile: '',
  contractDocumentsNote: '',
  drawingsFile: '',
  drawingsNote: '',
  specificationsFile: '',
  specificationsNote: '',
  permitsFile: '',
  permitsNote: '',
  currency: 'USD',
  language: 'en',
  dateFormat: 'YYYY-MM-DD',
  weatherProvider: 'openweather',
  enableWeatherAlerts: true,
  enableSafetyDashboard: true,
  enableProgressDashboard: true,
  enableCostDashboard: false,
  allowFieldReporting: true,
  allowPhotoUpload: true,
  requireApprovalForReports: false,
}

/** Payload shape sent to the API — server assigns hidden IDs */
export interface ProjectInitializationPayload {
  project: Record<string, unknown>
  team: Record<string, unknown>
  technical: Record<string, unknown>
  schedule: Record<string, unknown>
  standards: Record<string, unknown>
  uploads: Record<string, unknown>
  documents: Record<string, unknown>
  settings: Record<string, unknown>
  submittedAt: string
}

export function buildSubmissionPayload(values: ProjectInitializationFormValues): ProjectInitializationPayload {
  return {
    project: {
      name: values.projectName,
      code: values.projectCode,
      type: values.projectType,
      status: values.status,
      description: values.description,
      clientName: values.clientName,
      clientContact: values.clientContact,
      clientEmail: values.clientEmail,
      clientPhone: values.clientPhone,
      organizationName: values.organizationName,
      department: values.department,
      contractType: values.contractType,
      contractNumber: values.contractNumber,
      contractValue: values.contractValue,
      contractStartDate: values.contractStartDate,
      contractEndDate: values.contractEndDate,
      buildingClassification: values.buildingClassification,
      projectPhase: values.projectPhase,
      sector: values.sector,
      estimatedWorkforce: values.estimatedWorkforce,
      peakWorkforce: values.peakWorkforce,
      internalNotes: values.internalNotes,
      publicNotes: values.publicNotes,
      location: {
        address: values.address,
        city: values.city,
        country: values.country,
        latitude: values.latitude,
        longitude: values.longitude,
        siteArea: values.siteArea,
      },
    },
    team: {
      projectDirector: values.projectDirector,
      projectManager: values.projectManager,
      constructionManager: values.constructionManager,
      leadEngineer: values.leadEngineer,
      structuralEngineer: values.structuralEngineer,
      mepEngineer: values.mepEngineer,
      qaManager: values.qaManager,
      qcInspector: values.qcInspector,
      commercialManager: values.commercialManager,
      procurementLead: values.procurementLead,
    },
    technical: {
      structureType: values.structureType,
      primaryMaterial: values.primaryMaterial,
      foundationType: values.foundationType,
      soilClassification: values.soilClassification,
      numberOfFloors: values.numberOfFloors,
      totalBuiltArea: values.totalBuiltArea,
      basementLevels: values.basementLevels,
      designStage: values.designStage,
      designStandard: values.designStandard,
      architectFirm: values.architectFirm,
    },
    schedule: {
      plannedStartDate: values.plannedStartDate,
      plannedFinishDate: values.plannedFinishDate,
      actualStartDate: values.actualStartDate,
      workingDaysPerWeek: values.workingDaysPerWeek,
      publicHolidayCalendar: values.publicHolidayCalendar,
      shiftPattern: values.shiftPattern,
      dailyWorkHours: values.dailyWorkHours,
      nightShiftEnabled: values.nightShiftEnabled,
      progressMeasurementMethod: values.progressMeasurementMethod,
      reportingFrequency: values.reportingFrequency,
      delayAnalysisEnabled: values.delayAnalysisEnabled,
      criticalPathMonitoring: values.criticalPathMonitoring,
    },
    standards: {
      region: values.region,
      timezone: values.timezone,
      safetyStandard: values.safetyStandard,
      qualityStandard: values.qualityStandard,
      environmentalStandard: values.environmentalStandard,
      bimEnabled: values.bimEnabled,
      bimLevel: values.bimLevel,
      modelCoordinationRequired: values.modelCoordinationRequired,
    },
    uploads: {
      scheduleFileName: values.scheduleFileName,
      validateScheduleOnUpload: values.validateScheduleOnUpload,
      autoLinkActivities: values.autoLinkActivities,
      requireBaselineApproval: values.requireBaselineApproval,
    },
    documents: {
      contractDocumentsFile: values.contractDocumentsFile,
      contractDocumentsNote: values.contractDocumentsNote,
      drawingsFile: values.drawingsFile,
      drawingsNote: values.drawingsNote,
      specificationsFile: values.specificationsFile,
      specificationsNote: values.specificationsNote,
      permitsFile: values.permitsFile,
      permitsNote: values.permitsNote,
    },
    settings: {
      currency: values.currency,
      language: values.language,
      dateFormat: values.dateFormat,
      weatherProvider: values.weatherProvider,
      enableWeatherAlerts: values.enableWeatherAlerts,
      enableSafetyDashboard: values.enableSafetyDashboard,
      enableProgressDashboard: values.enableProgressDashboard,
      enableCostDashboard: values.enableCostDashboard,
      allowFieldReporting: values.allowFieldReporting,
      allowPhotoUpload: values.allowPhotoUpload,
      requireApprovalForReports: values.requireApprovalForReports,
    },
    submittedAt: new Date().toISOString(),
  }
}
