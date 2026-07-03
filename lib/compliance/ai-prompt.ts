/**
 * Helpers for wiring compliance context into AI analysis (reports, alerts, dashboards).
 */

import type { ComplianceResolutionResult } from './types'

/** System prompt fragment — inject into daily report / photo analysis requests */
export function buildComplianceSystemPrompt(context: ComplianceResolutionResult['aiComplianceContext']): string {
  const standards = context.aiReferenceIds.join(', ') || 'none configured'
  return [
    'You are SitePilot AI performing construction compliance analysis.',
    `Regulatory region: ${context.regulatoryRegion}.`,
    `Construction type: ${context.constructionType}.`,
    `Applicable standards (reference IDs): ${standards}.`,
    context.mandatoryStandardKeys.length
      ? `Mandatory standards: ${context.mandatoryStandardKeys.join(', ')}.`
      : '',
    context.customStandardKeys.length
      ? `User-defined custom standards: ${context.customStandardKeys.join(', ')}.`
      : '',
    'Evaluate observations against these standards for: safety violations, quality issues, schedule deviations, compliance gaps, and project risks.',
    context.customNotes.length ? `Custom notes: ${context.customNotes.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Structured metadata attached to analysis API payloads */
export function toAiAnalysisMetadata(profile: ComplianceResolutionResult) {
  return {
    compliance: profile.aiComplianceContext,
    activatedStandardCount: profile.activatedStandards.length,
    standardFamilies: Object.keys(profile.standardsByFamily),
  }
}
