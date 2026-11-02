# QuestãoCerta

Site de questionários compartilhados: cada pessoa cria a própria conta, e **todas as contas
enxergam os mesmos questionários** (inclusive os que os outros forem publicando).

- **Site**: arquivos estáticos (HTML/CSS/JS) hospedados no **GitHub Pages**.
- **Contas e dados**: **Supabase** (login + banco PostgreSQL), plano gratuito.

👉 Para colocar no ar, siga o **[COMO-PUBLICAR.md](COMO-PUBLICAR.md)**.

## Quem pode o quê
| | Ver | Criar | Editar / excluir |
|---|---|---|---|
| Questionários | todas as contas | qualquer conta | só quem criou |
| Matérias | todas as contas | qualquer conta | só quem criou (e só se estiver vazia, para excluir) |
| Perfil (curso, instituição, foto) | só você (os outros veem apenas o nome) | — | só você |
| Salvos e histórico de respostas | só você | — | só você |

Essas regras ficam **no banco** (`banco/schema.sql`, "Row Level Security"), não só na tela:
mesmo quem mexer no código do site não consegue editar o que é dos outros.

## Estrutura
- `index.html` — redireciona para `html/index.html` (necessário no GitHub Pages)
- `html/index.html` — página única; as telas trocam por JavaScript (`#/rota`)
- `css/` — `style.css` (base, tema claro/escuro) e `paginas.css`
- `js/config.js` — **URL e chave pública do seu Supabase** (você preenche)
- `js/api.js` · `auth.js` · `dados.js` — conexão, contas e dados (tudo que fala com o servidor)
- `js/paginas/` — uma tela por arquivo
- `js/vendor/supabase.js` — biblioteca oficial do Supabase (MIT), incluída para o site não depender de CDN
- `banco/schema.sql` — tabelas e regras de acesso do banco
