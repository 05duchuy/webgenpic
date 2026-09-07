
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeneratedImage } from '../types';
import Spinner from './Spinner';

declare global {
    interface Window {
        GIF: any;
    }
}

const loadGifJs = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.GIF) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load gif.js script.'));
        document.body.appendChild(script);
    });
};

interface GifCreatorModalProps {
    images: GeneratedImage[];
    onClose: () => void;
}

const GifCreatorModal: React.FC<GifCreatorModalProps> = ({ images, onClose }) => {
    const [frames, setFrames] = useState<GeneratedImage[]>(images);
    const [delay, setDelay] = useState<number>(200); // ms
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // For live preview
    const [previewIndex, setPreviewIndex] = useState(0);
    const previewIntervalRef = useRef<number | null>(null);
    
    const draggedItemIndex = useRef<number | null>(null);
    const draggedOverItemIndex = useRef<number | null>(null);

    // Effect for live preview animation
    useEffect(() => {
        if (previewIntervalRef.current) {
            clearInterval(previewIntervalRef.current);
        }
        if (frames.length > 0) {
            previewIntervalRef.current = window.setInterval(() => {
                setPreviewIndex(prevIndex => (prevIndex + 1) % frames.length);
            }, delay);
        }

        return () => {
            if (previewIntervalRef.current) {
                clearInterval(previewIntervalRef.current);
            }
        };
    }, [frames, delay]);

    const handleGenerateGif = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedGifUrl(null);

        try {
            await loadGifJs();
            const gif = new window.GIF({
                workers: 2,
                quality: 10,
                workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
            });

            const imagePromises = frames.map(frame => {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('Failed to load image for GIF frame.'));
                    img.src = `data:image/png;base64,${frame.base64}`;
                });
            });

            const loadedImages = await Promise.all(imagePromises);
            
            loadedImages.forEach(img => {
                gif.addFrame(img, { delay: delay });
            });

            gif.on('finished', (blob: Blob) => {
                const url = URL.createObjectURL(blob);
                setGeneratedGifUrl(url);
                setIsLoading(false);
            });
            
            gif.on('abort', () => {
                setError('GIF generation was aborted.');
                setIsLoading(false);
            });

            gif.render();

        } catch (err) {
            console.error(err);
            setError('An error occurred while generating the GIF. Please try again.');
            setIsLoading(false);
        }
    }, [frames, delay]);

    const handleSort = () => {
        if (draggedItemIndex.current === null || draggedOverItemIndex.current === null || draggedItemIndex.current === draggedOverItemIndex.current) {
            return;
        }
        const _frames = [...frames];
        const draggedItem = _frames.splice(draggedItemIndex.current, 1)[0];
        _frames.splice(draggedOverItemIndex.current, 0, draggedItem);
        draggedItemIndex.current = null;
        draggedOverItemIndex.current = null;
        setFrames(_frames);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        GIF Creator Studio
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                        aria-label="Close GIF Creator"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto min-h-0">
                    {/* Left Panel: Preview & Controls */}
                    <div className="flex flex-col space-y-4">
                        <div className="w-full aspect-square bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden border border-gray-700">
                            {frames.length > 0 && <img src={`data:image/png;base64,${frames[previewIndex].base64}`} alt="GIF Preview" className="max-w-full max-h-full object-contain" />}
                        </div>
                        <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg">
                            <label htmlFor="speed-slider" className="block text-sm font-medium text-gray-300">Tốc độ (Delay: {delay}ms)</label>
                            <input
                                id="speed-slider"
                                type="range"
                                min="100"
                                max="2000"
                                step="100"
                                value={delay}
                                onChange={e => setDelay(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                         {error && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</p>}
                    </div>

                    {/* Right Panel: Frame list */}
                    <div className="flex flex-col min-h-0">
                        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Thứ tự khung hình (kéo thả để sắp xếp)</h3>
                        <div className="grid grid-cols-3 gap-2 flex-grow overflow-y-auto p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                           {frames.map((frame, index) => (
                                <div
                                    key={frame.id}
                                    className="relative aspect-square bg-gray-700 rounded-md cursor-grab active:cursor-grabbing"
                                    draggable
                                    onDragStart={() => (draggedItemIndex.current = index)}
                                    onDragEnter={() => (draggedOverItemIndex.current = index)}
                                    onDragEnd={handleSort}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    <img src={`data:image/png;base64,${frame.base64}`} alt={`Frame ${index + 1}`} className="w-full h-full object-cover rounded-md pointer-events-none"/>
                                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-mono pointer-events-none">{index + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-6 pt-4 flex justify-end items-center gap-4 flex-shrink-0">
                    {generatedGifUrl ? (
                        <a
                            href={generatedGifUrl}
                            download={`ai_studio_animation_${Date.now()}.gif`}
                            className="w-48 flex items-center justify-center py-2 px-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Tải GIF
                        </a>
                    ) : (
                        <button
                            onClick={handleGenerateGif}
                            disabled={isLoading}
                            className="w-48 flex items-center justify-center py-2 px-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isLoading ? <Spinner /> : 'Tạo GIF'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GifCreatorModal;
