(()=>{
  const money = value => `₦${Number(value || 0).toLocaleString('en-NG')}`;
  const selected = new Map();

  const packageMap = {
    'quiet-renewal': ['swedish-massage', 'foot-detox'],
    'radiance-ritual': ['hydra-facial', 'glow-body-polish', 'sauna-bath'],
    'maya-luxe': ['hot-stone-massage', 'hammam-bath', 'hydra-facial', 'pedicure']
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const selectedItems = $('#spaSelectedItems');
  const serviceCount = $('#spaServiceCount');
  const duration = $('#spaDuration');
  const total = $('#spaTotal');
  const bookingTotal = $('#spaBookingTotal');
  const bookingSummaryText = $('#spaBookingSummaryText');
  const summaryButton = $('#spaSummaryButton');
  const submitButton = $('#spaSubmit');
  const floatingReserve = $('#spaFloatingReserve');
  const floatingCount = $('#spaFloatingCount');
  const floatingTotal = $('#spaFloatingTotal');
  const form = $('#spaBookingForm');
  const dateInput = $('#spaDate');

  function formatDuration(minutes) {
    const value = Number(minutes || 0);
    if (!value) return '0 min';
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (!hours) return `${mins} min`;
    if (!mins) return `${hours} hr${hours === 1 ? '' : 's'}`;
    return `${hours} hr${hours === 1 ? '' : 's'} ${mins} min`;
  }

  function serviceFromButton(button) {
    return {
      id: button.dataset.id,
      name: button.dataset.name,
      category: button.dataset.category,
      price: Number(button.dataset.price || 0),
      duration: Number(button.dataset.duration || 0)
    };
  }

  function toggleService(button, forceAdd = false) {
    const service = serviceFromButton(button);
    const exists = selected.has(service.id);

    if (exists && !forceAdd) {
      selected.delete(service.id);
    } else if (!exists) {
      selected.set(service.id, service);
    }

    syncButtons();
    renderSummary();
  }

  function syncButtons() {
    $$('.spa-choice').forEach(button => {
      const active = selected.has(button.dataset.id);
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
      const mark = button.querySelector('.spa-choice-mark');
      if (mark) mark.textContent = active ? '✓' : '+';
    });
  }

  function removeService(id) {
    selected.delete(id);
    syncButtons();
    renderSummary();
  }

  function renderSummary() {
    const services = [...selected.values()];
    const totalPrice = services.reduce((sum, item) => sum + item.price, 0);
    const totalDuration = services.reduce((sum, item) => sum + item.duration, 0);

    if (!services.length) {
      selectedItems.innerHTML = '<div class="spa-empty-selection"><span>✦</span><p>Your selected treatments will appear here.</p></div>';
    } else {
      selectedItems.innerHTML = services.map(item => `
        <article class="spa-selected-line">
          <div><small>${escapeHtml(item.category)}</small><b>${escapeHtml(item.name)}</b><span>${formatDuration(item.duration)}</span></div>
          <div><strong>${money(item.price)}</strong><button type="button" class="spa-remove-service" data-remove-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>
        </article>`).join('');
    }

    serviceCount.textContent = String(services.length);
    duration.textContent = formatDuration(totalDuration);
    total.textContent = money(totalPrice);
    bookingTotal.textContent = money(totalPrice);
    bookingSummaryText.textContent = services.length
      ? `${services.length} service${services.length === 1 ? '' : 's'} · ${formatDuration(totalDuration)}`
      : 'No services selected yet';

    floatingCount.textContent = String(services.length);
    floatingTotal.textContent = money(totalPrice);
    floatingReserve.classList.toggle('visible', services.length > 0);

    summaryButton.classList.toggle('disabled', !services.length);
    summaryButton.setAttribute('aria-disabled', String(!services.length));
    submitButton.disabled = !services.length;

    $$('.spa-remove-service').forEach(button => {
      button.addEventListener('click', () => removeService(button.dataset.removeId));
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  $$('.spa-accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const current = trigger.closest('.spa-accordion-item');
      const isOpen = current.classList.contains('open');

      $$('.spa-accordion-item').forEach(item => {
        item.classList.remove('open');
        item.querySelector('.spa-accordion-trigger')?.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        current.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  $$('.spa-choice').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => toggleService(button));
  });

  $$('.spa-package-add').forEach(button => {
    button.addEventListener('click', () => {
      const ids = packageMap[button.dataset.package] || [];
      ids.forEach(id => {
        const serviceButton = document.querySelector(`.spa-choice[data-id="${id}"]`);
        if (serviceButton && !selected.has(id)) {
          selected.set(id, serviceFromButton(serviceButton));
        }
      });
      syncButtons();
      renderSummary();
      button.textContent = 'Added ✓';
      setTimeout(() => { button.textContent = 'Add experience'; }, 1400);
      document.querySelector('#spa-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  $('#spaClearAll')?.addEventListener('click', () => {
    selected.clear();
    syncButtons();
    renderSummary();
  });

  summaryButton?.addEventListener('click', event => {
    if (!selected.size) {
      event.preventDefault();
      document.querySelector('#spa-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  if (dateInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.min = now.toISOString().split('T')[0];
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();

    if (!selected.size) {
      document.querySelector('#spa-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!form.reportValidity()) return;

    const services = [...selected.values()];
    const totalPrice = services.reduce((sum, item) => sum + item.price, 0);
    const totalDuration = services.reduce((sum, item) => sum + item.duration, 0);
    const rawDate = $('#spaDate').value;
    const formattedDate = rawDate
      ? new Date(`${rawDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const serviceLines = services.map((item, index) => `${index + 1}. ${item.name} — ${money(item.price)}`);
    const message = [
      "Hello Maya's Secret Spa,",
      '',
      'I would like to reserve the following spa experience:',
      '',
      ...serviceLines,
      '',
      `Total: ${money(totalPrice)}`,
      `Estimated duration: ${formatDuration(totalDuration)}`,
      '',
      `Name: ${$('#spaName').value.trim()}`,
      `Phone: ${$('#spaPhone').value.trim()}`,
      `Preferred date: ${formattedDate}`,
      `Preferred time: ${$('#spaTime').value}`,
      `Additional notes: ${$('#spaNotes').value.trim() || 'None'}`,
      '',
      'Please confirm availability. Thank you.'
    ].join('\n');

    window.open(`https://wa.me/2348109044321?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });

  renderSummary();
})();
