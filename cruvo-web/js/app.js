// CRUVO Static Web Client Logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Calculate Full APK Download URL
  const apkRelativePath = 'downloads/CRUVO.apk';
  const fullApkUrl = new URL(apkRelativePath, window.location.href).href;

  const shareLinkInput = document.getElementById('share-link-input');
  if (shareLinkInput) {
    shareLinkInput.value = fullApkUrl;
  }

  // 2. QR Code Modal Handlers
  const qrModal = document.getElementById('qr-modal');
  const btnShowQr = document.getElementById('btn-show-qr');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const qrCanvas = document.getElementById('qr-canvas');
  const btnCopyLink = document.getElementById('btn-copy-link');

  let qrGenerated = false;

  const generateQRCode = () => {
    if (qrCanvas && window.QRCode && !qrGenerated) {
      window.QRCode.toCanvas(
        qrCanvas,
        fullApkUrl,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#121317',
            light: '#ffffff'
          }
        },
        (error) => {
          if (!error) qrGenerated = true;
        }
      );
    }
  };

  if (btnShowQr && qrModal) {
    btnShowQr.addEventListener('click', () => {
      generateQRCode();
      qrModal.classList.add('open');
    });
  }

  if (btnCloseModal && qrModal) {
    btnCloseModal.addEventListener('click', () => {
      qrModal.classList.remove('open');
    });
  }

  // Close modal when clicking outside card
  if (qrModal) {
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.classList.remove('open');
      }
    });
  }

  // 3. Copy Link Action
  if (btnCopyLink && shareLinkInput) {
    btnCopyLink.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareLinkInput.value);
        const originalText = btnCopyLink.innerText;
        btnCopyLink.innerText = 'Copied!';
        btnCopyLink.style.background = '#00e676';
        btnCopyLink.style.color = '#121317';
        setTimeout(() => {
          btnCopyLink.innerText = originalText;
          btnCopyLink.style.background = '';
          btnCopyLink.style.color = '';
        }, 2000);
      } catch (err) {
        shareLinkInput.select();
        document.execCommand('copy');
      }
    });
  }

  // 4. FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Close all
        faqItems.forEach((other) => other.classList.remove('active'));
        // Toggle current
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  // Open first FAQ by default
  if (faqItems.length > 0) {
    faqItems[0].classList.add('active');
  }

  // 5. Download Button Visual Feedback
  const downloadButtons = document.querySelectorAll('a[download]');
  downloadButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const originalHtml = btn.innerHTML;
      btn.style.opacity = '0.9';
      btn.style.transform = 'scale(0.98)';
      setTimeout(() => {
        btn.style.opacity = '';
        btn.style.transform = '';
      }, 300);
    });
  });

  // 6. Interactive Bezel Parallax on Mouse Move (Desktop)
  const phoneMockup = document.querySelector('.phone-mockup-frame');
  if (phoneMockup && window.innerWidth > 992) {
    document.addEventListener('mousemove', (e) => {
      const xAxis = (window.innerWidth / 2 - e.pageX) / 45;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 45;
      phoneMockup.style.transform = `rotateY(${xAxis - 8}deg) rotateX(${yAxis + 4}deg)`;
    });
  }
});
