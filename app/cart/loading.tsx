export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffdf5]" dir="rtl">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#fef08a] border-t-[#fbbf24] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">טוען...</p>
      </div>
    </div>
  )
}
