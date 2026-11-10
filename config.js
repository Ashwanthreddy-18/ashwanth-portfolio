/* ==========================================================================
   Contact form configuration
   --------------------------------------------------------------------------
   Fill in the three values below from your EmailJS dashboard
   (https://dashboard.emailjs.com) and the form starts delivering real emails.

   These are PUBLIC identifiers, not secrets: EmailJS expects the browser to
   send them, and they are safe to keep in this file / commit to GitHub.
   The actual SMTP password (e.g. your Gmail app password) only ever lives in
   the EmailJS dashboard under Email Services — never put it here.
   ========================================================================== */
window.PORTFOLIO_EMAIL = {
  serviceId:  'YOUR_EMAILJS_SERVICE_ID',   // Email Services  -> your service (e.g. service_ab12cde)
  templateId: 'YOUR_EMAILJS_TEMPLATE_ID',  // Email Templates -> your template (e.g. template_xy34zab)
  publicKey:  'YOUR_EMAILJS_PUBLIC_KEY',   // Account         -> General  -> Public Key

  // Where the message is delivered. The visitor cannot change this: it is
  // passed to EmailJS from here, and the template's "To" field uses {{to_email}}.
  recipient: 'ashwanthreddy685@gmail.com'
};
