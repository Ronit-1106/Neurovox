NeuroVox

Local AI-Assisted Facial Geometry Analysis and Protective Mask Size Recommendation

NeuroVox is a browser-based computer-vision and machine-learning
prototype that analyzes facial geometry from a camera feed and
recommends a protective mask size: Small, Medium, or Large.

The current application uses:

Next.js + React + TypeScript for the application and UI

MediaPipe Face Landmarker for local facial landmark detection

A 16-feature facial geometry vector for machine-learning input

A small MLP-style neural-network architecture with topology
16 → 128 → 64 → 32 → 3

ONNX as the deployment model format

ONNX Runtime Web for client-side inference

PostgreSQL + Drizzle ORM for stored scan records

A Python training/evaluation/export pipeline under ml/

Important: NeuroVox is an AI-assisted anthropometric sizing
prototype. It is not a medical device, clinical diagnostic system, or
guarantee of airtight protective-mask fit.

1. What NeuroVox Does

At the highest level:

Camera
   ↓
MediaPipe Face Landmarker
   ↓
Facial landmarks
   ↓
Face quality + head-pose checks
   ↓
Normalized facial geometry
   ↓
16-feature vector
   ↓
Local ONNX model
   ↓
Small / Medium / Large probabilities
   ↓
Multi-frame aggregation
   ↓
Final recommendation + confidence + scan quality

The important distinction is that NeuroVox has two different
technologies:

Computer vision

MediaPipe detects the face and provides facial landmarks.

Machine learning

The NeuroVox model receives numerical facial-geometric features and
predicts the mask-size class.

The ML model does not need the raw camera image.

2. Why Use Facial Geometry Instead of Raw Images?

A raw-image classifier would have to learn both:

Where the face is and what its geometry is.

How that geometry relates to mask size.

NeuroVox separates these tasks.

Raw camera image
       ↓
MediaPipe
       ↓
Structured facial landmarks
       ↓
Geometry
       ↓
ML classifier

Advantages:

Smaller model

Faster local inference

Easier debugging

Less sensitive to background

Less dependent on image appearance

Easier to explain during an engineering presentation

Better suited to privacy-preserving local processing

This is a geometry-classification problem, so a compact MLP is a
reasonable model choice.

3. Facial Landmark Detection

NeuroVox uses MediaPipe Face Landmarker.

The detector provides a dense facial landmark representation. NeuroVox
does not feed every landmark directly into the classifier.

Instead, selected landmarks are used to derive measurements and ratios.

Examples include:

jaw-side landmarks

cheek landmarks

forehead landmarks

chin landmark

facial-height anchors

nose landmarks

eye-region landmarks

The exact landmark indices are defined in:

lib/facial-features.ts
python_engine/feature_extractor.py

The TypeScript and Python feature definitions should remain
synchronized.

4. Eye-Region Calibration

The current implementation uses an eye-region reference distance to
normalize facial measurements.

The current reference scale is:

6.3 cm

This is an assumed population reference and is used to estimate physical
dimensions from camera geometry.

It is important to understand what this means.

NeuroVox is not currently measuring true pupil-to-pupil distance with
a physical ruler.

The current implementation uses eye-corner/eye-region landmarks as a
scale reference.

Therefore the correct terminology is:

Inter-eye reference distance

not:

Exact pupil distance

and not:

Clinically measured interpupillary distance

This calibration makes the geometry approximately scale-invariant, but
it does not eliminate camera perspective, pose, lens distortion, and
individual anatomical variation.

5. Feature Extraction

The current model receives exactly 16 features.

They are:

Index Feature

    0 `jaw_width_norm`
    1 `face_height_norm`
    2 `face_width_norm`
    3 `cheek_width_norm`
    4 `forehead_width_norm`
    5 `chin_length_norm`
    6 `nose_width_norm`
    7 `eye_region_width_norm`
    8 `inter_eye_ref_norm`
    9 `face_aspect_ratio`
   10 `jaw_to_face_width_ratio`
   11 `face_height_to_width_ratio`
   12 `chin_to_face_height_ratio`
   13 `head_yaw_deg`
   14 `head_pitch_deg`
   15 `head_roll_deg`

Most distance features are normalized against the inter-eye reference.

Ratios are additionally used to describe facial proportions.

