"""
Email Notification Service for Salmo Assist
Reads SMTP settings from the email_settings entity and sends emails.
Supports bilingual (Arabic/English) HTML email templates.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.email_settings import Email_settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications using SMTP settings from the database."""

    def __init__(self, db: AsyncSession):
        self._db = db

    async def _get_smtp_settings(self) -> Optional[Email_settings]:
        """Retrieve the active SMTP settings from the database."""
        try:
            result = await self._db.execute(
                select(Email_settings)
                .where(Email_settings.is_active == True)
                .order_by(Email_settings.id.desc())
                .limit(1)
            )
            settings = result.scalar_one_or_none()
            if not settings:
                logger.warning("No active email settings found in database")
            return settings
        except Exception as e:
            logger.error(f"Error fetching SMTP settings: {e}")
            return None

    async def test_connection(self) -> dict:
        """Test the SMTP connection with current settings."""
        settings = await self._get_smtp_settings()
        if not settings:
            return {"success": False, "message": "No active email settings found"}

        try:
            if settings.use_tls:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)

            server.login(settings.smtp_user, settings.smtp_password or "")
            server.quit()
            return {"success": True, "message": "SMTP connection successful"}
        except smtplib.SMTPAuthenticationError:
            return {"success": False, "message": "Authentication failed. Check username and password."}
        except smtplib.SMTPConnectError:
            return {"success": False, "message": "Could not connect to SMTP server. Check host and port."}
        except Exception as e:
            return {"success": False, "message": f"Connection failed: {str(e)}"}

    async def send_email(self, to_email: str, subject: str, html_body: str) -> dict:
        """Send an email using SMTP settings from the database."""
        settings = await self._get_smtp_settings()
        if not settings:
            return {"success": False, "message": "No active email settings found"}

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.from_name or 'Salmo'} <{settings.from_email or settings.smtp_user}>"
            msg["To"] = to_email

            html_part = MIMEText(html_body, "html", "utf-8")
            msg.attach(html_part)

            if settings.use_tls:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15)

            server.login(settings.smtp_user, settings.smtp_password or "")
            server.sendmail(
                settings.from_email or settings.smtp_user,
                to_email,
                msg.as_string(),
            )
            server.quit()

            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return {"success": True, "message": "Email sent successfully"}
        except smtplib.SMTPAuthenticationError:
            logger.error(f"SMTP auth failed when sending to {to_email}")
            return {"success": False, "message": "SMTP authentication failed"}
        except smtplib.SMTPRecipientsRefused:
            logger.error(f"Recipient refused: {to_email}")
            return {"success": False, "message": f"Recipient address rejected: {to_email}"}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {"success": False, "message": f"Failed to send email: {str(e)}"}

    # ──────────────────────────────────────────────
    # HTML Email Templates (Bilingual Arabic/English)
    # ──────────────────────────────────────────────

    def _base_template(self, title: str, content_html: str) -> str:
        """Wrap content in a professional bilingual email template."""
        return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;">
<tr><td align="center" style="padding:30px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Salmo</h1>
</td>
</tr>
<!-- Content -->
<tr>
<td style="padding:32px;">
{content_html}
</td>
</tr>
<!-- Footer -->
<tr>
<td style="background-color:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:12px;">
© 2026 Salmo. جميع الحقوق محفوظة / All rights reserved.
</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>"""

    # ── Payment Success ──

    async def send_payment_success_email(
        self,
        to_email: str,
        customer_name: str,
        plan_name: str,
        amount: str,
        invoice_number: str,
    ) -> dict:
        """Send a payment success notification email."""
        content = f"""
<div style="text-align:right;margin-bottom:24px;">
<h2 style="color:#16a34a;margin:0 0 8px;">✅ تم الدفع بنجاح</h2>
<p style="color:#64748b;margin:0;">مرحباً {customer_name}، تم استلام دفعتك بنجاح.</p>
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:24px;">
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>الخطة / Plan:</strong> {plan_name}
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>المبلغ / Amount:</strong> {amount} ر.س
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>رقم الفاتورة / Invoice:</strong> {invoice_number}
</td></tr>
</table>
<div style="text-align:left;margin-top:16px;">
<p style="color:#64748b;font-size:13px;margin:0;">
Hello {customer_name}, your payment has been received successfully.
</p>
</div>"""
        subject = f"✅ تأكيد الدفع - فاتورة {invoice_number} | Payment Confirmation"
        html = self._base_template(subject, content)
        return await self.send_email(to_email, subject, html)

    # ── Payment Failure ──

    async def send_payment_failure_email(
        self,
        to_email: str,
        customer_name: str,
        plan_name: str,
        reason: str,
    ) -> dict:
        """Send a payment failure notification email."""
        content = f"""
