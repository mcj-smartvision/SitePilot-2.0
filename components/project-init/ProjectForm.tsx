'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FORM_STEPS } from '@/lib/project-init/constants'
import {
  buildSubmissionPayload,
  defaultFormValues,
  projectInitializationSchema,
  STEP_FIELD_NAMES,
  STEP_SCHEMAS,
  type ProjectInitializationFormValues,
} from '@/lib/project-init/schema'
import { ProjectInfoSection } from './sections/ProjectInfo'
import { ProjectTeamSection } from './sections/ProjectTeam'
import { TechnicalInfoSection } from './sections/TechnicalInfo'
import { ScheduleHoursSection } from './sections/ScheduleHours'
import { StandardsLocationSection } from './sections/StandardsLocation'
import { ScheduleUploadSection } from './sections/ScheduleUpload'
import { ProjectDocumentsSection } from './sections/ProjectDocuments'
import { ProjectSettingsSection } from './sections/ProjectSettings'

const SECTION_COMPONENTS = [
  ProjectInfoSection,
  ProjectTeamSection,
  TechnicalInfoSection,
  ScheduleHoursSection,
  StandardsLocationSection,
  ScheduleUploadSection,
  ProjectDocumentsSection,
  ProjectSettingsSection,
] as const

interface ProjectFormProps {
  onSubmitted?: (payload: ReturnType<typeof buildSubmissionPayload>) => void
}

export function ProjectForm({ onSubmitted }: ProjectFormProps) {
  const [step, setStep] = useState(0)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const methods = useForm<ProjectInitializationFormValues>({
    resolver: zodResolver(projectInitializationSchema),
    defaultValues: defaultFormValues,
    mode: 'onBlur',
  })

  const { handleSubmit, trigger, getValues, setError, formState } = methods
  const progress = ((step + 1) / FORM_STEPS.length) * 100
  const ActiveSection = SECTION_COMPONENTS[step]

  async function goNext() {
    const fields = STEP_FIELD_NAMES[step]
    const fieldValid = await trigger(fields, { shouldFocus: true })
    if (!fieldValid) return

    // Run section-level Zod rules (e.g. planned finish >= start on Schedule step)
    const stepSchema = STEP_SCHEMAS[step]
    const allValues = getValues()
    const stepSlice = Object.fromEntries(fields.map((field) => [field, allValues[field]]))
    const sectionResult = stepSchema.safeParse(stepSlice)
    if (!sectionResult.success) {
      for (const issue of sectionResult.error.issues) {
        const fieldName = issue.path[0]
        if (typeof fieldName === 'string') {
          setError(fieldName as keyof ProjectInitializationFormValues, { message: issue.message })
        }
      }
      return
    }

    setStep((s) => Math.min(s + 1, FORM_STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function onSubmit(values: ProjectInitializationFormValues) {
    const parsed = projectInitializationSchema.parse(values)
    const payload = buildSubmissionPayload(parsed)
    console.log('Project Initialization Payload:', JSON.stringify(payload, null, 2))
    setSubmitSuccess(true)
    onSubmitted?.(payload)
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Mobile progress bar */}
        <div className="lg:hidden space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{FORM_STEPS[step].title}</span>
            <span className="text-muted-foreground">
              Step {step + 1} of {FORM_STEPS.length}
            </span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar step navigation — desktop */}
          <aside className="hidden lg:block">
            <nav className="sticky top-6 space-y-1">
              {FORM_STEPS.map((s, index) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => index < step && setStep(index)}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2.5 transition-colors',
                    index === step
                      ? 'bg-primary text-primary-foreground'
                      : index < step
                        ? 'hover:bg-muted text-foreground'
                        : 'text-muted-foreground cursor-default'
                  )}
                >
                  <p className="text-xs font-medium opacity-80">Step {index + 1}</p>
                  <p className="text-sm font-semibold leading-tight">{s.title}</p>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main form content */}
          <Card>
            <CardContent className="pt-6">
              {submitSuccess ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Project initialization data validated and logged. Check the browser console for the JSON payload
                    that will be sent to the database (hidden IDs are assigned server-side).
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <ActiveSection />

                  {formState.errors && Object.keys(formState.errors).length > 0 && formState.isSubmitted ? (
                    <p className="text-sm text-destructive mt-4">
                      Please fix validation errors before submitting.
                    </p>
                  ) : null}

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>

                    {step < FORM_STEPS.length - 1 ? (
                      <Button type="button" onClick={goNext}>
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit">Submit Project Initialization</Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </FormProvider>
  )
}