6. Example Feature Calculation

Suppose the system measures:

jaw width in normalized coordinates = 1.83
face height in normalized coordinates = 1.76

The model does not simply use camera pixels.

It first calculates normalized relationships such as:

jaw width / inter-eye reference
face height / inter-eye reference
jaw width / face width
face height / face width

This reduces the effect of how close the user is to the camera.

7. Head Pose Validation

NeuroVox estimates:

Yaw

Pitch

Roll

These represent head rotation.

The current Python feature extractor uses approximately:

Maximum yaw   = ±12°
Maximum pitch = ±12°
Maximum roll  = ±12°

If the face is rotated too far, the frame is rejected from aggregation.

Example:

User turns head
       ↓
Yaw exceeds threshold
       ↓
Frame rejected
       ↓
UI asks user to face the camera

This is important because a rotated face can distort apparent 2D
distances.

Recommended future change

Head pose should primarily act as a quality gate, not as a predictor
of mask size.

The current 16-feature model includes yaw, pitch, and roll. Future model
versions should test whether these features actually improve
generalization. In many cases, it is better to use pose to reject bad
frames and keep pose angles out of the size classifier.

8. Multi-Frame Scanning

NeuroVox does not rely on a single frame.

During scanning, multiple valid frames are collected.

The system can calculate:

Mean

Median

Standard deviation

Coefficient of variation

Stability score

The purpose is to reduce noise.

For example:

Frame 1  → jaw = 12.61
Frame 2  → jaw = 12.68
Frame 3  → jaw = 12.59
...
Frame 30 → jaw = 12.64

The final measurement can use a robust statistic such as the median.

9. Scan Quality vs AI Confidence

These are different concepts.

Scan quality

Describes how reliable the scanning process was.

Examples:

Excellent
Good
Fair
Poor

It is based on factors such as landmark stability and accepted/rejected
frames.

AI confidence

Describes the model's output probability for the predicted class.

Example:

Small     0.04
Medium    0.91
Large     0.05

Prediction: Medium
AI confidence: 91%

A scan can have:

High AI confidence
+
Poor scan quality

and that should not automatically be considered a trustworthy result.

A future version should combine these concepts into an explicit
decision reliability score rather than pretending model probability
alone represents real-world accuracy.

10. Local AI Model

The production model is stored as an ONNX file.

Current topology:

16 input features
       ↓
Dense 128
ReLU
       ↓
Dense 64
ReLU
       ↓
Dense 32
ReLU
       ↓
Dense 3
       ↓
Softmax
       ↓
Small / Medium / Large

The output has three classes:

0 = Small
1 = Medium
2 = Large

11. ONNX Runtime Web

The production inference engine is:

ONNX Runtime Web

The browser loads the ONNX model locally.

Current inference candidates are:

/models/neurovox_mask_classifier.onnx
/model/mask_classifier.onnx
/neurovox_mask_classifier.onnx

The model is configured to use the WebAssembly execution provider.

This means the prediction can run on the user's machine without sending
the facial feature vector to a cloud AI API.

12. Production Inference Flow

The relevant implementation is:

lib/facial-features.ts
        ↓
featureVector[16]
        ↓
lib/model-runner.ts
        ↓
ONNX Runtime Web
        ↓
ONNX model
        ↓
probabilities
        ↓
predicted size

The production model runner explicitly rejects invalid feature vectors
that do not contain exactly 16 features.

There is no intended heuristic or simulated prediction fallback in the
current production runner.

13. Current Model Training Pipeline

The training code is located under:

ml/

Important files:

ml/dataset_loader.py
ml/train_and_export.py
ml/evaluate.py
ml/export_onnx.py
ml/seed_collected_participants.py

The intended flow is:

Participant records
       ↓
Dataset loader
       ↓
Participant-level split
       ↓
Feature standardization
       ↓
Model training
       ↓
Evaluation
       ↓
ONNX export
       ↓
Browser deployment

14. Dataset Collection

The application contains a dataset collection interface.

The collector stores:

Participant ID
Consent confirmation
Reference mask-size label
Measured jaw width
Measured face height
Frames
Feature vectors
Head pose
Estimated measurements
Collection timestamp

Data is written under:

ml/collected_dataset/

