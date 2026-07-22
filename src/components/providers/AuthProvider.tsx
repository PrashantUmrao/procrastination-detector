"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryEmailAddress: { emailAddress: string };
  imageUrl: string;
}

interface AuthContextType {
  isSignedIn: boolean;
  user: User | null;
  userId: string | null;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Automatically check if user was signed in previously
    const saved = localStorage.getItem("pd_mock_signed_in");
    if (saved === "true") {
      setIsSignedIn(true);
      setUser({
        id: "user_mock_12345",
        fullName: "Arthur Pendragon",
        firstName: "Arthur",
        lastName: "Pendragon",
        primaryEmailAddress: { emailAddress: "arthur@discipline.academy" },
        imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      });
    }
  }, []);

  const signIn = () => {
    localStorage.setItem("pd_mock_signed_in", "true");
    setIsSignedIn(true);
    setUser({
      id: "user_mock_12345",
      fullName: "Arthur Pendragon",
      firstName: "Arthur",
      lastName: "Pendragon",
      primaryEmailAddress: { emailAddress: "arthur@discipline.academy" },
      imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    });
  };

  const signOut = () => {
    localStorage.removeItem("pd_mock_signed_in");
    setIsSignedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        user,
        userId: user ? user.id : null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useUser must be used within AuthProvider");
  return {
    isSignedIn: context.isSignedIn,
    user: context.user,
    isLoaded: true,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return {
    isSignedIn: context.isSignedIn,
    userId: context.userId,
    signOut: context.signOut,
    isLoaded: true,
  };
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  if (!isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  if (isSignedIn) return null;
  return <>{children}</>;
}

export function SignInButton({ children }: { children?: React.ReactNode }) {
  const { signIn } = useContext(AuthContext)!;
  if (children) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: signIn });
  }
  return (
    <button
      onClick={signIn}
      className="px-6 py-2 bg-white text-black font-orbitron uppercase text-xs tracking-widest font-bold border border-white hover:bg-black hover:text-white transition-all duration-300"
    >
      Start Your Journey
    </button>
  );
}

export function SignOutButton({ children }: { children?: React.ReactNode }) {
  const { signOut } = useContext(AuthContext)!;
  if (children) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: signOut });
  }
  return (
    <button
      onClick={signOut}
      className="px-4 py-2 border border-white/20 text-white font-orbitron uppercase text-xs tracking-widest hover:border-white transition-all duration-300"
    >
      Sign Out
    </button>
  );
}

export function UserButton() {
  const { user, signOut } = useContext(AuthContext)!;
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={user.imageUrl}
        alt={user.fullName}
        className="w-8 h-8 rounded-full border border-white/20"
      />
      <div className="hidden md:flex flex-col text-left">
        <span className="text-xs font-orbitron text-white uppercase tracking-wider">{user.firstName}</span>
        <button
          onClick={signOut}
          className="text-[10px] text-white/50 hover:text-white underline text-left uppercase tracking-widest"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
