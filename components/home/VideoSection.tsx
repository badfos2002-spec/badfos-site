export default function VideoSection() {
  // This will be replaced with actual YouTube URL from Firebase
  const videoId = 'dQw4w9WgXcQ' // Placeholder

  return (
    <section className="section-spacing">
      <div className="container-rtl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          תהליך ההדפסה שלנו
        </h2>
        <div className="max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-xl">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="תהליך הדפסה"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <p className="text-center text-sm text-text-gray mt-4">
            צפו בתהליך ההדפסה המקצועי שלנו
          </p>
        </div>
      </div>
    </section>
  )
}