Each participant is stored separately.

Example:

ml/collected_dataset/
    PARTICIPANT_001.json
    PARTICIPANT_002.json
    ...
    index.json

15. Ground Truth

A machine-learning model needs ground truth.

For NeuroVox, the useful ground truth should come from:

A known reference mask size determined using a documented fitting
procedure.

Ideally, physical anthropometric measurements taken with a
calibrated instrument.

Examples:

Jaw width = 13.2 cm
Face height = 11.8 cm
Reference mask size = Medium

The camera measurement is the input.

The physical measurement/reference fit is the target.

16. IMPORTANT: Current Repository Dataset Limitation

The current repository contains a script:

ml/seed_collected_participants.py

that generates participant profiles using statistical/random formulas.

For example, it samples values around configured means for Small,
Medium, and Large participants and then derives facial features
mathematically.

Therefore the committed participant dataset should not be described as
a genuinely measured human dataset.

It is better described as:

Seeded/simulated anthropometric data for development and pipeline
testing.

The collector UI is capable of accepting real participant measurements,
but the committed seeded records are not equivalent to a real human
study.

This is the single biggest scientific limitation of the current model.

Do not advertise the current test accuracy as real-world facial-sizing
accuracy.

17. Current Dataset Size

The repository currently contains approximately:

85 participant JSON records

with approximately:

1020 stored frames

The class distribution is approximately:

Small   = 25 participants
Medium  = 35 participants
Large   = 25 participants

The repository also contains previously generated dataset partitions.

These partitions are not fully synchronized with the current participant
directory.

In particular, the stored test partition references a participant ID
that is not present in the current collected participant files.

Therefore the committed dataset metadata should be regenerated before
treating the repository as reproducible.

18. Participant-Level Train/Validation/Test Split

The intended split strategy is correct:

Train
Validation
Test

with participant-level isolation.

This is important.

If a participant has 12 frames, you must not put some of those frames
into training and the remaining frames into testing.

Bad:

Participant 001
    Frame 1–8 → training
    Frame 9–12 → testing

This causes identity leakage.

Better:

Participant 001 → training
Participant 002 → training
...
Participant 081 → validation
...
Participant 085 → test

The current dataset loader implements participant-level splitting.

19. Current Model Training Caveat

The current train_and_export.py deserves special attention.

Although the exported network has the topology:

16 → 128 → 64 → 32 → 3

the training implementation does not perform ordinary end-to-end
backpropagation through all layers of a deep MLP.

Instead, it trains a three-class linear classifier using SGD and then
embeds that learned linear behavior into the larger MLP-shaped ONNX
graph.

Therefore:

The current artifact has an MLP topology, but it should not be
presented as a conventionally trained deep neural network.

This should be fixed in the next ML revision.

20. Recommended Proper Training Method

The improved training implementation should use a real trainable neural
network.

Recommended options:

Option A: PyTorch

Dataset
 ↓
PyTorch Dataset/DataLoader
 ↓
MLP
 ↓
CrossEntropyLoss
 ↓
Adam optimizer
 ↓
Validation
 ↓
Early stopping
 ↓
Best checkpoint
 ↓
ONNX export

Option B: scikit-learn baseline

For this small structured dataset, first establish a strong baseline
using:

Logistic Regression

Random Forest

Gradient Boosting

SVM

Then compare the MLP against the baseline.

This is scientifically better than assuming the neural network is
automatically superior.

21. Recommended Future MLP

A reasonable first true MLP is:

Input: 16
       ↓
Linear(16, 128)
ReLU
Dropout(0.2)
       ↓
Linear(128, 64)
ReLU
Dropout(0.2)
       ↓
Linear(64, 32)
ReLU
       ↓
Linear(32, 3)

Training:

Loss:
CrossEntropyLoss

Optimizer:
Adam

Initial learning rate:
0.001

Batch size:
16 or 32

Epochs:
50–200

Early stopping:
Yes

Random seed:
fixed for reproducibility

These are starting values, not scientifically optimal constants.

Hyperparameters should be tuned using the validation set.

22. Feature Standardization

The training pipeline calculates:

feature mean
feature standard deviation

from the training set.

For every feature:

x_standardized =
    (x - training_mean)
    /
    training_std

The critical rule is:

