require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path'); // Thêm module path để quản lý đường dẫn

const app = express();
const port = process.env.PORT || 3000;

// Cấu hình Middleware
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json());

// ==========================================
// PHỤC VỤ GIAO DIỆN WEB (FRONTEND)
// ==========================================
// Lệnh này giúp server tự động tìm và trả về file index.html cùng các file tĩnh (CSS, JS, ảnh) trong thư mục "public"
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Multer để lưu file tạm vào RAM (bộ nhớ đệm)
const upload = multer({ storage: multer.memoryStorage() });

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// HÀM: Viết lại Prompt bằng Gemini
// ==========================================
async function optimizePrompt(userPrompt) {
    try {
        // Dùng model flash vì nó nhẹ, nhanh và miễn phí cao
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        
        const systemInstruction = `Bạn là một Prompt Engineer chuyên nghiệp cho Midjourney và Stable Diffusion. 
        Nhiệm vụ của bạn là dịch ý tưởng của người dùng sang tiếng Anh, sau đó thêm các từ khóa nghệ thuật để bức ảnh trở nên lộng lẫy, chi tiết và đẹp mắt nhất.
        Ví dụ: "chó đội nón" -> "A photorealistic portrait of a cute golden retriever wearing a red baseball cap, cinematic lighting, 8k resolution, highly detailed, Unreal Engine 5 render".
        CHỈ TRẢ VỀ NỘI DUNG PROMPT TIẾNG ANH, KHÔNG GIẢI THÍCH GÌ THÊM.`;

        const result = await model.generateContent(`${systemInstruction}\n\nÝ tưởng của người dùng: ${userPrompt}`);
        return result.response.text().trim();
    } catch (error) {
        console.error("Lỗi Gemini:", error);
        throw new Error("Không thể tối ưu prompt qua Gemini.", error.toString());
    }
}

// ==========================================
// HÀM: Tạo ảnh qua Hugging Face (Text-to-Image)
// ==========================================
async function generateImage(prompt) {
    const HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
    
    const response = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Xử lý lỗi model đang loading của Hugging Face
        if (errorData.error && errorData.error.includes('currently loading')) {
            throw new Error(`AI đang khởi động, vui lòng thử lại sau ${Math.ceil(errorData.estimated_time)} giây.`);
        }
        throw new Error("Lỗi từ Hugging Face API.");
    }

    // Lấy dữ liệu ảnh dưới dạng ArrayBuffer -> chuyển thành Base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
}

// ==========================================
// API ROUTE CHÍNH
// ==========================================
app.post('/api/generate', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const imageFile = req.file;

        if (!prompt) {
            return res.status(400).json({ message: "Vui lòng nhập prompt!" });
        }

        console.log(`[1] Nhận yêu cầu: "${prompt}"`);

        // 1. Dùng Gemini để biến prompt cộc lốc thành prompt chuyên nghiệp
        console.log(`[2] Đang gọi Gemini tối ưu prompt...`);
        const optimizedPrompt = await optimizePrompt(prompt);
        console.log(`[3] Prompt tối ưu: ${optimizedPrompt}`);

        // 2. Tạo/Chỉnh sửa ảnh qua Hugging Face
        let imageBase64 = "";

        if (imageFile) {
            // LƯU Ý DÀNH CHO BẠN:
            // Tính năng Image-to-Image trên API miễn phí của Hugging Face khá phức tạp (cần cấu hình model InstructPix2Pix và gửi binary data). 
            // Để hệ thống không bị crash, ở phiên bản này, nếu user up ảnh, ta sẽ ưu tiên lấy prompt đã tối ưu để generate ảnh mới.
            console.log(`[4] Có file ảnh đính kèm (Tính năng Image-to-Image đang trong giai đoạn dev). Đang dùng Text-to-Image làm mặc định...`);
            imageBase64 = await generateImage(optimizedPrompt);
        } else {
            console.log(`[4] Đang gọi Hugging Face (Text-to-Image)...`);
            imageBase64 = await generateImage(optimizedPrompt);
        }

        console.log(`[5] Thành công! Trả kết quả về Frontend.`);
        // 3. Trả kết quả về Frontend
        res.json({
            optimizedPrompt: optimizedPrompt,
            imageBase64: imageBase64
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Lỗi máy chủ nội bộ." });
    }
});

// ==========================================
// CATCH-ALL ROUTE (Dự phòng)
// ==========================================
// Đảm bảo rằng nếu người dùng gõ đường dẫn sai hoặc load lại trang, 
// họ vẫn sẽ được trả về file index.html nằm trong thư mục public.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Chạy server
app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});