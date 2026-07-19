/**
 * Workshop domain smoke tests.
 * Run: npx tsx scripts/test-workshop-domain.ts
 */
import {
  assertCanEditPackage,
  assertCanSendToToday,
  canEditPackageContent,
  canReviseChangeRequest,
} from '../lib/workshop/approvals'
import { inferReviewReason, validateCreatePackage, WorkshopError } from '../lib/workshop/domain'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const ok = validateCreatePackage({
  projectId: 'p1',
  parentScheduleNodeId: 't1',
  name: 'اجرای شمشه‌گیری گچ',
  quantity: 120,
  uom: 'm2',
  location: 'واحد 201',
  crew: 'گچ‌کار',
})
assert(ok.name.includes('شمشه'), 'name ok')
assert(ok.quantity === 120, 'qty ok')

let failed = false
try {
  validateCreatePackage({
    projectId: 'p1',
    parentScheduleNodeId: 't1',
    name: '',
    quantity: 0,
    uom: '',
  })
} catch (e) {
  failed = e instanceof WorkshopError
}
assert(failed, 'validation fails on empty')

const flagged = inferReviewReason({ flagForReview: true })
assert(flagged.flag && flagged.reasonCode === 'out_of_baseline_scope', 'flag reason')

assert(canEditPackageContent('draft'), 'draft editable')
assert(canEditPackageContent('rejected'), 'rejected editable')
assert(canEditPackageContent('pending_approval'), 'pending still editable')
assert(!canEditPackageContent('approved'), 'approved locked')
assert(canReviseChangeRequest('change_requested'), 'revise change request')

let locked = false
try {
  assertCanEditPackage('approved')
} catch (e) {
  locked = e instanceof WorkshopError
}
assert(locked, 'edit blocked after approve')

let sendBlocked = false
try {
  assertCanSendToToday('draft')
} catch (e) {
  sendBlocked = e instanceof WorkshopError
}
assert(sendBlocked, 'send-to-today requires approval')

console.log('workshop domain tests: OK')
