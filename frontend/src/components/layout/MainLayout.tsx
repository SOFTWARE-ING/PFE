// src/components/layout/MainLayout.tsx
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="p-4 bg-white shadow">Shield</header>
      <main className="p-6">{children}</main>
    </div>
  );
}