Calculate scaling parameters using the training partition only.

Do not calculate means/stds using the test set.

Otherwise information from the test set leaks into the model pipeline.

The saved model metadata should include the exact scaler parameters used
by the deployed model.

23. ONNX Export

After proper model training:

PyTorch model
       ↓
torch.onnx.export()
       ↓
neurovox_mask_classifier.onnx

Then validate:

PyTorch prediction
        vs
ONNX Runtime prediction

They should agree within a small floating-point tolerance.

The repository currently contains the same ONNX binary at several
locations:

models/neurovox_mask_classifier.onnx
public/models/neurovox_mask_classifier.onnx
public/model/mask_classifier.onnx
public/neurovox_mask_classifier.onnx

This duplication is unnecessary.

A cleaner production layout is:

public/models/
    neurovox_mask_classifier.onnx
    model_metadata.json

Keep training artifacts outside the public directory unless they are
intentionally needed by the browser.

24. Running NeuroVox Locally

Requirements

Recommended:

Node.js 18+
Python 3.10–3.12
Git
A modern Chromium-based browser
Webcam

The project uses Bun lockfiles, so Bun is also appropriate.

Install Bun if desired, then use:

bun install

Alternatively use npm if the dependency lockfile is intentionally
regenerated for npm.

25. Local IDE Setup

VS Code is recommended.

Open the project root:

Neurovox-main/

Create a Python environment:

Windows PowerShell

python -m venv .venv
.\.venv\Scripts\Activate.ps1

Install the current training dependencies:

python -m pip install --upgrade pip
pip install numpy onnx onnxruntime

The current repository does not contain a requirements.txt.

For reproducible development, create one containing the exact Python
package versions used by the training environment.

26. Install JavaScript Dependencies

From the project root:

bun install

Then start the application:

bun run dev

Open:

http://localhost:3000

Allow webcam access when the browser asks.

27. Database Setup

The application can use PostgreSQL through:

DATABASE_URL

The database layer is implemented using:

Drizzle ORM
pg

The relevant files are:

src/db/index.ts
src/db/schema.ts
src/db/scans.ts
src/db/orders.ts

If you do not configure a database, parts of the application that depend
on persistent scan storage will not work.

Create an environment file such as:

.env.local

with the appropriate database connection string.

Do not commit secrets.

28. Training the Current Model

From the project root:

Windows PowerShell

.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
python -m ml.train_and_export

The pipeline will attempt to:

Load participant records.

Validate their feature vectors.

Split participants into train/validation/test.

Calculate training-set scaling parameters.

Train the current classifier.

Export ONNX.

Validate the ONNX model with ONNX Runtime.

Generate model metadata.

The model files are written to the configured model directories.

29. Training Through the Web Application

The application exposes:

POST /api/ml/train

which invokes:

python3 -m ml.train_and_export

This is convenient for a development dashboard.

However, this endpoint should be treated as an admin/development
operation, not a public user operation.

It should require authorization before deployment.

A public endpoint capable of launching model training can become a
denial-of-service or resource-exhaustion problem.

30. Collecting a New Real Participant

The intended procedure is:

1. Obtain informed consent.
2. Assign an anonymous participant ID.
3. Measure the participant physically using a calibrated procedure.
4. Determine the ground-truth mask size using a documented fitting protocol.
5. Run the camera scanner.
6. Capture multiple stable frames.
7. Save the participant record.
8. Repeat across participants.
9. Rebuild train/validation/test splits.
10. Train the model.
11. Evaluate on participants never seen during training.
12. Deploy the new ONNX model only after validation.

Do not manually guess a person's label just to create a training sample.

31. Recommended Dataset Size

The current dataset is too small to make strong claims about real-world
generalization.

A more useful target is:

Minimum prototype:
100–150 participants

Better:
300–500 participants

Strong experimental dataset:
500–1000+ participants

The exact requirement depends on:

population diversity

camera diversity

mask models

measurement protocol

class balance

feature dimensionality

intended deployment population

More participants are generally more valuable than simply collecting
many frames from the same participants.

32. Diversity Requirements

The dataset should cover variation in:

age groups

sex

facial morphology

face width

jaw shape

nose shape

facial proportions

skin tones

glasses/no glasses

facial hair/no facial hair

camera types

