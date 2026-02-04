'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ContactForm } from '@/components/contact-form'
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
  Globe,
  Mail,
  Phone,
  MapPin,
  Lightbulb,
  ClipboardCheck,
  Send,
  Target,
  Zap,
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
              <Lightbulb className="h-4 w-4" />
              <span className="text-sm font-medium">Intelligence-Powered Planning</span>
            </div>

            <h1 className="mb-6 text-5xl font-bold leading-tight text-slate-900 lg:text-6xl">
              Plan Smarter with Real-Time Supply & Demand Intelligence
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-slate-600">
              Coordinate demand forecasts with supplier commitments. Visualize gaps, optimize coverage, and collaborate seamlessly with 8 powerful analytics charts and automated insights.
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
            <div className="mb-2 text-4xl font-bold text-slate-900">8 Charts</div>
            <div className="text-sm text-slate-600">Real-Time Analytics & Insights</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-slate-900">94.5%</div>
            <div className="text-sm text-slate-600">Average Coverage Rate</div>
          </div>
          <div className="text-center">
            <div className="mb-2 text-4xl font-bold text-slate-900">7 Days</div>
            <div className="text-sm text-slate-600">Weekly Planning Horizon</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20 lg:py-28">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900">
              Everything You Need to Master Supply & Demand
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              From intelligent forecasting to supplier collaboration, gain complete visibility and control over your weekly planning
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Lightbulb,
                color: 'bg-amber-100 text-amber-600',
                title: 'Intelligence Dashboard',
                description: '8 powerful analytics charts with automated insights. Track demand vs supply, coverage gaps, vendor contribution, and capacity utilization in real-time.',
              },
              {
                icon: ClipboardList,
                color: 'bg-blue-100 text-blue-600',
                title: 'Demand Planning',
                description: 'Multi-week forecasting with route-level precision. Plan daily load requirements across 7-day cycles by client, route, and truck type.',
              },
              {
                icon: Truck,
                color: 'bg-green-100 text-green-600',
                title: 'Supply Management',
                description: 'Track supplier commitments by route and day. Match available capacity to forecasted demand with gap analysis and coverage metrics.',
              },
              {
                icon: Send,
                color: 'bg-purple-100 text-purple-600',
                title: 'Supplier Collaboration',
                description: 'Share weekly plans directly with suppliers. Enable seamless communication and commitment tracking with your supply partners.',
              },
              {
                icon: ClipboardCheck,
                color: 'bg-teal-100 text-teal-600',
                title: 'Dispatch Sheet',
                description: 'Daily execution view for operations teams. Track actual pickups and deliveries against planned commitments.',
              },
              {
                icon: Target,
                color: 'bg-red-100 text-red-600',
                title: 'Performance Reports',
                description: 'Forecast accuracy tracking and vendor performance analytics. Make data-driven decisions to continuously improve planning.',
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

      {/* Intelligence Showcase */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-20 text-white lg:py-28">
        <div className="container mx-auto px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-amber-300">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">New Feature</span>
              </div>

              <h2 className="mb-6 text-4xl font-bold">
                Intelligence That Drives Better Decisions
              </h2>
              <p className="mb-8 text-lg text-slate-300">
                Our Intelligence dashboard gives you instant visibility into your supply-demand balance with 8 comprehensive analytics charts and automated insights.
              </p>

              <div className="space-y-4">
                {[
                  { icon: TrendingUp, text: 'Real-time demand vs committed tracking across all routes' },
                  { icon: BarChart3, text: 'Visual gap heatmaps to identify coverage issues instantly' },
                  { icon: Target, text: 'Vendor contribution analysis and concentration risk alerts' },
                  { icon: Lightbulb, text: 'Smart insights that highlight top gaps and opportunities' },
                  { icon: Calendar, text: 'Coverage analysis by planning horizon and lead time' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                      <item.icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Explore Intelligence
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl bg-slate-700/50 p-6 shadow-2xl backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Intelligence Dashboard</h3>
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </div>

                {/* Mock Chart Preview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <div className="mb-2 text-xs text-slate-400">Total Demand</div>
                    <div className="text-2xl font-bold text-blue-400">1,247</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <div className="mb-2 text-xs text-slate-400">Total Committed</div>
                    <div className="text-2xl font-bold text-green-400">1,178</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <div className="mb-2 text-xs text-slate-400">Gap</div>
                    <div className="text-2xl font-bold text-red-400">69</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <div className="mb-2 text-xs text-slate-400">Avg Coverage</div>
                    <div className="text-2xl font-bold text-white">94.5%</div>
                  </div>
                </div>

                {/* Mock Chart Bars */}
                <div className="mt-6 space-y-3">
                  <div className="h-2 w-full rounded-full bg-slate-700">
                    <div className="h-2 w-11/12 rounded-full bg-gradient-to-r from-blue-500 to-green-500"></div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-700">
                    <div className="h-2 w-10/12 rounded-full bg-gradient-to-r from-blue-500 to-green-500"></div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-700">
                    <div className="h-2 w-9/12 rounded-full bg-gradient-to-r from-blue-500 to-yellow-500"></div>
                  </div>
                </div>

                {/* Insights Preview */}
                <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                    <div>
                      <div className="text-sm font-semibold text-amber-300">Key Insight</div>
                      <div className="text-xs text-amber-200/80">Route RUH-JED has 45 trucks gap on Thursday. Consider increasing supplier commitments.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                Transform Your Planning with Intelligence
              </h2>
              <p className="mb-8 text-lg text-slate-600">
                Stop reacting to capacity issues. Start preventing them with real-time visibility, automated insights, and seamless supplier collaboration.
              </p>

              <div className="space-y-4">
                {[
                  'Visualize supply-demand gaps with 8 analytics charts',
                  'Get automated insights on coverage risks and opportunities',
                  'Share plans directly with suppliers for faster commitments',
                  'Track vendor contribution and concentration risk',
                  'Coordinate seamlessly between demand and supply teams',
                  'Measure forecast accuracy and continuously improve',
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

      {/* Pricing */}
      <section id="pricing" className="bg-white py-20 lg:py-28">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Choose the plan that fits your transportation planning needs
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {/* Starter Plan */}
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-blue-200 hover:shadow-lg">
              <h3 className="mb-3 text-2xl font-bold text-slate-900">Starter</h3>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-slate-600">SAR</span>
                  <span className="text-5xl font-bold text-slate-900">999</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">per month</p>
              </div>
              <Link
                href="/register"
                className="mb-6 block w-full rounded-lg border-2 border-blue-600 bg-white py-3 text-center font-semibold text-blue-600 transition-colors hover:bg-blue-50"
              >
                Start Free Trial
              </Link>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Up to 5 users</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Demand & supply planning</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Basic analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Route management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Email support</span>
                </li>
              </ul>
            </div>

            {/* Professional Plan */}
            <div className="relative rounded-xl border-2 border-blue-600 bg-white p-8 shadow-xl transition-all hover:shadow-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                MOST POPULAR
              </div>
              <h3 className="mb-3 text-2xl font-bold text-slate-900">Professional</h3>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-slate-600">SAR</span>
                  <span className="text-5xl font-bold text-slate-900">1,999</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">per month</p>
              </div>
              <Link
                href="/register"
                className="mb-6 block w-full rounded-lg bg-blue-600 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Start Free Trial
              </Link>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Up to 20 users</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span><strong>Intelligence dashboard with 8 charts</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Supplier collaboration portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Dispatch sheet & actuals tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Performance reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Priority support & API access</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-blue-200 hover:shadow-lg">
              <h3 className="mb-3 text-2xl font-bold text-slate-900">Enterprise</h3>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-slate-900">Custom</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">tailored to your needs</p>
              </div>
              <Link
                href="#contact"
                className="mb-6 block w-full rounded-lg border-2 border-slate-900 bg-slate-900 py-3 text-center font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Contact Sales
              </Link>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Full Intelligence suite</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Custom integrations & workflows</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>24/7 priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>SLA guarantees & advanced security</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold">
            Ready to Plan with Intelligence?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Get instant visibility into your supply-demand balance. Start your free trial today.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-white/20 bg-white/10 px-8 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-8 text-sm text-blue-200">
            No credit card required • 14-day free trial • Full Intelligence access
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-slate-50 py-20 lg:py-28">
        <div className="container mx-auto px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Info */}
            <div>
              <h2 className="mb-6 text-4xl font-bold text-slate-900">
                Get in Touch
              </h2>
              <p className="mb-8 text-lg text-slate-600">
                Ready to streamline your transportation planning? Fill out the form and our team will reach out to you shortly.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-900">Email</h3>
                    <a
                      href="mailto:support@teamtakt.app"
                      className="text-slate-600 transition-colors hover:text-blue-600"
                    >
                      support@teamtakt.app
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-900">Phone</h3>
                    <a
                      href="tel:+966534035184"
                      className="text-slate-600 transition-colors hover:text-blue-600"
                    >
                      +966 534035184
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-900">Location</h3>
                    <p className="text-slate-600">
                      Riyadh, Saudi Arabia
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
              <h3 className="mb-6 text-2xl font-bold text-slate-900">Send us a message</h3>
              <ContactForm />
            </div>
          </div>
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
                Intelligence-powered supply and demand planning for transportation companies.
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
            <div>© {new Date().getFullYear()} Takt Planning. All rights reserved.</div>
            <div className="mt-2">Takt is a Bosla company.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
