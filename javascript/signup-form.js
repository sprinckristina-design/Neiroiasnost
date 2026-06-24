function initSignupForm() {
  const overlay = document.createElement('div');
  overlay.className = 'signup-overlay form__noactive';

  const form = document.createElement('form');
  form.className = 'signup-form form__noactive';
  form.innerHTML = `
    <button type="button" class="signup-form__close" aria-label="Закрыть">&times;</button>
    <input type="text" placeholder="Ваше имя: " name="name" required>
    <input type="tel" placeholder="Телефон: " name="phone" required>
    <input type="email" placeholder="Email: " name="email" required>
    <button type="submit">Подать заявку</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(form);

  const closeBtn = form.querySelector('.signup-form__close');
  const pageContent = () => document.querySelectorAll('.page-content');

  function openForm() {
    overlay.classList.remove('form__noactive');
    form.classList.remove('form__noactive');
    pageContent().forEach((el) => el.classList.add('blur'));
    document.body.classList.add('signup-open');
  }

  function closeForm() {
    overlay.classList.add('form__noactive');
    form.classList.add('form__noactive');
    pageContent().forEach((el) => el.classList.remove('blur'));
    document.body.classList.remove('signup-open');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.textContent.trim() !== 'Записаться') return;
    e.preventDefault();
    openForm();
  });

  overlay.addEventListener('click', closeForm);
  closeBtn.addEventListener('click', closeForm);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.reset();
    closeForm();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !form.classList.contains('form__noactive')) {
      closeForm();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSignupForm);
} else {
  initSignupForm();
}
