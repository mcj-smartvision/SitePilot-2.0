/**
 * Browser-only FaceNet descriptor extraction (@vladmandic/face-api).
 * MediaPipe still finds boxes; this net produces the biometric vector.
 */

'use client'

import { FACE_EMBEDDING_DIM, FACE_EMBEDDING_MODEL, averageEmbeddings, l2Normalize } from '@/lib/attendance/face-match'

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model'

type FaceApiModule = typeof import('@vladmandic/face-api')

let loadPromise: Promise<FaceApiModule> | null = null

async function loadFaceApi(): Promise<FaceApiModule> {
  if (typeof window === 'undefined') {
    throw new Error('Face embedding only runs in the browser')
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const faceapi = await import('@vladmandic/face-api')
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      return faceapi
    })()
  }
  return loadPromise
}

/** Warm models so first enroll/recognize is not slow. */
export async function warmFaceEmbedder(): Promise<void> {
  await loadFaceApi()
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('face_image_load_failed'))
    img.src = dataUrl
  })
}

/**
 * Extract a 128-d FaceNet descriptor from a face crop (data URL or canvas).
 */
export async function extractFaceEmbedding(
  source: string | HTMLCanvasElement | HTMLVideoElement
): Promise<number[] | null> {
  const faceapi = await loadFaceApi()
  const input =
    typeof source === 'string' ? await dataUrlToImage(source) : source

  const detection = await faceapi
    .detectSingleFace(
      input,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection?.descriptor || detection.descriptor.length !== FACE_EMBEDDING_DIM) {
    return null
  }

  return l2Normalize(Array.from(detection.descriptor))
}

export async function extractAveragedEmbedding(
  sources: Array<string | HTMLCanvasElement>
): Promise<{ embedding: number[]; sampleCount: number; model: string } | null> {
  const samples: number[][] = []
  for (const src of sources) {
    const emb = await extractFaceEmbedding(src)
    if (emb) samples.push(emb)
  }
  if (samples.length < 2) {
    // Allow single sample only if that is all we got; caller should prefer ≥3
    if (samples.length === 1) {
      return { embedding: samples[0], sampleCount: 1, model: FACE_EMBEDDING_MODEL }
    }
    return null
  }
  return {
    embedding: averageEmbeddings(samples),
    sampleCount: samples.length,
    model: FACE_EMBEDDING_MODEL,
  }
}

export { FACE_EMBEDDING_MODEL, FACE_EMBEDDING_DIM }
