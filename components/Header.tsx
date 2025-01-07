import { SignInButton, UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

export default function Header() {
  const { user, isLoaded } = useUser();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-white border-b">
      {/* Logo/Brand */}
      <div className="flex items-center space-x-2">
        <svg
          className="w-8 h-8 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <h1 className="text-xl font-bold">AI Chat Assistant</h1>
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center space-x-4">
        {isLoaded && (
          <>
            {user ? (
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-600">
                  Welcome, {user.firstName || user.username}
                </p>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            )}
          </>
        )}
      </div>
    </header>
  );
}
