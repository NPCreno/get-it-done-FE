# Get It Done

A modern productivity and task management web application built with Next.js and TypeScript. Get It Done helps users organize projects, create and manage tasks, track progress, and boost productivity through a clean, interactive dashboard.

## Features
- **User Authentication:** Secure login, signup, and password recovery.
- **Dashboard:** Visual stats, charts, and recent activity for tasks and projects.
- **Project & Task Management:** Create, view, and manage projects and tasks with priorities, due dates, and statuses.
- **Productivity Tools:** Pomodoro timer, productivity streaks, and analytics.
- **Responsive UI:** Modern design using Tailwind CSS and Radix UI components.

## Technologies Used
- **Framework:** Next.js (React 18, App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, tailwindcss-animate
- **UI Libraries:** Radix UI, Lucide React, React Icons
- **Forms & Validation:** Formik, React Hook Form, Yup, Zod
- **Date Handling:** date-fns, react-day-picker
- **Backend Integration:** Get It Done backend API (authentication and data)
- **State/Context:** React Context API

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, pnpm, or bun (choose one)

### Installation
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd get-it-done-fe
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```
3. **Set up environment variables:**
   - Create a `.env.local` file in the root directory.
   - Add the following (replace with your actual values):
     ```env
     NEXT_PUBLIC_API_URL=<your-backend-api-url>
     # Add any other required environment variables here
     ```

### Running the Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Scripts
- `dev` - Start the development server
- `build` - Build for production
- `start` - Start the production server
- `lint` - Run ESLint

## Folder Structure
- `src/app/` - Main application code (pages, components, modals, interfaces, etc.)
- `src/app/components/` - UI components
- `src/app/modals/` - Modal dialogs for tasks and projects
- `src/app/interface/` - TypeScript interfaces and types

## License
MIT (or your chosen license)

---
Feel free to contribute or open issues for suggestions and improvements!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