<div style="text-align:right;margin-bottom:24px;">
<h2 style="color:#dc2626;margin:0 0 8px;">❌ فشل الدفع</h2>
<p style="color:#64748b;margin:0;">مرحباً {customer_name}، لم يتم إتمام عملية الدفع.</p>
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;padding:16px;margin-bottom:24px;">
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>الخطة / Plan:</strong> {plan_name}
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>السبب / Reason:</strong> {reason}
</td></tr>
</table>
<p style="color:#64748b;font-size:14px;text-align:right;">
يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.
</p>
<div style="text-align:left;margin-top:16px;">
<p style="color:#64748b;font-size:13px;margin:0;">
Hello {customer_name}, your payment could not be processed. Please try again or contact support.
</p>
</div>"""
        subject = f"❌ فشل الدفع - {plan_name} | Payment Failed"
        html = self._base_template(subject, content)
        return await self.send_email(to_email, subject, html)

    # ── Invoice Created ──

    async def send_invoice_email(
        self,
        to_email: str,
        customer_name: str,
        invoice_number: str,
        plan_name: str,
        amount: str,
        date: str,
    ) -> dict:
        """Send an invoice notification email."""
        content = f"""
<div style="text-align:right;margin-bottom:24px;">
<h2 style="color:#1e40af;margin:0 0 8px;">📄 فاتورة جديدة</h2>
<p style="color:#64748b;margin:0;">مرحباً {customer_name}، تم إنشاء فاتورة جديدة لحسابك.</p>
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:8px;padding:16px;margin-bottom:24px;">
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>رقم الفاتورة / Invoice #:</strong> {invoice_number}
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>الخطة / Plan:</strong> {plan_name}
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>المبلغ / Amount:</strong> {amount} ر.س
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>التاريخ / Date:</strong> {date}
</td></tr>
</table>
<div style="text-align:left;margin-top:16px;">
<p style="color:#64748b;font-size:13px;margin:0;">
Hello {customer_name}, a new invoice has been created for your account.
</p>
</div>"""
        subject = f"📄 فاتورة جديدة #{invoice_number} | New Invoice"
        html = self._base_template(subject, content)
        return await self.send_email(to_email, subject, html)

    # ── Subscription Renewal ──

    async def send_subscription_renewal_email(
        self,
        to_email: str,
        customer_name: str,
        plan_name: str,
        next_billing_date: str,
    ) -> dict:
        """Send a subscription renewal notification email."""
        content = f"""
<div style="text-align:right;margin-bottom:24px;">
<h2 style="color:#7c3aed;margin:0 0 8px;">🔄 تجديد الاشتراك</h2>
<p style="color:#64748b;margin:0;">مرحباً {customer_name}، تم تجديد اشتراكك بنجاح.</p>
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff;border-radius:8px;padding:16px;margin-bottom:24px;">
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>الخطة / Plan:</strong> {plan_name}
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>تاريخ الفوترة القادم / Next Billing:</strong> {next_billing_date}
</td></tr>
</table>
<div style="text-align:left;margin-top:16px;">
<p style="color:#64748b;font-size:13px;margin:0;">
Hello {customer_name}, your subscription has been renewed successfully. Next billing date: {next_billing_date}.
</p>
</div>"""
        subject = f"🔄 تجديد الاشتراك - {plan_name} | Subscription Renewed"
        html = self._base_template(subject, content)
        return await self.send_email(to_email, subject, html)

    # ── Subscription Expiry ──

    async def send_subscription_expiry_email(
        self,
        to_email: str,
        customer_name: str,
        plan_name: str,
        expiry_date: str,
    ) -> dict:
        """Send a subscription expiry warning email."""
        content = f"""
<div style="text-align:right;margin-bottom:24px;">
<h2 style="color:#ea580c;margin:0 0 8px;">⚠️ انتهاء الاشتراك</h2>
<p style="color:#64748b;margin:0;">مرحباً {customer_name}، اشتراكك على وشك الانتهاء.</p>
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed;border-radius:8px;padding:16px;margin-bottom:24px;">
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>الخطة / Plan:</strong> {plan_name}
</td></tr>
<tr><td style="padding:8px 16px;color:#374151;font-size:14px;">
<strong>تاريخ الانتهاء / Expiry Date:</strong> {expiry_date}
</td></tr>
</table>
<p style="color:#64748b;font-size:14px;text-align:right;">
يرجى تجديد اشتراكك لتجنب انقطاع الخدمة.
</p>
<div style="text-align:left;margin-top:16px;">
<p style="color:#64748b;font-size:13px;margin:0;">
Hello {customer_name}, your subscription is about to expire on {expiry_date}. Please renew to avoid service interruption.
</p>
</div>"""
        subject = f"⚠️ انتهاء الاشتراك - {plan_name} | Subscription Expiring"
        html = self._base_template(subject, content)
        return await self.send_email(to_email, subject, html)