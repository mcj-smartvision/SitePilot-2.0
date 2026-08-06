'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Info, Loader2, Pencil, Radio, Search, Square, Trash2, UserPlus } from 'lucide-react'
import { SectionCard } from '@/components/admin/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  captureVideoFrame,
  listBrowserCameras,
  openCameraStream,
  stopStream,
  type BrowserCamera,
} from '@/lib/attendance/camera'
import {
  announceRecognized,
  cropFaceFromVideo,
  detectFacesInVideo,
  drawFaceBoxes,
  playConfirmBeep,
  type FaceBox,
} from '@/lib/attendance/face-detect'
import {
  extractAveragedEmbedding,
  extractFaceEmbedding,
  warmFaceEmbedder,
} from '@/lib/attendance/face-embed.client'
import { FaceRecognitionMethodModal } from '@/components/security/face-recognition-method-modal'
import type { AttendanceEnrollment, AttendanceGate, AttendanceTransit } from '@/lib/attendance/types'
import { cn } from '@/lib/utils'

type MemberOption = { userId: string; fullName: string; email: string | null; personnelCode?: string | null }

interface GateCameraPanelProps {
  projectId: string
  gates: AttendanceGate[]
  selectedGateId: string
  onGateChange: (gateId: string) => void
  members: MemberOption[]
  onTransitRecorded: (transit: AttendanceTransit) => void
  onError: (message: string | null) => void
  onEnrolled?: () => void
}

/** How often to call the recognize API while watching */
const WATCH_INTERVAL_MS = 900
/** Face-box detector cadence (every-frame was too heavy) */
const BOX_DETECT_MS = 140
/** Multi-sample biometric enroll */
const ENROLL_SAMPLE_COUNT = 5
const ENROLL_SAMPLE_GAP_MS = 380

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

