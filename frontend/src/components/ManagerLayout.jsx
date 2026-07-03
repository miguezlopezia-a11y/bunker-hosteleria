import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function ManagerLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-[260px] pb-20 md:pb-8 min-h-screen">{children}</main>
      <BottomNav />
    </div>
  );
}
