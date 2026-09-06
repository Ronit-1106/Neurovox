# NeuroVox 🧠

### AI-Assisted Facial Biometric Mask Sizing & E-Commerce Platform

**NeuroVox** is a computer-vision-powered web application that uses facial measurements to recommend an appropriate mask size and provides an integrated mask selection and ordering workflow.

The system combines **real-time face landmark detection, biometric measurement extraction, rule-based sizing, authentication, database persistence, and an e-commerce interface** into a single application.

> **Live Application:** [neurovox.ai.studio](https://neurovox.ai.studio)

---

## 🚀 Features

### 📷 Facial Biometric Scanning

* Real-time face detection using **MediaPipe Tasks Vision**
* Facial landmark extraction through the user's camera
* Measurement of facial dimensions such as:

  * Jaw width
  * Face height
  * Facial ratio
* Scan alignment and progress feedback
* Demo/simulation mode for testing without a webcam

### 📏 Intelligent Mask Size Recommendation

The extracted facial measurements are processed by the biometric engine to recommend:

* **Small**
* **Medium**
* **Large**

The current sizing engine uses a weighted anthropometric scoring approach based on facial measurements and calibrated thresholds.

> **Note:** The current implementation is a computer-vision + rule-based classification system rather than a trained machine-learning model.

### 🛍️ Mask Store & Ordering

* Mask style selection
* Color selection
* Recommended size integration
* Quantity selection
* Shopping/order workflow
* Order confirmation and order history

### 🔐 Authentication

* Firebase Authentication
* User-specific data association
* Firebase Admin integration for server-side authentication

### 🗄️ Database

* PostgreSQL database
* Drizzle ORM
* Persistent storage of:

  * User profiles
  * Facial scan measurements
  * Size recommendations
  * Orders

### 🔒 Biometric Data Considerations

* Facial scan records include an expiration timestamp
* The application is designed around limited retention of biometric scan information
* Scan data is stored separately from general order information

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │       User          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Next.js Web App  │
                         │  React + TypeScript  │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
          ┌──────────────────┐            ┌──────────────────┐
          │ MediaPipe Vision │            │ Firebase Auth    │
          │ Face Landmarks   │            │ Authentication   │
          └────────┬─────────┘            └────────┬─────────┘
                   │                               │
                   ▼                               │
          ┌──────────────────┐                     │
          │ Facial           │                     │
          │ Measurements     │                     │
          └────────┬─────────┘                     │
                   │                               │
                   ▼                               │
          ┌──────────────────┐                     │
          │ Python Biometric │                     │
          │ Engine           │                     │
          └────────┬─────────┘                     │
                   │                               │
                   ▼                               │
          ┌──────────────────┐                     │
          │ Size             │                     │
          │ Recommendation   │                     │
          └────────┬─────────┘                     │
                   │                               │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │ PostgreSQL +        │
                         │ Drizzle ORM         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Orders & Scan Data  │
                         └─────────────────────┘
```

---

# 🧰 Technology Stack

## Frontend

| Technology       | Purpose                    |
| ---------------- | -------------------------- |
| **Next.js**      | Full-stack React framework |
| **React**        | User interface             |
| **TypeScript**   | Type-safe development      |
| **Tailwind CSS** | Styling                    |
| **Motion**       | UI animations              |
| **Lucide**       | Icons                      |

## Computer Vision

| Technology                 | Purpose                             |
| -------------------------- | ----------------------------------- |
| **MediaPipe Tasks Vision** | Face detection and facial landmarks |
| **Canvas API**             | Camera/image processing             |
| **Python**                 | Biometric processing engine         |

## Backend & Data

| Technology                  | Purpose                                 |
| --------------------------- | --------------------------------------- |
| **Next.js API Routes**      | Backend APIs                            |
| **PostgreSQL**              | Relational database                     |
| **Drizzle ORM**             | Database access and schema management   |
| **Firebase Authentication** | User authentication                     |
| **Firebase Admin SDK**      | Server-side authentication verification |

---

# 📂 Project Structure

```text
Neurovox/
│
├── app/
│   ├── api/
│   │   └── orders/
│   ├── ...
│   └── page.tsx
│
├── components/
│   ├── face-scanner.tsx
│   ├── home-view.tsx
│   └── ...
│
├── lib/
│   ├── firebase.ts
│   ├── firebase-admin.ts
│   └── ...
│
├── src/
│   └── db/
│       ├── schema.ts
│       └── ...
│
├── python_engine/
│   ├── biometrics.py
│   └── orders.py
│
├── python_mysql_app/
│   └── ...
│
├── public/
│
├── package.json
├── drizzle.config.ts
├── Dockerfile
└── README.md
```

---

# 🔬 How the Biometric Sizing Works

The facial scanner first detects facial landmarks using MediaPipe.

Relevant facial dimensions are then extracted and passed to the biometric processing layer.

The current sizing algorithm uses a weighted score based on facial measurements:

```text
Composite Score =
    (Jaw Width × 0.55) +
    (Face Height × 0.45)
```

The resulting score is evaluated against calibrated thresholds to classify the user into a mask size:

```text
Facial Measurements
        │
        ▼
  Feature Extraction
        │
        ▼
 Weighted Biometric Score
        │
        ▼
 ┌──────┼───────┐
 ▼      ▼       ▼
Small  Medium  Large
```

This architecture is intentionally modular so that the rule-based classifier can later be replaced or supplemented with a trained machine-learning model.

---

# 🧪 Demo Mode

NeuroVox includes a simulation mode that can generate representative biometric measurements for different face-size categories.

This allows the application to be demonstrated when:

* A webcam is unavailable
* Camera permissions are blocked
* Lighting conditions are unsuitable
* Internet/device restrictions prevent live scanning

The demo mode is intended for **testing and presentation purposes**.

---

# 🗃️ Database Design

The application primarily uses PostgreSQL with Drizzle ORM.

### Users

Stores application user information and authentication identifiers.

### Face Scans

Stores biometric scan results including:

* Facial measurements
* Recommended mask size
* Facial ratio
* Scan confidence/fit information
* Selected mask style
* Scan timestamp
* Expiration timestamp

### Orders

Stores:

* Order number
* Customer information
* Mask style
* Mask color
* Mask size
* Quantity
* Total amount
* Shipping information
* Payment method
* Order status
* Creation timestamp

---

# 🔐 Security & Privacy

NeuroVox handles biometric measurements, so privacy is an important consideration in the system design.

Current security-related features include:

* Firebase-based authentication
* Server-side Firebase Admin SDK
* User-associated scan and order records
* Expiration timestamps for biometric scan records
* Separation of biometric scan information from order records

### Important

The current project is primarily a **prototype/academic implementation**. It should undergo additional security hardening before being used for production biometric processing or real financial transactions.

---

# 💳 Ordering & Payment

NeuroVox includes an end-to-end checkout and order-management workflow.

The current implementation focuses on:

```text
Mask Selection
      ↓
Size Recommendation
      ↓
Customer Details
      ↓
Order Creation
      ↓
Order Confirmation
```

Payment processing is currently implemented as a **prototype workflow** rather than a production payment-gateway integration.

A future production implementation could integrate services such as Razorpay or Stripe.

---

# 🛠️ Installation

## Prerequisites

Make sure the following are installed:

* Node.js
* npm / pnpm / yarn
* PostgreSQL
* Firebase project

Python is also required if you intend to run the biometric processing components locally.

---

## Clone the Repository

```bash
git clone https://github.com/Ronit-1106/Neurovox.git
cd Neurovox
```

---

## Install Dependencies

```bash
npm install
```

---

## Environment Variables

Create a `.env.local` file and configure the required Firebase and PostgreSQL credentials.

Example:

```env
DATABASE_URL=your_postgresql_connection_string

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

> Never commit real credentials, Firebase service-account keys, database passwords, or API secrets to GitHub.

---

## Run the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🧪 Development

Useful commands:

```bash
npm run dev
```

Start the development server.

```bash
npm run build
```

Create a production build.

```bash
npm run start
```

Start the production server.

```bash
npm run lint
```

Run linting checks.

---

# 🐳 Docker

The repository also contains a `Dockerfile` for containerized deployment.

A typical workflow is:

```bash
docker build -t neurovox .
docker run -p 3000:3000 neurovox
```

Additional environment configuration may be required depending on the deployment environment.

---

# 📈 Future Improvements

Planned or possible improvements include:

* [ ] Train and validate an ML-based mask-sizing model
* [ ] Build a real biometric calibration pipeline
* [ ] Derive confidence scores from model uncertainty
* [ ] Add automated biometric-data deletion after retention expiry
* [ ] Strengthen API authorization
* [ ] Add comprehensive unit and integration tests
* [ ] Integrate a production payment gateway
* [ ] Improve accessibility
* [ ] Add analytics and monitoring
* [ ] Improve component modularity
* [ ] Add automated CI/CD testing
* [ ] Expand mask-size datasets for different populations
* [ ] Add model evaluation metrics and benchmarking

---

# 🎯 Project Objective

The primary objective of NeuroVox is to demonstrate how **computer vision and biometric measurements can be integrated into a practical consumer application**.

Rather than requiring users to manually determine their mask size, NeuroVox attempts to automate the sizing process through facial measurement and provide the recommendation directly inside an e-commerce workflow.

---

# ⚠️ Disclaimer

NeuroVox is a **prototype/academic engineering project**.

The biometric sizing system should not be considered a medical device, diagnostic system, or clinically validated measurement system.

Facial measurements and mask recommendations may vary depending on camera quality, lighting, face orientation, device hardware, and other environmental factors.

---

# 👨‍💻 Author

Neuronox Team 

---

# 📄 License

This project does not currently specify an open-source license.

If you intend to allow others to use, modify, and distribute the project, add an appropriate license such as MIT before presenting it as an open-source project.
