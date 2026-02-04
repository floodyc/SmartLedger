import Link from "next/link"
import {
  Wallet,
  Upload,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle,
  FileText,
  PieChart,
  TrendingUp,
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartLedger</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              Track Your Finances
              <br />
              <span className="text-emerald-600">The Simple Way</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              No complicated setups. No bank connections. Just upload your statements and let SmartLedger do the rest. See where your money goes in seconds.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 px-8 py-3 text-base font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Start Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything You Need, Nothing You Don&apos;t
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Built for people who want clarity, not complexity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4">
                <Upload className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Any Document
              </h3>
              <p className="text-gray-600">
                Bank statements, receipts, invoices - just drag and drop PDFs, Excel, or Word files
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
                <BarChart3 className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Smart Analysis
              </h3>
              <p className="text-gray-600">
                Six powerful analysis tools to understand your spending, track savings, and find recurring costs
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-4">
                <Shield className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                100% Secure
              </h3>
              <p className="text-gray-600">
                No bank connections needed. Your data stays private and secure, always
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Create Your Account
              </h3>
              <p className="text-gray-600">
                Quick sign up - just email and password. No credit card required.
              </p>
            </div>

            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Your Documents
              </h3>
              <p className="text-gray-600">
                Drag and drop bank statements, receipts, or any financial documents.
              </p>
            </div>

            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Get Insights Instantly
              </h3>
              <p className="text-gray-600">
                See your spending breakdown, track trends, and discover savings opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Six Powerful Analysis Tools
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to understand your finances
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: TrendingUp, title: "Cash Flow", desc: "See income vs expenses over time" },
              { icon: PieChart, title: "Spending Categories", desc: "Understand where your money goes" },
              { icon: CheckCircle, title: "Budget Tracking", desc: "Compare planned vs actual spending" },
              { icon: BarChart3, title: "Net Worth", desc: "Track your wealth over time" },
              { icon: FileText, title: "Recurring Expenses", desc: "Find subscriptions and regular costs" },
              { icon: Wallet, title: "Savings Goals", desc: "Monitor progress toward your goals" },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all">
                <feature.icon className="h-8 w-8 text-emerald-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-emerald-100 text-lg mb-8">
            Join thousands of people who trust SmartLedger to manage their money.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 text-base font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 sm:mb-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">SmartLedger</span>
            </div>
            <p className="text-gray-400 text-sm">
              Simple finance tracking for everyone
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
