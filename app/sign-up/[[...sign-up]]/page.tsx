import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-canvas via-surface to-purple-soft px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple to-blue text-white text-lg font-bold shadow-md">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Join Momentum
          </h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Create your producer account
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-xl border border-line",
            },
          }}
        />
      </div>
    </div>
  );
}
