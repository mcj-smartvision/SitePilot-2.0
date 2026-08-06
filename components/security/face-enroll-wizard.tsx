'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  Play,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/admin/shared'
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
  listBrowserCameras,
  openCameraStream,
  stopStream,
  type BrowserCamera,
} from '@/lib/attendance/camera'
import {
  cropFaceFromVideo,
  detectFacesInVideo,
  drawFaceBoxes,
} from '@/lib/attendance/face-detect'
import { extractFaceEmbedding, warmFaceEmbedder } from '@/lib/attendance/face-embed.client'
import { ENROLL_POSES, type EnrollPose } from '@/lib/attendance/enroll-poses'
import type { AttendanceEnrollment } from '@/lib/attendance/types'
import { cn } from '@/lib/utils'

type MemberOption = { userId: string; fullName: string; email: string | null }

type CapturedSample = {
  pose: EnrollPose
  imageBase64: string
  faceEmbedding: number[]
}

type WizardPhase = 'setup' | 'running' | 'saving' | 'done'

function sleep(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms))
}

export function FaceEnrollWizardPage({
  projectId,
  projectName,
  members,
}: {
  projectId: string
  projectName: string
  members: MemberOption[]
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const abortRef = useRef(false)

  const [enrollments, setEnrollments] = useState<AttendanceEnrollment[]>([])
  const [memberQuery, setMemberQuery] = useState('')
  const [userId, setUserId] = useState('')
  const [cameras, setCameras] = useState<BrowserCamera[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [previewOn, setPreviewOn] = useState(false)
  const [phase, setPhase] = useState<WizardPhase>('setup')
  const [poseIndex, setPoseIndex] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [captured, setCaptured] = useState<CapturedSample[]>([])

  const selectedMember = members.find((m) => m.userId === userId) ?? null
  const currentPose = ENROLL_POSES[poseIndex]

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
    if (!res.ok) throw new Error(json.error || 'Failed to load enrollments')
    setEnrollments(json.enrollments as AttendanceEnrollment[])
  }, [projectId])

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setPreviewOn(false)
  }, [])

  const startCamera = useCallback(
    async (id?: string) => {
      const stream = await openCameraStream(id || deviceId || null)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setPreviewOn(true)
    },
    [deviceId]
  )

  useEffect(() => {
    void loadEnrollments().catch((e) =>
      setError(e instanceof Error ? e.message : 'Load error')
    )
    void warmFaceEmbedder().catch(() => undefined)
    void listBrowserCameras()
      .then((list) => {
        setCameras(list)
        if (list[0]) setDeviceId(list[0].deviceId)
      })
      .catch(() => undefined)
    return () => {
      abortRef.current = true
      stopCamera()
    }
  }, [loadEnrollments, stopCamera])

  useEffect(() => {
    if (phase !== 'running' || !previewOn) return
    let alive = true
    const id = window.setInterval(() => {
      void (async () => {
        if (!alive) return
        const video = videoRef.current
        const overlay = overlayRef.current
        if (!video || !overlay) return
        const boxes = await detectFacesInVideo(video)
        if (!alive) return
        drawFaceBoxes(overlay, video, boxes.slice(0, 1))
      })()
    }, 160)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [phase, previewOn])

  async function captureCurrentPose(pose: EnrollPose): Promise<CapturedSample | null> {
    const video = videoRef.current
    if (!video) return null
    for (let attempt = 0; attempt < 8; attempt++) {
      if (abortRef.current) return null
      const boxes = await detectFacesInVideo(video)
      const best = boxes[0]
      if (best && best.width * best.height > 40 * 40) {
        const crop = cropFaceFromVideo(video, best, 0.4, 0.94)
        if (crop) {
          const embedding = await extractFaceEmbedding(crop)
          if (embedding) {
            return { pose, imageBase64: crop, faceEmbedding: embedding }
          }
        }
      }
      await sleep(280)
    }
    return null
  }

  async function runGuidedCapture() {
    if (!userId) {
      setError('ابتدا نام فرد را انتخاب کنید')
      return
    }
    setError(null)
    setCaptured([])
    abortRef.current = false
    setPhase('running')
    setPoseIndex(0)
    setStatus('آماده‌سازی دوربین و مدل…')

    try {
      await warmFaceEmbedder()
      if (!previewOn) await startCamera(deviceId || undefined)

      const samples: CapturedSample[] = []
      for (let i = 0; i < ENROLL_POSES.length; i++) {
        if (abortRef.current) throw new Error('لغو شد')
        const pose = ENROLL_POSES[i]
        setPoseIndex(i)
        setStatus(pose.hintFa)
        setCountdown(null)
        await sleep(900)

        for (let c = 3; c >= 1; c--) {
          if (abortRef.current) throw new Error('لغو شد')
          setCountdown(c)
          await sleep(700)
        }
        setCountdown(null)
        setStatus(`در حال ثبت: ${pose.labelFa}`)

        const sample = await captureCurrentPose(pose)
        if (!sample) {
          throw new Error(`ثبت زاویه «${pose.labelFa}» ناموفق بود — نور و موقعیت صورت را بهتر کنید`)
        }
        samples.push(sample)
        setCaptured([...samples])
        setStatus(`✓ ${pose.labelFa}`)
        await sleep(450)
      }

      setPhase('saving')
      setStatus('ذخیره بیومتریک…')
      const res = await fetch('/api/attendance/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          personName: selectedMember?.fullName,
          samples: samples.map((s) => ({
            imageBase64: s.imageBase64,
            faceEmbedding: s.faceEmbedding,
            pose: s.pose.id,
            mimeType: 'image/jpeg',
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'ذخیره ناموفق')

      setPhase('done')
      setStatus(`ثبت «${selectedMember?.fullName}» با ${samples.length} زاویه انجام شد`)
      await loadEnrollments()
      stopCamera()
    } catch (e) {
      setPhase('setup')
      setError(e instanceof Error ? e.message : 'ثبت ناموفق')
      setStatus(null)
    } finally {
      setCountdown(null)
    }
  }

  function cancelRunning() {
    abortRef.current = true
    setPhase('setup')
    setCountdown(null)
    setStatus('لغو شد')
    stopCamera()
  }

  async function removePerson(enrollment: AttendanceEnrollment) {
    if (!confirm(`حذف کامل ثبت بیومتریک «${enrollment.personName}»؟`)) return
    setBusyId(enrollment.id)
    try {
      const qs = new URLSearchParams({
        projectId,
        enrollmentId: enrollment.id,
      })
      const res = await fetch(`/api/attendance/enrollments?${qs}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'حذف ناموفق')
      await loadEnrollments()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حذف ناموفق')
    } finally {
      setBusyId(null)
    }
  }

  async function removeSample(enrollment: AttendanceEnrollment, sampleId: string) {
    if (!confirm('حذف این عکس نمونه؟')) return
    setBusyId(`${enrollment.id}:${sampleId}`)
    try {
      const qs = new URLSearchParams({
        projectId,
        enrollmentId: enrollment.id,
        sampleId,
      })
      const res = await fetch(`/api/attendance/enrollments?${qs}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'حذف نمونه ناموفق')
      await loadEnrollments()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حذف نمونه ناموفق')
    } finally {
      setBusyId(null)
    }
  }

  const isRunning = phase === 'running' || phase === 'saving'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="ثبت بیومتریک افراد"
          description={`${projectName} — صفحه جدا برای ثبت اولیه؛ با پایش گیت قاطی نمی‌شود`}
        />
        <Button asChild variant="outline">
          <Link href="/dashboard/security">
            <ArrowRight className="h-4 w-4 ml-1" />
            بازگشت به گیت
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <SectionCard
        title="ثبت فرد جدید"
        description="نام را انتخاب کنید، شروع را بزنید؛ برنامه مرحله‌به‌مرحله زاویه‌ها را راهنمایی می‌کند"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>جستجوی نام</Label>
              <Input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="نام عضو…"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <Label>فرد برای ثبت</Label>
              <Select
                value={userId || undefined}
                onValueChange={setUserId}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب عضو پروژه" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMembers.map((m) => {
                    const enrolled = enrollments.find((e) => e.userId === m.userId)
                    return (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.fullName}
                        {enrolled?.hasEmbedding
                          ? ' (ثبت‌شده — بازنویسی)'
                          : enrolled
                            ? ' (ناقص)'
                            : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {cameras.length > 1 ? (
            <div className="space-y-2">
              <Label>دوربین</Label>
              <Select
                value={deviceId || undefined}
                onValueChange={setDeviceId}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب دوربین" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((c) => (
                    <SelectItem key={c.deviceId} value={c.deviceId}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {phase === 'setup' || phase === 'done' ? (
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                disabled={!userId}
                onClick={() => void runGuidedCapture()}
              >
                <Play className="h-4 w-4 ml-1" />
                شروع ثبت هدایت‌شده
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={cancelRunning}>
                لغو
              </Button>
            )}
            {selectedMember ? (
              <Badge variant="outline" className="h-9 px-3 text-sm">
                <UserPlus className="h-3.5 w-3.5 ml-1" />
                {selectedMember.fullName}
              </Badge>
            ) : null}
          </div>

          {(phase === 'running' || phase === 'saving' || phase === 'done' || phase === 'setup') && (
            <div className="relative overflow-hidden rounded-2xl border bg-black aspect-video">
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

              {phase === 'running' && currentPose ? (
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent px-4 pt-4 pb-16 text-center">
                  <p className="text-xs font-medium text-emerald-300 tracking-wide">
                    مرحله {poseIndex + 1} از {ENROLL_POSES.length}
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {currentPose.labelFa}
                  </p>
                  <p className="mt-1 text-sm text-white/80">{currentPose.hintFa}</p>
                  <p className="mt-0.5 text-xs text-white/50">{currentPose.labelEn}</p>
                </div>
              ) : null}

              {countdown != null ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <span className="text-7xl font-bold text-white drop-shadow-lg tabular-nums">
                    {countdown}
                  </span>
                </div>
              ) : null}

              {phase === 'saving' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>در حال ذخیره…</span>
                </div>
              ) : null}

              {phase === 'setup' && !previewOn ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 text-sm">
                  <Camera className="h-8 w-8" />
                  <span>نام را انتخاب کنید و «شروع ثبت هدایت‌شده» را بزنید</span>
                </div>
              ) : null}

              {phase === 'done' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-950/70 text-white">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <span className="font-semibold">ثبت کامل شد</span>
                </div>
              ) : null}
            </div>
          )}

          {ENROLL_POSES.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ENROLL_POSES.map((pose, i) => {
                const done = captured.some((c) => c.pose.id === pose.id)
                const active = phase === 'running' && i === poseIndex
                return (
                  <div
                    key={pose.id}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-center text-[11px] leading-snug',
                      done && 'border-emerald-500 bg-emerald-50 text-emerald-900',
                      active && 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-200',
                      !done && !active && 'text-muted-foreground'
                    )}
                  >
                    <span className="block font-medium">{i + 1}. {pose.labelFa}</span>
                    {done ? (
                      <CheckCircle2 className="mx-auto mt-1 h-3.5 w-3.5 text-emerald-600" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          {status ? (
            <p className="text-sm rounded-md border bg-muted/40 px-3 py-2">{status}</p>
          ) : null}

          {phase === 'done' && captured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {captured.map((c) => (
                <div key={c.pose.id} className="rounded-lg border overflow-hidden bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.imageBase64}
                    alt={c.pose.labelFa}
                    className="aspect-square w-full object-cover"
                  />
                  <p className="px-1.5 py-1 text-[10px] text-center truncate">{c.pose.labelFa}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="افراد ثبت‌شده"
        description="نام و عکس‌های هر زاویه را ببینید؛ می‌توانید یک عکس یا کل فرد را حذف کنید"
      >
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            هنوز کسی ثبت نشده — از بخش بالا شروع کنید
          </p>
        ) : (
          <ul className="space-y-4">
            {enrollments.map((e) => {
              const personBusy = busyId === e.id
              return (
                <li key={e.id} className="rounded-xl border bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{e.personName || e.userId}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.hasEmbedding
                          ? `${e.samples?.length ?? e.sampleCount ?? 0} زاویه · بیومتریک فعال`
                          : 'بیومتریک ناقص — دوباره ثبت کنید'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={personBusy || isRunning}
                      onClick={() => void removePerson(e)}
                    >
                      {personBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 ml-1" />
                      )}
                      حذف فرد
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {(e.samples && e.samples.length > 0
                      ? e.samples
                      : e.imageUrl
                        ? [
                            {
                              id: 'primary',
                              pose: 'straight',
                              labelFa: 'اصلی',
                              labelEn: 'Primary',
                              imageUrl: e.imageUrl,
                            },
                          ]
                        : []
                    ).map((sample) => {
                      const sampleBusy = busyId === `${e.id}:${sample.id}`
                      return (
                        <div
                          key={sample.id}
                          className="group relative rounded-lg border overflow-hidden bg-slate-50"
                        >
                          {sample.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sample.imageUrl}
                              alt={sample.labelFa}
                              className="aspect-square w-full object-cover"
                            />
                          ) : (
                            <div className="aspect-square bg-muted" />
                          )}
                          <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                            <span className="text-[10px] truncate">{sample.labelFa}</span>
                            {sample.id !== 'primary' ? (
                              <button
                                type="button"
                                className="text-rose-600 hover:text-rose-800 p-0.5"
                                disabled={sampleBusy || isRunning}
                                title="حذف این عکس"
                                onClick={() => void removeSample(e, sample.id)}
                              >
                                {sampleBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
