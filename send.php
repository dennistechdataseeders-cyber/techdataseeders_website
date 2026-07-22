<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$name    = strip_tags(trim($_POST['name'] ?? ''));
$email   = strip_tags(trim($_POST['email'] ?? ''));
$phone   = strip_tags(trim($_POST['phone'] ?? ''));
$message = strip_tags(trim($_POST['message'] ?? ''));

header('Content-Type: application/json');

if (!$name || !$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please fill in your name and a valid email.']);
    exit;
}

$to      = 'ceo@techdataseeders.in';
$subject = 'Data Inquiry from ' . $name;
$body    = "Name: $name\nEmail: $email\nPhone: $phone\n\nMessage:\n$message";
$headers = implode("\r\n", [
    'From: noreply@techdataseeders.in',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
]);

$sent = mail($to, $subject, $body, $headers);

echo json_encode(['success' => $sent]);
