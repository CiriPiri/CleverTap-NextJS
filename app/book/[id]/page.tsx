"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";

// Lively, "Fake" Reviews
const REVIEWS = [
  {
    user: "Elena R.",
    text: "Ideally curated. Changed my perspective entirely.",
    rating: 5,
  },
  {
    user: "Marcus T.",
    text: "The print quality implied by the digital presence is palpable.",
    rating: 5,
  },
  { user: "Sarah L.", text: "A modern classic. Fast shipping too.", rating: 4 },
  {
    user: "David K.",
    text: "Exactly what I was looking for. A masterpiece.",
    rating: 5,
  },
];

// --- STRICT TYPES ---
type BookDetails = {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  price: number;
};

export default function BookDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addToCart, showToast } = useAuthStore();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        // 1. INJECT API KEY (Prevents 429 Quota Exceeded)
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || "";
        const keyParam = apiKey ? `?key=${apiKey}` : "";
        const endpoint = `https://www.googleapis.com/books/v1/volumes/${id}${keyParam}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        // 2. DEFENSIVE CHECK: API Errors
        if (data.error) {
          throw new Error(
            data.error.message || "Google Books API Quota Exceeded",
          );
        }

        // 3. DEFENSIVE CHECK: Malformed Data
        if (!data || !data.volumeInfo) {
          throw new Error("Book data not found or malformed in the Archive.");
        }

        const info = data.volumeInfo;

        // 4. SAFE IMAGE EXTRACTION (Prevents TypeError: Cannot read 'thumbnail')
        const rawImg =
          info.imageLinks?.extraLarge ||
          info.imageLinks?.large ||
          info.imageLinks?.thumbnail ||
          info.imageLinks?.smallThumbnail;

        const finalImg = rawImg
          ? rawImg.replace("http:", "https:").replace("&zoom=1", "&zoom=0")
          : "https://via.placeholder.com/400x600?text=No+Cover+Available"; // Fallback Image

        // 5. CLEAN HTML SAFELY
        const desc = info.description
          ? info.description.replace(/<\/?[^>]+(>|$)/g, "")
          : "No description available for this masterpiece.";

        setBook({
          id: data.id,
          title: info.title || "Unknown Title",
          author: info.authors?.[0] || "Unknown Author",
          description: desc,
          coverUrl: finalImg,
          price: parseFloat((25 + ((info.title?.length || 0) % 40)).toFixed(2)),
        });
      } catch (e: any) {
        console.error("🚨 [SYSTEM] Fetch Details Error:", e.message);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const handleAddToCart = async () => {
    if (!book) return;

    addToCart({
      id: book.id,
      title: book.title,
      price: book.price,
      coverUrl: book.coverUrl,
      quantity: 1,
    });

    if (showToast) showToast("Added to Cart");

    // Analytics (Modernized Async/Await)
    if (typeof window !== "undefined") {
      const ctModule = await import("clevertap-web-sdk");
      const clevertap = ctModule.default || ctModule;
      clevertap.event.push("Added to Cart", {
        "Product Name": book.title,
        Source: "Details Page",
      });
    }
  };

  // --- RENDER STATES ---
  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-serif text-ink animate-pulse text-2xl">
        Fetching from Archive...
      </div>
    );
  }

  // Graceful Degradation: Show an error state instead of a white screen crash
  if (error || !book) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center font-serif text-ink p-8 text-center">
        <h2 className="text-4xl mb-4">Volume Unavailable</h2>
        <p className="font-sans text-xs uppercase tracking-widest text-red-500 mb-8">
          {error}
        </p>
        <button
          onClick={() => router.back()}
          className="border-b border-ink pb-1 hover:text-[#9F8155] transition-colors"
        >
          Return to Previous Page
        </button>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <main className="min-h-screen bg-paper text-ink p-6 lg:p-12 flex flex-col lg:flex-row gap-12 relative">
      {/* LEFT: IMAGE (Sticky & Large) */}
      <div className="w-full lg:w-1/2 lg:h-[90vh] lg:sticky lg:top-12 flex items-center justify-center bg-[#e8e6e1] relative overflow-hidden rounded-sm">
        {/* Background Blur */}
        <div className="absolute inset-0 bg-ink/5" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative w-[300px] h-[450px] lg:w-[400px] lg:h-[600px] shadow-2xl perspective-1000"
        >
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            className="object-cover rounded-sm shadow-xl"
            priority // Eager load the main product image
          />

          {/* Reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none rounded-sm" />
        </motion.div>
      </div>

      {/* RIGHT: CONTENT */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-12 py-12 lg:pr-24">
        {/* Title Block */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <span className="font-sans text-xs uppercase tracking-[0.2em] text-[#9F8155] font-bold">
            Detailed View
          </span>
          <h1 className="font-serif text-5xl lg:text-7xl leading-[0.9] mt-4 mb-2 text-ink">
            {book.title}
          </h1>
          <p className="font-serif italic text-3xl text-gray-400">
            by {book.author}
          </p>
        </motion.div>

        {/* Price & Add */}
        <div className="flex items-center gap-8 border-t border-b border-gray-200 py-8">
          <span className="font-sans text-4xl font-bold text-ink">
            ${book.price}
          </span>
          <button
            onClick={handleAddToCart}
            className="bg-ink text-paper px-12 py-5 font-sans text-xs uppercase tracking-widest hover:bg-[#9F8155] transition-colors shadow-lg"
          >
            Add to Cart
          </button>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <h3 className="font-sans text-xs uppercase tracking-widest text-gray-500">
            Synopsis
          </h3>
          <p className="font-sans text-gray-600 leading-loose text-lg">
            {book.description}
          </p>
        </div>

        {/* Fake Lively Feedback */}
        <div className="bg-[#f4f1ea] p-10 mt-12 rounded-sm">
          <h3 className="font-serif text-2xl mb-8 flex items-center gap-4">
            Reader Notes{" "}
            <span className="text-sm font-sans text-gray-400 tracking-widest uppercase">
              (Verified)
            </span>
          </h3>
          <div className="space-y-8">
            {REVIEWS.map((review, i) => (
              <div
                key={i}
                className="border-b border-gray-300 pb-6 last:border-0 last:pb-0"
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-bold font-sans text-xs uppercase tracking-widest text-ink">
                    {review.user}
                  </span>
                  <span className="text-[#9F8155] text-xs">
                    {"★".repeat(review.rating)}
                  </span>
                </div>
                <p className="font-serif italic text-gray-600">
                  "{review.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
