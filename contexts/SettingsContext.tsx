import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'vi' | 'en';
type Theme = 'dark' | 'light';

// Translation Dictionary
const translations = {
    vi: {
        app_title: "AI Image Studio Pro",
        app_subtitle: "Tạo và chỉnh sửa ảnh với sức mạnh của AI",
        mode_single: "Chỉnh sửa / Tạo lẻ",
        mode_batch: "Tạo hàng loạt",
        mode_restore: "Phục chế ảnh",
        upload_label: "Ảnh gốc (tùy chọn)",
        add_image: "Thêm ảnh",
        paste_hint: "(hoặc dán Ctrl+V)",
        face_only_label: "Tạo ảnh mới, chỉ giữ lại khuôn mặt",
        face_only_desc: "Bỏ qua hậu cảnh, quần áo, v.v. của ảnh gốc.",
        prompt_label: "Mô tả (Prompt)",
        prompt_placeholder_face: "Mô tả bối cảnh mới cho khuôn mặt, vd: 'phi hành gia trên mặt trăng'",
        prompt_placeholder_edit: "Mô tả thay đổi bạn muốn, vd: 'thay áo sơ mi thành áo vest'",
        prompt_placeholder_create: "Mô tả hình ảnh bạn muốn tạo, vd: 'một con mèo phi hành gia'",
        batch_prompt_label: "Danh sách ý tưởng (mỗi dòng một ý)",
        batch_placeholder: "Mèo phi hành gia\nChó lướt ván\nCáo đọc sách",
        negative_prompt_label: "Prompt phủ định (Không muốn có)",
        negative_placeholder: "Vd: xấu, mờ, chất lượng thấp",
        aspect_ratio: "Tỉ lệ khung hình",
        artistic_angle: "Góc máy nghệ thuật",
        num_variations: "Số lượng biến thể",
        blur_bg: "Làm mờ hậu cảnh (Bokeh)",
        blur_intensity: "Cường độ mờ",
        btn_generate: "Tạo ảnh",
        btn_restore: "Phục chế ảnh",
        btn_upscale: "Nâng cấp (Upscale)",
        btn_use_source: "Dùng làm mẫu",
        btn_download: "Tải về",
        btn_download_all: "Tải xuống tất cả",
        results_title: "Kết quả",
        history_title: "Lịch sử",
        history_empty: "Lịch sử trống",
        loading_upscale: "AI đang nâng cấp ảnh của bạn...",
        loading_generate: "AI đang sáng tạo, vui lòng chờ trong giây lát...",
        empty_state_title: "Không gian sáng tạo của bạn",
        empty_state_desc: "Các hình ảnh bạn tạo hoặc chỉnh sửa sẽ xuất hiện ở đây.",
        toast_copy_success: "Đã sao chép prompt!",
        toast_copy_fail: "Không thể sao chép",
        toast_save_success: "Đã lưu ảnh!",
        toast_error_generic: "Đã xảy ra lỗi",
        btn_copy: "Chép",
        btn_copied: "Đã chép!",
        btn_clear: "Xóa",
        btn_rewrite: "Viết lại tự động",
        sort_newest: "Mới nhất",
        sort_oldest: "Cũ nhất",
        sort_az: "Prompt A-Z",
        sort_za: "Prompt Z-A",
        help_title: "Hướng dẫn sử dụng",
        help_btn: "Hướng dẫn",
        err_max_files: "Bạn chỉ có thể tải lên tối đa 5 ảnh.",
        err_no_prompt: "Vui lòng nhập nội dung.",
    },
    en: {
        app_title: "AI Image Studio Pro",
        app_subtitle: "Create and edit images with AI power",
        mode_single: "Edit / Single Gen",
        mode_batch: "Batch Generation",
        mode_restore: "Photo Restoration",
        upload_label: "Source Images (Optional)",
        add_image: "Add Image",
        paste_hint: "(or paste Ctrl+V)",
        face_only_label: "New image, keep face only",
        face_only_desc: "Ignore background, clothes, etc. of the original.",
        prompt_label: "Prompt",
        prompt_placeholder_face: "Describe new context for the face, e.g., 'astronaut on the moon'",
        prompt_placeholder_edit: "Describe changes, e.g., 'change shirt to a suit'",
        prompt_placeholder_create: "Describe the image, e.g., 'a cat astronaut'",
        batch_prompt_label: "List of ideas (one per line)",
        batch_placeholder: "Cat astronaut\nDog surfing\nFox reading",
        negative_prompt_label: "Negative Prompt (Avoid)",
        negative_placeholder: "e.g., ugly, blurry, low quality",
        aspect_ratio: "Aspect Ratio",
        artistic_angle: "Artistic Angle",
        num_variations: "Variations count",
        blur_bg: "Blur Background (Bokeh)",
        blur_intensity: "Blur Intensity",
        btn_generate: "Generate",
        btn_restore: "Restore Photo",
        btn_upscale: "Upscale",
        btn_use_source: "Use as Source",
        btn_download: "Download",
        btn_download_all: "Download All",
        results_title: "Results",
        history_title: "History",
        history_empty: "History is empty",
        loading_upscale: "AI is upscaling your image...",
        loading_generate: "AI is creating, please wait...",
        empty_state_title: "Your Creative Space",
        empty_state_desc: "Images you create or edit will appear here.",
        toast_copy_success: "Prompt copied!",
        toast_copy_fail: "Failed to copy",
        toast_save_success: "Image saved!",
        toast_error_generic: "An error occurred",
        btn_copy: "Copy",
        btn_copied: "Copied!",
        btn_clear: "Clear",
        btn_rewrite: "Auto Rewrite",
        sort_newest: "Newest",
        sort_oldest: "Oldest",
        sort_az: "Prompt A-Z",
        sort_za: "Prompt Z-A",
        help_title: "User Guide",
        help_btn: "Guide",
        err_max_files: "You can only upload up to 5 images.",
        err_no_prompt: "Please enter a prompt.",
    }
};

interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: Theme;
    toggleTheme: () => void;
    t: typeof translations['vi'];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('vi');
    const [theme, setTheme] = useState<Theme>('dark');

    // Initialize Theme
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        if (storedTheme) {
            setTheme(storedTheme);
            if (storedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } else {
            // Default to dark
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        // Could save to local storage if needed
    };

    return (
        <SettingsContext.Provider value={{ 
            language, 
            setLanguage: handleSetLanguage, 
            theme, 
            toggleTheme,
            t: translations[language] 
        }}>
            {children}
        </SettingsContext.Provider>
    );
};