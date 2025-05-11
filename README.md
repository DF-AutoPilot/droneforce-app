# DroneForce Protocol App

A frontend-only Next.js application for the DroneForce Protocol on Solana, enabling decentralized drone task management. This application allows users to create, accept, and complete drone tasks using Solana smart contracts while storing task metadata and logs in Firebase.

## Features

- 100% frontend-only application (no backend/server code)
- Solana wallet integration using Phantom wallet
- Solana smart contract interaction (devnet)
- Firebase Firestore for task metadata storage
- Firebase Storage for log file storage (.bin)
- Role-based UI determined by wallet address
- Responsive design with Tailwind CSS and shadcn/ui

## Prerequisites

- Node.js 18+ and npm
- Phantom wallet or compatible Solana wallet extension
- Firebase project with Firestore and Storage enabled
- Solana program deployed to devnet

## Getting Started

### Environment Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SOLANA_PROGRAM_ID=your_program_id
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_VALIDATOR_PUBKEY=your_validator_pubkey
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application

### Wallet Connection

You must connect your Phantom wallet or another compatible Solana wallet before you can interact with the application. The wallet connection is required for:

- Authentication and identity
- Determining your role within the application (creator, operator, or viewer)
- Signing and sending transactions to the Solana blockchain

## Smart Contract Interaction

This frontend application interacts with a Solana smart contract that should already be deployed to the Solana devnet. The contract supports the following functions:

1. **create_task**: Creates a new drone task with specified parameters
   - Parameters: task_id, validator_pubkey, location, area_size, altitude, duration, geofencing_enabled, description

2. **accept_task**: Allows a drone operator to accept an available task
   - Parameters: task_id

3. **complete_task**: Marks a task as completed by the drone operator
   - Parameters: task_id, arweave_tx_id, log_hash, signature

4. **record_verification**: Records the verification result of a completed task
   - Parameters: task_id, verification_result, verification_report_hash

## App Structure

- **Wallet Connection Screen**: Forces users to connect their wallet before accessing the app
- **Dashboard**: Shows the task creation form and a summary of tasks
- **Task List**: Displays all tasks with filtering by created, operated, and other tasks
- **Task Detail**: Shows complete task information with role-specific actions

## Firebase Integration

The app uses Firebase for storing task metadata and log files:

- **Firestore**: Stores task data under `/tasks/{taskId}`
- **Storage**: Stores binary log files under `/logs/{taskId}.bin`

## Deployment

### Deploy on Vercel

The easiest way to deploy this application is to use Vercel:

1. Push your code to a GitHub, GitLab, or Bitbucket repository
2. Import the project in the [Vercel dashboard](https://vercel.com/new)
3. Add the environment variables in the Vercel project settings
4. Deploy the application

```bash
# Or use the Vercel CLI for deployment
npm install -g vercel
vercel
```

This application is designed to be deployed as a static site with no server-side components.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
