# +Apoio

Plataforma de apoio domiciliário para beneficiários, médicos voluntários e coordenação.

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
