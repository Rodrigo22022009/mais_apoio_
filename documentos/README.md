# +Apoio

Plataforma de apoio domiciliário para beneficiários, médicos voluntários e coordenação.

## Estrutura do projeto

- [`index.html`](./index.html) — estrutura das páginas e componentes da aplicação.
- [`assets/css/styles.css`](./assets/css/styles.css) — estilos visuais próprios da aplicação.
- [`assets/js/app.js`](./assets/js/app.js) — comportamento, autenticação, operações CRUD e integração com Supabase.
- [`supabase/config.js`](./supabase/config.js) — URL e chave pública do projeto Supabase.
- [`supabase/schema.sql`](./supabase/schema.sql) — tabelas, funções e políticas RLS.
- [`supabase/migrations/002_scheduling_security.sql`](./supabase/migrations/002_scheduling_security.sql) — proteção de conflitos de agenda, duração das consultas e proteção de perfis.
- [`backend/api.php`](./backend/api.php) — backend opcional PHP/SQLite para execução local.

## Funcionalidades

- Entrada por perfil: beneficiário, médico voluntário e coordenação.
- Registo e aprovação de utilizadores.
- Gestão de beneficiários com contacto, morada, prioridade e necessidade.
- Gestão de médicos voluntários e disponibilidade.
- Pedidos de apoio com prioridades e estados.
- Agenda de apoios em lista e calendário.
- Avaliação de apoios realizados.
- Relatórios, exportação e cópia de segurança local.
- Rota para o médico voluntário através do Google Maps.
- Fallback para `localStorage` quando o site é publicado apenas como GitHub Pages.

## Base de dados

Quando executado num servidor PHP, `backend/api.php` cria e utiliza automaticamente uma base SQLite em `backend/apoio.sqlite`.

Requisitos:

- PHP 8.1 ou superior.
- Extensão `pdo_sqlite` ativa.

Para executar localmente:

```powershell
php -S localhost:8080
```

Abrir `http://localhost:8080`.

Conta demo:

```text
Utilizador: admin
Palavra-passe: admin123
```

GitHub Pages não executa PHP. Nesse modo, a aplicação funciona com os dados de demonstração e grava as alterações no armazenamento local do navegador. Para uma base partilhada em produção, o `backend` deve ser alojado num servidor PHP com SQLite ou substituído por uma API com autenticação e base de dados remota.

## Publicação com GitHub Pages e Supabase

1. Execute `supabase/schema.sql` no SQL Editor do Supabase.
2. Execute depois `supabase/migrations/002_scheduling_security.sql`.
3. Confirme que `supabase/config.js` contém apenas a URL do projeto e uma chave `sb_publishable_`.
4. Nunca coloque chaves `sb_secret_` no frontend, no GitHub ou em ficheiros JavaScript.
5. Ative o GitHub Pages para o ramo `master` e a pasta raiz do repositório.

A migração de agenda usa uma restrição PostgreSQL. Se já existirem consultas sobrepostas, corrija ou cancele esses registos antes de executar a migração. A validação do frontend continua ativa para dar uma mensagem imediata ao utilizador, mas a base de dados é a proteção definitiva contra dois agendamentos simultâneos.

## Supabase e GitHub Pages

Foi preparada uma configuração Supabase em [`supabase/`](./supabase/), com esquema PostgreSQL, autenticação por email e políticas RLS. Segue o guia em [`supabase/README.md`](./supabase/README.md). Não coloques chaves `service_role` no frontend.
