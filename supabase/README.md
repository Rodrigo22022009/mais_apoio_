# Configuração do Supabase

## 1. Criar o projeto

1. Abre [supabase.com](https://supabase.com) e cria uma conta.
2. Seleciona **New project**.
3. Escolhe um nome, uma palavra-passe forte para a base de dados e uma região próxima de Portugal.
4. Aguarda até o projeto ficar pronto.

## 2. Criar a base de dados

1. No painel do projeto, abre **SQL Editor**.
2. Cria uma nova query.
3. Copia todo o conteúdo de [`schema.sql`](./schema.sql).
4. Carrega em **Run**.
5. Confirma em **Table Editor** que aparecem as tabelas `profiles`, `beneficiaries`, `volunteers`, `support_requests`, `supports`, `ratings` e `notifications`.

## 3. Obter as chaves públicas

1. Abre **Project Settings → API**.
2. Copia o **Project URL**.
3. Copia a **Publishable key**. Em projetos antigos pode aparecer como **anon public key**.
4. Copia [`config.example.js`](./config.example.js) para `config.js`.
5. Coloca o URL e a chave em `config.js`.

O ficheiro `config.js` está excluído do Git para não ser enviado por engano. A chave pública pode ser usada no frontend, desde que as políticas RLS do `schema.sql` estejam ativas. Nunca uses a `service_role` no HTML.

## 4. Configurar autenticação

Em **Authentication → Providers**, ativa **Email**.

Para testes locais, em **Authentication → URL Configuration**, adiciona:

- `http://localhost:5500`
- `http://localhost:8080`

Quando o GitHub Pages estiver criado, adiciona também o URL do site, por exemplo:

- `https://o-teu-utilizador.github.io/mais_apoio_/`

## 5. Criar o primeiro administrador

1. Regista uma conta normal na aplicação.
2. Em **Authentication → Users**, copia o UUID do utilizador.
3. No **SQL Editor**, executa:

```sql
update public.profiles
set role = 'admin', status = 'approved'
where id = 'COLOCA-AQUI-O-UUID';
```

Não tornes todos os utilizadores administradores.

## 6. Publicar no GitHub Pages

1. Coloca `supabase/config.js` no projeto local.
2. Ativa GitHub Pages para a branch `main` e pasta `/root`.
3. Abre o URL publicado.
4. Em Supabase, adiciona esse URL em **Authentication → URL Configuration**.
5. Testa criação de conta, login, pedido de apoio e acesso administrativo.

## Estado atual da integração

O frontend já carrega o cliente Supabase e usa Supabase Auth quando o utilizador inicia sessão com email. O registo também cria a conta no Supabase quando é indicado um email. Os módulos de dados mantêm fallback local/PHP enquanto a migração completa das operações CRUD para as tabelas Supabase é validada.

Se executaste uma versão anterior do `schema.sql`, executa novamente a secção da função e trigger `handle_new_user` para que username e telefone sejam copiados dos metadados do registo.
