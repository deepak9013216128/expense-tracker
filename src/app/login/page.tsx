import { LoginButton } from './LoginButton'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
      <div className="w-full max-w-[390px]">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 w-full border border-slate-100">
          {/* Logo mark */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200 mb-5 text-3xl">
              💸
            </div>
            <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-tight">
              Expense Tracker
            </h1>
            <p className="text-slate-500 mt-2 text-[15px] font-normal">
              Track every rupee, effortlessly.
            </p>
          </div>

          {/* Sign in button */}
          <LoginButton />

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-6 font-normal">
            Your data is private and secure.
          </p>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Built for mindful spending
        </p>
      </div>
    </div>
  )
}
