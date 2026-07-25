"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ClerkProvider,
  useUser as useClerkUser,
  useAuth as useClerkAuth,
  useClerk,
  Show,
  UserButton as ClerkUserButton,
} from "@clerk/nextjs";


export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <ClerkProvider afterSignOutUrl="/">{children}</ClerkProvider>;
}

export function useUser() {
  const { isSignedIn, user, isLoaded } = useClerkUser();

  return {
    isSignedIn: !!isSignedIn,
    user: user
      ? {
          id: user.id,
          fullName: user.fullName || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          primaryEmailAddress: {
            emailAddress: user.primaryEmailAddress?.emailAddress || "",
          },
          imageUrl: user.imageUrl,
          createdAt: user.createdAt || null,
          username: user.username || null,
          publicMetadata: user.publicMetadata || {},
          unsafeMetadata: user.unsafeMetadata || {},
        }
      : null,
    isLoaded,
  };
}

export function useAuth() {
  const { isSignedIn, userId, isLoaded } = useClerkAuth();
  const { signOut } = useClerk();

  return {
    isSignedIn: !!isSignedIn,
    userId: userId || null,
    signOut,
    isLoaded,
  };
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <Show when="signed-in">{children}</Show>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  return <Show when="signed-out">{children}</Show>;
}

export function SignInButton({ children }: { children?: React.ReactNode }) {
  const router = useRouter();

  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push("/auth");
  };

  if (children) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
      onClick: handleSignIn,
    });
  }

  return (
    <button
      onClick={handleSignIn}
      className="px-6 py-2 bg-white text-black font-orbitron uppercase text-xs tracking-widest font-bold border border-white hover:bg-black hover:text-white transition-all duration-300"
    >
      Start Your Journey
    </button>
  );
}

export function SignOutButton({ children }: { children?: React.ReactNode }) {
  const { signOut } = useClerk();

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut();
  };

  if (children) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
      onClick: handleSignOut,
    });
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 border border-white/20 text-white font-orbitron uppercase text-xs tracking-widest hover:border-white transition-all duration-300"
    >
      Sign Out
    </button>
  );
}

export const UserButton = ClerkUserButton;
