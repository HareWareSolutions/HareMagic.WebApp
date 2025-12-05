
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, CreativeAsset } from "../types";

// Função auxiliar para obter instância da IA (importante recriar para pegar chave nova se usuário trocar)
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Map UI ratios to API supported ratios
const IMAGE_RATIO_MAP: Record<string, string> = {
  [AspectRatio.SQUARE]: "1:1",
  [AspectRatio.STORY]: "9:16",
  [AspectRatio.PORTRAIT]: "3:4", 
};

export const generateBrandPost = async (
  styleAssets: CreativeAsset[],
  productAsset: CreativeAsset | null,
  userPrompt: string,
  ratio: AspectRatio
): Promise<string> => {
  const ai = getAIClient();
  try {
    const apiRatio = IMAGE_RATIO_MAP[ratio] || "1:1";
    const parts: any[] = [];

    // 1. Adicionar imagens de ESTILO (Identidade Visual)
    styleAssets.forEach((asset) => {
      parts.push({
        inlineData: {
          data: asset.base64,
          mimeType: asset.mimeType,
        },
      });
    });

    // 2. Adicionar imagem do PRODUTO (se houver)
    if (productAsset) {
      parts.push({
        inlineData: {
          data: productAsset.base64,
          mimeType: productAsset.mimeType,
        },
      });
    }

    // 3. Construir o Prompt do Sistema
    let systemPrompt = `
      Você é um especialista em design gráfico e identidade visual de marcas.
      
      CONTEXTO DAS IMAGENS:
      As primeiras ${styleAssets.length} imagens fornecidas são REFERÊNCIAS DE ESTILO. Analise-as para extrair a paleta de cores, tipografia, iluminação e composição da marca.
    `;

    if (productAsset) {
      systemPrompt += `
      A ÚLTIMA imagem fornecida é o PRODUTO ESPECÍFICO (Packshot) que DEVE ser o protagonista do novo post.
      
      TAREFA:
      Crie uma nova imagem publicitária integrando o PRODUTO (última imagem) dentro de um cenário ou composição que siga estritamente o ESTILO visual das primeiras imagens (referências). O produto deve manter suas características originais, mas com iluminação e ambiência adaptadas ao estilo da marca.
      `;
    } else {
      systemPrompt += `
      TAREFA:
      Crie uma nova imagem para redes sociais que pareça ter sido criada pela mesma empresa/marca das referências.
      `;
    }

    systemPrompt += `
      INSTRUÇÃO DO USUÁRIO: "${userPrompt}"
      
      Requisito: Alta qualidade fotográfica ou render 3D, consistência visual extrema.
    `;

    parts.push({ text: systemPrompt });

    // Using gemini-3-pro-image-preview for high quality image generation
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: apiRatio,
          imageSize: "1K", // High quality
        },
      },
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }

    throw new Error("Nenhuma imagem foi gerada pelo modelo.");

  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    throw error;
  }
};
