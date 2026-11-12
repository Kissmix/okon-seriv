<?php
// Приём заявок с сайта и отправка на почту.
// Работает на любом виртуальном хостинге с PHP (функция mail()).
header('Content-Type: application/json; charset=utf-8');

$TO = 'alega783@mail.ru'; // Куда приходят заявки

// Читаем JSON-тело запроса (его шлёт js/main.js)
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST; // запасной вариант — обычная форма
}
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad_request']);
    exit;
}

$clip = function ($v, $max) {
    if (!is_string($v)) return '';
    $v = trim($v);
    return mb_substr($v, 0, $max);
};

$name    = $clip($data['name'] ?? '', 120);
$phone   = $clip($data['phone'] ?? '', 32);
$message = $clip($data['message'] ?? '', 2000);
$service = $clip($data['service'] ?? '', 300);
$source  = $clip($data['source'] ?? 'site', 40);

$digits = preg_replace('/\D/', '', $phone);
if (strlen($digits) < 10 || strlen($digits) > 15) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_phone']);
    exit;
}

$sourceNames = [
    'callback'      => 'Кнопка «Заказать звонок»',
    'cta'           => 'CTA-блок',
    'calculator'    => 'Калькулятор',
    'service_page'  => 'Страница услуги',
    'contacts_page' => 'Страница контактов',
    'site'          => 'Сайт',
];
$srcLabel = $sourceNames[$source] ?? $source;

$bodyLines = [
    "Новая заявка с сайта",
    "",
    "Телефон: " . $phone,
    "Имя: " . ($name !== '' ? $name : '—'),
    "Услуга: " . ($service !== '' ? $service : '—'),
    "Источник: " . $srcLabel,
    "",
    "Сообщение:",
    ($message !== '' ? $message : '—'),
    "",
    "Дата: " . date('d.m.Y H:i'),
];
$body = implode("\n", $bodyLines);

$subject = 'Заявка с сайта: ' . $phone;
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$headers = implode("\r\n", [
    'From: site@' . preg_replace('/^www\./', '', $host),
    'Reply-To: ' . $TO,
    'Content-Type: text/plain; charset=utf-8',
    'X-Mailer: PHP/' . phpversion(),
]);

$sent = @mail($TO, $encodedSubject, $body, $headers);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail_failed']);
}