lighting

camera distance

head pose within accepted limits

Do not store identifiable information unless necessary.

Participant IDs should be pseudonymous.

33. Avoid Data Leakage

Do not use frames from the same participant across training and testing.

Also avoid leakage through:

duplicated samples

repeated scans

copied measurements

near-identical images

preprocessing performed using all datasets

normalization parameters calculated using test data

The test set should remain untouched until final evaluation.

34. Model Evaluation

The application reports:

Accuracy

Precision

Recall

F1 score

Confusion matrix

Per-class statistics

These are useful.

However, accuracy alone is not enough.

For mask sizing, pay particular attention to:

Small recall
Medium recall
Large recall

and the confusion matrix.

For example:

Actual Small → Predicted Medium
Actual Medium → Predicted Large

may have different practical implications than an isolated numerical
accuracy score.

35. Current Reported Model Result

The current model_metadata.json reports approximately:

Overall accuracy: 83.33%
Macro precision: 83.33%
Macro recall: 83.33%
Macro F1: 83.33%
Test samples: 144

The confusion matrix is:

             Predicted
             S     M     L

Actual S    24    12     0
Actual M    12    60     0
Actual L     0     0    36

However:

These numbers must not be interpreted as real-world accuracy.

The committed participant data is generated/seeded rather than a
verified human measurement study, and the repository contains
inconsistent stale dataset partitions.

Therefore the current result is best described as:

Development-pipeline benchmark on the currently stored dataset.

It is not a validated clinical or population-level accuracy result.

36. Major Current Problems

Problem 1: Synthetic/seeded participant data

ml/seed_collected_participants.py generates participant profiles
statistically.

Effect

The model may learn the artificial distributions rather than real facial
variation.

Fix

Collect real participants using a standardized protocol.

Problem 2: The MLP is not genuinely trained end-to-end

The current training code learns a linear classifier and embeds it into
an MLP-shaped graph.

Effect

The architecture looks deeper than the actual learning process.

Fix

Use genuine backpropagation through all trainable layers.

Problem 3: Dataset partitions are stale/inconsistent

The repository's stored split files do not perfectly match the current
participant directory.

Fix

Delete/rebuild:

ml/dataset/train.json
ml/dataset/val.json
ml/dataset/test.json

from the current participant records before training.

Problem 4: Multiple model copies

The ONNX model is duplicated in several locations.

Fix

Use one canonical browser model path.

Problem 5: Python dependencies are undocumented

There is no requirements.txt.

Fix

Create:

requirements.txt

with pinned versions.

Problem 6: Head pose is included in the size classifier

Yaw, pitch, and roll are among the 16 model features.

Risk

The model could learn camera/head-orientation artifacts instead of
facial geometry.

Fix

Use pose primarily as a frame-quality gate and test a model without pose
features.

Problem 7: Approximate physical calibration

The system assumes a reference eye-region distance of approximately 6.3
cm.

Risk

Actual scale can vary between individuals and camera conditions.

Fix

Use a controlled calibration procedure, a known-size reference, or a
validated depth/3D measurement method.

Problem 8: Current size labels are not necessarily equivalent to actual mask fit

A label of Small/Medium/Large must correspond to a documented physical
fitting protocol.

Fix

Define objective ground truth for each mask model.

Problem 9: Security still needs work

The scan API currently treats a bearer token as a UID string rather than
actually verifying a Firebase ID token.

Dataset collection and training routes also need proper administrative
authorization.

Fix

Use Firebase Admin token verification and enforce authorization on all
biometric and ML-management routes.

Problem 10: Training should not be publicly triggerable

Model training consumes CPU/memory and writes model artifacts.

Fix

Restrict training to an authenticated administrator/developer role.

37. Privacy Requirements

Facial biometric information is sensitive.

Recommended principles:

Process the camera feed locally.

Do not upload raw camera frames unless explicitly required.

Store only the minimum data required.

Use pseudonymous participant IDs.

Obtain informed consent for dataset collection.

Separate research/training data from normal user scans.

Restrict dataset access.

Encrypt data at rest where appropriate.

Use authentication and authorization.

Delete expired biometric records.

Keep a documented retention policy.

Do not put real participant biometric datasets into a public Git
repository.

