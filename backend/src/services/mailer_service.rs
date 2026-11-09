//! Sends the approval / rejection emails after an admin decides a registration.
//!
//! Configured entirely through environment variables (see backend/.env.example).
//! If SMTP is not configured the app still works: the email is skipped and a warning is logged.
//! Sending never fails the admin's approve/reject action - errors are only logged.

use lettre::{
    message::{Mailbox, MultiPart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use tracing::{info, warn};

use crate::models::registration::RegistrationView;

struct MailConfig {
    host: String,
    port: u16,
    username: String,
    password: String,
    from_email: String,
    from_name: String,
    venue: String,
    dates: String,
    contact_email: String,
}

impl MailConfig {
    /// Returns None when SMTP_HOST / SMTP_USERNAME / SMTP_PASSWORD are not all set.
    fn from_env() -> Option<Self> {
        let get = |k: &str| std::env::var(k).ok().map(|v| v.trim().to_string()).filter(|v| !v.is_empty());
        let host = get("SMTP_HOST")?;
        let username = get("SMTP_USERNAME")?;
        let password = get("SMTP_PASSWORD")?;
        Some(Self {
            host,
            port: get("SMTP_PORT").and_then(|v| v.parse().ok()).unwrap_or(587),
            from_email: get("MAIL_FROM").unwrap_or_else(|| username.clone()),
            from_name: get("MAIL_FROM_NAME").unwrap_or_else(|| "XPECTO".into()),
            venue: get("FEST_VENUE").unwrap_or_else(|| "IIT Mandi".into()),
            dates: get("FEST_DATES").unwrap_or_else(|| "20-22 February 2027".into()),
            contact_email: get("CONTACT_EMAIL").unwrap_or_else(|| "xpecto@students.iitmandi.ac.in".into()),
            username,
            password,
        })
    }
}

/// Call after `decide_registration` succeeds. Never returns an error; failures are logged.
pub async fn send_decision_email(reg: &RegistrationView) {
    let Some(cfg) = MailConfig::from_env() else {
        warn!("SMTP not configured (SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD); skipping decision email for registration {}", reg.id);
        return;
    };
    let Some(user) = reg.user.as_ref().filter(|u| !u.email.trim().is_empty()) else {
        warn!("registration {} has no user email; skipping decision email", reg.id);
        return;
    };

    let approved = match reg.status.as_str() {
        "approved" => true,
        "rejected" => false,
        _ => return,
    };

    let (subject, text, html) = build_email(&cfg, reg, &user.name, approved);

    match send(&cfg, &user.email, &user.name, &subject, text, html).await {
        Ok(()) => info!("{} email sent to {} for registration {}", reg.status, user.email, reg.id),
        Err(e) => warn!("failed to send {} email to {} for registration {}: {}", reg.status, user.email, reg.id, e),
    }
}

async fn send(
    cfg: &MailConfig,
    to_email: &str,
    to_name: &str,
    subject: &str,
    text: String,
    html: String,
) -> anyhow::Result<()> {
    let from: Mailbox = format!("{} <{}>", cfg.from_name, cfg.from_email).parse()?;
    let to: Mailbox = format!("{} <{}>", to_name.replace(['<', '>', '"'], ""), to_email.trim()).parse()?;

    let message = Message::builder()
        .from(from)
        .reply_to(cfg.contact_email.parse()?)
        .to(to)
        .subject(subject)
        .multipart(MultiPart::alternative_plain_html(text, html))?;

    let creds = Credentials::new(cfg.username.clone(), cfg.password.clone());
    // Port 465 = implicit TLS; anything else (587) = STARTTLS.
    let builder = if cfg.port == 465 {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.host)?
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&cfg.host)?
    };
    let mailer = builder.port(cfg.port).credentials(creds).build();
    mailer.send(message).await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

fn kind_label(kind: &str) -> &'static str {
    match kind {
        "event" => "event registration",
        "workshop" => "workshop registration",
        "mess" => "mess registration",
        "accommodation" => "accommodation booking",
        _ => "registration",
    }
}

fn payment_label(m: &str) -> Option<&'static str> {
    match m {
        "upi" => Some("UPI"),
        "neft" => Some("NEFT"),
        "cheque" => Some("Cheque"),
        _ => None,
    }
}

