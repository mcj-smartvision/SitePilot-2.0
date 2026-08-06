# Liparta Gate Face Identification — Technical Brief

**Product:** Liparta (Control Readiness & Site Operations)  
**Feature:** Biometric gate attendance (camera-based IN/OUT)  
**Audience:** Client / project stakeholders (Canada)

---

## Recognition Pattern (Industry Standard)

Liparta’s gate camera uses the same **biometric embedding pipeline** found in modern attendance terminals (e.g. FaceNet / ArcFace-class systems), not generative AI “image guessing.”

### Pipeline

1. **Detect** — locate faces in the live camera frame (MediaPipe Face Detector).
2. **Align & embed** — convert each face into a fixed **128-dimensional FaceNet descriptor** (numeric biometric vector).
3. **Enroll (multi-sample)** — capture **5 short samples** per person, average them into one stable template, and store the template securely with a preview image.
4. **Identify (1:N)** — compare the live descriptor to the project gallery using **Euclidean distance**.
5. **Decide with dual gates**
   - **Absolute threshold:** distance must be below a strict cutoff (default **0.48**).
   - **Ambiguity margin:** the best match must beat the second-best by a minimum margin (default **0.06**).  
     If two enrolled people look too similar under current lighting/angle, the system returns **Unknown** instead of risking a swap.
6. **Record transit** — only successful, non-ambiguous matches create an IN/OUT attendance event (with cooldown to avoid double punches).

### Why this is professional

| Approach | Liparta biometric gate | LLM vision compare (old) |
|----------|------------------------|---------------------------|
| Identity signal | Stable numeric embedding | Model “opinion” on photos |
| Determinism | Same face → same vector space | Non-deterministic |
| Lookalike control | Distance + ambiguity margin | Weak / inconsistent |
| Offline / API dependency | Matching on server, no OpenAI for ID | Requires vision API keys |
| Auditability | Distance / margin logged | Soft confidence only |

### Operational notes for site use

- Re-enroll workers once after this upgrade (old photo-only records have no embedding).
- During enrollment, the person should face the camera and slightly turn left/right across the 5 samples.
- Good frontal lighting improves accuracy; hard backlight or heavy occlusion can reject matches (by design).
- Privacy: the system stores a face template (vector) plus a cropped enrollment image in private project storage; matching runs as 1:N against the project gallery only.

### Summary for stakeholders

> Liparta gate attendance identifies people with a **FaceNet biometric template**, multi-sample enrollment, and **open-set matching** (threshold + ambiguity margin)—the same class of pattern used by commercial face attendance devices—rather than asking a language model to visually guess who is in the frame.
