import { lazy, ComponentType } from 'react'

export interface Tool {
  id: string
  label: string
  icon: string
  route: string
  description?: string
  component: ComponentType
}

/**
 * Registro de todas as ferramentas disponíveis no NevesTools.
 * Para adicionar uma nova ferramenta:
 * 1. Crie a pasta src/tools/<nome-da-tool>/
 * 2. Implemente o componente principal (ex: MinhaFerramenta.tsx)
 * 3. Adicione uma entrada neste array
 */
export const TOOLS: Tool[] = [
  {
    id: 'pdf-text-editor',
    label: 'PDF Editor de Texto',
    icon: '📝',
    route: '/pdf-text-editor',
    description: 'Adicione textos em slides e documentos PDF',
    component: lazy(() => import('./pdf-text-editor/PdfTextEditor')),
  },
  // Exemplo de como adicionar mais ferramentas:
  // {
  //   id: 'image-converter',
  //   label: 'Conversor de Imagens',
  //   icon: '🖼️',
  //   route: '/image-converter',
  //   description: 'Converta entre formatos de imagem',
  //   component: lazy(() => import('./image-converter/ImageConverter')),
  // },
]
