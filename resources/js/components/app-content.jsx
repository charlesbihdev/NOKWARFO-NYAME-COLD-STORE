import { SidebarInset } from '@/components/ui/sidebar';
import * as React from 'react';

export function AppContent({ variant = 'header', children, ...props }) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    return (<main className="flex h-full w-full flex-1 flex-col gap-4 rounded-xl" {...props}>
            {children}
        </main>);
}

