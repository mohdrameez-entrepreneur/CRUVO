// CRUVO Static Web Client Logic (v3.1.2)

document.addEventListener('DOMContentLoaded', () => {
  // 1. Download URLs
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.cruvo.app';
  const zipRelativePath = 'downloads/CRUVO.zip';
  const fullZipUrl = new URL(zipRelativePath, window.location.href).href;

  let currentQrTarget = 'play'; // 'play' or 'zip'

  const shareLinkInput = document.getElementById('share-link-input');
  const qrInstructions = document.getElementById('qr-instructions');
  const tabQrPlay = document.getElementById('tab-qr-play');
  const tabQrZip = document.getElementById('tab-qr-zip');

  const updateQrDisplay = () => {
    const activeUrl = currentQrTarget === 'play' ? playStoreUrl : fullZipUrl;

    if (shareLinkInput) {
      shareLinkInput.value = activeUrl;
    }

    if (qrInstructions) {
      if (currentQrTarget === 'play') {
        qrInstructions.innerHTML = 'Scan with your phone to open <strong>CRUVO on Google Play Store</strong>.';
      } else {
        qrInstructions.innerHTML = 'Scan with your phone to directly download <strong>CRUVO.zip (v3.1.2)</strong>.';
      }
    }

    const qrCanvas = document.getElementById('qr-canvas');
    if (qrCanvas && window.QRCode) {
      window.QRCode.toCanvas(
        qrCanvas,
        activeUrl,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#121317',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  };

  // 2. QR Code Modal Handlers
  const qrModal = document.getElementById('qr-modal');
  const btnShowQr = document.getElementById('btn-show-qr');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCopyLink = document.getElementById('btn-copy-link');

  if (tabQrPlay) {
    tabQrPlay.addEventListener('click', () => {
      currentQrTarget = 'play';
      tabQrPlay.classList.add('active');
      if (tabQrZip) tabQrZip.classList.remove('active');
      updateQrDisplay();
    });
  }

  if (tabQrZip) {
    tabQrZip.addEventListener('click', () => {
      currentQrTarget = 'zip';
      tabQrZip.classList.add('active');
      if (tabQrPlay) tabQrPlay.classList.remove('active');
      updateQrDisplay();
    });
  }

  if (btnShowQr && qrModal) {
    btnShowQr.addEventListener('click', () => {
      updateQrDisplay();
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
      } catch {
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
        faqItems.forEach((other) => other.classList.remove('active'));
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
  const downloadButtons = document.querySelectorAll('a[download], .btn-cta-primary, .btn-cta-secondary, .btn-primary-sm');
  downloadButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
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
