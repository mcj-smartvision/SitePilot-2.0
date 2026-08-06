/** Client-facing English brief for Canadian stakeholders — biometric gate ID. */

export const FACE_RECOGNITION_METHOD_TITLE =
  'Biometric Face Identification — Method Overview'

export const FACE_RECOGNITION_METHOD_SUBTITLE =
  'Industry-standard embedding pipeline used by Liparta gate attendance'

export type MethodSection = {
  heading: string
  body?: string
  bullets?: string[]
  steps?: Array<{ title: string; text: string }>
  rows?: Array<{ label: string; value: string }>
  quote?: string
}

export const FACE_RECOGNITION_METHOD_SECTIONS: MethodSection[] = [
  {
    heading: 'Recognition pattern',
    body:
      'Liparta’s gate camera uses the same biometric embedding approach found in modern commercial attendance terminals (FaceNet / ArcFace-class systems)—not generative AI “image guessing.”',
  },
  {
    heading: 'How identification works',
    steps: [
      {
        title: '1. Detect',
        text: 'Locate faces in the live camera frame (MediaPipe Face Detector).',
      },
      {
        title: '2. Align & embed',
        text: 'Convert each face into a fixed 128-dimensional FaceNet descriptor—a numeric biometric vector.',
      },
      {
        title: '3. Enroll (multi-sample)',
        text: 'Capture five short samples per person, average them into one stable template, and store it with a preview image.',
      },
      {
        title: '4. Identify (1:N)',
        text: 'Compare the live descriptor to the project gallery using Euclidean distance.',
      },
      {
        title: '5. Decide with dual gates',
        text: 'Accept only if distance is below a strict threshold (default 0.48) and the best match beats the second-best by an ambiguity margin (default 0.06). If two people look too similar, the system returns Unknown instead of risking a swap.',
      },
      {
        title: '6. Record transit',
        text: 'Only successful, non-ambiguous matches create an IN/OUT attendance event (with cooldown to avoid double punches).',
      },
    ],
  },
  {
    heading: 'Why this is professional',
    rows: [
      {
        label: 'Identity signal',
        value: 'Stable numeric embedding — not an LLM opinion on photos',
      },
      {
        label: 'Determinism',
        value: 'Same face maps into the same vector space every time',
      },
      {
        label: 'Lookalike control',
        value: 'Distance threshold + ambiguity margin (rejects risky swaps)',
      },
      {
        label: 'API dependency',
        value: 'Matching runs on the server; no OpenAI vision call for ID',
      },
      {
        label: 'Auditability',
        value: 'Distance and margin can be logged with each decision',
      },
    ],
  },
  {
    heading: 'Site operations',
    bullets: [
      'Re-enroll workers once after upgrading from photo-only records.',
      'During enrollment, face the camera and slightly turn left/right across the five samples.',
      'Good frontal lighting improves accuracy; hard backlight or heavy occlusion may reject matches by design.',
      'Privacy: a face template (vector) plus a cropped enrollment image are stored in private project storage; matching is 1:N within the project gallery only.',
    ],
  },
  {
    heading: 'Summary for stakeholders',
    quote:
      'Liparta gate attendance identifies people with a FaceNet biometric template, multi-sample enrollment, and open-set matching (threshold + ambiguity margin)—the same class of pattern used by commercial face attendance devices—rather than asking a language model to visually guess who is in the frame.',
  },
]
