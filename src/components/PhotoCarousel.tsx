import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Copy, Check } from 'lucide-react';

interface PhotoCarouselProps {
  photos: string[];
  title: string;
}

export default function PhotoCarousel({ photos, title }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Preload next and previous images
  useEffect(() => {
    if (photos.length > 1) {
      const nextIndex = (currentIndex + 1) % photos.length;
      const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
      
      const nextImg = new Image();
      nextImg.src = photos[nextIndex];
      
      const prevImg = new Image();
      prevImg.src = photos[prevIndex];
    }
  }, [currentIndex, photos]);

  const nextPhoto = () => {
    setIsImageLoading(true);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setIsImageLoading(true);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const selectPhoto = (index: number) => {
    if (index !== currentIndex) {
      setIsImageLoading(true);
      setCurrentIndex(index);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(photos[currentIndex])}
            className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[8px] font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest"
            title="Copiar link da imagem"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </button>
          <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      </div>
      <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden group shadow-xl">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={photos[currentIndex]}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            onLoad={() => setIsImageLoading(false)}
            className={`w-full h-full object-contain transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>

        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Carregando...</span>
            </div>
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all opacity-0 group-hover:opacity-100 active:scale-90 z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all opacity-0 group-hover:opacity-100 active:scale-90 z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
      
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {photos.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => selectPhoto(idx)}
              className={`relative flex-shrink-0 w-20 aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                currentIndex === idx ? 'border-slate-900 scale-95 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img 
                src={photo} 
                alt={`Thumbnail ${idx + 1}`} 
                className="w-full h-full object-cover" 
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
