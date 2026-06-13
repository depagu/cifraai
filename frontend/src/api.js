// URL base do backend — em produção vem da variável VITE_API_URL (definida no Vercel)
// Em desenvolvimento local usa o proxy do Vite (vazio = relativo)
export const API_URL = import.meta.env.VITE_API_URL || ""
