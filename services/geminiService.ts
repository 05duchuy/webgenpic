import { GoogleGenAI, Modality, GenerateContentResponse, GenerateImagesResponse } from "@google/genai";
import { AspectRatio } from '../types';

// Helper to get the AI instance with the latest API key
const getAI = () => {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API key is missing. Please select an API key.");
    }
    return new GoogleGenAI({ apiKey });
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix e.g. "data:image/png;base64,"
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

export const describeImage = async (sourceImageFile: File): Promise<string> => {
    try {
        const ai = getAI();
        const base64Image = await fileToBase64(sourceImageFile);
        const mimeType = sourceImageFile.type;
        
        const promptText = `Analyze this image and write a detailed, descriptive prompt for a text-to-image AI. 
Focus on key subjects, their actions, clothing, the environment, lighting, and overall style. 
The description should be concise but comprehensive, suitable for generating a similar image. 
Output only the prompt text, without any introductory phrases.`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: promptText,
                    },
                ],
            }],
        });
        
        return response.text;

    } catch (error) {
        console.error("Error describing image:", error);
        throw new Error("Failed to generate description from image.");
    }
};

export const generateImages = async (prompt: string, aspectRatio: AspectRatio, numberOfImages: number, negativePrompt?: string): Promise<string[]> => {
    try {
        const ai = getAI();
        
        // Use gemini-2.5-flash-image as the default for image generation
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{
                role: 'user',
                parts: [{
                    text: `${prompt}${negativePrompt ? `. Negative prompt: ${negativePrompt}` : ''}`
                }]
            }],
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any,
                },
                // Generate multiple images if requested by calling multiple times or using a model that supports it.
                // gemini-2.5-flash-image generates 1 image per call usually, but let's check if we can loop.
            },
        });
        
        const base64Images: string[] = [];
        for (const candidate of response.candidates) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    base64Images.push(part.inlineData.data);
                }
            }
        }

        // If we need more images than returned, we might need to make more calls, 
        // but for now let's return what we got.
        if (base64Images.length > 0) {
            return base64Images;
        } else {
            throw new Error("Image generation failed, no images returned.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

export const editImage = async (prompt: string, sourceImageFile: File, artisticAngle: string, negativePrompt: string | undefined, useFaceOnly: boolean, aspectRatio: AspectRatio): Promise<string> => {
    try {
        const ai = getAI();
        const base64Image = await fileToBase64(sourceImageFile);
        const mimeType = sourceImageFile.type;

        let fullPrompt: string;

        if (useFaceOnly) {
            fullPrompt = `Generate a new, photorealistic image of the following scene: "${prompt}". The desired aspect ratio is ${aspectRatio}.
CRITICAL INSTRUCTION: The main person in the new image MUST have the exact same face, identity, and facial features as the person in the uploaded reference photo.
Replace the original background, clothing, and pose completely based on the prompt.
The final image should be 8k quality and look like a professional photograph.`;
        } else {
            // FIX: Added a strong instruction to preserve the subject's face to implement the "face-lock" feature.
            fullPrompt = `${prompt}. CRITICAL INSTRUCTION: Keep the real face and natural expression of the person in the photo exactly as in the uploaded original. It is mandatory to not change any facial features, identity, or expression. Apply all other edits (like changing clothes or background) around them. The final image should be 8k quality and maintain the original photographic style.`;
        }

        if (artisticAngle !== 'Không có') {
            fullPrompt += `, ${artisticAngle}`;
        }
        if (negativePrompt && negativePrompt.trim() !== '') {
            fullPrompt += `. Avoid the following: ${negativePrompt}`;
        }


        const response: GenerateContentResponse = await ai.models.generateContent({
            // FIX: Updated model name to 'gemini-2.5-flash-image' from deprecated preview version.
            model: 'gemini-2.5-flash-image',
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: fullPrompt,
                    },
                ],
            }],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        
        throw new Error("Image editing failed, no image part in response.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw error;
    }
};

export const restoreImage = async (sourceImageFile: File): Promise<string> => {
    try {
        const ai = getAI();
        const base64Image = await fileToBase64(sourceImageFile);
        const mimeType = sourceImageFile.type;

        const restorePrompt = `
        Act as a professional high-end photo retoucher and restoration expert. Transform the provided image into a pristine, ultra-high-resolution masterpiece.

        STRICT EXECUTION PIPELINE:

        1.  **PRE-PROCESSING & CLEANUP**:
            -   **Detection**: Identify the main subject and original composition limits.
            -   **Geometry**: Correct perspective distortions, straighten horizons, and fix lens warping.
            -   **Damage Removal**: Aggressively remove all physical damage including scratches, cracks, dust, mold spots, water stains, and crease marks.
            -   **Clarity**: Reduce glare, haze, and unwanted reflections.

        2.  **CAMERA SIMULATION (Phase One XF IQ4)**:
            -   Simulate the optical characteristics of a **Phase One XF IQ4 150MP** camera with a **Schneider Kreuznach** lens.
            -   Apply **High Dynamic Range (HDR)** processing to recover details in shadows and highlights.
            -   Create a "3D Pop" effect with micro-contrast enhancement and exceptional sharpness.
            -   Ensure zero chromatic aberration.

        3.  **DETAIL RETOUCHING**:
            -   **Skin**: Restore natural skin texture (retain pores, never plastic-smooth). Fix blemishes, scars, and uneven tones.
            -   **Features**: Sharpen eyes (add catchlights), enhance eyebrows/lashes, and fix teeth whiteness/alignment naturally.
            -   **Materials**: Restore the texture of clothing (fabric weave), hair (strand definition), and jewelry.

        4.  **COLOR RESTORATION & GRADING**:
            -   **Restoration**: Remove color casts, yellowing, fading, or silvering. Correct White Balance.
            -   **Colorization**: If the original is B&W or Sepia, perform a full, realistic, cinematic colorization.
            -   **Profile**: Grade the colors in an **AdobeRGB 1998** style space for rich, vibrant, yet natural tones.

        5.  **BACKGROUND TREATMENT**:
            -   Preserve the ORIGINAL background context. Do not replace it.
            -   Clean up background noise and artifacts.
            -   Apply color grading to the background to ensure it matches the lighting of the foreground subjects perfectly.

        OUTPUT REQUIREMENTS:
        -   Resolution: Equivalent to 8K/12000x8000 pixels density.
        -   Depth: 16-bit color depth simulation.
        -   Format: Photorealistic, no cartoonish or painting effects.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            // FIX: Updated model name to 'gemini-2.5-flash-image' from deprecated preview version.
            model: 'gemini-2.5-flash-image',
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: restorePrompt,
                    },
                ],
            }],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        
        throw new Error("Image restoration failed, no image part in response.");
    } catch (error) {
        console.error("Error restoring image:", error);
        throw error;
    }
};

export const upscaleImage = async (sourceImageFile: File): Promise<string> => {
    try {
        const ai = getAI();
        const base64Image = await fileToBase64(sourceImageFile);
        const mimeType = sourceImageFile.type;

        const upscalePrompt = `
        Upscale this image to 4x its original resolution.
        Task:
        1.  **Increase Resolution**: Significantly increase the pixel dimensions of the image.
        2.  **Enhance Details**: Add realistic fine details, textures, and sharpness. Make it look like it was shot with a high-end camera.
        3.  **Clean Artifacts**: Remove any compression artifacts, noise, or blurriness from the original image.
        4.  **Preserve Identity**: The subjects' facial features, identity, objects, and overall composition MUST be preserved with extreme accuracy. Do not change the content.
        5.  **Maintain Style**: The color grading and artistic style of the original image should be maintained, only enhanced.
        
        The final result must be an ultra-realistic, high-resolution, and crystal-clear photograph.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: upscalePrompt,
                    },
                ],
            }],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        
        throw new Error("Image upscaling failed, no image part in response.");
    } catch (error) {
        console.error("Error upscaling image:", error);
        throw error;
    }
};