/// The detail rows shown in both emails (label, value).
fn detail_rows(reg: &RegistrationView, user_name: &str, user_email: &str, user_college: &str) -> Vec<(String, String)> {
    let item = if reg.kind == "mess" { &reg.mess_name } else { &reg.target_name };
    let mut rows: Vec<(String, String)> = vec![
        ("Registration ID".into(), reg.id.clone()),
        ("Name".into(), user_name.to_string()),
        ("Email".into(), user_email.to_string()),
    ];
    if !user_college.trim().is_empty() {
        rows.push(("College".into(), user_college.to_string()));
    }
    rows.push(("Registered for".into(), item.clone()));
    if let Some(t) = reg.team_name.as_ref().filter(|t| !t.trim().is_empty()) {
        rows.push(("Team".into(), t.clone()));
    }
    if !reg.team_members.is_empty() {
        let names: Vec<&str> = reg.team_members.iter().map(|m| m.name.as_str()).collect();
        rows.push(("Team members".into(), names.join(", ")));
    }
    if reg.kind == "accommodation" {
        if reg.visit_days > 0 {
            rows.push(("Number of days".into(), reg.visit_days.to_string()));
        }
        if !reg.competition_names.is_empty() {
            rows.push(("Competitions".into(), reg.competition_names.join(", ")));
        }
    }
    rows.push(("Amount paid".into(), format!("Rs. {}", reg.amount)));
    if let Some(p) = payment_label(&reg.payment_method) {
        rows.push(("Payment method".into(), p.to_string()));
    }
    rows.push(("Transaction ID".into(), reg.transaction_id.clone()));
    rows
}

fn build_email(cfg: &MailConfig, reg: &RegistrationView, user_name: &str, approved: bool) -> (String, String, String) {
    let user = reg.user.as_ref();
    let email = user.map(|u| u.email.as_str()).unwrap_or("");
    let college = user.map(|u| u.college.as_str()).unwrap_or("");
    let rows = detail_rows(reg, user_name, email, college);
    let item = if reg.kind == "mess" { &reg.mess_name } else { &reg.target_name };
    let kind = kind_label(&reg.kind);

    let (subject, headline, intro, extra_title, extra_lines): (String, String, String, &str, Vec<String>) = if approved {
        (
            format!("XPECTO - Your {} is approved", kind),
            "Registration approved".to_string(),
            format!(
                "Hi {}, your payment has been verified and your {} for \"{}\" is approved.",
                user_name, kind, item
            ),
            "When you arrive at the campus",
            vec![
                format!("XPECTO takes place at {} on {}.", cfg.venue, cfg.dates),
                "Show this email (on your phone or printed) at the registration desk. The Registration ID above is what the team will use to verify you.".to_string(),
                "Carry your college ID card.".to_string(),
            ],
        )
    } else {
        let reason = reg
            .rejection_reason
            .as_deref()
            .map(str::trim)
            .filter(|r| !r.is_empty())
            .unwrap_or("No specific reason was recorded.");
        (
            format!("XPECTO - Your {} could not be approved", kind),
            "Registration not approved".to_string(),
            format!(
                "Hi {}, we could not approve your {} for \"{}\".",
                user_name, kind, item
            ),
            "Reason",
            vec![
                reason.to_string(),
                format!(
                    "If you think this is a mistake, or you need help, write to {} and quote your Registration ID.",
                    cfg.contact_email
                ),
            ],
        )
    };

    // ----- plain text -----
    let mut text = format!("{}\n\n{}\n\n", headline.to_uppercase(), intro);
    for (k, v) in &rows {
        text.push_str(&format!("{}: {}\n", k, v));
    }
    text.push_str(&format!("\n{}:\n", extra_title));
    for l in &extra_lines {
        text.push_str(&format!("- {}\n", l));
    }
    text.push_str("\n- Team XPECTO, IIT Mandi\n");

    // ----- HTML -----
    let accent = if approved { "#16a34a" } else { "#dc2626" };
    let row_html: String = rows
        .iter()
        .map(|(k, v)| {
            format!(
                "<tr><td style=\"padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top\">{}</td>\
                 <td style=\"padding:6px 0;font-size:14px;color:#111827;word-break:break-word\">{}</td></tr>",
                esc(k),
                esc(v)
            )
        })
        .collect();
    let extra_html: String = extra_lines
        .iter()
        .map(|l| format!("<li style=\"margin:4px 0\">{}</li>", esc(l)))
        .collect();

    let html = format!(
        "<!doctype html><html><body style=\"margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif\">\
         <div style=\"max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden\">\
         <div style=\"background:{accent};color:#ffffff;padding:18px 24px;font-size:20px;font-weight:bold\">{headline}</div>\
         <div style=\"padding:24px\">\
         <p style=\"margin:0 0 16px;font-size:15px;color:#111827;line-height:1.5\">{intro}</p>\
         <table style=\"border-collapse:collapse;width:100%\">{rows}</table>\
         <h3 style=\"margin:24px 0 8px;font-size:15px;color:#111827\">{extra_title}</h3>\
         <ul style=\"margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:1.5\">{extra}</ul>\
         <p style=\"margin:24px 0 0;font-size:13px;color:#6b7280\">Team XPECTO, IIT Mandi</p>\
         </div></div></body></html>",
        accent = accent,
        headline = esc(&headline),
        intro = esc(&intro),
        rows = row_html,
        extra_title = esc(extra_title),
        extra = extra_html,
    );

    (subject, text, html)
}

/// Escape user-supplied text (names, reasons, team names) before putting it in HTML.
fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
