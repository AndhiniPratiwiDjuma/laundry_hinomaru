<?php
header('Content-Type: application/json; charset=utf-8');

$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'laundry_hinomaru';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Koneksi database gagal: ' . $conn->connect_error], JSON_UNESCAPED_UNICODE);
    exit;
}
$conn->set_charset('utf8mb4');


@$conn->query("ALTER TABLE kasir MODIFY password VARCHAR(255) NOT NULL");

function inputData(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function reply($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getCashierId(mysqli $conn, string $cashier): ?int {
    $stmt = $conn->prepare('SELECT id FROM kasir WHERE username = ? OR nama = ? LIMIT 1');
    $stmt->bind_param('ss', $cashier, $cashier);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ? (int)$row['id'] : null;
}

function generateNota(mysqli $conn): string {
    $prefix = 'HN-' . date('Ymd') . '-';
    $stmt = $conn->prepare("SELECT nomor_nota FROM pesanan WHERE nomor_nota LIKE CONCAT(?, '%') ORDER BY id DESC LIMIT 1");
    $stmt->bind_param('s', $prefix);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $number = 1;
    if ($row && preg_match('/-(\d+)$/', $row['nomor_nota'], $m)) {
        $number = (int)$m[1] + 1;
    }
    return $prefix . str_pad((string)$number, 3, '0', STR_PAD_LEFT);
}

function getOrder(mysqli $conn, string $nota): ?array {
    $stmt = $conn->prepare(
        'SELECT p.id, p.nomor_nota, p.nama_pelanggan, p.total, p.status, p.tanggal, COALESCE(k.nama, "Kasir") AS cashier
         FROM pesanan p
         LEFT JOIN kasir k ON k.id = p.kasir_id
         WHERE p.nomor_nota = ? LIMIT 1'
    );
    $stmt->bind_param('s', $nota);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) return null;

    $orderId = (int)$order['id'];
    $stmt = $conn->prepare(
        'SELECT d.layanan_id, d.jumlah, d.harga, d.subtotal, l.nama_layanan, l.satuan
         FROM detail_pesanan d
         JOIN layanan l ON l.id = d.layanan_id
         WHERE d.pesanan_id = ? ORDER BY d.id ASC'
    );
    $stmt->bind_param('i', $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = [
            'service' => [
                'id' => (int)$row['layanan_id'],
                'name' => $row['nama_layanan'],
                'price' => (float)$row['harga'],
                'unit' => $row['satuan']
            ],
            'quantity' => (float)$row['jumlah'],
            'subtotal' => (float)$row['subtotal']
        ];
    }
    $stmt->close();

    return [
        'nota' => $order['nomor_nota'],
        'customer' => $order['nama_pelanggan'],
        'total' => (float)$order['total'],
        'status' => $order['status'],
        'createdAt' => $order['tanggal'],
        'cashier' => $order['cashier'],
        'items' => $items
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$bodyData = ($method === 'POST') ? inputData() : [];
$action = $_GET['action'] ?? ($bodyData['action'] ?? $_POST['action'] ?? '');

/* LAYANAN */
if ($action === 'services' && $method === 'GET') {
    $result = $conn->query('SELECT id, nama_layanan, harga, satuan FROM layanan ORDER BY id ASC');
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = [
            'id' => (int)$row['id'],
            'name' => $row['nama_layanan'],
            'price' => (float)$row['harga'],
            'unit' => $row['satuan']
        ];
    }
    reply($data);
}

/* DAFTAR KASIR */
if ($action === 'cashiers' && $method === 'GET') {
    $result = $conn->query('SELECT id, nama, username FROM kasir ORDER BY nama ASC');
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = [
            'id' => (int)$row['id'],
            'name' => $row['nama'],
            'username' => $row['username']
        ];
    }
    reply($data);
}

/* LOGIN */
if ($action === 'login' && $method === 'POST') {
    $data = inputData();
    $username = trim((string)($data['username'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if ($username === '' || $password === '') {
        reply(['success' => false, 'message' => 'Nama kasir dan password wajib diisi.'], 400);
    }

    $stmt = $conn->prepare('SELECT id, nama, username, password FROM kasir WHERE username = ? OR nama = ? LIMIT 1');
    $stmt->bind_param('ss', $username, $username);
    $stmt->execute();
    $cashier = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$cashier) {
        reply(['success' => false, 'message' => 'Kasir tidak ditemukan.'], 401);
    }

    $stored = (string)$cashier['password'];
    $valid = false;

    if ($stored !== '') {
        if (password_get_info($stored)['algo'] !== 0) {
            $valid = password_verify($password, $stored);
        } else {
            $valid = hash_equals($stored, $password);
        }
    }

    if (!$valid) {
        reply(['success' => false, 'message' => 'Password salah.'], 401);
    }

    reply([
        'success' => true,
        'cashier' => [
            'id' => (int)$cashier['id'],
            'name' => $cashier['nama'],
            'username' => $cashier['username']
        ]
    ]);
}

/* TAMBAH KASIR */
if ($action === 'add_cashier' && $method === 'POST') {
    $data = inputData();
    $name = trim((string)($data['name'] ?? ''));
    $username = trim((string)($data['username'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if ($name === '' || $password === '') {
        reply(['success' => false, 'message' => 'Nama dan password kasir wajib diisi.'], 400);
    }

    if ($username === '') {
        $username = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '.', $name));
        $username = trim($username, '.');
    }

    $stmt = $conn->prepare('SELECT id FROM kasir WHERE username = ? OR nama = ? LIMIT 1');
    $stmt->bind_param('ss', $username, $name);
    $stmt->execute();
    $exists = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($exists) {
        reply(['success' => false, 'message' => 'Nama atau username kasir sudah digunakan.'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare('INSERT INTO kasir (nama, username, password, created_at) VALUES (?, ?, ?, NOW())');
    $stmt->bind_param('sss', $name, $username, $hash);

    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        reply(['success' => false, 'message' => 'Gagal menambah kasir: ' . $error], 500);
    }

    $id = $stmt->insert_id;
    $stmt->close();
    reply(['success' => true, 'id' => $id]);
}

/* SEMUA PESANAN */
if ($action === 'orders' && $method === 'GET') {
    $result = $conn->query('SELECT nomor_nota FROM pesanan ORDER BY id DESC');
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $order = getOrder($conn, $row['nomor_nota']);
        if ($order) $orders[] = $order;
    }
    reply($orders);
}

/* SATU NOTA */
if ($action === 'order' && $method === 'GET') {
    $nota = trim((string)($_GET['nota'] ?? ''));
    if ($nota === '') reply(['success' => false, 'message' => 'Nomor nota tidak ada.'], 400);

    $order = getOrder($conn, $nota);
    if (!$order) reply(['success' => false, 'message' => 'Nota tidak ditemukan.'], 404);
    reply($order);
}

/* SIMPAN PESANAN BARU / EDIT PESANAN */
if ($action === 'save_order' && $method === 'POST') {
    $data = inputData();
    $nota = trim((string)($data['nota'] ?? ''));
    $customer = trim((string)($data['customer'] ?? ''));
    $cashier = trim((string)($data['cashier'] ?? ''));
    $items = $data['items'] ?? [];

    if ($customer === '' || !is_array($items) || count($items) === 0) {
        reply(['success' => false, 'message' => 'Nama pelanggan dan layanan wajib diisi.'], 400);
    }

    $cashierId = getCashierId($conn, $cashier);
    if (!$cashierId) {
        reply(['success' => false, 'message' => 'Kasir tidak ditemukan di database. Silakan login ulang.'], 400);
    }

    $cleanItems = [];
    $total = 0;

    foreach ($items as $item) {
        $serviceId = (int)($item['serviceId'] ?? 0);
        $quantity = (float)($item['quantity'] ?? 0);
        if ($serviceId <= 0 || $quantity <= 0) continue;

        $stmt = $conn->prepare('SELECT id, harga FROM layanan WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $serviceId);
        $stmt->execute();
        $service = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$service) continue;

        $price = (float)$service['harga'];
        $subtotal = round($price * $quantity);
        $total += $subtotal;
        $cleanItems[] = [
            'serviceId' => $serviceId,
            'quantity' => $quantity,
            'price' => $price,
            'subtotal' => $subtotal
        ];
    }

    if (!$cleanItems) {
        reply(['success' => false, 'message' => 'Layanan tidak valid.'], 400);
    }

    $conn->begin_transaction();
    try {
        if ($nota === '') {
            $nota = generateNota($conn);
            $status = 'DIPROSES';

            $stmt = $conn->prepare('INSERT INTO pesanan (nomor_nota, kasir_id, nama_pelanggan, total, status, tanggal) VALUES (?, ?, ?, ?, ?, NOW())');
            $stmt->bind_param('sisds', $nota, $cashierId, $customer, $total, $status);
            $stmt->execute();
            $orderId = $stmt->insert_id;
            $stmt->close();
        } else {
            $stmt = $conn->prepare('SELECT id FROM pesanan WHERE nomor_nota = ? LIMIT 1');
            $stmt->bind_param('s', $nota);
            $stmt->execute();
            $old = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$old) throw new Exception('Pesanan tidak ditemukan.');
            $orderId = (int)$old['id'];

            $stmt = $conn->prepare('UPDATE pesanan SET kasir_id = ?, nama_pelanggan = ?, total = ? WHERE id = ?');
            $stmt->bind_param('isdi', $cashierId, $customer, $total, $orderId);
            $stmt->execute();
            $stmt->close();

            $stmt = $conn->prepare('DELETE FROM detail_pesanan WHERE pesanan_id = ?');
            $stmt->bind_param('i', $orderId);
            $stmt->execute();
            $stmt->close();
        }

        $stmt = $conn->prepare('INSERT INTO detail_pesanan (pesanan_id, layanan_id, jumlah, harga, subtotal) VALUES (?, ?, ?, ?, ?)');
        foreach ($cleanItems as $item) {
            $stmt->bind_param('iiddd', $orderId, $item['serviceId'], $item['quantity'], $item['price'], $item['subtotal']);
            $stmt->execute();
        }
        $stmt->close();

        $conn->commit();
        reply(['success' => true, 'order' => getOrder($conn, $nota)]);
    } catch (Throwable $e) {
        $conn->rollback();
        reply(['success' => false, 'message' => 'Gagal menyimpan pesanan: ' . $e->getMessage()], 500);
    }
}

/* UBAH STATUS */
if ($action === 'status' && $method === 'POST') {
    $data = inputData();
    $nota = trim((string)($data['nota'] ?? ''));
    $status = trim((string)($data['status'] ?? ''));
    $allowed = ['DIPROSES', 'SELESAI', 'DIAMBIL'];

    if ($nota === '' || !in_array($status, $allowed, true)) {
        reply(['success' => false, 'message' => 'Nota atau status tidak valid.'], 400);
    }

    $stmt = $conn->prepare('UPDATE pesanan SET status = ? WHERE nomor_nota = ?');
    $stmt->bind_param('ss', $status, $nota);
    $stmt->execute();
    $stmt->close();

    $order = getOrder($conn, $nota);
    if (!$order) reply(['success' => false, 'message' => 'Pesanan tidak ditemukan.'], 404);
    reply(['success' => true, 'order' => $order]);
}

/* HAPUS PESANAN */
if ($action === 'delete_order' && $method === 'POST') {
    $data  = inputData();
    $nota = trim((string)($data['nota'] ?? ''));
    if ($nota === '') reply(['success' => false, 'message' => 'Nomor nota tidak ada.'], 400);

    $stmt = $conn->prepare('SELECT id FROM pesanan WHERE nomor_nota = ? LIMIT 1');
    $stmt->bind_param('s', $nota);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) reply(['success' => false, 'message' => 'Pesanan tidak ditemukan.'], 404);

    $id = (int)$row['id'];
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare('DELETE FROM detail_pesanan WHERE pesanan_id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare('DELETE FROM pesanan WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        $conn->commit();
        reply(['success' => true]);
    } catch (Throwable $e) {
        $conn->rollback();
        reply(['success' => false, 'message' => 'Gagal menghapus pesanan: ' . $e->getMessage()], 500);
    }
}

reply(['success' => false, 'message' => 'Aksi tidak dikenali.'], 404);