The current repository contains participant JSON files and should
therefore be treated as a development/research repository, not a clean
public biometric-data repository.

38. Retention

Normal scan records contain:

biometric measurements
model output
probabilities
head pose
stability metrics
normalized features

The database assigns a 30-day expiration timestamp.

The repository also contains:

POST /api/scans/cleanup

which can physically delete expired records.

This is better than merely hiding expired rows.

However, the cleanup endpoint itself must be protected before production
deployment.

39. Recommended Production Architecture

                       NEUROVOX
                           │
                       Camera
                           │
                           ▼
                MediaPipe Face Landmarker
                           │
                           ▼
                  Face Quality Gate
              ┌────────────┼────────────┐
              │            │            │
           Position      Pose       Stability
              │            │            │
              └────────────┼────────────┘
                           ▼
                  Landmark Normalization
                           │
                           ▼
                   Feature Extraction
                           │
                           ▼
                    16-D Feature Vector
                           │
                           ▼
                Local ONNX Runtime Web
                           │
                           ▼
                  NeuroVox ML Classifier
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                 Size         Probability
                    │             │
                    └──────┬──────┘
                           ▼
                  Multi-frame aggregation
                           │
                           ▼
                 Final recommendation
                           │
                           ▼
                   Optional secure API
                           │
                           ▼
                     PostgreSQL

40. Recommended ML Research Architecture

For a stronger academic version:

Facial landmarks
      ↓
Normalization
      ↓
Feature engineering
      ↓
        ┌────────────────────┐
        │ Shared MLP          │
        └─────────┬──────────┘
                  │
          ┌───────┴────────┐
          ▼                ▼
Measurement Head       Size Head
          │                │
          ▼                ▼
Jaw width            Small/Medium/Large
Face height
Face width

This becomes a multi-task model.

The model learns both:

continuous anthropometric measurements

and:

mask-size classification

This is a more interesting research direction than classification alone.

41. Future Improvements

Short term

Replace seeded participant records with real measurements.

Properly train the complete MLP.

Rebuild dataset partitions.

Add requirements.txt.

Remove duplicate model artifacts.

Remove head pose from classifier input after experimentation.

Add stronger input validation.

Protect ML administration routes.

Verify Firebase tokens properly.

Medium term

Increase participant count.

Improve physical calibration.

Add more facial features.

Compare MLP against Random Forest, SVM, Logistic Regression, and
Gradient Boosting.

Perform cross-validation.

Calibrate model probabilities.

Add model versioning.

Add automated regression tests.

Add ONNX-vs-training-runtime numerical equivalence tests.

Long term

Use actual 3D facial geometry.

Investigate depth cameras or structured-light calibration.

Predict continuous facial dimensions.

Model individual mask geometries rather than only S/M/L labels.

Predict fit scores.

Incorporate mask seal geometry.

Validate against actual fit-testing procedures.

Evaluate across different camera devices and environments.

Establish statistically meaningful confidence intervals.

42. Recommended Model Versioning

Every deployed model should have metadata:

{
  "model_version": "v3.0.0",
  "training_dataset_version": "dataset-2026-09-01",
  "feature_schema_version": "features-v2",
  "architecture": "16-128-64-32-3",
  "training_participants": 350,
  "validation_participants": 75,
  "test_participants": 75,
  "test_accuracy": 0.84
}

Never overwrite a model without recording which dataset and feature
schema produced it.

43. Local Development Checklist

[ ] Install Node/Bun
[ ] Install Python
[ ] Create Python virtual environment
[ ] Install Python dependencies
[ ] Install JavaScript dependencies
[ ] Configure DATABASE_URL if persistence is needed
[ ] Start Next.js
[ ] Allow webcam access
[ ] Test MediaPipe
[ ] Test feature extraction
[ ] Test ONNX loading
[ ] Test local prediction
[ ] Test multi-frame scan
[ ] Test database save
[ ] Test database retrieval
[ ] Test cleanup

44. Local Training Checklist

[ ] Collect real participant data
[ ] Obtain consent
[ ] Record ground-truth measurements
[ ] Record ground-truth mask size
[ ] Validate feature vectors
[ ] Remove corrupted samples
[ ] Split by participant
[ ] Fit scaler on training data only
[ ] Train model
[ ] Validate model
[ ] Test model once
[ ] Calculate confusion matrix
[ ] Compare against baseline models
[ ] Export ONNX
[ ] Compare ONNX vs training runtime
[ ] Update metadata
[ ] Deploy model

