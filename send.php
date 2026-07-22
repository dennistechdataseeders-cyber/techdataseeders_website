<?php
$name    = strip_tags(trim($_POST['name'] ?? ''));
$email   = strip_tags(trim($_POST['email'] ?? ''));
$phone   = strip_tags(trim($_POST['phone'] ?? ''));
$message = strip_tags(trim($_POST['message'] ?? ''));

if (!$name || !$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: /?form=error');
    exit;
}

$to      = 'ceo@techdataseeders.in';
$subject = 'Data Inquiry from ' . $name;
$body    = "Name: $name\nEmail: $email\nPhone: $phone\n\nMessage:\n$message";
$headers = "From: noreply@techdataseeders.in\r\nReply-To: $email\r\nX-Mailer: PHP/" . PHP_VERSION;

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    header('Location: /?form=success');
} else {
    header('Location: /?form=error');
}
exit;
