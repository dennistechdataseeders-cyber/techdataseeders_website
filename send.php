<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$name    = strip_tags(trim($_POST['name'] ?? ''));
$email   = strip_tags(trim($_POST['email'] ?? ''));
$phone   = strip_tags(trim($_POST['phone'] ?? ''));
$message = strip_tags(trim($_POST['message'] ?? ''));

if (!$name || !$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in your name and a valid email.']);
    exit;
}

$to      = 'ceo@techdataseeders.in';
$subject = 'Data Inquiry from ' . $name;
$body    = "Name: $name\nEmail: $email\nPhone: $phone\n\nMessage:\n$message";
$headers = "From: noreply@techdataseeders.in\r\nReply-To: $email\r\nX-Mailer: PHP/" . PHP_VERSION;

$sent = mail($to, $subject, $body, $headers);

echo json_encode(['success' => $sent]);
