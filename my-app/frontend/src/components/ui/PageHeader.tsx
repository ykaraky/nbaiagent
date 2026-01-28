import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    borderColor?: string; // e.g., 'border-purple-500'
    children?: React.ReactNode; // For actions/controls
}

export default function PageHeader({
    title,
    subtitle,
    icon,
    borderColor = "border-gray-800",
    children
}: PageHeaderProps) {
    return (
        <div className={`flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8 pb-4 border-b ${borderColor}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="p-2 bg-gray-900/50 rounded-xl border border-gray-800/50">
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm font-medium text-gray-400 mt-1 tracking-wide">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {children && (
                <div className="w-full md:w-auto flex items-center justify-end">
                    {children}
                </div>
            )}
        </div>
    );
}
