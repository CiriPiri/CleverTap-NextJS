"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useEffect, useState } from "react";

// --- COMPONENTS ---
import NativeSpotlight from "./components/NativeSpotlight";
import Footer from "./components/Footer";
import Manifesto from "./components/Manifesto";

// --- TYPES ---
type HeroBook = {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  price: number;
};

type Particle = {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
};

// --- FALLBACK DATA (Graceful Degradation) ---
const FALLBACK_BOOK: HeroBook = {
  id: "archive-exclusive-01",
  title: "The Principles of Minimalist Design",
  author: "Archive Editorial",
  description:
    "An exploration into the aesthetics of modern digital curation. This exclusive volume captures the essence of white space, typography, and structural layout.",
  coverUrl:
    "https://via.placeholder.com/400x600/e8e6e1/1a1a1a?text=Archive+Design",
  price: 45.0,
};

// --- PARTICLE COMPONENT ---
const FloatingParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generatedParticles = [...Array(8)].map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#9F8155] opacity-20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default function Home() {
  const { user, logout, addToCart } = useAuthStore();
  const router = useRouter();

  const [book, setBook] = useState<HeroBook | null>(null);
  const [loading, setLoading] = useState(true);

  const { scrollYProgress } = useScroll();
  const marqueeX = useTransform(scrollYProgress, [0, 1], [0, -200]);

  // --- FETCH HERO BOOK ---
  useEffect(() => {
    const fetchHeroBook = async () => {
      setLoading(true);
      try {
        // 1. INJECT API KEY
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || "";
        const keyParam = apiKey ? `&key=${apiKey}` : "";
        const endpoint = `https://www.googleapis.com/books/v1/volumes?q=subject:design&orderBy=newest&langRestrict=en&maxResults=5${keyParam}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        // 2. ERROR HANDLING
        if (data.error) throw new Error(data.error.message);
        if (!data.items) throw new Error("No items returned");

        const validBook = data.items.find(
          (item: any) =>
            item.volumeInfo?.imageLinks?.thumbnail &&
            item.volumeInfo?.description,
        );

        if (!validBook) throw new Error("No valid book with cover found");

        const info = validBook.volumeInfo;
        const rawImage = info.imageLinks.thumbnail;
        const highResImage = rawImage
          .replace("http:", "https:")
          .replace("&zoom=1", "&zoom=0");

        setBook({
          id: validBook.id,
          title: info.title,
          author: info.authors?.[0] || "Unknown Author",
          description:
            info.description.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 150) +
            "...",
          coverUrl: highResImage,
          price: parseFloat((25 + (info.title.length % 15)).toFixed(2)),
        });
      } catch (error) {
        console.error(
          "🚨 [SYSTEM] Hero Fetch Failed. Loading Fallback.",
          error,
        );
        // 3. GRACEFUL DEGRADATION: Load fallback book instead of crashing
        setBook(FALLBACK_BOOK);
      } finally {
        setLoading(false);
      }
    };

    fetchHeroBook();
  }, []);

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!book) return;

    addToCart({
      id: book.id,
      title: book.title,
      price: book.price,
      coverUrl: book.coverUrl,
      quantity: 1,
    });

    if (typeof window !== "undefined") {
      const ctModule = await import("clevertap-web-sdk");
      const ct = ctModule.default || ctModule;
      ct.event.push("Added to Cart", {
        "Product Name": book.title,
        Category: "Hero Section",
      });
    }
  };

  return (
    <main className="min-h-screen w-full bg-paper flex flex-col overflow-x-hidden relative">
      {/* --- HERO SECTION --- */}
      <section className="relative w-full lg:h-screen flex flex-col lg:flex-row">
        <FloatingParticles />

        {/* LOADING STATE */}
        {loading ? (
          <div className="w-full h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : book ? (
          <>
            {/* LEFT SIDE: TEXT */}
            <div className="w-full lg:w-1/2 p-12 lg:p-24 flex flex-col justify-center z-10 pt-32 lg:pt-0">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4">
                  <span className="h-[1px] w-12 bg-[#9F8155]"></span>
                  <span className="font-sans text-xs uppercase tracking-[0.2em] text-[#9F8155] font-bold">
                    Editor's Choice
                  </span>
                </div>

                <h1 className="font-serif text-6xl lg:text-8xl leading-[0.9] text-ink line-clamp-3 mix-blend-darken">
                  {book.title}
                </h1>

                <p className="font-serif italic text-2xl text-gray-400">
                  by {book.author}
                </p>

                <p className="font-sans text-gray-600 max-w-md text-lg leading-relaxed pt-4 line-clamp-3">
                  {book.description}
                </p>

                <div className="pt-8 flex gap-6">
                  <button
                    onClick={handleAddToCart}
                    className="group relative px-8 py-4 bg-ink text-white font-sans text-sm tracking-widest overflow-hidden shadow-2xl hover:scale-105 transition-transform"
                  >
                    <span className="relative z-10 group-hover:text-ink transition-colors duration-300">
                      {user ? `BUY NOW ($${book.price})` : "LOGIN TO BUY"}
                    </span>
                    <div className="absolute inset-0 bg-[#9F8155] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  </button>

                  <button
                    onClick={() => router.push(`/book/${book.id}`)}
                    className="px-8 py-4 border-b border-gray-300 font-sans text-sm tracking-widest text-gray-500 hover:text-ink hover:border-ink transition-colors"
                  >
                    VIEW DETAILS
                  </button>
                </div>
              </motion.div>
            </div>

            {/* RIGHT SIDE: IMAGE */}
            <div className="w-full lg:w-1/2 relative h-[60vh] lg:h-auto bg-[#e8e6e1] overflow-hidden flex items-center justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] -rotate-45 opacity-[0.04] pointer-events-none select-none z-0">
                <motion.div
                  style={{ x: marqueeX }}
                  className="font-sans font-black text-[150px] leading-none whitespace-nowrap text-ink"
                >
                  ARCHIVE • DESIGN • CULTURE • ARCHIVE • DESIGN • CULTURE •
                </motion.div>
              </div>

              <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, y: [0, -15, 0] }}
                transition={{
                  scale: { duration: 1.2 },
                  y: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                }}
                className="relative w-[280px] h-[420px] lg:w-[350px] lg:h-[540px] shadow-2xl z-10 perspective-1000"
              >
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  fill
                  className="object-cover rounded-sm"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none rounded-sm" />
              </motion.div>
            </div>
          </>
        ) : null}
      </section>

      <Manifesto />

      <div
        id="ct-exclusive-drop-slot"
        className="w-full relative z-30 bg-[#1a1a1a]"
      >
        <NativeSpotlight />
      </div>

      <Footer />
    </main>
  );
}
