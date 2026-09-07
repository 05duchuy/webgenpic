import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import Spinner from './Spinner';
import { useToast } from '../contexts/ToastContext';

interface QuickViewPanelProps {
    image: GeneratedImage;
    onClose: () => void;
    onUseAsSource: (image: GeneratedImage) => void;
    onUpscale: (image: GeneratedImage) => void;
    isUpscaling: boolean;
}

const QuickViewPanel: React.FC<QuickViewPanelProps> = ({ image, onClose, onUseAsSource, onUpscale, isUpscaling }) => {
    const { addToast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const handleUseAsSourceClick = () => {
        onUseAsSource(image);
        onClose(); // Close panel after action
    };

    const handleCopyPrompt = () => {
        if (isCopied) return;
        navigator.clipboard.writeText(image.prompt).then(() => {
            setIsCopied(true);
            addToast("Prompt đã được sao chép vào bộ nhớ tạm", 'success', 2000);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy prompt: ', err);
            addToast("Không thể sao chép prompt", 'error');
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-40 flex justify-end animate-fade-in-backdrop"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <style>{`
                @keyframes fade-in-backdrop {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in-backdrop {
                    animation: fade-in-backdrop 0.3s ease-out forwards;
                }
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out forwards;
                }
            `}</style>
            <div
                className="w-full max-w-md h-full bg-gray-800 border-l border-gray-700 shadow-2xl p-6 flex flex-col text-white animate-slide-in-right"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Quick View</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Close quick view"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    <div className="w-full aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4 border border-gray-700">
                         <img src={`data:image/png;base64,${image.base64}`} alt={image.prompt} className="w-full h-full object-contain"/>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium text-gray-400">Prompt</h3>
                            <button
                                onClick={handleCopyPrompt}
                                disabled={isCopied}
                                className="text-xs flex items-center gap-1.5 py-1 px-2.5 rounded-md bg-gray-700/50 hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:bg-green-600/30"
                                title="Chép prompt"
                            >
                                {isCopied ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <span className="text-green-400 font-medium">Đã chép!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        <span className="text-gray-300">Chép</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-base bg-gray-900/50 p-3 rounded-md whitespace-pre-wrap break-words">{image.prompt}</p>
                    </div>
                </div>
                
                <div className="mt-6 border-t border-gray-700 pt-6 flex flex-col space-y-3">
                    <button
                        onClick={() => onUpscale(image)}
                        disabled={isUpscaling}
                        className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-wait"
                    >
                        {isUpscaling ? <Spinner /> : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                        )}
                        {isUpscaling ? 'Đang nâng cấp...' : 'Nâng cấp (Upscale)'}
                    </button>
                     <button
                        onClick={handleUseAsSourceClick}
                        className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                        Dùng ảnh này để chỉnh sửa
                    </button>
                    <a 
                        href={`data:image/png;base64,${image.base64}`} 
                        download={`${image.prompt.substring(0,30).replace(/ /g, '_')}.png`} 
                        className="w-full flex items-center justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Tải ảnh xuống
                    </a>
                </div>
            </div>
        </div>
    );
};

export default QuickViewPanel;