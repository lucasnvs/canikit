# CaniKit - Guia de UI/UX e Desenvolvimento

Este documento serve como a única fonte de verdade para a identidade visual e experiência do usuário do CaniKit. Toda geração de código ou design deve aderir estritamente a estas diretrizes.

---

## 🎨 1. Identidade Visual

O CaniKit deve transmitir a sensação de uma ferramenta profissional, focada e eficiente — próximo do estilo de IDEs como VS Code e JetBrains com Dark Gray.

### Paleta de Cores

| Papel             | Hex       | Uso                                      |
|-------------------|-----------|------------------------------------------|
| Body Background   | `#282828` | Fundo do corpo da aplicação              |
| Surface           | `#333333` | Toolbar, titlebar, painéis, cards        |
| Elevated          | `#3d3d3d` | Inputs, hover de botões, dropdowns       |
| **Primary Orange**| `#FF8C00` | Botões primários, estados ativos, accent |
| Blue (efeito)     | `#0047AB` | Gradiente de texto do título, glow sutil |
| Text              | `#D4D4D4` | Texto principal                          |
| Text Muted        | `#808080` | Labels, dicas, info secundária           |
| Border            | `rgba(255,255,255,0.08)` | Bordas neutras em geral      |
| Border Hover      | `rgba(255,140,0,0.3)`    | Borda ao passar o mouse      |

### Regras de Gradiente

- **Uso restrito:** Gradientes apenas em texto de título (home) e no ícone/logo.
- **Proibido:** Gradientes de 3+ cores em botões, cards ou fundos grandes.
- **Título (texto):** `from #FF8C00 to #D4D4D4` (laranja → branco/cinza)
- **Logo background:** `#FF8C00` sólido (sem gradiente)

---

## 📐 2. Diretrizes de UI

- **Bordas:** `border-radius: 6px` padrão. Cards da home podem usar `8px`.
- **Tipografia:**
  - Interface Geral: `Inter`, `system-ui`, sans-serif
  - Dados/Código/Números: `JetBrains Mono` obrigatório (zoom, tamanho de fonte, page info)
- **Botão Primário:** Sólido `#FF8C00`, sem gradiente, `color: #fff`, `font-weight: 600`
- **Botão Ativo (toolbar):** Background `#FF8C00`, borda transparente, leve `box-shadow` laranja
- **Hover geral:** `background: #3d3d3d`, `border-color: rgba(255,255,255,0.15)`
- **Micro-interações:** `transform: scale(0.96)` no clique em botões

---

## 🧠 3. Princípios de UX

- **Eficácia "One-Tap":** Máximo 2 cliques para chegar em qualquer ferramenta.
- **Feedback Visual:** Toda ação dispara feedback imediato (cor, toast ou ícone).
- **Foco em Utilitários:** Layout prioriza área de trabalho, sem distrações visuais.
- **Sem gradientes decorativos:** A cor faz o trabalho — sem efeitos que distraiam.

---

## ⌨️ 4. Padrões de Código (CSS custom props)

```css
:root {
  --bg: #282828;
  --bg-surface: #333333;
  --bg-elevated: #3d3d3d;
  --accent: #FF8C00;
  --accent-blue: #0047AB;
  --text: #D4D4D4;
  --text-muted: #808080;
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 140, 0, 0.3);
  --radius: 6px;
}
```

```css
/* Botão primário */
.btn-primary {
  background: #FF8C00;
  color: #fff;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  padding: 5px 14px;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:active { transform: scale(0.96); }
```

---

## 🛠️ 5. Contexto do Projeto

- **Nome:** CaniKit
- **Conceito:** Canivete Suíço Digital (MicroSaaS / Desktop App)
- **Stack:** Tauri + React + TypeScript + CSS custom props (sem Tailwind)
- **Público:** Desenvolvedores e entusiastas de produtividade
