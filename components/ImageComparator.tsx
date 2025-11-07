import React, { useState, useRef, useCallback } from 'react';

interface ImageComparatorProps {
  originalImage: string;
  generatedImage: string;
}

const ImageComparator: React.FC<ImageComparatorProps> = ({ originalImage, generatedImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback(() => {
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden">
      <div 
        ref={imageContainerRef}
        className="relative w-full aspect-[4/3] select-none"
      >
        <img
          src={originalImage}
          alt="Original Room"
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={generatedImage}
            alt="AI Generated Design"
            className="absolute inset-0 w-full h-full object-cover"
            draggable="false"
          />
        </div>
        <div
            className="absolute top-0 bottom-0 w-[44px] -translate-x-1/2 cursor-ew-resize"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <div className="relative w-full h-full flex justify-center items-center">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-white/75 backdrop-blur-sm"></div>
                <div className="relative bg-white rounded-full h-9 w-9 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageComparator;