<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$databasePath = __DIR__ . DIRECTORY_SEPARATOR . 'apoio.sqlite';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    $input = [];
}

function respond(mixed $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $db = new PDO('sqlite:' . $databasePath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec('PRAGMA foreign_keys = ON');
    $db->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, email TEXT, phone TEXT, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT "pending", created_at TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS app_data (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, description TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL DEFAULT "Pendente", beneficiary_name TEXT, created_at TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS ratings (id INTEGER PRIMARY KEY AUTOINCREMENT, apoio_id INTEGER NOT NULL, stars INTEGER NOT NULL, comment TEXT, created_at TEXT NOT NULL)');

    if (!$db->query("SELECT id FROM users WHERE username = 'admin'")->fetch()) {
        $stmt = $db->prepare('INSERT INTO users (username,password_hash,name,email,phone,role,status,created_at) VALUES (?,?,?,?,?,?,?,?)');
        $stmt->execute(['admin', password_hash('admin123', PASSWORD_DEFAULT), 'Coordenação', '', '', 'admin', 'approved', gmdate('c')]);
    }

    if ($action === 'register' && $method === 'POST') {
        $username = strtolower(trim((string)($input['username'] ?? '')));
        $name = trim((string)($input['name'] ?? ''));
        $password = (string)($input['password'] ?? '');
        $role = (string)($input['role'] ?? '');
        if (!preg_match('/^[a-z0-9._-]{3,40}$/', $username) || strlen($password) < 8 || $name === '' || !in_array($role, ['beneficiario', 'medico'], true)) {
            respond(['error' => 'Preencha os dados corretamente. A palavra-passe deve ter pelo menos 8 caracteres.'], 422);
        }
        try {
            $stmt = $db->prepare('INSERT INTO users (username,password_hash,name,email,phone,role,status,created_at) VALUES (?,?,?,?,?,?,?,?)');
            $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $name, trim((string)($input['email'] ?? '')), trim((string)($input['phone'] ?? '')), $role, 'pending', gmdate('c')]);
        } catch (PDOException) {
            respond(['error' => 'Esse nome de utilizador já existe.'], 409);
        }
        respond(['message' => 'Conta criada. Aguarde aprovação da coordenação.'], 201);
    }

    if ($action === 'login' && $method === 'POST') {
        $stmt = $db->prepare('SELECT * FROM users WHERE username = ?');
        $stmt->execute([strtolower(trim((string)($input['username'] ?? '')))]);
        $user = $stmt->fetch();
        if (!$user || !password_verify((string)($input['password'] ?? ''), $user['password_hash'])) {
            respond(['error' => 'Utilizador ou palavra-passe inválidos.'], 401);
        }
        if ($user['status'] !== 'approved') {
            respond(['error' => $user['status'] === 'pending' ? 'A conta aguarda aprovação da coordenação.' : 'Esta conta foi recusada.'], 403);
        }
        $_SESSION['user_id'] = $user['id'];
        unset($user['password_hash']);
        respond(['user' => $user]);
    }
    if ($action === 'logout' && $method === 'POST') { session_destroy(); respond(['ok' => true]); }
    if ($action === 'users' && $method === 'GET') { respond(['users' => $db->query('SELECT id,username,name,email,phone,role,status,created_at FROM users ORDER BY created_at DESC')->fetchAll()]); }
    if ($action === 'users' && $method === 'PUT') { $stmt = $db->prepare('UPDATE users SET status = ? WHERE id = ? AND role != "admin"'); $stmt->execute([(string)($input['status'] ?? 'pending'), (int)($input['id'] ?? 0)]); respond(['ok' => true]); }
    if ($action === 'users' && $method === 'DELETE') { $stmt = $db->prepare('DELETE FROM users WHERE id = ? AND role != "admin"'); $stmt->execute([(int)($input['id'] ?? 0)]); respond(['ok' => true]); }
    if ($action === 'requests' && $method === 'GET') { respond(['requests' => $db->query('SELECT * FROM requests ORDER BY created_at DESC')->fetchAll()]); }
    if ($action === 'requests' && $method === 'POST') { $stmt = $db->prepare('INSERT INTO requests (subject,description,priority,beneficiary_name,created_at) VALUES (?,?,?,?,?)'); $stmt->execute([trim((string)($input['subject'] ?? '')), trim((string)($input['description'] ?? '')), (string)($input['priority'] ?? 'Média'), 'Beneficiário registado', gmdate('c')]); respond(['id' => (int)$db->lastInsertId()], 201); }
    if ($action === 'requests' && $method === 'PUT') { $stmt = $db->prepare('UPDATE requests SET status = ? WHERE id = ?'); $stmt->execute([(string)($input['status'] ?? 'Pendente'), (int)($input['id'] ?? 0)]); respond(['ok' => true]); }
    if ($action === 'ratings' && $method === 'POST') { $stars = (int)($input['stars'] ?? 0); if ($stars < 1 || $stars > 5) respond(['error' => 'A avaliação deve ter entre 1 e 5 estrelas.'], 422); $stmt = $db->prepare('INSERT INTO ratings (apoio_id,stars,comment,created_at) VALUES (?,?,?,?)'); $stmt->execute([(int)($input['apoio_id'] ?? 0), $stars, trim((string)($input['comment'] ?? '')), gmdate('c')]); respond(['ok' => true], 201); }
    if ($method === 'GET') { $row = $db->query('SELECT payload FROM app_data WHERE id = 1')->fetch(); respond($row ? json_decode($row['payload'], true) : ['beneficiarios' => [], 'medicos' => [], 'apoios' => [], 'ratings' => []]); }
    if ($method === 'PUT') { $payload = json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); $stmt = $db->prepare('INSERT INTO app_data (id,payload) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload'); $stmt->execute([$payload]); respond($input); }
    if ($method === 'DELETE') { $db->exec('DELETE FROM app_data'); $db->exec('DELETE FROM requests'); $db->exec('DELETE FROM ratings'); respond(['ok' => true]); }
    respond(['error' => 'Operação não encontrada.'], 404);
} catch (Throwable) {
    respond(['error' => 'Erro interno. Verifique se o PHP tem PDO SQLite ativo.'], 500);
}
