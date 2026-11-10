/* ==========================================================================
   Contact form handler
   Sends the message through EmailJS and only reports success when EmailJS
   confirms the send. Requires config.js and the EmailJS browser SDK.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var button = document.getElementById('contact-submit');
  var statusBox = document.getElementById('form-status');
  var honeypot = document.getElementById('cf-company');
  var cfg = window.PORTFOLIO_EMAIL || {};

  var MIN_SEND_GAP = 5000;    // brief cooldown after a successful send
  var SEND_TIMEOUT = 20000;   // stop waiting on a hung request after 20s

  var fields = {
    name: {
      input: document.getElementById('cf-name'),
      error: document.getElementById('cf-name-error')
    },
    email: {
      input: document.getElementById('cf-email'),
      error: document.getElementById('cf-email-error')
    },
    message: {
      input: document.getElementById('cf-message'),
      error: document.getElementById('cf-message-error')
    }
  };

  // Deliberately simple: rejects empty strings, spaces and missing dots.
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  var sending = false;
  var cooldownUntil = 0;
  var buttonTimer = null;

  /* ---------- UI helpers ---------- */

  function setError(field, message) {
    var f = fields[field];
    if (!f) return;
    var hasError = Boolean(message);
    f.error.textContent = message || '';
    f.error.classList.toggle('show', hasError);
    f.input.classList.toggle('invalid', hasError);
    f.input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
  }

  function setStatus(kind, message) {
    statusBox.textContent = message;
    statusBox.className = 'form-status show ' + kind;
  }

  function clearStatus() {
    statusBox.textContent = '';
    statusBox.className = 'form-status';
  }

  function setButton(label, disabled) {
    if (buttonTimer) {
      clearTimeout(buttonTimer);
      buttonTimer = null;
    }
    button.textContent = label;
    button.disabled = Boolean(disabled);
  }

  function restoreButtonAfter(label, delay) {
    if (buttonTimer) clearTimeout(buttonTimer);
    buttonTimer = setTimeout(function () {
      buttonTimer = null;
      if (!sending) setButton(label, false);
    }, delay);
  }

  /* ---------- Validation ---------- */

  function validate() {
    var name = fields.name.input.value.trim();
    var email = fields.email.input.value.trim();
    var message = fields.message.input.value.trim();
    var firstInvalid = null;

    setError('name', '');
    setError('email', '');
    setError('message', '');

    if (!name) {
      setError('name', 'Please enter your name.');
      firstInvalid = firstInvalid || fields.name.input;
    } else if (name.length < 2) {
      setError('name', 'That name looks too short — please enter your full name.');
      firstInvalid = firstInvalid || fields.name.input;
    }

    if (!email) {
      setError('email', 'Please enter your email address.');
      firstInvalid = firstInvalid || fields.email.input;
    } else if (!EMAIL_RE.test(email)) {
      setError('email', 'Please enter a valid email address, e.g. name@company.com.');
      firstInvalid = firstInvalid || fields.email.input;
    }

    if (!message) {
      setError('message', 'Please enter a message.');
      firstInvalid = firstInvalid || fields.message.input;
    } else if (message.length < 10) {
      setError('message', 'Please add a little more detail (at least 10 characters).');
      firstInvalid = firstInvalid || fields.message.input;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return null;
    }

    return { name: name, email: email, message: message };
  }

  /* ---------- Sending ---------- */

  function missingConfig() {
    return ['serviceId', 'templateId', 'publicKey'].filter(function (key) {
      return !cfg[key] || /^YOUR_/i.test(String(cfg[key]));
    });
  }

  function sendMessage(values) {
    if (!window.emailjs || typeof window.emailjs.send !== 'function') {
      return Promise.reject(new Error('EmailJS SDK did not load.'));
    }

    var submittedAt = new Date().toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    var params = {
      from_name: values.name,
      from_email: values.email,
      reply_to: values.email,               // Gmail's Reply button goes to the visitor
      message: values.message,
      to_email: cfg.recipient,              // fixed here, not editable by visitors
      source: 'Personal Portfolio Website',
      subject: 'New Portfolio Inquiry – ' + values.name,
      submitted_at: submittedAt,
      time: submittedAt                     // kept for templates that already use {{time}}
    };

    return new Promise(function (resolve, reject) {
      var timedOut = false;
      var timer = setTimeout(function () {
        timedOut = true;
        reject(new Error('EmailJS request timed out after ' + SEND_TIMEOUT + 'ms.'));
      }, SEND_TIMEOUT);

      window.emailjs
        .send(cfg.serviceId, cfg.templateId, params, { publicKey: cfg.publicKey })
        .then(function (response) {
          if (timedOut) return;
          clearTimeout(timer);
          resolve(response);
        })
        .catch(function (error) {
          if (timedOut) return;
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /* ---------- Events ---------- */

  Object.keys(fields).forEach(function (key) {
    fields[key].input.addEventListener('input', function () {
      setError(key, '');
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (sending) return;
    if (Date.now() < cooldownUntil) return;

    // Honeypot: real visitors never see or fill this. Drop bots silently.
    if (honeypot && honeypot.value.trim() !== '') {
      form.reset();
      return;
    }

    var values = validate();
    if (!values) return;

    var missing = missingConfig();
    if (missing.length) {
      console.error(
        '[contact] EmailJS is not configured. Set ' + missing.join(', ') +
        ' in config.js. See the setup notes in config.js.'
      );
      setStatus(
        'error',
        'The contact form is not connected yet. Please email me directly at ashwanthreddy685@gmail.com.'
      );
      setButton('Failed to Send. Please Try Again.', false);
      restoreButtonAfter('Send Message', 4000);
      return;
    }

    sending = true;
    setButton('Sending Message...', true);
    clearStatus();

    sendMessage(values)
      .then(function () {
        sending = false;
        form.reset();
        setStatus(
          'success',
          "Thank you for reaching out! Your message has been delivered successfully. I'll get back to you soon."
        );
        setButton('Message Sent Successfully!', true);
        cooldownUntil = Date.now() + MIN_SEND_GAP;
        restoreButtonAfter('Send Message', MIN_SEND_GAP);
      })
      .catch(function (error) {
        sending = false;
        console.error('[contact] EmailJS send failed:', error);
        setStatus(
          'error',
          'Unable to send your message right now. Please try again or email me directly.'
        );
        setButton('Failed to Send. Please Try Again.', false);
        restoreButtonAfter('Send Message', 4000);
      });
  });

  // Warm up the SDK once so the first real send is quick.
  if (window.emailjs && !missingConfig().length) {
    window.emailjs.init({ publicKey: cfg.publicKey });
  }
})();
