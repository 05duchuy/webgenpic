require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();

// ✅ RENDER FIX: Sử dụng PORT từ environment, default 3000
const port = process.env.PORT || 3000;

// ✅ RENDER FIX: Thiết lập Trust proxy để lấy IP thực
app.set('trust proxy', 1);

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors({
    origin: '*', // Cho phép tất cả origins
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ RENDER FIX: Phục vụ static files từ public folder
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Cấu hình Multer với memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ==========================================
// GEMINI INITIALIZATION
// ==========================================
let genAI;
try {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY không tồn tại');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini API initialized successfully');
} catch (error) {
    console.error('❌ Gemini initialization error:', error.message);
    // Không crash server, chỉ log error
}

// ==========================================
// HEALTH CHECK ENDPOINT (Để Render giám sát)
// ==========================================
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ==========================================
// FUNCTION: Optimize Prompt với Gemini
// ==========================================
async function optimizePrompt(userPrompt) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY không được cấu hình");
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
// FUNCTION: Tạo ảnh qua Hugging Face
// ==========================================
async function generateImage(prompt) {
    const HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
    
    if (!process.env.HF_TOKEN) {
        throw new Error("HF_TOKEN không được cấu hình");
    }

    try {
        console.log('⏳ Gọi Hugging Face API...');
        const response = await fetch(HF_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: prompt }),
            timeout: 120000 // 2 phút timeout
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("HF Error:", errorData);
            
            if (errorData.includes('currently loading')) {
                throw new Error("AI đang khởi động, vui lòng thử lại sau 30 giây.");
            }
            if (response.status === 429) {
                throw new Error("Quá nhiều yêu cầu, vui lòng chờ một lát và thử lại.");
            }
            throw new Error(`Lỗi từ Hugging Face (${response.status})`);
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
// API ROUTE: Generate Image
// ==========================================
app.post('/api/generate', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || prompt.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: "Vui lòng nhập prompt!" 
            });
        }

        console.log(`\n📝 [1] Nhận yêu cầu: "${prompt}"`);

        // Kiểm tra API keys
        if (!process.env.GEMINI_API_KEY || !process.env.HF_TOKEN) {
            return res.status(500).json({
                success: false,
                message: "Máy chủ chưa được cấu hình API keys. Liên hệ admin."
            });
        }

        // Step 1: Optimize prompt
        console.log(`⏳ [2] Đang tối ưu prompt qua Gemini...`);
        const optimizedPrompt = await optimizePrompt(prompt);
        console.log(`✅ [3] Prompt tối ưu: ${optimizedPrompt}`);

        // Step 2: Generate image
        console.log(`⏳ [4] Đang tạo ảnh qua Hugging Face...`);
        const imageBase64 = await generateImage(optimizedPrompt);

        console.log(`✅ [5] Thành công!\n`);
        
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

// ==========================================
// API ROUTE: Download Image
// ==========================================
app.post('/api/download', express.json({ limit: '50mb' }), (req, res) => {
    try {
        const { imageBase64, filename } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({ 
                success: false,
                message: "Không có ảnh để tải" 
            });
        }

        const buffer = Buffer.from(imageBase64, 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'ai-generated.png'}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// ==========================================
// CATCH-ALL ROUTE: Serve index.html
// ==========================================
app.get('*', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).send('File not found');
        }
    });
});

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ nội bộ',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==========================================
// START SERVER
// ==========================================
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Server đang chạy tại:`);
    console.log(`   Local: http://localhost:${port}`);
    console.log(`   Port: ${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`✅ Sẵn sàng nhận yêu cầu...\n`);
});

// ==========================================
// GRACEFUL SHUTDOWN (Cho Render)
// ==========================================
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM nhận được, đóng server...');
    server.close(() => {
        console.log('✅ Server đã đóng');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT nhận được, đóng server...');
    server.close(() => {
        console.log('✅ Server đã đóng');
        process.exit(0);
    });
});

// ==========================================
// HANDLE UNCAUGHT ERRORS
// ==========================================
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Không exit, chỉ log
});