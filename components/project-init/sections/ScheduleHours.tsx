'use client'

import {
  HOLIDAY_CALENDARS,
  PROGRESS_METHODS,
  REPORTING_FREQUENCIES,
  SHIFT_PATTERNS,
  WORKING_DAYS_OPTIONS,
} from '@/lib/project-init/constants'
import { FieldGrid, NumberField, SectionHeader, SelectField, SubsectionTitle, SwitchField, TextField } from '../FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function ScheduleHoursSection() {
  return (
    <div>
      <SectionHeader
        title="Schedule & Working Hours"
        description="Baseline dates, working calendar, shift patterns, and progress reporting configuration."
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>Dates</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="plannedStartDate" label="Planned Start Date" type="date" required />
        <TextField<ProjectInitializationFormValues> name="plannedFinishDate" label="Planned Finish Date" type="date" required />
        <TextField<ProjectInitializationFormValues> name="actualStartDate" label="Actual Start Date (if known)" type="date" />

        <SubsectionTitle>Calendar</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues>
          name="workingDaysPerWeek"
          label="Working Days per Week"
          required
          options={WORKING_DAYS_OPTIONS}
        />
        <SelectField<ProjectInitializationFormValues>
          name="publicHolidayCalendar"
          label="Public Holiday Calendar"
          required
          options={HOLIDAY_CALENDARS}
        />

        <SubsectionTitle>Shift & Working Hours</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="shiftPattern" label="Shift Pattern" required options={SHIFT_PATTERNS} />
        <NumberField<ProjectInitializationFormValues> name="dailyWorkHours" label="Daily Work Hours" required />
        <SwitchField<ProjectInitializationFormValues>
          name="nightShiftEnabled"
          label="Night Shift Enabled"
          description="Enable if night operations are planned on site."
          className="md:col-span-2"
        />

        <SubsectionTitle>Progress Settings</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues>
          name="progressMeasurementMethod"
          label="Progress Measurement Method"
          required
          options={PROGRESS_METHODS}
        />
        <SelectField<ProjectInitializationFormValues>
          name="reportingFrequency"
          label="Reporting Frequency"
          required
          options={REPORTING_FREQUENCIES}
        />

        <SubsectionTitle>Delay Analysis</SubsectionTitle>
        <SwitchField<ProjectInitializationFormValues>
          name="delayAnalysisEnabled"
          label="Enable Delay Analysis"
          description="Track and analyze schedule variances against baseline."
        />
        <SwitchField<ProjectInitializationFormValues>
          name="criticalPathMonitoring"
          label="Critical Path Monitoring"
          description="Monitor critical path activities for schedule risk."
        />
      </FieldGrid>
    </div>
  )
}
