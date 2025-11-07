import React, { useState, useCallback, useEffect } from 'react';
import { DESIGN_STYLES, COLOR_PALETTES, ATMOSPHERES, IMAGE_QUALITIES } from './constants';
import {
  generateImageWithStyle,
  applyStyleFromReference,
  refineImageWithText,
  getChatResponse,
  getShoppingSuggestions
} from './services/geminiService';
import ImageComparator from './components/ImageComparator';
import ChatInterface from './components/ChatInterface';
import MoodBoard from './components/MoodBoard';
import ProcessExplanation from './components/ProcessExplanation';
import { UploadIcon, SparklesIcon, BookmarkIcon, LayoutGridIcon, XIcon, DownloadIcon } from './components/icons';
import type { ChatMessage, MoodBoardItem } from './types';

type AppState = 'initial' | 'generating' | 'ready';
type ChatMode = 'design' | 'general';
type ImageQuality = 'standard' | 'high';

const PREFERENCES_KEY = 'aiInteriorDesignerPrefs';

const App: React.FC = () => {
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);

  const [appState, setAppState] = useState<AppState>('initial');
  const [generationProgress, setGenerationProgress] = useState<{current: number, total: number} | null>(null);

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedColorPalette, setSelectedColorPalette] = useState<string | null>(null);
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<ImageQuality>('standard');
  
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('design');
  
  const [moodBoardItems, setMoodBoardItems] = useState<MoodBoardItem[]>([]);
  const [isMoodBoardOpen, setIsMoodBoardOpen] = useState(false);
  
  const [prefsSavedFeedback, setPrefsSavedFeedback] = useState(false);
  const [showProcess, setShowProcess] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    try {
      const savedPrefsRaw = localStorage.getItem(PREFERENCES_KEY);
      if (savedPrefsRaw) {
        const savedPrefs = JSON.parse(savedPrefsRaw);
        if (savedPrefs.style) setSelectedStyle(savedPrefs.style);
        if (savedPrefs.colorPalette) setSelectedColorPalette(savedPrefs.colorPalette);
        if (savedPrefs.atmosphere) setSelectedAtmosphere(savedPrefs.atmosphere);
        if (savedPrefs.quality) setSelectedQuality(savedPrefs.quality);
      }
    } catch (e) {
      console.error("Failed to parse preferences from localStorage", e);
    }
  }, []);

  const resetGenerationState = () => {
      setGeneratedImages({});
      setAppState('initial');
      setError(null);
      setChatMessages([]);
      setSelectedResultIndex(null);
      setShowProcess(true);
  }
  
  const processFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const filePromises = imageFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
        });
        
        Promise.all(filePromises).then(newImages => {
            const updatedImages = [...originalImages, ...newImages];
            setOriginalImages(updatedImages);
            resetGenerationState();
        }).catch(err => {
            console.error("Error reading files:", err);
            setError("There was an error processing some of your images.");
        });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
      setOriginalImages(current => current.filter((_, index) => index !== indexToRemove));
      // Also remove the corresponding generated image if it exists
      setGeneratedImages(current => {
          const newGenerated = {...current};
          delete newGenerated[indexToRemove];
          // Shift keys for subsequent images
          Object.keys(newGenerated).forEach(keyStr => {
              const key = parseInt(keyStr);
              if (key > indexToRemove) {
                  newGenerated[key - 1] = newGenerated[key];
                  delete newGenerated[key];
              }
          });
          return newGenerated;
      });

      if (selectedResultIndex === indexToRemove) {
          setSelectedResultIndex(null);
      } else if (selectedResultIndex && selectedResultIndex > indexToRemove) {
          setSelectedResultIndex(selectedResultIndex - 1);
      }
  };

  const handleSelectStyle = (style: string) => {
    setSelectedStyle(current => current === style ? null : style);
  };
  const handleSelectColorPalette = (palette: string) => {
    setSelectedColorPalette(current => current === palette ? null : palette);
  };
  const handleSelectAtmosphere = (atmosphere: string) => {
    setSelectedAtmosphere(current => current === atmosphere ? null : atmosphere);
  };
   const handleSelectQuality = (quality: ImageQuality) => {
    setSelectedQuality(quality);
  };
  
  const handleSavePreferences = () => {
    const prefs = {
      style: selectedStyle,
      colorPalette: selectedColorPalette,
      atmosphere: selectedAtmosphere,
      quality: selectedQuality,
    };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    setPrefsSavedFeedback(true);
    setTimeout(() => setPrefsSavedFeedback(false), 2000);
  };

  const handleClearPreferences = () => {
    localStorage.removeItem(PREFERENCES_KEY);
    setSelectedStyle(null);
    setSelectedColorPalette(null);
    setSelectedAtmosphere(null);
    setSelectedQuality('standard');
  };

  const handleGenerateClick = useCallback(async () => {
    if (originalImages.length === 0 || !selectedStyle) return;

    setAppState('generating');
    setError(null);
    setGeneratedImages({});
    setChatMessages([]);
    setChatMode('design');
    setSelectedResultIndex(null);

    try {
        if (originalImages.length === 1) {
            // If only one image, use the original method.
            setGenerationProgress({ current: 1, total: 1 });
            const image = await generateImageWithStyle(originalImages[0], selectedStyle, selectedColorPalette, selectedAtmosphere, selectedQuality);
            setGeneratedImages({ 0: image });
        } else {
            // If multiple images, use the reference-based method for consistency.
            // 1. Generate the reference design from the first image.
            setGenerationProgress({ current: 1, total: originalImages.length });
            const referenceImage = await generateImageWithStyle(originalImages[0], selectedStyle, selectedColorPalette, selectedAtmosphere, selectedQuality);
            setGeneratedImages(prev => ({ ...prev, [0]: referenceImage }));

            // 2. Apply this design to the rest of the images.
            for (let i = 1; i < originalImages.length; i++) {
                setGenerationProgress({ current: i + 1, total: originalImages.length });
                const styledImage = await applyStyleFromReference(originalImages[i], referenceImage, selectedQuality);
                setGeneratedImages(prev => ({ ...prev, [i]: styledImage }));
            }
        }
        setAppState('ready');
    } catch (err) {
        setError('Failed to generate all images. Please try again.');
        setAppState('initial');
        console.error(err);
    } finally {
        setGenerationProgress(null);
    }
  }, [originalImages, selectedStyle, selectedColorPalette, selectedAtmosphere, selectedQuality]);
  
  const handleSendMessage = async (message: string, isShoppingQuery: boolean) => {
      if (selectedResultIndex === null) return;

      const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: message };
      setChatMessages(prev => [...prev, newUserMessage]);
      setIsChatLoading(true);
      setError(null);

      const baseImage = generatedImages[selectedResultIndex];

      try {
          let modelResponseText: string;
          if (chatMode === 'design' && baseImage) {
               if (isShoppingQuery) {
                    modelResponseText = await getShoppingSuggestions(baseImage, message);
               } else {
                    const refinedImage = await refineImageWithText(baseImage, message, selectedQuality);
                    setGeneratedImages(prev => ({ ...prev, [selectedResultIndex]: refinedImage })); // Update the specific image
                    modelResponseText = "I've updated the selected design. What do you think?";
               }
          } else {
              modelResponseText = await getChatResponse(message);
          }
          const newModelMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: modelResponseText };
          setChatMessages(prev => [...prev, newModelMessage]);

      } catch (err) {
          console.error(err);
          const errorText = "Sorry, I couldn't process that request. Please try again.";
          const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: errorText };
          setChatMessages(prev => [...prev, errorMessage]);
      } finally {
          setIsChatLoading(false);
      }
  };

  const handleSaveDesign = (imageUrl: string) => {
    if (!selectedStyle) return;
    const newDesignItem: MoodBoardItem = {
      id: `design-${Date.now()}`,
      type: 'design',
      imageUrl: imageUrl,
      style: selectedStyle,
    };
    setMoodBoardItems(prev => [...prev, newDesignItem]);
  };
  
  const handleExportImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-interior-design-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSaveShoppingItem = (item: { name: string, url: string, description: string }) => {
    const newItem: MoodBoardItem = {
      id: `item-${Date.now()}`,
      type: 'item',
      ...item,
    };
    setMoodBoardItems(prev => [...prev, newItem]);
  };

  const handleRemoveMoodBoardItem = (id: string) => {
    setMoodBoardItems(prev => prev.filter(item => item.id !== id));
  };


  const WelcomeScreen = () => (
    <div 
        className={`text-center p-8 border-4 border-dashed rounded-2xl transition-colors duration-300 ${isDragging ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-600'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
    >
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">
        AI Interior Design Consultant
      </h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Drag & drop photos of your room, or click to upload. Select a style, compare results, and chat with our AI to perfect your new space.
      </p>
      <label htmlFor="image-upload" className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md cursor-pointer hover:bg-indigo-700 transition-transform transform hover:scale-105">
        <UploadIcon className="w-6 h-6" />
        {isDragging ? 'Drop Photos Here' : 'Click to Upload Photos'}
      </label>
      <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} multiple />
    </div>
  );
  
  const MainInterface = () => (
    <div className="w-full">
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">{error}</div>}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div 
                    className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-2 border-dashed transition-colors duration-300 ${isDragging ? 'border-indigo-400' : 'border-transparent'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Your Photos</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add more by dragging them here, or use the button below.</p>
                   
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                        {originalImages.map((img, index) => (
                            <div key={index} className="relative group">
                                <img 
                                    src={img}
                                    alt={`Your room upload ${index + 1}`}
                                    className={`w-full h-20 object-cover rounded-md`}
                                />
                                <button onClick={() => handleRemoveImage(index)} className="absolute -top-2 -right-2 z-10 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" aria-label="Remove image">
                                    <XIcon className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex space-x-2 mt-4">
                        <label htmlFor="image-upload-2" className="flex-1 text-center inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-md cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                            <UploadIcon className="w-5 h-5" />
                            Add More
                        </label>
                         <button onClick={() => setIsMoodBoardOpen(true)} className="flex-1 text-center inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-md cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                            <LayoutGridIcon className="w-5 h-5" />
                            Mood Board ({moodBoardItems.length})
                        </button>
                    </div>
                    <input id="image-upload-2" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} multiple />
                </div>
            </div>

            <div className="lg:col-span-2">
                 {showProcess ? (
                    <ProcessExplanation onStart={() => setShowProcess(false)} />
                 ) : (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Design Controls</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select a base style, then add optional details to refine the AI's generation for all photos.</p>
                        
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">1. Choose a Style <span className="text-red-500 font-medium">*</span></h3>
                            <div className="flex flex-wrap gap-2">
                                {DESIGN_STYLES.map((style) => (
                                <button
                                    key={style}
                                    onClick={() => handleSelectStyle(style)}
                                    disabled={appState === 'generating'}
                                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200
                                        ${selectedStyle === style ? 'bg-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-200 dark:hover:bg-indigo-900'}
                                        ${appState === 'generating' ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    {style}
                                </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">2. Select Color Palette <span className="text-xs text-gray-400">(Optional)</span></h3>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_PALETTES.map((palette) => (
                                <button
                                    key={palette}
                                    onClick={() => handleSelectColorPalette(palette)}
                                    disabled={appState === 'generating'}
                                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200
                                        ${selectedColorPalette === palette ? 'bg-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-200 dark:hover:bg-indigo-900'}
                                        ${appState === 'generating' ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    {palette}
                                </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">3. Pick an Atmosphere <span className="text-xs text-gray-400">(Optional)</span></h3>
                            <div className="flex flex-wrap gap-2">
                                {ATMOSPHERES.map((atmosphere) => (
                                <button
                                    key={atmosphere}
                                    onClick={() => handleSelectAtmosphere(atmosphere)}
                                    disabled={appState === 'generating'}
                                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200
                                        ${selectedAtmosphere === atmosphere ? 'bg-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-200 dark:hover:bg-indigo-900'}
                                        ${appState === 'generating' ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    {atmosphere}
                                </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">4. Set Image Quality <span className="text-xs text-gray-400">(Optional)</span></h3>
                            <div className="flex flex-wrap gap-2">
                                {IMAGE_QUALITIES.map((quality) => (
                                <button
                                    key={quality.id}
                                    onClick={() => handleSelectQuality(quality.id as ImageQuality)}
                                    disabled={appState === 'generating'}
                                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200
                                        ${selectedQuality === quality.id ? 'bg-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-indigo-200 dark:hover:bg-indigo-900'}
                                        ${appState === 'generating' ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    {quality.name}
                                </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 border-t dark:border-gray-700 pt-6">
                            <div className="flex items-center gap-2 mb-4 justify-end">
                                <button onClick={handleSavePreferences} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50" disabled={prefsSavedFeedback}>
                                    <BookmarkIcon className="w-4 h-4" />
                                    {prefsSavedFeedback ? 'Preferences Saved!' : 'Save Preferences'}
                                </button>
                                 <button onClick={handleClearPreferences} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 rounded-md hover:bg-red-200 dark:hover:bg-red-900 transition-colors">
                                    <XIcon className="w-4 h-4" />
                                    Clear
                                </button>
                            </div>
                            <button 
                                onClick={handleGenerateClick} 
                                disabled={!selectedStyle || appState === 'generating'}
                                className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md cursor-pointer hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed disabled:scale-100"
                            >
                                <SparklesIcon className="w-6 h-6" />
                                {appState === 'generating' ? `Generating...` : `Apply Design to All Photos (${originalImages.length})`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {appState === 'generating' && (
            <div className="text-center my-12">
                <div className="inline-flex items-center gap-3">
                    <SparklesIcon className="w-8 h-8 text-indigo-500 animate-pulse" />
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        Generating {generationProgress?.current} of {generationProgress?.total} in <span className="font-bold text-indigo-500">{selectedStyle}</span> style...
                    </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few moments. Great design is worth the wait!</p>
            </div>
        )}
        
        {appState === 'ready' && Object.keys(generatedImages).length > 0 && (
            <>
              <div className="my-10">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Your Design Gallery</h2>
                    <p className="text-gray-500 dark:text-gray-400">Click a design to select it for refinement in the chat below.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {originalImages.map((original, index) => {
                        const generated = generatedImages[index];
                        if (!generated) return null;
                        
                        const isSelected = selectedResultIndex === index;

                        return (
                            <div key={index}
                                onClick={() => setSelectedResultIndex(index)}
                                className={`rounded-2xl p-2 transition-all duration-300 cursor-pointer ${isSelected ? 'bg-indigo-500' : 'bg-transparent'}`}
                            >
                                <ImageComparator originalImage={original} generatedImage={generated} />
                                <div className="mt-4 flex justify-center items-center gap-4">
                                    <button onClick={(e) => { e.stopPropagation(); handleSaveDesign(generated); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                                        <BookmarkIcon className="w-4 h-4"/>
                                        Save
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleExportImage(generated); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                                        <DownloadIcon className="w-4 h-4"/>
                                        Export
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                  </div>
              </div>
              
              {selectedResultIndex !== null && (
                <div className="mt-10">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-full flex items-center space-x-1">
                            <button onClick={() => setChatMode('design')} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${chatMode === 'design' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Refine Selected Design</button>
                            <button onClick={() => setChatMode('general')} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${chatMode === 'general' ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}>General Chat</button>
                        </div>
                    </div>
                    <ChatInterface 
                        messages={chatMessages} 
                        onSendMessage={handleSendMessage}
                        isLoading={isChatLoading}
                        isDesignMode={chatMode === 'design'}
                        onSaveShoppingItem={handleSaveShoppingItem}
                    />
                </div>
              )}
            </>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 md:p-8 transition-colors duration-300">
      <main className="w-full max-w-7xl mx-auto">
        {originalImages.length > 0 ? <MainInterface /> : <WelcomeScreen />}
      </main>
      {isMoodBoardOpen && <MoodBoard items={moodBoardItems} onClose={() => setIsMoodBoardOpen(false)} onRemoveItem={handleRemoveMoodBoardItem} />}
    </div>
  );
};

export default App;