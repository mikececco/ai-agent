import { SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl">
              AI Chat Assistant
            </h1>
            <p className="max-w-[600px] text-zinc-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-zinc-400">
              Your intelligent chat companion powered by Claude AI. Experience
              seamless conversations with advanced language understanding.
            </p>
          </div>
          <SignInButton mode="modal" forceRedirectUrl={"/dashboard"}>
            <button className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}
