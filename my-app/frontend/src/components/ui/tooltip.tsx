"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Simplified Tooltip Context
const TooltipContext = createContext<{
    isVisible: boolean;
    setIsVisible: (v: boolean) => void;
} | undefined>(undefined);

export function TooltipProvider({ children }: { children: ReactNode }) {
    // Simple pass-through for compatibility
    return <>{children}</>;
}

export function Tooltip({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <TooltipContext.Provider value={{ isVisible, setIsVisible }}>
            <div
                className="relative inline-block"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
        </TooltipContext.Provider>
    );
}

export function TooltipTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
    // If asChild is true, valid React element should be passed, keeping it simple here
    return <div className="inline-block cursor-help">{children}</div>;
}

export function TooltipContent({ children, className = "" }: { children: ReactNode; className?: string }) {
    const context = useContext(TooltipContext);

    if (!context?.isVisible) return null;

    return (
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-md border border-gray-800 bg-[#18181b] px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ${className}`}>
            {/* Triangle arrow could be added here if needed */}
            {children}
        </div>
    );
}
