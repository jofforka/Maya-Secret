const menuBtn = document.getElementById('menuBtn');
const mainNav = document.getElementById('mainNav');
const header = document.getElementById('siteHeader');

menuBtn?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuBtn.classList.toggle('active', isOpen);
  menuBtn.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

mainNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuBtn?.classList.remove('active');
  menuBtn?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}));

window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 80), { passive: true });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(item => revealObserver.observe(item));

document.getElementById('year').textContent = new Date().getFullYear();
const bookingDate = document.getElementById('bookingDate');
if (bookingDate) bookingDate.min = new Date().toISOString().split('T')[0];

document.getElementById('bookingForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('clientName').value.trim();
  const service = document.getElementById('serviceChoice').value;
  const date = document.getElementById('bookingDate').value;
  const time = document.getElementById('bookingTime').value;
  const note = document.getElementById('bookingNote').value.trim();
  const readableDate = date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const message = `Hello Maya's Secret, my name is ${name}. I would like to book ${service} on ${readableDate} (${time}).${note ? ` Additional note: ${note}` : ''} Please confirm availability. `;
  window.open(`https://wa.me/2348109044321?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
});

window.addEventListener('load', () => setTimeout(() => document.querySelector('.page-loader')?.classList.add('hide'), 350));
