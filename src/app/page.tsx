'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Logo } from '@/components/layout/logo'
import {
  BarChart3,
  Truck,
  ClipboardList,
  Calendar,
  ArrowRight,
  Play,
  CheckCircle2,
  Brain,
  TrendingUp,
  Zap,
  Shield,
  Globe,
  Lock,
  LineChart,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/takt-logo-blue.png"
              alt="Takt"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              Features
            </Link>
            <Link href="#benefits" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              Benefits
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              Pricing
            </Link>
            <Link href="#contact" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-700">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">Weekly Demand & Supply Planning</span>
            </div>

            <h1 className="mb-6 text-5xl font-bold leading-tight text-slate-900 lg:text-6xl">
              Balance Freight Demand and Supply Every Week
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-slate-600">
              Coordinate client demand forecasts with supplier commitments. Plan weekly truck capacity across routes, truck types, and ensure reliable freight delivery.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-8 font-semibold text-slate-900 transition-colors hover:bg-slate-50">
                <Play className="h-4 w-4" />
                Watch Demo
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
              <img
                src="/forklift-loading.jpg"
                alt="Forklift loading freight onto trucks at logistics facility"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-600">Forecast Accuracy</div>
                  <div className="text-2xl font-bold text-slate-900">94.5%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-3 gap-8 border-t border-slate-200 pt-12">
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-slate-900">3 Roles</div>
            <div className="text-sm text-slate-600">Demand, Supply & Admin</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-slate-900">Weekly</div>
            <div className="text-sm text-slate-600">Planning Cycles</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-slate-900">7 Days</div>
            <div className="text-sm text-slate-600">Daily Load Planning</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20 lg:py-28">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900">
              Streamline Your Weekly Planning Process
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Purpose-built tools for demand planners and supply planners to collaborate and balance capacity
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ClipboardList,
                color: 'bg-blue-100 text-blue-600',
                title: 'Demand Forecasting',
                description: 'Input weekly demand by client, route, and truck type. Plan daily load requirements across 7-day cycles.',
              },
              {
                icon: Truck,
                color: 'bg-purple-100 text-purple-600',
                title: 'Supply Commitment',
                description: 'Track supplier commitments by route and truck type. Match available capacity to forecasted demand.',
              },
              {
                icon: Calendar,
                color: 'bg-green-100 text-green-600',
                title: 'Weekly Planning Cycles',
                description: 'Organize planning in weekly windows (Sunday-Saturday). Lock completed weeks and focus on upcoming demand.',
              },
              {
                icon: Globe,
                color: 'bg-yellow-100 text-yellow-600',
                title: 'Multi-Route Management',
                description: 'Manage capacity across city pairs and regions. Handle domestic and ports verticals separately.',
              },
              {
                icon: BarChart3,
                color: 'bg-red-100 text-red-600',
                title: 'Demand vs Supply Analytics',
                description: 'Compare forecasted demand against committed supply. Identify gaps and overcapacity by route and day.',
              },
              {
                icon: TrendingUp,
                color: 'bg-indigo-100 text-indigo-600',
                title: 'Actuals Tracking',
                description: 'Integrate actual shipper requests and fleet completion data to improve future planning accuracy.',
              },
            ].map((feature, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-lg">
                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.color}`}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 lg:py-28">
        <div className="container mx-auto px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
              <img
                src="/benefits-image.jpg"
                alt="Supply chain operations and logistics management"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            <div>
              <h2 className="mb-6 text-4xl font-bold text-slate-900">
                Coordinate Demand and Supply Seamlessly
              </h2>
              <p className="mb-8 text-lg text-slate-600">
                Built for transportation companies that need to balance client demand with supplier capacity every week.
              </p>

              <div className="space-y-4">
                {[
                  'Centralize demand forecasts from all clients',
                  'Track supplier commitments in one place',
                  'Identify capacity gaps before they happen',
                  'Coordinate between demand and supply planners',
                  'Compare planned vs actual performance',
                  'Make data-driven capacity decisions',
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <button className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-8 font-semibold text-white transition-colors hover:bg-blue-700">
                See How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold">
            Ready to Streamline Your Weekly Planning?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Start coordinating demand and supply today. No credit card required.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-white/20 bg-white/10 px-8 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-8 text-sm text-blue-200">
            Join transportation companies balancing capacity and demand
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4">
                <Image
                  src="/takt-logo-white.png"
                  alt="Takt"
                  width={100}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-sm text-slate-400">
                Weekly demand and supply planning for transportation companies.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-blue-400">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="cursor-pointer transition-colors hover:text-white">Features</li>
                <li className="cursor-pointer transition-colors hover:text-white">Pricing</li>
                <li className="cursor-pointer transition-colors hover:text-white">Integrations</li>
                <li className="cursor-pointer transition-colors hover:text-white">API</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-blue-400">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="cursor-pointer transition-colors hover:text-white">About Us</li>
                <li className="cursor-pointer transition-colors hover:text-white">Careers</li>
                <li className="cursor-pointer transition-colors hover:text-white">Blog</li>
                <li className="cursor-pointer transition-colors hover:text-white">Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-blue-400">Contact</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>support@teamtakt.app</li>
                <li>+966 534035184</li>
                <li>Riyadh</li>
                <li>Saudi Arabia</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <div className="mb-4 flex justify-center gap-8">
              <Link href="#" className="transition-colors hover:text-white">Privacy Policy</Link>
              <Link href="#" className="transition-colors hover:text-white">Terms of Service</Link>
              <Link href="#" className="transition-colors hover:text-white">Cookie Policy</Link>
            </div>
            © {new Date().getFullYear()} Takt Planning. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
