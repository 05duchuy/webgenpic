import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GeneratedImage, AspectRatio } from './types';
import { ASPECT_RATIOS, ARTISTIC_ANGLES } from './constants';
import { generateImages, editImage, restoreImage, describeImage, upscaleImage } from './services/geminiService';
import { saveHistoryToLocalStorage, loadHistoryFromLocalStorage } from './services/localStorageService';
import Spinner from './components/Spinner';
import ImageModal from './components/ImageModal';
import QuickViewPanel from './components/QuickViewPanel';
import GifCreatorModal from './components/GifCreatorModal';
import HelpModal from './components/HelpModal';
import useUndoRedo from './hooks/useUndoRedo';
import { useToast } from './contexts/ToastContext';
import { useSettings } from './contexts/SettingsContext';

// Define JSZip and aistudio on the window object
declare global {
  interface Window {
    JSZip: any;
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const base64StrToFile = (base64Str: string, fileName: string): File => {
    const byteCharacters = atob(base64Str);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    return new File([blob], fileName, { type: 'image/png' });
};

const Header: React.FC<{ onOpenHelp: () => void, hasApiKey: boolean, onConnectKey: () => void }> = ({ onOpenHelp, hasApiKey, onConnectKey }) => {
    const { t, language, setLanguage, theme, toggleTheme } = useSettings();
    return (
        <header className="py-4 px-4 md:px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 flex flex-wrap justify-between items-center transition-colors duration-200">
            <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-600">
                    {t.app_title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.app_subtitle}</p>
            </div>
            <div className="flex items-center gap-3 mt-2 md:mt-0">
                {!hasApiKey && (
                    <button 
                        onClick={onConnectKey}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors animate-pulse"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        {language === 'vi' ? 'Kết nối API Key' : 'Connect API Key'}
                    </button>
                )}
                <button 
                    onClick={onOpenHelp}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    title={t.help_btn}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
                    <button 
                        onClick={() => setLanguage('vi')}
                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'vi' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        VI
                    </button>
                    <button 
                        onClick={() => setLanguage('en')}
                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'en' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        EN
                    </button>
                </div>
                <button 
                    onClick={toggleTheme}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>
            </div>
        </header>
    );
};

const ImageUploader: React.FC<{
    onImageUpload: (files: FileList) => void;
    onRemoveImage: (index: number) => void;
    sourceImageUrls: string[];
    label: string;
}> = ({ onImageUpload, onRemoveImage, sourceImageUrls, label }) => {
    const { t } = useSettings();
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
            <div className="grid grid-cols-3 gap-2">
                {sourceImageUrls.map((url, index) => (
                    <div key={url} className="relative w-full aspect-square border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <img src={url} alt={`Source ${index + 1}`} className="max-h-full max-w-full object-contain rounded-lg" />
                        <button 
                            onClick={() => onRemoveImage(index)} 
                            className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 hover:bg-red-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
                            aria-label={`Remove image ${index + 1}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
                {sourceImageUrls.length < 5 && (
                    <div className="relative w-full aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group cursor-pointer">
                        <div className="text-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t.add_image}</p>
                            <span className="text-[10px] text-gray-400 dark:text-gray-600 block">{t.paste_hint}</span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="absolute w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => e.target.files && onImageUpload(e.target.files)}
                        />
                    </div>
                )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{sourceImageUrls.length} / 5</p>
        </div>
    );
};

type SortOrder = 'newest' | 'oldest' | 'prompt-asc' | 'prompt-desc';

export default function App() {
    const { addToast } = useToast();
    const { t, language } = useSettings();
    const [prompt, setPrompt] = useState<string>('');
    const [batchPrompt, setBatchPrompt] = useState<string>('');
    const [negativePrompt, setNegativePrompt] = useState<string>('blurry, low quality, bad anatomy');
    const [artisticAngle, setArtisticAngle] = useState<string>('Không có');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [sourceImageFiles, setSourceImageFiles] = useState<File[]>([]);
    const [sourceImageUrls, setSourceImageUrls] = useState<string[]>([]);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRewritingPrompt, setIsRewritingPrompt] = useState<boolean>(false);
    
    // Use custom undo/redo hook for history
    const {
        state: history,
        setState: setHistory,
        undo,
        redo,
        canUndo,
        canRedo
    } = useUndoRedo<GeneratedImage[]>(() => loadHistoryFromLocalStorage(), 10);

    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [quickViewImage, setQuickViewImage] = useState<GeneratedImage | null>(null);
    const [isDownloadingHistory, setIsDownloadingHistory] = useState<boolean>(false);
    const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
    const [imageBeingUpscaledId, setImageBeingUpscaledId] = useState<string | null>(null);

    const [generationMode, setGenerationMode] = useState<'single' | 'batch' | 'restore'>('single');
    const [numVariations, setNumVariations] = useState<number>(2);
    const [isBlurEnabled, setIsBlurEnabled] = useState<boolean>(false);
    const [blurIntensity, setBlurIntensity] = useState<number>(5);
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
    const [useFaceOnly, setUseFaceOnly] = useState<boolean>(false);
    const [copiedPromptType, setCopiedPromptType] = useState<'single' | 'batch' | null>(null);
    const [isGifModalOpen, setIsGifModalOpen] = useState<boolean>(false);
    const [gifSourceImages, setGifSourceImages] = useState<GeneratedImage[] | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [hasApiKey, setHasApiKey] = useState<boolean>(true);

    // Helper to provide friendly error messages
    const getFriendlyErrorMessage = (error: unknown, lang: 'vi'|'en' = 'vi'): string => {
        if (typeof error !== 'object' || error === null) return lang === 'vi' ? "Đã xảy ra lỗi không xác định." : "An unknown error occurred.";
        
        const msg = (error as any).message || (error as any).toString();
        
        // Check for common Gemini/API errors
        if (msg.includes('SAFETY')) return lang === 'vi' ? "Nội dung bị chặn do vi phạm chính sách an toàn." : "Content blocked due to safety policy.";
        if (msg.includes('429')) return lang === 'vi' ? "Hệ thống đang quá tải (Quota Exceeded)." : "Quota Exceeded. Please wait.";
        if (msg.includes('403') || msg.includes('permission') || msg.includes('not found')) {
            // If it's a permission error or "not found" (which can happen with bad keys), reset key state
            setHasApiKey(false);
            return lang === 'vi' ? "Lỗi xác thực API Key. Vui lòng kết nối lại API Key của bạn." : "API Key Authentication Error. Please reconnect your API Key.";
        }
        
        // Generic fallback or original message if it's readable
        return msg.length < 100 ? msg : (lang === 'vi' ? "Đã xảy ra lỗi khi xử lý yêu cầu." : "Error processing request.");
    };

    const controlPanelRef = useRef<HTMLDivElement>(null);

    // Check for API key on mount
    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio) {
                const selected = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(selected);
            }
        };
        checkApiKey();
    }, []);

    const ensureApiKey = async (): Promise<boolean> => {
        if (window.aistudio) {
            const selected = await window.aistudio.hasSelectedApiKey();
            if (!selected) {
                await window.aistudio.openSelectKey();
                // Assume success after opening dialog as per guidelines
                setHasApiKey(true);
                return true;
            }
            return true;
        }
        return true; // Fallback for environments without aistudio
    };
    
    useEffect(() => {
        // Save history to local storage whenever it changes.
        saveHistoryToLocalStorage(history);
    }, [history]);

    // Keyboard shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                 e.preventDefault();
                 redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, addToast]);

    useEffect(() => {
        // Only switch mode if user uploads an image while in the incompatible 'batch' mode.
        if (sourceImageFiles.length > 0 && generationMode === 'batch') {
            setGenerationMode('single');
        }
        // Disable face only mode if source images are removed
        if (sourceImageFiles.length === 0) {
            setUseFaceOnly(false);
        }
    }, [sourceImageFiles, generationMode]);

    const handleImageUpload = (files: FileList | File[]) => {
        const newFiles = files instanceof FileList ? Array.from(files) : files;
        const totalFiles = sourceImageFiles.length + newFiles.length;
        if (totalFiles > 5) {
            addToast(t.err_max_files, 'warning');
            return;
        }

        const filesToUpload = newFiles.slice(0, 5 - sourceImageFiles.length);
        setSourceImageFiles(prev => [...prev, ...filesToUpload]);

        const newUrls = filesToUpload.map(file => URL.createObjectURL(file));
        setSourceImageUrls(prev => [...prev, ...newUrls]);
        
        setGeneratedImages(null);
    };

    // Paste event listener
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            
            const pastedFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image')) {
                    const file = items[i].getAsFile();
                    if (file) pastedFiles.push(file);
                }
            }
            
            if (pastedFiles.length > 0) {
                e.preventDefault();
                handleImageUpload(pastedFiles);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleImageUpload]);

    const handleRemoveImage = (indexToRemove: number) => {
        const urlToRemove = sourceImageUrls[indexToRemove];
        if (urlToRemove) {
            URL.revokeObjectURL(urlToRemove);
        }
        setSourceImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setSourceImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleUseAsSource = (image: GeneratedImage) => {
        const fileName = `${image.prompt.substring(0, 30).replace(/ /g, '_')}.png`;
        const file = base64StrToFile(image.base64, fileName);
        
        // Revoke all old URLs before setting the new one
        sourceImageUrls.forEach(url => URL.revokeObjectURL(url));

        setSourceImageFiles([file]);
        setSourceImageUrls([`data:image/png;base64,${image.base64}`]);
        setPrompt('');
        setGenerationMode('single'); // Default to single edit mode when using an image as source
        setGeneratedImages(null);
        controlPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleViewImage = (image: GeneratedImage) => {
        setSelectedImage(image);
    };

    const handleCloseModal = () => {
        setSelectedImage(null);
    };

    const handleQuickView = (image: GeneratedImage) => {
        setQuickViewImage(image);
    };

    const handleCloseQuickView = () => {
        setQuickViewImage(null);
    };
    
    const handleRewritePrompt = useCallback(async () => {
        if (sourceImageFiles.length === 0) return;
        
        const keyOk = await ensureApiKey();
        if (!keyOk) return;

        setIsRewritingPrompt(true);
        try {
            const newPrompt = await describeImage(sourceImageFiles[0]);
            setPrompt(newPrompt);
        } catch (err) {
            addToast("Error rewriting prompt.", 'error');
        } finally {
            setIsRewritingPrompt(false);
        }
    }, [sourceImageFiles, addToast]);

    const handleUpscale = useCallback(async (imageToUpscale: GeneratedImage) => {
        const keyOk = await ensureApiKey();
        if (!keyOk) return;

        setIsUpscaling(true);
        setImageBeingUpscaledId(imageToUpscale.id);

        // Close any open popups to provide clear feedback
        if (selectedImage) setSelectedImage(null);
        if (quickViewImage) setQuickViewImage(null);
        
        try {
            const fileName = `source_for_upscale_${imageToUpscale.id}.png`;
            const file = base64StrToFile(imageToUpscale.base64, fileName);
            
            const upscaledBase64 = await upscaleImage(file);
            
            const upscaledImage: GeneratedImage = {
                id: crypto.randomUUID(),
                base64: upscaledBase64,
                prompt: `Upscaled: ${imageToUpscale.prompt}`,
                createdAt: new Date(),
            };

            // Add to history and show the result immediately in the modal
            setHistory(prev => [upscaledImage, ...prev].slice(0, 50));
            setSelectedImage(upscaledImage);
            addToast(t.toast_save_success, 'success');

        } catch (err) {
            console.error("Upscaling failed:", err);
            addToast(getFriendlyErrorMessage(err, language), 'error');
        } finally {
            setIsUpscaling(false);
            setImageBeingUpscaledId(null);
        }
    }, [selectedImage, quickViewImage, setHistory, addToast, language, t]);

    const handleCopyPrompt = useCallback((type: 'single' | 'batch') => {
        const textToCopy = type === 'single' ? prompt : batchPrompt;
        if (!textToCopy) return;
    
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopiedPromptType(type);
            addToast(t.toast_copy_success, 'success', 2000);
            setTimeout(() => setCopiedPromptType(null), 2000);
        }).catch(err => {
            console.error('Failed to copy prompt: ', err);
            addToast(t.toast_copy_fail, 'error');
        });
    }, [prompt, batchPrompt, addToast, t]);

    const handleGenerate = useCallback(async () => {
        const keyOk = await ensureApiKey();
        if (!keyOk) return;

        setIsLoading(true);
        setGeneratedImages(null);
        
        try {
            let imagesToSet: GeneratedImage[] = [];
            const hasSourceImages = sourceImageFiles.length > 0;

            if (generationMode === 'restore') {
                if (!hasSourceImages) {
                    addToast(language === 'vi' ? "Vui lòng tải lên ảnh." : "Please upload an image.", 'warning');
                    setIsLoading(false);
                    return;
                }
                const restorePromises = sourceImageFiles.map(file => restoreImage(file));
                const restoredBase64s = await Promise.all(restorePromises);

                imagesToSet = restoredBase64s.map(imageBase64 => ({
                    id: crypto.randomUUID(),
                    base64: imageBase64,
                    prompt: language === 'vi' ? "Ảnh đã được phục chế và nâng cấp" : "Restored and upscaled image",
                    createdAt: new Date(),
                }));

            } else {
                const isBatch = generationMode === 'batch' && !hasSourceImages;
                const currentPrompt = isBatch ? batchPrompt : prompt;

                if (!currentPrompt.trim() && !hasSourceImages) {
                    addToast(t.err_no_prompt, 'warning');
                    setIsLoading(false);
                    return;
                }
                 if (!currentPrompt.trim() && hasSourceImages) {
                    addToast(t.err_no_prompt, 'warning');
                    setIsLoading(false);
                    return;
                }
                
                let blurPromptModifier = '';
                if (isBlurEnabled) {
                    if (blurIntensity <= 3) {
                        blurPromptModifier = ', subtle background blur, shallow depth of field';
                    } else if (blurIntensity <= 7) {
                        blurPromptModifier = ', moderate background blur, bokeh effect';
                    } else {
                        blurPromptModifier = ', strong background blur, heavy bokeh';
                    }
                }

                if (hasSourceImages) { // EDITING (handles multiple)
                    let fullPrompt = prompt + blurPromptModifier;
                    let promptForHistory = fullPrompt;
                    if (negativePrompt && negativePrompt.trim() !== '' && negativePrompt.trim() !== 'blurry, low quality, bad anatomy') {
                        promptForHistory += ` [no: ${negativePrompt}]`;
                    }
                    
                    const editPromises = sourceImageFiles.map(file => editImage(fullPrompt, file, artisticAngle, negativePrompt, useFaceOnly, aspectRatio));
                    const editedBase64s = await Promise.all(editPromises);
                    
                    imagesToSet = editedBase64s.map(imageBase64 => ({
                        id: crypto.randomUUID(),
                        base64: imageBase64,
                        prompt: promptForHistory,
                        createdAt: new Date(),
                    }));
                } else { // GENERATING (single or batch)
                    const promptsToProcess = isBatch
                        ? batchPrompt.split('\n').map(p => p.trim()).filter(Boolean)
                        : [prompt];

                    if (promptsToProcess.length === 0) {
                        addToast(t.err_no_prompt, 'warning');
                        setIsLoading(false);
                        return;
                    }

                    for (const p of promptsToProcess) {
                        let fullPrompt = p;
                        if (artisticAngle !== 'Không có') fullPrompt += `, ${artisticAngle}`;
                        fullPrompt += blurPromptModifier;
                        
                        let promptForHistory = fullPrompt;
                        if (negativePrompt && negativePrompt.trim() !== '' && negativePrompt.trim() !== 'blurry, low quality, bad anatomy') {
                            promptForHistory += ` [no: ${negativePrompt}]`;
                        }
                        
                        const imageBase64s = await generateImages(fullPrompt, aspectRatio, numVariations, negativePrompt);
                        const newImagesForPrompt = imageBase64s.map(base64 => ({
                            id: crypto.randomUUID(),
                            base64,
                            prompt: promptForHistory,
                            createdAt: new Date(),
                        }));
                        imagesToSet.push(...newImagesForPrompt);
                    }
                }
            }

            setGeneratedImages(imagesToSet);
            setHistory(prev => [...imagesToSet.reverse(), ...prev].slice(0, 50));
            addToast(t.toast_save_success, 'success');

        } catch (err) {
            console.error("Generation failed:", err);
            addToast(getFriendlyErrorMessage(err, language), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [
        prompt,
        batchPrompt,
        negativePrompt,
        artisticAngle,
        aspectRatio,
        sourceImageFiles,
        generationMode,
        numVariations,
        isBlurEnabled,
        blurIntensity,
        useFaceOnly,
        setHistory,
        addToast,
        t,
        language
    ]);
    
    const sortedHistory = useMemo(() => {
        const sorted = [...history]; // Create a mutable copy
        switch (sortOrder) {
            case 'oldest':
                return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            case 'prompt-asc':
                return sorted.sort((a, b) => a.prompt.localeCompare(b.prompt));
            case 'prompt-desc':
                return sorted.sort((a, b) => b.prompt.localeCompare(a.prompt));
            case 'newest':
            default:
                return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
    }, [history, sortOrder]);

    const loadJSZip = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (window.JSZip) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load JSZip script.'));
            document.body.appendChild(script);
        });
    };

    const handleDownloadHistory = async () => {
        if (history.length === 0) return;
    
        setIsDownloadingHistory(true);
    
        try {
            await loadJSZip();
            
            const zip = new window.JSZip();
            const filenames = new Set<string>();
    
            history.forEach((image) => {
                const safePrompt = image.prompt.replace(/[^a-z0-9_]/gi, '_').substring(0, 50);
                const date = new Date(image.createdAt);
                const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
                
                let filename = `${dateString}_${safePrompt}.png`;
                
                let counter = 1;
                while (filenames.has(filename)) {
                    filename = `${dateString}_${safePrompt}_${counter++}.png`;
                }
                filenames.add(filename);
    
                zip.file(filename, image.base64, { base64: true });
            });
    
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `ai_studio_history_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            addToast(t.toast_save_success, 'success');
    
        } catch (err) {
            console.error("Failed to download history:", err);
            addToast(t.toast_error_generic, 'error');
        } finally {
            setIsDownloadingHistory(false);
        }
    };
    
    const handleOpenGifModal = () => {
        if (generatedImages && generatedImages.length > 1) {
            setGifSourceImages(generatedImages);
            setIsGifModalOpen(true);
        }
    };
    
    const handleCloseGifModal = () => {
        setIsGifModalOpen(false);
        setGifSourceImages(null);
    };


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 font-sans transition-colors duration-200">
            <Header 
                onOpenHelp={() => setIsHelpOpen(true)} 
                hasApiKey={hasApiKey}
                onConnectKey={ensureApiKey}
            />

            <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
                <div className="flex flex-col gap-8">
                    {/* Control Panel Section */}
                    <div ref={controlPanelRef} className="space-y-6 bg-white dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
                        
                        <div className="flex bg-gray-200 dark:bg-gray-700/80 rounded-lg p-1">
                            <button
                                onClick={() => setGenerationMode('single')}
                                disabled={generationMode === 'batch' && sourceImageFiles.length > 0}
                                className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${generationMode === 'single' ? 'bg-white dark:bg-indigo-600 shadow text-indigo-700 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600/50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {t.mode_single}
                            </button>
                            <button
                                onClick={() => setGenerationMode('batch')}
                                disabled={sourceImageFiles.length > 0}
                                className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${generationMode === 'batch' ? 'bg-white dark:bg-indigo-600 shadow text-indigo-700 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600/50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {t.mode_batch}
                            </button>
                            <button
                                onClick={() => setGenerationMode('restore')}
                                disabled={generationMode === 'batch' && sourceImageFiles.length > 0}
                                className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${generationMode === 'restore' ? 'bg-white dark:bg-indigo-600 shadow text-indigo-700 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600/50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {t.mode_restore}
                            </button>
                        </div>
                        
                        <ImageUploader 
                           onImageUpload={handleImageUpload}
                           onRemoveImage={handleRemoveImage}
                           sourceImageUrls={sourceImageUrls}
                           label={t.upload_label}
                        />

                        {sourceImageFiles.length > 0 && generationMode !== 'restore' && (
                            <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="mr-3">
                                    <label htmlFor="face-only-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t.face_only_label}
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.face_only_desc}</p>
                                </div>
                                <button
                                    id="face-only-toggle"
                                    onClick={() => setUseFaceOnly(!useFaceOnly)}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-200 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 ${useFaceOnly ? 'bg-indigo-600' : 'bg-gray-400 dark:bg-gray-600'}`}
                                    aria-pressed={useFaceOnly}
                                    role="switch"
                                >
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${useFaceOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        )}

                        {generationMode !== 'restore' && (
                            <div className="border-t border-gray-200 dark:border-gray-700/50 pt-6">
                                <div className="space-y-6">
                                    {generationMode === 'single' ? (
                                        <div>
                                            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t.prompt_label}
                                            </label>
                                            <div className="relative">
                                                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleCopyPrompt('single')}
                                                        disabled={!prompt || copiedPromptType === 'single'}
                                                        className="text-xs flex items-center gap-1.5 py-1 px-2.5 rounded-md bg-gray-200/80 dark:bg-gray-700/60 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-70"
                                                        title={copiedPromptType === 'single' ? t.btn_copied : t.btn_copy}
                                                    >
                                                        {copiedPromptType === 'single' ? (
                                                            <>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                <span className="text-green-600 dark:text-green-400 font-medium">{t.btn_copied}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                                <span className="text-gray-600 dark:text-gray-300">{t.btn_copy}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setPrompt('')}
                                                        disabled={!prompt}
                                                        className="text-xs flex items-center justify-center p-1.5 rounded-md bg-gray-200/80 dark:bg-gray-700/60 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-70"
                                                        title={t.btn_clear}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <textarea
                                                    id="prompt"
                                                    value={prompt}
                                                    onChange={(e) => setPrompt(e.target.value)}
                                                    placeholder={
                                                        sourceImageFiles.length > 0 
                                                            ? (useFaceOnly 
                                                                ? t.prompt_placeholder_face
                                                                : t.prompt_placeholder_edit) 
                                                            : t.prompt_placeholder_create
                                                    }
                                                    className="w-full h-32 p-3 pr-32 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 dark:text-gray-200"
                                                />
                                                <button 
                                                    onClick={handleRewritePrompt}
                                                    disabled={sourceImageFiles.length === 0 || isRewritingPrompt}
                                                    className="absolute bottom-2 right-2 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md transition-colors"
                                                >
                                                    {isRewritingPrompt ? <Spinner/> : t.btn_rewrite}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label htmlFor="batch-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t.batch_prompt_label}
                                            </label>
                                            <div className="relative">
                                                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleCopyPrompt('batch')}
                                                        disabled={!batchPrompt || copiedPromptType === 'batch'}
                                                        className="text-xs flex items-center gap-1.5 py-1 px-2.5 rounded-md bg-gray-200/80 dark:bg-gray-700/60 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-70"
                                                        title={copiedPromptType === 'batch' ? t.btn_copied : t.btn_copy}
                                                    >
                                                        {copiedPromptType === 'batch' ? (
                                                            <>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                <span className="text-green-600 dark:text-green-400 font-medium">{t.btn_copied}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                                <span className="text-gray-600 dark:text-gray-300">{t.btn_copy}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setBatchPrompt('')}
                                                        disabled={!batchPrompt}
                                                        className="text-xs flex items-center justify-center p-1.5 rounded-md bg-gray-200/80 dark:bg-gray-700/60 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-70"
                                                        title={t.btn_clear}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <textarea
                                                    id="batch-prompt"
                                                    value={batchPrompt}
                                                    onChange={(e) => setBatchPrompt(e.target.value)}
                                                    placeholder={t.batch_placeholder}
                                                    className="w-full h-40 p-3 pr-32 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 dark:text-gray-200"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t.negative_prompt_label}
                                        </label>
                                        <input
                                            id="negative-prompt"
                                            type="text"
                                            value={negativePrompt}
                                            onChange={(e) => setNegativePrompt(e.target.value)}
                                            placeholder={t.negative_placeholder}
                                            className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 dark:text-gray-200"
                                        />
                                    </div>
                                
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.aspect_ratio}</label>
                                            <select
                                                id="aspect-ratio"
                                                value={aspectRatio}
                                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                                disabled={sourceImageFiles.length > 0 && !useFaceOnly}
                                                className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-200"
                                            >
                                                {ASPECT_RATIOS.map(ratio => (
                                                    <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="artistic-angle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.artistic_angle}</label>
                                            <select
                                                id="artistic-angle"
                                                value={artisticAngle}
                                                onChange={(e) => setArtisticAngle(e.target.value)}
                                                className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 dark:text-gray-200"
                                            >
                                                {ARTISTIC_ANGLES.map(angle => (
                                                    <option key={angle} value={angle}>{angle}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {sourceImageFiles.length === 0 && generationMode !== 'batch' && (
                                        <div>
                                            <label htmlFor="num-variations" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.num_variations}: {numVariations}</label>
                                            <input
                                                id="num-variations"
                                                type="range"
                                                min="1"
                                                max="4"
                                                value={numVariations}
                                                onChange={(e) => setNumVariations(Number(e.target.value))}
                                                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="blur-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t.blur_bg}
                                            </label>
                                            <button
                                                id="blur-toggle"
                                                onClick={() => setIsBlurEnabled(!isBlurEnabled)}
                                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isBlurEnabled ? 'bg-indigo-600' : 'bg-gray-400 dark:bg-gray-600'}`}
                                                aria-pressed={isBlurEnabled}
                                            >
                                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isBlurEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        {isBlurEnabled && (
                                            <div>
                                                <label htmlFor="blur-intensity" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t.blur_intensity}</label>
                                                <input
                                                    id="blur-intensity"
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={blurIntensity}
                                                    onChange={(e) => setBlurIntensity(Number(e.target.value))}
                                                    className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isLoading ? <Spinner /> : (generationMode === 'restore' ? t.btn_restore : t.btn_generate)}
                        </button>
                        
                    </div>

                    {/* Results Section */}
                    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[60vh] flex flex-col shadow-sm transition-colors duration-200">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-200">{t.results_title}</h2>
                        <div className="flex-grow">
                            {(isLoading || isUpscaling) && (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <div className="text-indigo-600 dark:text-white"><Spinner /></div>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">{isUpscaling ? t.loading_upscale : t.loading_generate}</p>
                                </div>
                            )}
                            {!isLoading && !isUpscaling && !generatedImages && (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500 p-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">{t.empty_state_title}</h3>
                                    <p className="max-w-md mt-1">{t.empty_state_desc}</p>
                                </div>
                            )}
                            {generatedImages && !isUpscaling && (
                                <>
                                    {generatedImages.length > 1 && (
                                        <div className="text-center mb-4">
                                            <button
                                                onClick={handleOpenGifModal}
                                                className="py-2 px-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" /></svg>
                                                GIF
                                            </button>
                                        </div>
                                    )}
                                    <div className={`grid gap-4 ${generatedImages.length > 1 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 place-items-center'}`}>
                                        {generatedImages.map((image) => (
                                            <div key={image.id} className="group relative aspect-square w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/50 shadow-md">
                                                <img
                                                    src={`data:image/png;base64,${image.base64}`}
                                                    alt={image.prompt}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 flex flex-col justify-end">
                                                    <p className="text-xs text-gray-300 line-clamp-3 mb-2">{image.prompt}</p>
                                                    <div className="flex gap-1.5 justify-end">
                                                        <button onClick={() => handleViewImage(image)} className="p-1.5 bg-gray-700/80 hover:bg-gray-600/80 rounded-full" title="View"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" /></svg></button>
                                                        <button onClick={() => handleQuickView(image)} className="p-1.5 bg-gray-700/80 hover:bg-gray-600/80 rounded-full" title="Quick View"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                                        {isUpscaling && imageBeingUpscaledId === image.id ? (
                                                            <div className="p-1.5 bg-purple-600/80 rounded-full"><Spinner/></div>
                                                        ) : (
                                                            <button onClick={() => handleUpscale(image)} className="p-1.5 bg-purple-600/80 hover:bg-purple-500/80 rounded-full" title="Upscale"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">{t.history_title}</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 mr-2 border border-gray-200 dark:border-gray-600">
                                     <button
                                        onClick={() => { undo(); addToast("Undo", 'info', 2000); }}
                                        disabled={!canUndo}
                                        className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Undo (Ctrl+Z)"
                                     >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                     </button>
                                     <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                     <button
                                        onClick={() => { redo(); addToast("Redo", 'info', 2000); }}
                                        disabled={!canRedo}
                                        className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Redo (Ctrl+Shift+Z)"
                                     >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                        </svg>
                                     </button>
                                </div>
                                 <select 
                                    value={sortOrder} 
                                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 text-gray-900 dark:text-white"
                                >
                                    <option value="newest">{t.sort_newest}</option>
                                    <option value="oldest">{t.sort_oldest}</option>
                                    <option value="prompt-asc">{t.sort_az}</option>
                                    <option value="prompt-desc">{t.sort_za}</option>
                                </select>
                                <button
                                    onClick={handleDownloadHistory}
                                    disabled={history.length === 0 || isDownloadingHistory}
                                    className="flex items-center gap-2 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {isDownloadingHistory ? <div className="text-gray-900 dark:text-white"><Spinner/></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                    {t.btn_download_all}
                                </button>
                            </div>
                        </div>
                         {history.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {sortedHistory.map((image) => (
                                    <div key={image.id} className="group relative aspect-square w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/50 shadow-md">
                                        <img
                                            src={`data:image/png;base64,${image.base64}`}
                                            alt={image.prompt}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 flex flex-col justify-end">
                                            <p className="text-xs text-gray-300 line-clamp-3 mb-2">{image.prompt}</p>
                                            <div className="flex gap-1.5 justify-end">
                                                 <button onClick={() => handleViewImage(image)} className="p-1.5 bg-gray-700/80 hover:bg-gray-600/80 rounded-full" title="View"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" /></svg></button>
                                                <button onClick={() => handleQuickView(image)} className="p-1.5 bg-gray-700/80 hover:bg-gray-600/80 rounded-full" title="Quick View"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 dark:text-gray-500 py-8">{t.history_empty}</p>
                        )}
                    </div>

                </div>
            </div>

            {selectedImage && <ImageModal image={selectedImage} onClose={handleCloseModal} onUpscale={handleUpscale} onUseAsSource={handleUseAsSource} isUpscaling={isUpscaling && imageBeingUpscaledId === selectedImage.id} />}
            {quickViewImage && <QuickViewPanel image={quickViewImage} onClose={handleCloseQuickView} onUseAsSource={handleUseAsSource} onUpscale={handleUpscale} isUpscaling={isUpscaling && imageBeingUpscaledId === quickViewImage.id} />}
            {isGifModalOpen && gifSourceImages && (
                <GifCreatorModal images={gifSourceImages} onClose={handleCloseGifModal} />
            )}
            {isHelpOpen && (
                <HelpModal onClose={() => setIsHelpOpen(false)} />
            )}
        </div>
    );
}