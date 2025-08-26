import AppSidebar from '@/components/app-sidebar';
import ToastProvider from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Link } from '@inertiajs/react';
import { ChevronRight, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function AppLayout({ children, breadcrumbs = [] }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);


    return (
        <SidebarProvider>
            <ToastProvider>
                <div className="min-h-screen w-full bg-gray-50 lg:flex">
                    {/* Mobile sidebar */}
                    <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                        <div className="bg-opacity-75 fixed inset-0 bg-gray-600" onClick={() => setSidebarOpen(false)} />
                        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
                            <AppSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                        </div>
                    </div>

                    {/* Desktop sidebar */}
                    <div className={`hidden flex-shrink-0 lg:flex ${isCollapsed ? 'lg:w-16' : 'lg:w-64'} lg:flex-col`}>
                        <AppSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                    </div>

                    {/* Main content */}
                    <div className="flex min-w-0 flex-1 flex-col">
                        {/* Top bar */}
                        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-5 w-5" />
                            </Button>

                            {/* Breadcrumbs */}
                            <nav className="flex flex-1" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-4">
                                    {breadcrumbs.map((crumb, index) => (
                                        <li key={index}>
                                            <div className="flex items-center">
                                                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                                                {index === breadcrumbs.length - 1 ? (
                                                    <span className="text-sm font-medium text-gray-500">{crumb.title}</span>
                                                ) : (
                                                    <Link href={crumb.href} className="text-sm font-medium text-gray-500 hover:text-gray-700">
                                                        {crumb.title}
                                                    </Link>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </nav>

                            {/* Logout */}
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex cursor-pointer items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </Link>
                        </div>

                        {/* Page content */}
                        <main className="py-6">{children}</main>
                    </div>
                </div>
            </ToastProvider>
        </SidebarProvider>
    );
}
