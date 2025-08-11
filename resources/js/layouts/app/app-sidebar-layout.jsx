import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import AppSidebar from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { useState } from 'react';
import { router } from '@inertiajs/react';

const sectionToRoute = {
  dashboard: '/dashboard',
  products: '/products',
  'product-management': '/Inventory-Management',
  'stock-control': '/stock-control',
  sales: '/sales',
  'daily-sales': '/daily-sales-report',
  'credit-collection': '/credit-collection',
  'profit-analysis': '/profit-analysis',
  'bank-transfers': '/bank-transfers',
  suppliers: '/suppliers',
};

export default function AppSidebarLayout({ children, breadcrumbs = [] }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (sectionToRoute[section]) {
      router.visit(sectionToRoute[section]);
    }
  };

  return (
    <AppShell variant="sidebar">
      <AppSidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
            <AppContent variant="sidebar">
        <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
    </AppShell>
  );
}

