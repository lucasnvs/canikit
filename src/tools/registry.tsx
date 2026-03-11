import { lazy, ComponentType, ReactNode } from 'react'
import {
  FileText,
  Scissors,
  Youtube,
  Pipette,
  ImageDown,
  NotebookPen,
} from 'lucide-react'

export interface Tool {
  id: string
  label: string
  icon: ReactNode
  route: string
  description?: string
  category: string
  component: ComponentType
}

/**
 * Registro de todas as ferramentas disponíveis no CaniKit.
 * Para adicionar uma nova ferramenta:
 * 1. Crie a pasta src/tools/<nome-da-tool>/
 * 2. Implemente o componente principal (ex: MinhaFerramenta.tsx)
 * 3. Adicione uma entrada neste array
 */
export const TOOLS: Tool[] = [
  {
    id: 'pdf-text-editor',
    label: 'PDF Editor de Texto',
    icon: <FileText />,
    route: '/pdf-text-editor',
    description: 'Adicione textos em slides e documentos PDF',
    category: 'PDF',
    component: lazy(() => import('./pdf-text-editor/PdfTextEditor')),
  },
  {
    id: 'pdf-splitter',
    label: 'PDF Splitter',
    icon: <Scissors size={20} />,
    route: '/pdf-splitter',
    description: 'Selecione e exporte páginas específicas de um PDF',
    category: 'PDF',
    component: lazy(() => import('./pdf-splitter/PdfSplitter')),
  },
  {
    id: 'youtube-downloader',
    label: 'YouTube Downloader',
    icon: <Youtube size={20} />,
    route: '/youtube-downloader',
    description: 'Baixe vídeos e áudios do YouTube com seleção de qualidade',
    category: 'Mídia',
    component: lazy(() => import('./youtube-downloader/YoutubeDownloader')),
  },
  {
    id: 'color-picker',
    label: 'Color Picker',
    icon: <Pipette size={20} />,
    route: '/color-picker',
    description: 'Capture qualquer cor da tela em HEX, RGB ou HSL',
    category: 'Design',
    component: lazy(() => import('./color-picker/ColorPicker')),
  },
  {
    id: 'image-to-ico',
    label: 'Image to ICO',
    icon: <ImageDown size={20} />,
    route: '/image-to-ico',
    description: 'Converta JPG, PNG ou SVG para pacote .ico com todas as resoluções',
    category: 'Design',
    component: lazy(() => import('./image-to-ico/ImageToIco')),
  },
  {
    id: 'write-it',
    label: 'WriteIt',
    icon: <NotebookPen size={20} />,
    route: '/write-it',
    description: 'Notas em markdown organizadas por disciplina',
    category: 'Estudo',
    component: lazy(() => import('./write-it/WriteIt')),
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
