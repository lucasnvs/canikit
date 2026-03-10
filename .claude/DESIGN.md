# CaniKit - Guia de UI/UX e Desenvolvimento

Este documento serve como a única fonte de verdade para a identidade visual e experiência do usuário do CaniKit. Toda geração de código ou design deve aderir estritamente a estas diretrizes.

---

## 🎨 1. Identidade Visual (Estilo JetBrains)
O CaniKit deve transmitir a sensação de uma ferramenta de alta performance, técnica e vibrante.

### Paleta de Cores (Hex & Tailwind)
- **Deep Base (Fundo):** `#000B1A` | `bg-[#000B1A]`
- **Surface (Cards/Modais):** `#011627` | `bg-[#011627]`
- **Royal Blue (Primária):** `#0047AB` | `text-[#0047AB]` / `bg-[#0047AB]`
- **Electric Magenta (Destaque):** `#BC00DD` | `from-[#0047AB] to-[#BC00DD]`
- **Hot Orange (Alerta/Ação):** `#FF8C00` | `border-[#FF8C00]`

### Gradientes Assinatura
- **Main Action:** `bg-gradient-to-br from-[#0047AB] via-[#BC00DD] to-[#FF8C00]`
- **Subtle Glow:** `shadow-[0_0_20px_rgba(188,0,221,0.15)]`

---

## 📐 2. Diretrizes de UI (User Interface)
- **Bordas:** Arredondamento padrão de `rounded-xl` (12px).
- **Tipografia:** - Interface Geral: Sans-serif geométrica (Inter, Geist ou Roboto).
  - Dados/Código: Monoespaçada (**JetBrains Mono** é obrigatória para valores numéricos ou outputs).
- **Glassmorphism:** Em modais, usar `backdrop-blur-md` com fundo `bg-white/5` sobre o Deep Base.
- **Micro-interações:** Botões devem ter uma transição suave de `scale-95` no clique e um leve brilho no hover.

---

## 🧠 3. Princípios de UX (User Experience)
- **Eficácia "One-Tap":** O usuário deve chegar na ferramenta desejada com no máximo 2 cliques.
- **Feedback Visual:** Toda ação (ex: "copiar para área de transferência") deve disparar um feedback visual imediato (toast ou mudança de cor do ícone).
- **Foco em Utilitários:** O layout deve priorizar a área de input/output de dados, sem distrações visuais desnecessárias.

---

## ⌨️ 4. Padrões de Código (Tailwind / React)
Sempre que gerar componentes, siga este padrão de estrutura:

```tsx
// Exemplo de Botão CaniKit
<button className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#0047AB] to-[#BC00DD] 
                   hover:brightness-110 transition-all active:scale-95 text-white font-medium 
                   shadow-lg shadow-blue-900/20">
  Usar Ferramenta
</button>
🛠️ 5. Contexto do Projeto
Nome: CaniKit

Conceito: Canivete Suíço Digital (MicroSaaS).

Público: Desenvolvedores, entusiastas de produtividade e usuários que buscam ferramentas rápidas.