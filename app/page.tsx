import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-50/50">
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
      <div className="px-4 py-8 mx-auto w-full max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-10 text-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              AI Chat Assistant
            </h1>
            <p className="max-w-[600px] text-lg text-gray-600 md:text-xl/relaxed xl:text-2xl/relaxed">
              Meet your new AI chat companion that goes beyond conversation - it
              can actually get things done!
              <br />
              <span className="text-gray-400 text-sm">
                Powered by IBM&apos;s WxTools & your favourite LLM&apos;s.
              </span>
            </p>
          </div>
          <SignedIn>
            <Link href="/dashboard">
              <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-gray-900 to-gray-800 rounded-full hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-900/20 to-gray-800/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl={"/dashboard"}>
              <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-gray-900 to-gray-800 rounded-full hover:from-gray-800 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-900/20 to-gray-800/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </SignInButton>
          </SignedOut>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 pt-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">Fast</div>
              <div className="text-sm text-gray-600 mt-1">
                Real-time streamed responses
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">Modern</div>
              <div className="text-sm text-gray-600 mt-1">
                Next.js 15, Tailwind CSS, Convex, Clerk
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">Smart</div>
              <div className="text-sm text-gray-600 mt-1">
                Powered by Your Favourite LLM&apos;s
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
