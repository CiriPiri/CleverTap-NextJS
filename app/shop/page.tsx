"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

// --- TYPES ---
type Book = {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string;
  price: number;
};

// --- CONFIGURATION ---
const CATEGORIES: Record<string, string> = {
  Curated: "subject:design+subject:art",
  Fiction: "subject:fiction",
  Mystery: "subject:mystery",
  Thriller: "subject:thriller",
  Horror: "subject:horror",
  Fantasy: "subject:fantasy",
  Comics: "subject:graphic+novels",
  "Sci-Fi": "subject:science+fiction",
  Biography: "subject:biography",
  History: "subject:history",
};

// --- ATMOSPHERES ---
const CATEGORY_THEMES: Record<string, string> = {
  Curated: "linear-gradient(to bottom, #Fdfbf7 0%, #Fdfbf7 100%)",
  Fiction: "linear-gradient(to bottom, #E0F2FE 0%, #Fdfbf7 80%)",
  Mystery: "linear-gradient(to bottom, #E9D5FF 0%, #Fdfbf7 80%)",
  Thriller: "linear-gradient(to bottom, #CBD5E1 0%, #Fdfbf7 80%)",
  Horror: "linear-gradient(to bottom, #FECACA 0%, #Fdfbf7 80%)",
  Fantasy: "linear-gradient(to bottom, #DDD6FE 0%, #Fdfbf7 80%)",
  Comics: "linear-gradient(to bottom, #FDE68A 0%, #Fdfbf7 80%)",
  "Sci-Fi": "linear-gradient(to bottom, #A5F3FC 0%, #Fdfbf7 80%)",
  Biography: "linear-gradient(to bottom, #E5E7EB 0%, #Fdfbf7 80%)",
  History: "linear-gradient(to bottom, #F5E6D3 0%, #Fdfbf7 80%)",
};

