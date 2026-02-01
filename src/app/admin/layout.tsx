export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Admin pages use their own layout without the main Header/Footer
  return (
    <div className="min-h-screen bg-neutral-50">
      {children}
    </div>
  )
}
