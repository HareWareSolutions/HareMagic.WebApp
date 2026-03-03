
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, CreativeAsset } from "../types";

// Função auxiliar para obter instância da IA (importante recriar para pegar chave nova se usuário trocar)
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

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

    // Try up to 3 times with exponential backoff for 503 errors
    let attempt = 0;
    const maxAttempts = 3;
    let response;

    while (attempt < maxAttempts) {
      try {
        // Using gemini-3-pro-image-preview for high quality image generation
        response = await ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: apiRatio,
              imageSize: "1K", // High quality
            },
          },
        });
        break; // If successful, exit loop
      } catch (err: any) {
        attempt++;
        const isOverloaded = err?.status === 503 || err?.message?.includes('high demand') || err?.message?.includes('503');
        if (isOverloaded && attempt < maxAttempts) {
          console.warn(`Modelo de IA sobrecarregado (tentativa ${attempt}). Tentando novamente em ${attempt * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        } else {
          // If we run out of retries or it's a different error, throw it
          if (isOverloaded) {
            throw new Error("Os servidores da IA estão recebendo um alto volume de requisições. Por favor, tente novamente em alguns minutos.");
          }
          throw err;
        }
      }
    }

    // Extract image from response
    for (const part of response?.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }

    throw new Error("Nenhuma imagem foi gerada pelo modelo.");

  } catch (error: any) {
    console.error("Erro ao gerar imagem:", error);
    // Preserva a mensagem de erro customizada, se existir
    if (error?.message?.includes("Os servidores da IA estão recebendo")) {
      throw error;
    }
    throw new Error(error.message || "Ocorreu um erro ao conectar com a IA. Tente novamente.");
  }
};

export const generateCarouselPost = async (
  styleAssets: CreativeAsset[],
  productAsset: CreativeAsset | null,
  generalPrompt: string,
  carouselSlides: { instruction: string }[],
  ratio: AspectRatio,
  onProgress?: (progress: string) => void
): Promise<string[]> => {
  const generatedImages: string[] = [];

  for (let i = 0; i < carouselSlides.length; i++) {
    const slide = carouselSlides[i];

    if (onProgress) {
      onProgress(`Gerando slide ${i + 1} de ${carouselSlides.length}...`);
    }

    const slideSpecificPrompt = `
      PROMPT GERAL DA CAMPANHA: "${generalPrompt}"
      
      ATENÇÃO: Esta imagem é a parte ${i + 1} de um carrossel de ${carouselSlides.length} imagens.
      Mantenha o mesmo personagem/produto e estilo de arte.
      
      INSTRUÇÃO ESPECÍFICA PARA ESTE SLIDE (${i + 1}): "${slide.instruction}"
    `;

    const slideImageBase64 = await generateBrandPost(
      styleAssets,
      productAsset,
      slideSpecificPrompt,
      ratio
    );

    generatedImages.push(slideImageBase64);
  }

  return generatedImages;
};

export const editBrandPost = async (
  styleAssets: CreativeAsset[],
  productAsset: CreativeAsset | null,
  targetImageBase64WithPrefix: string,
  editInstruction: string,
  ratio: AspectRatio
): Promise<string> => {
  const ai = getAIClient();
  try {
    const apiRatio = IMAGE_RATIO_MAP[ratio] || "1:1";
    const parts: any[] = [];

    // 1. Adicionar imagens de ESTILO
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

    // 3. Adicionar a imagem que queremos editar
    // targetImageBase64WithPrefix looks like "data:image/png;base64,iVBORw0KGgo..."
    const [mimePrefix, base64Data] = targetImageBase64WithPrefix.split(',');
    const mimeType = mimePrefix.replace('data:', '').replace(';base64', '') || 'image/png';

    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    });

    // 4. Prompt para Edição
    let systemPrompt = `
      Você é um especialista em design gráfico e identidade visual de marcas.
      
      CONTEXTO:
      As primeiras imagens fornecidas são REFERÊNCIAS DO ESTILO e (opcionalmente) DE PRODUTO.
      
      A penúltima ou última imagem fornecida é o POST ATUAL gerado que precisa ser EDITADO.
      Você DEVE gerar uma nova versão desta última imagem exata, aplicando as modificações solicitadas pelo usuário abaixo, enquanto preserva ao máximo o contexto, cenário e elementos que não foram mencionados na edição.
      
      INSTRUÇÃO DE EDIÇÃO DO USUÁRIO: "${editInstruction}"
      
      Requisito: Alta qualidade fotográfica ou render 3D, consistência visual extrema com o estilo da marca fornecido.
    `;

    parts.push({ text: systemPrompt });

    let attempt = 0;
    const maxAttempts = 3;
    let response;

    while (attempt < maxAttempts) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: apiRatio,
              imageSize: "1K", // High quality
            },
          },
        });
        break; // If successful, exit loop
      } catch (err: any) {
        attempt++;
        const isOverloaded = err?.status === 503 || err?.message?.includes('high demand') || err?.message?.includes('503');
        if (isOverloaded && attempt < maxAttempts) {
          console.warn(`Modelo de IA sobrecarregado (tentativa ${attempt}). Tentando novamente em ${attempt * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        } else {
          if (isOverloaded) {
            throw new Error("Os servidores da IA estão recebendo um alto volume de requisições. Por favor, tente novamente em alguns minutos.");
          }
          throw err;
        }
      }
    }

    // Extract image from response
    for (const part of response?.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }

    throw new Error("Nenhuma imagem revisada foi gerada pelo modelo.");

  } catch (error: any) {
    console.error("Erro ao editar imagem:", error);
    if (error?.message?.includes("Os servidores da IA estão recebendo")) {
      throw error;
    }
    throw new Error(error.message || "Ocorreu um erro ao conectar com a IA para edição. Tente novamente.");
  }
};
