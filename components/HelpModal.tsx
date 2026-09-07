import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface HelpModalProps {
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
    const { language, t } = useSettings();

    const renderContent = () => {
        if (language === 'vi') {
            return (
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">1. Chế độ Chỉnh sửa / Tạo lẻ</h3>
                        <p>Dùng để tạo ảnh mới từ văn bản hoặc chỉnh sửa ảnh có sẵn.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li><strong>Tạo mới:</strong> Nhập mô tả vào ô "Prompt" và nhấn "Tạo ảnh".</li>
                            <li><strong>Chỉnh sửa:</strong> Tải ảnh lên mục "Ảnh gốc", nhập mô tả thay đổi (ví dụ: "đổi màu tóc thành đỏ").</li>
                            <li><strong>Chỉ giữ mặt (Face Lock):</strong> Bật tùy chọn "Tạo ảnh mới, chỉ giữ lại khuôn mặt" để thay đổi hoàn toàn bối cảnh nhưng giữ nguyên gương mặt nhân vật.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">2. Tạo hàng loạt</h3>
                        <p>Tạo nhiều ảnh cùng lúc với các ý tưởng khác nhau.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Mỗi dòng trong ô nhập liệu sẽ tương ứng với một ảnh được tạo ra.</li>
                            <li>Chế độ này không hỗ trợ ảnh gốc.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">3. Phục chế ảnh</h3>
                        <p>Nâng cấp chất lượng ảnh cũ, mờ hoặc vỡ nét.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Tải ảnh cần phục chế lên.</li>
                            <li>Nhấn "Phục chế ảnh". Hệ thống sẽ tự động làm nét, khử nhiễu, cân bằng màu sắc và tăng độ phân giải (giả lập máy ảnh Phase One).</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">4. Viết lại Prompt tự động</h3>
                        <p>Tính năng hỗ trợ phân tích ảnh mẫu và tạo mô tả chi tiết giúp bạn.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Tải <strong>một</strong> ảnh lên mục "Ảnh gốc".</li>
                            <li>Nhấn nút <strong>"Viết lại tự động"</strong> nằm góc dưới ô nhập Prompt.</li>
                            <li>AI sẽ phân tích nội dung ảnh (ánh sáng, chủ thể, phong cách...) và tự động điền mô tả chi tiết vào ô Prompt.</li>
                            <li>Bạn có thể chỉnh sửa lại mô tả này trước khi nhấn "Tạo ảnh" để có kết quả như ý.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">5. Các tính năng khác</h3>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li><strong>Nâng cấp (Upscale):</strong> Tăng độ phân giải ảnh lên 4 lần.</li>
                            <li><strong>Làm mờ hậu cảnh:</strong> Tạo hiệu ứng xóa phông chuyên nghiệp.</li>
                            <li><strong>Tạo GIF:</strong> Chọn nhiều ảnh từ kết quả để tạo ảnh động.</li>
                        </ul>
                    </section>
                </div>
            );
        } else {
            return (
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">1. Edit / Single Generation</h3>
                        <p>Use this to generate new images from text or edit existing ones.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li><strong>Create:</strong> Enter description in "Prompt" and click "Generate".</li>
                            <li><strong>Edit:</strong> Upload an image to "Source Images", describe the change (e.g., "change hair color to red").</li>
                            <li><strong>Face Lock:</strong> Enable "New image, keep face only" to completely change the context while preserving the subject's face.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">2. Batch Generation</h3>
                        <p>Create multiple images at once with different ideas.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Each line in the input box corresponds to one generated image.</li>
                            <li>This mode does not support source images.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">3. Photo Restoration</h3>
                        <p>Upgrade old, blurry, or low-quality photos.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Upload the photo you want to restore.</li>
                            <li>Click "Restore Photo". The system automatically sharpens, denoises, color balances, and upscales (Phase One simulation).</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">4. Auto Prompt Rewrite</h3>
                        <p>Analyzes a reference image and generates a detailed description for you.</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Upload <strong>one</strong> image to "Source Images".</li>
                            <li>Click the <strong>"Auto Rewrite"</strong> button located at the bottom of the Prompt input box.</li>
                            <li>AI will analyze the image (lighting, subject, style...) and automatically fill the Prompt box with a detailed description.</li>
                            <li>You can edit this description before clicking "Generate" to fine-tune the result.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">5. Other Features</h3>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li><strong>Upscale:</strong> Increase image resolution by 4x.</li>
                            <li><strong>Blur Background:</strong> Create professional bokeh effects.</li>
                            <li><strong>Create GIF:</strong> Select multiple result images to create an animation.</li>
                        </ul>
                    </section>
                </div>
            );
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
             <div 
                className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.help_title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {renderContent()}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;