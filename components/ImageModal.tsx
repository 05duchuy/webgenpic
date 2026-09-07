import React from 'react';
import { GeneratedImage } from '../types';
import Spinner from './Spinner';

interface ImageModalProps {
    image: GeneratedImage;
    onClose: () => void;
    onUpscale: (image: GeneratedImage) => void;
    onUseAsSource: (image: GeneratedImage) => void;
    isUpscaling: boolean;
}

const ImageModal: React.FC<ImageModalProps> = ({ image, onClose, onUpscale, onUseAsSource, isUpscaling }) => {
    
    const handleUseAsSource = () => {
        onUseAsSource(image);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <style>
                {`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                `}
            </style>
            <div 
                className="relative w-full h-full flex flex-col items-center justify-center gap-4"
                // Stop click from bubbling up to the backdrop and closing the modal
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={`data:image/png;base64,${image.base64}`} 
                    alt={image.prompt} 
                    className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                />
                 <div className="flex flex-wrap items-center justify-center gap-3 p-4 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg">
                    <button
                        onClick={() => onUpscale(image)}
                        disabled={isUpscaling}
                        className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-wait transition-colors"
                        title="Tăng độ phân giải và chi tiết cho ảnh"
                    >
                        {isUpscaling ? <Spinner /> : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>
                        )}
                        {isUpscaling ? 'Đang nâng cấp...' : 'Nâng cấp (Upscale)'}
                    </button>

                    <button
                        onClick={handleUseAsSource}
                        className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
                        title="Dùng ảnh này làm đầu vào để chỉnh sửa tiếp"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                        </svg>
                        Dùng làm mẫu
                    </button>

                    <a 
                        href={`data:image/png;base64,${image.base64}`} 
                        download={`${image.prompt.substring(0,30).replace(/ /g, '_')}.png`} 
                        className="flex items-center justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
                        title="Tải ảnh về máy"
                        onClick={(e) => e.stopPropagation()} 
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Tải về
                    </a>
                </div>
                 <button 
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-300 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Close image view"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ImageModal;