// --- SUB-COMPONENT: BOOK CARD (Handles Self-Hiding) ---
const BookCard = ({
  book,
  index,
  onClick,
  onAdd,
}: {
  book: Book;
  index: number;
  onClick: (b: Book) => void;
  onAdd: (e: any, b: Book) => void;
}) => {
  const [imageError, setImageError] = useState(false);

  // If image fails, don't render ANYTHING
  if (imageError) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => onClick(book)}
      className="group relative cursor-pointer"
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] mb-4 overflow-hidden bg-[#e8e6e1] shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-1">
        <Image
          src={book.coverUrl}
          alt={book.title}
          fill
          priority={index < 4} // Eager load first 4 images to fix LCP warning
          sizes="(max-width: 768px) 50vw, 20vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          onError={() => setImageError(true)} // Hide if broken
        />
        <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quick Add Button */}
        <div className="absolute bottom-4 right-4 translate-y-12 group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={(e) => onAdd(e, book)}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur text-ink flex items-center justify-center hover:bg-[#9F8155] hover:text-white shadow-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h3 className="font-serif text-lg leading-tight text-ink line-clamp-2 min-h-[2.5rem]">
          {book.title}
        </h3>
        <div className="flex justify-between items-baseline">
          <p className="font-sans text-[10px] text-gray-500 uppercase tracking-widest line-clamp-1 max-w-[70%]">
            {book.authors[0]}
          </p>
          <span className="font-sans font-bold text-xs text-[#9F8155]">
            ${book.price}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function ShopPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeCategory, setActiveCategory] = useState("Curated");
  const [loading, setLoading] = useState(true);

  const { user, addToCart } = useAuthStore();
  const router = useRouter();

  const shuffleArray = (array: any[]) => array.sort(() => Math.random() - 0.5);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);

      // 1. CHECK CACHE FIRST
      const cacheKey = `archive_books_${activeCategory}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      if (cachedData) {
        setBooks(JSON.parse(cachedData));
        setLoading(false);

        // Track Event even if cached
        if (typeof window !== "undefined") {
          const ctModule = await import("clevertap-web-sdk");
          const ct = ctModule.default || ctModule;
          ct.event.push("Category Viewed", {
            "Category Name": activeCategory,
            User: user?.email || "Guest",
          });
        }
        return; // Stop execution here if cached
      }

      // 2. FETCH FROM API IF NOT CACHED
      try {
        const query = CATEGORIES[activeCategory];
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY || "";
        const keyParam = apiKey ? `&key=${apiKey}` : "";
        const endpoint = `https://www.googleapis.com/books/v1/volumes?q=${query}&orderBy=newest&maxResults=40&langRestrict=en&printType=books${keyParam}`;

        // 👇 ADD THIS DEBUG LINE
        console.log(
          "🔑 API Key Check:",
          apiKey ? "Loaded!" : "MISSING! Reading as undefined",
        );
        const response = await fetch(endpoint);
        const data = await response.json();

        // Handle Quota/Rate Limit Errors Gracefully
        if (data.error) {
          console.error("API Error:", data.error.message);
          setLoading(false);
          return;
        }

        if (!data.items) {
          setBooks([]);
          setLoading(false);
          return;
        }

        const processedBooks = data.items
          .map((item: any) => {
            const info = item.volumeInfo;

            // STRICT API FILTER
            const rawImg =
              info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
            if (!rawImg) return null;

            // High Res Hack
            const img = rawImg
              .replace("http:", "https:")
              .replace("&zoom=1", "&zoom=0");

            return {
              id: item.id,
              title: info.title,
              authors: info.authors || ["Unknown"],
              coverUrl: img,
              price: parseFloat((20 + (info.title.length % 35)).toFixed(2)),
            };
          })
          .filter((b: any) => b !== null)
          .filter((b: Book) => !b.title.toLowerCase().includes("summary"));

        // Remove Duplicates
        const uniqueBooks = Array.from(
          new Map(processedBooks.map((item: Book) => [item.id, item])).values(),
        ) as Book[];

        const finalBooks = shuffleArray(uniqueBooks).slice(0, 15);

        // 3. SAVE TO CACHE FOR NEXT TIME
        sessionStorage.setItem(cacheKey, JSON.stringify(finalBooks));
        setBooks(finalBooks);

        // Analytics
        if (typeof window !== "undefined") {
          const ctModule = await import("clevertap-web-sdk");
          const ct = ctModule.default || ctModule;
          ct.event.push("Category Viewed", {
            "Category Name": activeCategory,
            User: user?.email || "Guest",
          });
        }
      } catch (error) {
        console.error("Fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [activeCategory, user]);

  const handleCardClick = (book: Book) => {
    router.push(`/book/${book.id}`);
  };

  const handleQuickAdd = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
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
        Category: activeCategory,
      });
    }
  };

  return (
    <main className="min-h-screen bg-paper text-ink pb-48 relative transition-colors duration-700">
      {/* ATMOSPHERE */}
      <motion.div
        className="absolute top-0 left-0 w-full h-[60vh] z-0 pointer-events-none"
        animate={{ background: CATEGORY_THEMES[activeCategory] }}
        transition={{ duration: 1.2 }}
      />

      {/* HEADER */}
      <div className="relative z-10 pt-24 px-8 lg:px-24 mb-12">
        <span className="font-sans text-xs uppercase tracking-[0.3em] text-[#9F8155] font-bold">
          {activeCategory}
        </span>
        <h1 className="font-serif text-5xl lg:text-7xl mt-4">The Archive</h1>
      </div>

      {/* FILTERS */}
      <div className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md border-b border-gray-200 px-8 lg:px-24 py-4 mb-12 flex gap-8 overflow-x-auto scrollbar-hide">
        {Object.keys(CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="relative py-2 font-sans text-xs uppercase tracking-widest text-ink/60 hover:text-ink transition-colors whitespace-nowrap"
          >
            <span
              className={activeCategory === cat ? "text-ink font-bold" : ""}
            >
              {cat}
            </span>
            {activeCategory === cat && (
              <motion.div
                layoutId="activeFilter"
                className="absolute bottom-0 left-0 w-full h-[2px] bg-[#9F8155]"
              />
            )}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="relative z-10 px-8 lg:px-24">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-[2/3] mb-4 rounded-sm"></div>
                <div className="h-3 bg-gray-200 w-3/4 mb-2"></div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12"
          >
            <AnimatePresence mode="popLayout">
              {books.map((book, index) => (
                <BookCard
                  key={book.id}
                  index={index}
                  book={book}
                  onClick={handleCardClick}
                  onAdd={handleQuickAdd}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  );
}
