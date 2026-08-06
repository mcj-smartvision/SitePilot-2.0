/** Guided enrollment poses — commercial-style multi-angle capture. */

export type EnrollPoseId =
  | 'straight'
  | 'tilt_up'
  | 'tilt_down'
  | 'turn_right'
  | 'turn_left'
  | 'no_glasses'

export type EnrollPose = {
  id: EnrollPoseId
  labelFa: string
  labelEn: string
  hintFa: string
  hintEn: string
}

export const ENROLL_POSES: EnrollPose[] = [
  {
    id: 'straight',
    labelFa: 'مستقیم نگاه کن',
    labelEn: 'Look straight',
    hintFa: 'صورت را روبه‌روی دوربین نگه دار و پلک نزن',
    hintEn: 'Face the camera directly and hold still',
  },
  {
    id: 'tilt_up',
    labelFa: 'سر را کمی بالا ببر',
    labelEn: 'Tilt your head up',
    hintFa: 'چانه را کمی بالا بیاور — صورت در قاب بماند',
    hintEn: 'Raise your chin slightly — keep your face in frame',
  },
  {
    id: 'tilt_down',
    labelFa: 'سر را کمی پایین بیاور',
    labelEn: 'Tilt your head down',
    hintFa: 'سر را کمی پایین ببر — چشم‌ها به دوربین',
    hintEn: 'Lower your head slightly — eyes toward the camera',
  },
  {
    id: 'turn_right',
    labelFa: 'کمی به سمت راست بچرخ',
    labelEn: 'Turn slightly right',
    hintFa: 'صورت را کمی به راست بچرخان (حدود ۳۰ درجه)',
    hintEn: 'Turn your face slightly to the right (~30°)',
  },
  {
    id: 'turn_left',
    labelFa: 'کمی به سمت چپ بچرخ',
    labelEn: 'Turn slightly left',
    hintFa: 'صورت را کمی به چپ بچرخان (حدود ۳۰ درجه)',
    hintEn: 'Turn your face slightly to the left (~30°)',
  },
  {
    id: 'no_glasses',
    labelFa: 'بدون عینک — مستقیم نگاه کن',
    labelEn: 'No glasses — look straight',
    hintFa: 'اگر عینک داری دربیار؛ اگر عینک نداری همین‌طور مستقیم بمان',
    hintEn: 'Remove glasses if you wear them; if not, just hold a straight pose',
  },
]

export function poseLabel(poseId: string, fa = true): string {
  const pose = ENROLL_POSES.find((p) => p.id === poseId)
  if (!pose) return poseId
  return fa ? pose.labelFa : pose.labelEn
}