export function GateCameraPanel({
  projectId,
  gates,
  selectedGateId,
  onGateChange,
  members,
  onTransitRecorded,
  onError,
  onEnrolled,
}: GateCameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const watchRef = useRef(false)
  const recognizingRef = useRef(false)
  const selectedGateIdRef = useRef(selectedGateId)
  const boxLoopRef = useRef<number | null>(null)
  const lastBoxesRef = useRef<FaceBox[]>([])
  const lastLabelsRef = useRef<Array<string | null>>([])

  const [cameras, setCameras] = useState<BrowserCamera[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [previewOn, setPreviewOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [watching, setWatching] = useState(false)
  const [faceCount, setFaceCount] = useState(0)
  const [enrollments, setEnrollments] = useState<AttendanceEnrollment[]>([])
  const [enrollUserId, setEnrollUserId] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [emailHint, setEmailHint] = useState<string | null>(null)
  const [flashName, setFlashName] = useState<string | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const lastDetectAtRef = useRef(0)
  const flashTimerRef = useRef<number | null>(null)

  const selectedGate = gates.find((g) => g.id === selectedGateId) ?? null
  selectedGateIdRef.current = selectedGateId

  const filteredMembers = members.filter((m) => {
    const q = memberQuery.trim().toLowerCase()
    if (!q) return true
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q)
    )
  })

  const loadEnrollments = useCallback(async () => {
    const res = await fetch(
      `/api/attendance/enrollments?projectId=${encodeURIComponent(projectId)}`
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'خطا در لیست شناسایی‌ها')
    setEnrollments(json.enrollments as AttendanceEnrollment[])
  }, [projectId])

  const stopPreview = useCallback(() => {
    watchRef.current = false
    setWatching(false)
    if (boxLoopRef.current != null) {
      cancelAnimationFrame(boxLoopRef.current)
      boxLoopRef.current = null
    }
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    const overlay = overlayRef.current
    if (overlay) {
      const ctx = overlay.getContext('2d')
      ctx?.clearRect(0, 0, overlay.width, overlay.height)
    }
    setPreviewOn(false)
    setFaceCount(0)
  }, [])

  const showFlash = useCallback((name: string) => {
    setFlashName(name)
    if (flashTimerRef.current != null) window.clearTimeout(flashTimerRef.current)
    flashTimerRef.current = window.setTimeout(() => setFlashName(null), 2800)
  }, [])

  const detectingRef = useRef(false)

  const startBoxLoop = useCallback(() => {
    const tick = () => {
      const video = videoRef.current
      const overlay = overlayRef.current
      if (video && overlay && video.readyState >= 2) {
        // Always paint last known boxes (cheap)
        if (lastBoxesRef.current.length) {
          drawFaceBoxes(overlay, video, lastBoxesRef.current, lastLabelsRef.current)
        }
        const now = performance.now()
        if (!detectingRef.current && now - lastDetectAtRef.current >= BOX_DETECT_MS) {
          detectingRef.current = true
          lastDetectAtRef.current = now
          void detectFacesInVideo(video, now)
            .then((boxes) => {
              lastBoxesRef.current = boxes
              setFaceCount(boxes.length)
              if (overlayRef.current && videoRef.current) {
                drawFaceBoxes(
                  overlayRef.current,
                  videoRef.current,
                  boxes,
                  lastLabelsRef.current
                )
              }
            })
            .catch(() => undefined)
            .finally(() => {
              detectingRef.current = false
            })
        }
      }
      boxLoopRef.current = requestAnimationFrame(tick)
    }
    if (boxLoopRef.current != null) cancelAnimationFrame(boxLoopRef.current)
    boxLoopRef.current = requestAnimationFrame(tick)
  }, [])

  const startPreview = useCallback(
    async (id?: string) => {
      onError(null)
      try {
        stopStream(streamRef.current)
        streamRef.current = null
        const stream = await openCameraStream(id || deviceId || null)
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setPreviewOn(true)
        startBoxLoop()
      } catch (e) {
        onError(e instanceof Error ? e.message : 'باز کردن دوربین ناموفق')
        setPreviewOn(false)
      }
    },
    [deviceId, onError, startBoxLoop]
  )

  const runAutoRecognize = useCallback(async () => {
    if (!watchRef.current || recognizingRef.current) return
    const video = videoRef.current
    if (!video) return

    let boxes = lastBoxesRef.current
    if (boxes.length === 0) {
      boxes = await detectFacesInVideo(video)
      lastBoxesRef.current = boxes
    }
    if (boxes.length === 0) {
      setStatusText('پایش فعال — صورتی در قاب نیست')
      lastLabelsRef.current = []
      return
    }

    // Largest 1–2 faces → FaceNet embeddings (not LLM image compare)
    const crops = boxes
      .slice(0, 2)
      .map((b) => cropFaceFromVideo(video, b, 0.35, 0.92))
      .filter((f): f is string => Boolean(f))

    if (crops.length === 0) return

    recognizingRef.current = true
    setStatusText(`استخراج بیومتریک ${crops.length} صورت...`)
    try {
      const embeddings: number[][] = []
      for (const crop of crops) {
        const emb = await extractFaceEmbedding(crop)
        if (emb) embeddings.push(emb)
      }
      if (embeddings.length === 0) {
        setStatusText('چهره دیده شد ولی بردار بیومتریک استخراج نشد — نور/زاویه را بهتر کنید')
        return
      }

      const res = await fetch('/api/attendance/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          gateId: selectedGateIdRef.current || null,
          embeddings,
          auto: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setStatusText(json.error || 'خطا در شناسایی خودکار')
        return
      }

      const results = (json.results ?? []) as Array<{
        matched: boolean
        duplicate?: boolean
        personName?: string | null
        transit?: AttendanceTransit | null
        confidence?: number
        reason?: string
      }>

      const labels: Array<string | null> = boxes.map(() => null)
      let anyNew = false

      results.forEach((r, i) => {
        if (r.matched && r.personName) {
          labels[i] = r.personName
          if (r.transit && !r.duplicate) {
            anyNew = true
            onTransitRecorded(r.transit)
            playConfirmBeep()
            showFlash(r.personName)
            announceRecognized(r.personName)
          }
        }
      })
      lastLabelsRef.current = labels
      const overlay = overlayRef.current
      if (overlay && video) {
        drawFaceBoxes(overlay, video, boxes, labels)
      }

      if (anyNew) {
        const names = results
          .filter((r) => r.matched && r.transit && !r.duplicate)
          .map((r) => r.personName)
          .filter(Boolean)
        setStatusText(`ثبت شد: ${names.join('، ')}`)
      } else if (results.some((r) => r.matched && r.duplicate)) {
        setStatusText('قبلاً ثبت شده — نزدیک گیت بمانید')
      } else if (results.some((r) => r.reason?.includes('ambiguous'))) {
        setStatusText('شباهت مبهم بین دو نفر — نزدیک‌تر و روبه‌رو بایستید')
      } else {
        setStatusText('صورت دیده شد — هنوز با افراد ثبت‌شده جور نشد')
      }
    } catch (e) {
      setStatusText(e instanceof Error ? e.message : 'خطای پایش')
    } finally {
      recognizingRef.current = false
    }
  }, [onTransitRecorded, projectId, showFlash])

  useEffect(() => {
    if (!watching) return
    const id = window.setInterval(() => {
      void runAutoRecognize()
    }, WATCH_INTERVAL_MS)
    void runAutoRecognize()
    return () => window.clearInterval(id)
  }, [watching, runAutoRecognize])

  async function searchCameras() {
    setScanning(true)
    onError(null)
    setStatusText(null)
    try {
      const list = await listBrowserCameras()
      setCameras(list)
      if (list.length === 0) {
        setStatusText('دوربینی پیدا نشد. اجازه دسترسی دوربین را بررسی کنید.')
        return
      }
      const preferred =
        list.find((c) => c.deviceId === selectedGate?.cameraDeviceId)?.deviceId ||
        list[0]?.deviceId ||
        ''
      setDeviceId(preferred)
      setStatusText(`${list.length} دوربین پیدا شد`)
      await startPreview(preferred)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'جستجوی دوربین ناموفق')
    } finally {
      setScanning(false)
    }
  }

  async function bindSelectedCamera() {
    if (!selectedGateId || !deviceId) {
      onError('گیت و دوربین را انتخاب کنید')
      return
    }
    setBusy(true)
    onError(null)
    try {
      const cam = cameras.find((c) => c.deviceId === deviceId)
      const res = await fetch('/api/attendance/gates/bind-camera', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          gateId: selectedGateId,
          cameraDeviceId: deviceId,
          cameraLabel: cam?.label ?? null,
          cameraGroupId: cam?.groupId ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'اتصال دوربین ناموفق')
      setStatusText(`دوربین «${cam?.label || 'انتخاب‌شده'}» به گیت وصل شد`)
      onEnrolled?.()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'اتصال دوربین ناموفق')
    } finally {
      setBusy(false)
    }
  }

  async function startAutoWatch() {
    onError(null)
    if (enrollments.length === 0) {
      onError('اول حداقل یک نفر را با «ثبت بیومتریک» ثبت کنید')
      return
    }
    if (!enrollments.some((e) => e.hasEmbedding)) {
      onError('ثبت‌های قبلی فقط عکس دارند — همه را دوباره با ثبت بیومتریک چندنمونه‌ای ثبت کنید')
      return
    }
    if (!previewOn) {
      await searchCameras()
    }
    setStatusText('بارگذاری مدل FaceNet…')
    try {
      await warmFaceEmbedder()
    } catch {
      onError('بارگذاری مدل شناسایی چهره ناموفق بود — اینترنت/CDN را بررسی کنید')
      return
    }
    watchRef.current = true
    setWatching(true)
    setStatusText('پایش بیومتریک روشن شد — تردد با تطبیق بردار چهره ثبت می‌شود')
  }

  function stopAutoWatch() {
    watchRef.current = false
    setWatching(false)
    setStatusText('پایش خودکار خاموش شد')
  }

  async function enrollFromCamera() {
    if (!enrollUserId) {
      onError('برای شناسایی اولیه، فرد را انتخاب کنید')
      return
    }
    setBusy(true)
    onError(null)
    try {
      const video = videoRef.current
      if (!video) {
        onError('دوربین آماده نیست')
        return
      }

      setStatusText(`ثبت بیومتریک — ${ENROLL_SAMPLE_COUNT} نمونه (کمی سر را چپ/راست کنید)`)
      await warmFaceEmbedder()

      const crops: string[] = []
      let previewCrop: string | null = null

      for (let i = 0; i < ENROLL_SAMPLE_COUNT; i++) {
        const boxes = await detectFacesInVideo(video)
        const best = boxes[0]
        const crop = best
          ? cropFaceFromVideo(video, best, 0.4, 0.94)
          : captureVideoFrame(video, 0.94)?.dataUrl ?? null
        if (crop) {
          crops.push(crop)
          if (!previewCrop) previewCrop = crop
        }
        setStatusText(`نمونه ${i + 1}/${ENROLL_SAMPLE_COUNT}…`)
        if (i < ENROLL_SAMPLE_COUNT - 1) await sleep(ENROLL_SAMPLE_GAP_MS)
      }

      if (crops.length < 3) {
        onError('حداقل ۳ نمونه واضح از چهره لازم است — نور بهتر و روبه‌روی دوربین بایستید')
        return
      }

      const averaged = await extractAveragedEmbedding(crops)
      if (!averaged) {
        onError('استخراج بردار بیومتریک ناموفق بود — دوباره تلاش کنید')
        return
      }

      const member = members.find((m) => m.userId === enrollUserId)
      const res = await fetch('/api/attendance/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: enrollUserId,
          personName: member?.fullName,
          imageBase64: previewCrop,
          mimeType: 'image/jpeg',
          faceEmbedding: averaged.embedding,
          embeddingModel: averaged.model,
          sampleCount: averaged.sampleCount,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'ثبت شناسایی ناموفق')
      setStatusText(
        `بیومتریک «${member?.fullName}» با ${averaged.sampleCount} نمونه ذخیره شد — پایش خودکار را روشن کنید`
      )
      await loadEnrollments()
      onEnrolled?.()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'ثبت شناسایی ناموفق')
    } finally {
      setBusy(false)
    }
  }

  function startReEnroll(enrollment: AttendanceEnrollment) {
    setEnrollUserId(enrollment.userId)
    setEditingId(null)
    setStatusText(
      `فرد «${enrollment.personName || 'انتخاب‌شده'}» برای ثبت مجدد انتخاب شد — دوربین را روشن کنید و «ثبت بیومتریک» را بزنید`
    )
  }

  function startRename(enrollment: AttendanceEnrollment) {
    setEditingId(enrollment.id)
    setEditName(enrollment.personName || '')
  }

  async function saveEnrollmentName(enrollmentId: string) {
    setRowBusyId(enrollmentId)
    onError(null)
    try {
      const res = await fetch('/api/attendance/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          enrollmentId,
          personName: editName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'ویرایش نام ناموفق')
      setEditingId(null)
      setStatusText('نام به‌روز شد')
      await loadEnrollments()
      onEnrolled?.()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'ویرایش نام ناموفق')
    } finally {
      setRowBusyId(null)
    }
  }

  async function removeEnrollment(enrollment: AttendanceEnrollment) {
    const label = enrollment.personName || 'این فرد'
    if (!window.confirm(`ثبت چهره «${label}» حذف شود؟`)) return
    setRowBusyId(enrollment.id)
    onError(null)
    try {
      const qs = new URLSearchParams({
        projectId,
        enrollmentId: enrollment.id,
      })
      const res = await fetch(`/api/attendance/enrollments?${qs.toString()}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'حذف ناموفق')
      if (enrollUserId === enrollment.userId) setEnrollUserId('')
      if (editingId === enrollment.id) setEditingId(null)
      setStatusText(`ثبت چهره «${label}» حذف شد`)
      await loadEnrollments()
      onEnrolled?.()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'حذف ناموفق')
    } finally {
      setRowBusyId(null)
    }
  }

  useEffect(() => {
    void loadEnrollments().catch((e) =>
      onError(e instanceof Error ? e.message : 'خطا در لیست شناسایی‌ها')
    )
    void fetch('/api/attendance/email-status')
      .then((r) => r.json())
      .then((j) => {
        if (j.email?.hint) setEmailHint(j.email.hint)
        else if (j.email?.configured) setEmailHint('سرویس ایمیل آماده است')
      })
      .catch(() => undefined)
    // Warm detectors + FaceNet so first enroll/recognize is not delayed
    void import('@/lib/attendance/face-detect').then((m) => m.getFaceDetector())
    void warmFaceEmbedder().catch(() => undefined)
    return () => stopPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (selectedGate?.cameraDeviceId) {
      setDeviceId(selectedGate.cameraDeviceId)
    }
  }, [selectedGate?.cameraDeviceId, selectedGateId])

  return (
    <SectionCard
      title="دوربین گیت — شناسایی بیومتریک"
      description="ثبت چندنمونه‌ای FaceNet، تطبیق ۱:N با آستانه و حاشیه ابهام — بدون حدس LLM"
    >
      <div className="space-y-4">
        {emailHint ? (
          <p
            className={cn(
              'text-xs rounded-md border px-3 py-2',
              emailHint.includes('آماده')
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            )}
          >
            ایمیل: {emailHint}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>گیت</Label>
            <Select value={selectedGateId || undefined} onValueChange={onGateChange}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب گیت" />
              </SelectTrigger>
              <SelectContent>
                {gates.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                    {g.cameraLabel ? ` — ${g.cameraLabel}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>دوربین‌های پیدا شده</Label>
            <div className="flex gap-2">
              <Select
                value={deviceId || undefined}
                onValueChange={(id) => {
                  setDeviceId(id)
                  void startPreview(id)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="بعد از جستجو انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((c) => (
                    <SelectItem key={c.deviceId} value={c.deviceId}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={scanning}
                onClick={() => void searchCameras()}
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-black aspect-video">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
          {watching ? (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              LIVE — پایش · {faceCount} صورت
            </div>
          ) : faceCount > 0 ? (
            <div className="absolute top-3 left-3 rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white">
              {faceCount} صورت در قاب
            </div>
          ) : null}
          {flashName ? (
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-6 pointer-events-none">
              <div className="mx-4 w-full max-w-lg rounded-2xl bg-emerald-600/95 px-6 py-5 text-center shadow-2xl">
                <p className="text-xs font-medium text-emerald-100">شناسایی شد</p>
                <p className="mt-1 text-3xl font-bold text-white tracking-tight">{flashName}</p>
              </div>
            </div>
          ) : null}
          {!previewOn ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 text-sm">
              <Camera className="h-8 w-8" />
              <span>برای شروع، «جستجوی دوربین» را بزنید</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={scanning}
            onClick={() => void searchCameras()}
          >
            <Search className="h-4 w-4 ml-1" />
            جستجوی دوربین‌ها
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !deviceId || !selectedGateId}
            onClick={() => void bindSelectedCamera()}
          >
            <Camera className="h-4 w-4 ml-1" />
            اتصال به این گیت
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-slate-800"
            onClick={() => setMethodOpen(true)}
          >
            <Info className="h-4 w-4 ml-1" />
            Recognition Method
          </Button>
          {!watching ? (
            <Button
              type="button"
              disabled={busy || enrollments.length === 0}
              onClick={() => void startAutoWatch()}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              <Radio className="h-4 w-4 ml-1" />
              روشن کردن پایش خودکار
            </Button>
          ) : (
            <Button type="button" variant="destructive" onClick={stopAutoWatch}>
              <Square className="h-4 w-4 ml-1" />
              توقف پایش
            </Button>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-base">ثبت بیومتریک (۵ نمونه برای هر نفر)</Label>
            <Badge variant="outline">
              {enrollments.filter((e) => e.hasEmbedding).length}/{enrollments.length} بیومتریک
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            هنگام ثبت، کمی سر را چپ/راست کنید. سیستم میانگین بردار FaceNet را ذخیره می‌کند و هنگام تردد با فاصله اقلیدسی + حاشیه ابهام تطبیق می‌دهد.
          </p>
          <Input
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder="جستجوی نام برای ثبت بیومتریک..."
          />
          <Select value={enrollUserId || undefined} onValueChange={setEnrollUserId}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب فرد برای ثبت چهره" />
            </SelectTrigger>
            <SelectContent>
              {filteredMembers.map((m) => {
                const enrolled = enrollments.find((e) => e.userId === m.userId)
                return (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.fullName}
                    {enrolled?.hasEmbedding ? ' ✓' : enrolled ? ' (نیاز به ثبت مجدد)' : ''}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !previewOn || !enrollUserId || watching}
            onClick={() => void enrollFromCamera()}
          >
            <UserPlus className="h-4 w-4 ml-1" />
            {enrollments.some((e) => e.userId === enrollUserId)
              ? 'ثبت مجدد بیومتریک از دوربین'
              : 'ثبت بیومتریک از دوربین'}
          </Button>

          {enrollments.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2 max-h-64 overflow-y-auto">
              {enrollments.map((e) => {
                const rowBusy = rowBusyId === e.id
                const isEditing = editingId === e.id
                return (
                  <li
                    key={e.id}
                    className="rounded-md border px-2 py-2 text-sm space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {e.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.imageUrl}
                          alt={e.personName || ''}
                          className="h-10 w-10 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted shrink-0" />
                      )}
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(ev) => setEditName(ev.target.value)}
                          className="h-8 text-sm"
                          disabled={rowBusy}
                          autoFocus
                        />
                      ) : (
                        <span className="truncate font-medium flex-1">
                          {e.personName || e.userId}
                          {!e.hasEmbedding ? (
                            <span className="ms-1 text-[10px] font-normal text-amber-700">
                              نیاز به ثبت مجدد
                            </span>
                          ) : (
                            <span className="ms-1 text-[10px] font-normal text-emerald-700">
                              {e.sampleCount ?? 1} نمونه
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={rowBusy || !editName.trim()}
                            onClick={() => void saveEnrollmentName(e.id)}
                          >
                            {rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'ذخیره'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            disabled={rowBusy}
                            onClick={() => setEditingId(null)}
                          >
                            انصراف
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={busy || rowBusy || watching}
                            onClick={() => startRename(e)}
                            title="ویرایش نام"
                          >
                            <Pencil className="h-3.5 w-3.5 ml-1" />
                            نام
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={busy || rowBusy || watching || !previewOn}
                            onClick={() => startReEnroll(e)}
                            title="ثبت مجدد چهره از دوربین"
                          >
                            <Camera className="h-3.5 w-3.5 ml-1" />
                            چهره
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            disabled={busy || rowBusy || watching}
                            onClick={() => void removeEnrollment(e)}
                            title="حذف ثبت چهره"
                          >
                            {rowBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 ml-1" />
                            )}
                            حذف
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        {statusText ? (
          <p className="text-sm rounded-md border bg-muted/40 px-3 py-2">{statusText}</p>
        ) : null}
      </div>

      <FaceRecognitionMethodModal open={methodOpen} onClose={() => setMethodOpen(false)} />
    </SectionCard>
  )
}
