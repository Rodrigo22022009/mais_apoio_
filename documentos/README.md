# +Apoio

Plataforma de apoio domiciliário para beneficiários, médicos voluntários e coordenação.

## Estrutura do projeto

- [`index.html`](./index.html) — estrutura das páginas e componentes da aplicação.
- [`assets/css/styles.css`](./assets/css/styles.css) — estilos visuais próprios da aplicação.
- [`assets/js/app.js`](./assets/js/app.js) — comportamento, autenticação, operações CRUD e integração com Supabase.
- [`supabase/config.js`](./supabase/config.js) — URL e chave pública do projeto Supabase.
- [`supabase/schema.sql`](./supabase/schema.sql) — tabelas, funções e políticas RLS.
- [`supabase/migrations/002_scheduling_security.sql`](./supabase/migrations/002_scheduling_security.sql) — proteção de conflitos de agenda, duração das consultas e proteção de perfis.

## Funcionalidades

- Entrada por perfil: beneficiário, médico voluntário e coordenação.
- Registo e aprovação de utilizadores.
- Gestão de beneficiários com contacto, morada, prioridade e necessidade.
- Gestão de médicos voluntários e disponibilidade.
- Pedidos de apoio com prioridades e estados.
- Agenda de apoios em lista e calendário.
- Avaliação de apoios realizados.
- Relatórios e exportação.
- Rota para o médico voluntário através do Google Maps.
- Todos os dados operacionais são guardados exclusivamente no Supabase.

## Base de dados

## Publicação com GitHub Pages e Supabase

1. Execute `supabase/schema.sql` no SQL Editor do Supabase.
2. Execute depois `supabase/migrations/002_scheduling_security.sql`.
3. Confirme que `supabase/config.js` contém apenas a URL do projeto e uma chave `sb_publishable_`.
4. Nunca coloque chaves `sb_secret_` no frontend, no GitHub ou em ficheiros JavaScript.
5. Ative o GitHub Pages para o ramo `master` e a pasta raiz do repositório.

A migração de agenda usa uma restrição PostgreSQL. Se já existirem consultas sobrepostas, corrija ou cancele esses registos antes de executar a migração. A validação do frontend continua ativa para dar uma mensagem imediata ao utilizador, mas a base de dados é a proteção definitiva contra dois agendamentos simultâneos.

## Supabase e GitHub Pages

Foi preparada uma configuração Supabase em [`supabase/`](./supabase/), com esquema PostgreSQL, autenticação por email e políticas RLS. Segue o guia em [`supabase/README.md`](./supabase/README.md). Não coloques chaves `service_role` no frontend.
