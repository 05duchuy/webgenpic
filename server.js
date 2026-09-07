require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Cấu hình Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Multer
const upload = multer({ storage: multer.memoryStorage() });

// Khởi tạo Gemini với error handling
let genAI;
try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini API initialized');
} catch (error) {
    console.error('❌ Lỗi khởi tạo Gemini:', error.message);
}

// ==========================================
// HÀM: Viết lại Prompt bằng Gemini (FIX)
// ==========================================
async function optimizePrompt(userPrompt) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY không được cấu hình trong .env");
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 500,
            }
        });
        
        const systemPrompt = `Bạn là một Prompt Engineer chuyên nghiệp cho Midjourney và Stable Diffusion. 
Nhiệm vụ của bạn là dịch ý tưởng của người dùng sang tiếng Anh, sau đó thêm các từ khóa nghệ thuật để bức ảnh trở nên lộng lẫy, chi tiết và đẹp mắt nhất.
Ví dụ: "chó đội nón" -> "A photorealistic portrait of a cute golden retriever wearing a red baseball cap, cinematic lighting, 8k resolution, highly detailed, Unreal Engine 5 render".
CHỈ TRẢ VỀ NỘI DUNG PROMPT TIẾNG ANH, KHÔNG GIẢI THÍCH GÌ THÊM.`;

        const fullPrompt = `${systemPrompt}\n\nÝ tưởng của người dùng: ${userPrompt}`;

        console.log('🔄 Gọi Gemini API...');
        const result = await model.generateContent(fullPrompt);
        
        if (!result || !result.response) {
            throw new Error("Không nhận được phản hồi từ Gemini");
        }

        const optimized = result.response.text().trim();
        console.log('✅ Prompt tối ưu thành công');
        return optimized;

    } catch (error) {
        console.error("❌ Lỗi Gemini:", error.message);
        throw new Error(`Lỗi Gemini: ${error.message}`);
    }
}

// ==========================================
// HÀM: Tạo ảnh qua Hugging Face
// ==========================================
async function generateImage(prompt) {
    const HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
    
    if (!process.env.HF_TOKEN) {
        throw new Error("HF_TOKEN không được cấu hình trong .env");
    }

    try {
        const response = await fetch(HF_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: prompt }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("HF Error:", errorData);
            
            // Xử lý lỗi model đang loading
            if (errorData.includes('currently loading')) {
                throw new Error("AI đang khởi động, vui lòng thử lại sau 30 giây.");
            }
            throw new Error(`Lỗi từ Hugging Face (${response.status}): ${errorData.substring(0, 100)}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('✅ Tạo ảnh thành công');
        return buffer.toString('base64');

    } catch (error) {
        console.error("❌ Lỗi tạo ảnh:", error.message);
        throw error;
    }
}

// ==========================================
// API ROUTE CHÍNH
// ==========================================
app.post('/api/generate', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const imageFile = req.file;

        if (!prompt || prompt.trim() === '') {
            return res.status(400).json({ message: "Vui lòng nhập prompt!" });
        }

        console.log(`\n📝 [1] Nhận yêu cầu: "${prompt}"`);

        // 1. Tối ưu prompt bằng Gemini
        console.log(`⏳ [2] Đang tối ưu prompt qua Gemini...`);
        const optimizedPrompt = await optimizePrompt(prompt);
        console.log(`✅ [3] Prompt tối ưu: ${optimizedPrompt}`);

        // 2. Tạo ảnh
        console.log(`⏳ [4] Đang tạo ảnh qua Hugging Face...`);
        const imageBase64 = await generateImage(optimizedPrompt);

        console.log(`✅ [5] Thành công! Trả kết quả về Frontend.\n`);
        
        res.json({
            success: true,
            optimizedPrompt: optimizedPrompt,
            imageBase64: imageBase64
        });

    } catch (error) {
        console.error("❌ Lỗi API:", error.message);
        res.status(500).json({ 
            success: false,
            message: error.message || "Lỗi máy chủ nội bộ."
        });
    }
});

// Route download ảnh
app.post('/api/download', express.json(), (req, res) => {
    try {
        const { imageBase64, filename } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({ message: "Không có ảnh để tải" });
        }

        const buffer = Buffer.from(imageBase64, 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'ai-generated.png'}"`);
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Catch-all route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Chạy server
app.listen(port, () => {
    console.log(`\n🚀 Server đang chạy tại http://localhost:${port}`);
    console.log(`📝 Đảm bảo .env có: GEMINI_API_KEY và HF_TOKEN\n`);
});