45. What NeuroVox Should Claim

A technically accurate description is:

NeuroVox is a local AI-assisted facial geometry analysis system that
uses MediaPipe facial landmarks and a lightweight ONNX
machine-learning classifier to recommend a protective mask size from
Small, Medium, and Large categories.

It can also say:

Facial analysis and inference are performed locally in the browser
using MediaPipe and ONNX Runtime Web.

It should not claim:

Guaranteed airtight fit

Exact physical measurements

Medical-grade accuracy

Clinical validation

100% accuracy

Population-level accuracy from the current seeded dataset

46. Final Technical Review

Overall assessment

Architecture: Good

Computer vision pipeline: Good prototype

Local inference concept: Strong

Feature engineering: Reasonable

Multi-frame stability: Good

Dataset collection interface: Useful

Participant-level split: Correct concept

ONNX deployment: Correct direction

ML training methodology: Needs significant improvement

Training dataset validity: Major limitation

Security: Needs hardening

Scientific validation: Not yet sufficient

Overall project status

Strong engineering prototype, but not yet a scientifically validated
facial-sizing AI system.

The biggest improvement is not another UI feature.

It is:

REAL PARTICIPANTS
      ↓
VALIDATED GROUND TRUTH
      ↓
PROPER ML TRAINING
      ↓
UNSEEN PARTICIPANT TESTING
      ↓
ONNX DEPLOYMENT

Once that pipeline is genuinely implemented, the model's accuracy
becomes meaningful.

47. Suggested Project Structure

Neurovox-main/
│
├── app/
│   ├── api/
│   │   ├── ml/
│   │   ├── scans/
│   │   └── orders/
│   └── page.tsx
│
├── components/
│   ├── face-scanner.tsx
│   ├── dataset-collector-modal.tsx
│   └── model-evaluation-modal.tsx
│
├── lib/
│   ├── facial-features.ts
│   ├── model-runner.ts
│   ├── mask-fit.ts
│   └── storage.ts
│
├── ml/
│   ├── collected_dataset/
│   ├── dataset/
│   ├── dataset_loader.py
│   ├── train_and_export.py
│   ├── evaluate.py
│   └── export_onnx.py
│
├── models/
│   └── model_metadata.json
│
├── public/
│   └── models/
│       ├── neurovox_mask_classifier.onnx
│       └── model_metadata.json
│
├── python_engine/
│   ├── feature_extractor.py
│   ├── biometrics.py
│   └── inference.py
│
├── src/
│   └── db/
│
├── package.json
├── requirements.txt       # recommended addition
├── .env.local             # local only
└── README.md

48. Viva / Presentation Explanation

A concise technical explanation is:

NeuroVox uses MediaPipe Face Landmarker to obtain facial landmarks
from a live camera feed. Selected landmarks are converted into
normalized geometric features such as jaw width, face height, face
width, facial ratios, and eye-region reference measurements. Multiple
valid frames are analyzed to reduce noise, while head pose and
landmark stability are used to reject unreliable frames. The resulting
16-dimensional feature vector is passed to a lightweight local ONNX
model running through ONNX Runtime Web. The model produces
probabilities for Small, Medium, and Large mask classes. The final
recommendation is aggregated across multiple frames, while scan
quality is reported separately from model confidence.

For a stronger future version:

The model is trained on participant-level separated real
anthropometric data with measured ground truth, evaluated on unseen
participants, exported to ONNX, and executed locally in the browser
for privacy-preserving inference.

49. Bottom Line

NeuroVox already has the right broad architecture for a local AI sizing
prototype:

MediaPipe
+
Feature Engineering
+
Local ONNX
+
Multi-frame Analysis

The major work remaining is scientific rather than cosmetic:

Replace simulated data
        ↓
Collect real labeled participants
        ↓
Train a genuine end-to-end model
        ↓
Evaluate properly
        ↓
Validate on unseen people
        ↓
Deploy the validated ONNX model

That is the point at which NeuroVox stops being merely an impressive
demo and becomes a defensible machine-learning engineering project.
