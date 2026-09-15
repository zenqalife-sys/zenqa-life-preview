/* ==========================================================================
   ZENQA LIFE — theme.js
   Carrito lateral, buscador predictivo, variantes, quiz, revelados, countdown
   Vanilla JS · sin dependencias · progresivo (la web funciona sin JS)
   ========================================================================== */
(function () {
  'use strict';

  const Z = (window.Zenqa = window.Zenqa || {});
  const routes = () => Z.routes || {};
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const debounce = (fn, wait = 250) => {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  /* ---------------------------------------------------------------- dinero */
  function formatMoney(cents) {
    const fmt = (Z.money && Z.money.format) || '€{{amount_with_comma_separator}}';
    const value = (cents / 100).toFixed(2);
    const [int, dec] = value.split('.');
    const intPretty = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decPretty = dec.replace('.', ',');
    return fmt
      .replace(/\{\{\s*amount\s*\}\}/, value)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, intPretty)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, intPretty + ',' + decPretty)
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, intPretty)
      .replace(/\{\{\s*amount_with_apostrophe_separator\s*\}\}/, intPretty + "'" + decPretty);
  }
  Z.formatMoney = formatMoney;

  /* ----------------------------------------------------------------- toasts */
  function toast(message, variant = 'success') {
    const stack = $('[data-toast-stack]');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + variant;
    el.setAttribute('role', 'status');
    el.innerHTML =
      (variant === 'error'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>') +
      '<span></span>';
    $('span', el).textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .4s ease, transform .4s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.remove(), 400);
    }, 4200);
  }
  Z.toast = toast;

  /* ------------------------------------------------------------- overlays */
  const Overlay = {
    el: null,
    ensure() {
      if (this.el) return this.el;
      this.el = document.createElement('div');
      this.el.className = 'overlay';
      this.el.setAttribute('data-overlay', '');
      document.body.appendChild(this.el);
      on(this.el, 'click', () => Overlay.closeAll());
      return this.el;
    },
    open() {
      this.ensure().classList.add('is-active');
      document.body.style.overflow = 'hidden';
    },
    closeAll() {
      $$('[data-drawer].is-open, [data-mobile-menu].is-open, [data-search-modal]:not([hidden]), [data-popup]:not([hidden])').forEach((el) => {
        el.classList.remove('is-open');
        if (el.hasAttribute('data-search-modal') || el.hasAttribute('data-popup')) el.hidden = true;
      });
      $$('.mega.is-open').forEach((m) => m.classList.remove('is-open'));
      if (this.el) this.el.classList.remove('is-active');
      document.body.style.overflow = '';
    }
  };
  Z.Overlay = Overlay;

  /* ---------------------------------------------------------------- header */
  function initHeader() {
    const header = $('[data-header]');
    const announcement = $('[data-announcement]');
    if (!header) return;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 12);
      if (header.dataset.sticky === 'true' && y > 220) {
        header.classList.toggle('is-hidden', y > lastY + 4 && !header.classList.contains('has-open-menu') && !document.body.classList.contains('cart-open'));
      } else {
        header.classList.remove('is-hidden');
      }
      lastY = y;
    };
    on(window, 'scroll', onScroll, { passive: true });
    onScroll();

    // Mega menú con teclado
    $$('[data-mega-trigger]').forEach((btn) => {
      const target = $(btn.getAttribute('data-mega-trigger'));
      if (!target) return;
      on(btn, 'click', (e) => {
        e.preventDefault();
        const willOpen = !target.classList.contains('is-open');
        $$('.mega.is-open').forEach((m) => m.classList.remove('is-open'));
        target.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
        header.classList.toggle('has-open-menu', willOpen);
      });
    });
    const closeMega = () => {
      $$('.mega.is-open').forEach((m) => m.classList.remove('is-open'));
      $$('[data-mega-trigger]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      header.classList.remove('has-open-menu');
    };
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape') {
        Overlay.closeAll();
        closeMega();
      }
    });
    // Cerrar el mega menú al pulsar fuera o al salir con el ratón de la cabecera
    on(document, 'click', (e) => {
      if (!e.target.closest('.site-header')) closeMega();
    });
    const nav = $('.header__nav');
    if (nav) on(nav, 'mouseleave', () => setTimeout(() => { if (!$('.mega:hover')) closeMega(); }, 220));

    // Menú móvil
    const menu = $('[data-mobile-menu]');
    on($('[data-mobile-menu-open]'), 'click', () => {
      if (!menu) return;
      Overlay.ensure();
      menu.classList.add('is-open');
      Overlay.ensure().classList.add('is-active');
      document.body.style.overflow = 'hidden';
    });
    on($('[data-mobile-menu-close]'), 'click', () => Overlay.closeAll());

    // Submenús móviles
    $$('[data-submenu-toggle]').forEach((btn) => {
      on(btn, 'click', () => {
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
      });
    });
  }

  /* ------------------------------------------------------- carrito lateral */
  function cartRefresh(payload) {
    // Actualiza contadores, subtotales y barras de envío gratis en toda la página
    if (payload) {
      const count = payload.item_count || 0;
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = count > 99 ? '99+' : String(count);
        el.dataset.count = String(count);
      });
      $$('[data-cart-subtotal]').forEach((el) => (el.textContent = formatMoney(payload.total_price)));
      updateShippingBars(payload.total_price);
      renderCartDrawerFromJSON(payload);
      return;
    }
    fetch((routes().cart || '/cart') + '.js', { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((data) => cartRefresh(data))
      .catch(() => {});
  }
  Z.cartRefresh = cartRefresh;

  function updateShippingBars(cents) {
    $$('[data-ship-progress]').forEach((wrap) => {
      const threshold = parseFloat(wrap.dataset.threshold || '35') * 100;
      const remaining = Math.max(0, threshold - cents);
      const pct = Math.min(100, (cents / threshold) * 100);
      const fill = $('[data-ship-fill]', wrap);
      const label = $('[data-ship-label]', wrap);
      wrap.classList.toggle('is-complete', remaining <= 0);
      if (fill) fill.style.width = pct + '%';
      if (label) {
        label.textContent =
          remaining <= 0
            ? (Z.strings && Z.strings.freeShippingReached) || '¡Envío gratis desbloqueado!'
            : ((Z.strings && Z.strings.freeShippingRemaining) || 'Te faltan {amount} para el envío gratis').replace('{amount}', formatMoney(remaining));
      }
    });
  }
  Z.updateShippingBars = updateShippingBars;

  function renderCartDrawerFromJSON(cart) {
    const body = $('[data-cart-drawer-body]');
    const foot = $('[data-cart-drawer-foot]');
    if (!body) return;
    if (!cart.items || cart.items.length === 0) {
      const tpl = $('[data-cart-empty-template]');
      body.innerHTML = tpl ? tpl.innerHTML : '';
      if (foot) foot.hidden = true;
      return;
    }
    if (foot) foot.hidden = false;
    body.innerHTML = cart.items
      .map((item) => {
        const img = item.image ? item.image.replace(/(\.[a-z]{3,4})(\?|$)/i, '_160x$1$2') : '';
        const props = item.properties
          ? Object.entries(item.properties)
              .filter(([k, v]) => v && k.indexOf('_') !== 0 && k !== 'shipping_interval_frequency')
              .map(([k, v]) => '<div class="cart-line__meta">' + k + ': ' + v + '</div>')
              .join('')
          : '';
        const sellingPlan = item.selling_plan_allocation ? '<div class="cart-line__meta">' + item.selling_plan_allocation.selling_plan.name + '</div>' : '';
        const discount =
          item.line_level_discount_allocations && item.line_level_discount_allocations.length
            ? item.line_level_discount_allocations.map((d) => '<div class="cart-line__meta">− ' + d.discount_application.title + '</div>').join('')
            : '';
        return (
          '<div class="cart-line" data-line="' + item.key + '">' +
          '<a class="media" href="' + item.url + '">' + (img ? '<img src="' + img + '" alt="" loading="lazy" width="84" height="84">' : '') + '</a>' +
          '<div>' +
          '<a class="cart-line__title" href="' + item.url + '">' + item.product_title + '</a>' +
          (item.variant_title && item.variant_title !== 'Default Title' ? '<div class="cart-line__meta">' + item.variant_title + '</div>' : '') +
          sellingPlan + props + discount +
          '<div class="cart-line__controls">' +
          '<div class="qty">' +
          '<button type="button" data-qty-change="-1" data-line-key="' + item.key + '" aria-label="Quitar una unidad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg></button>' +
          '<input type="text" inputmode="numeric" value="' + item.quantity + '" data-qty-input data-line-key="' + item.key + '" aria-label="Cantidad">' +
          '<button type="button" data-qty-change="1" data-line-key="' + item.key + '" aria-label="Añadir una unidad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>' +
          '</div>' +
          '<button type="button" class="cart-line__remove" data-remove-line="' + item.key + '">Quitar</button>' +
          '</div></div>' +
          '<div class="cart-line__price">' + formatMoney(item.final_line_price) +
          (item.original_line_price > item.final_line_price ? '<div class="cart-line__meta"><s>' + formatMoney(item.original_line_price) + '</s></div>' : '') +
          '</div></div>'
        );
      })
      .join('');
  }

  function openCart() {
    const drawer = $('[data-drawer="cart"]');
    if (!drawer) {
      window.location.href = routes().cart || '/cart';
      return;
    }
    Overlay.ensure();
    drawer.classList.add('is-open');
    Overlay.ensure().classList.add('is-active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('cart-open');
    const first = $('button, a, input', drawer);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 120);
  }
  Z.openCart = openCart;

  function changeLine(key, quantity) {
    fetch((routes().cartChange || '/cart/change') + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
      .then((r) => r.json())
      .then((cart) => {
        cartRefresh(cart);
        if (cart.item_count === 0) closeCartIfEmpty();
      })
      .catch(() => toast((Z.strings && Z.strings.cartError) || 'No hemos podido actualizar el carrito', 'error'));
  }
  Z.changeLine = changeLine;

  function closeCartIfEmpty() {
    const foot = $('[data-cart-drawer-foot]');
    if (foot) foot.hidden = true;
  }

  function initCart() {
    on(document, 'click', (e) => {
      const openBtn = e.target.closest('[data-cart-open]');
      if (openBtn) {
        e.preventDefault();
        openCart();
        return;
      }
      const closeBtn = e.target.closest('[data-cart-close]');
      if (closeBtn) {
        Overlay.closeAll();
        document.body.classList.remove('cart-open');
        return;
      }
      const plusMinus = e.target.closest('[data-qty-change]');
      if (plusMinus) {
        const input = $('[data-qty-input][data-line-key="' + plusMinus.dataset.lineKey + '"]');
        const next = Math.max(0, parseInt(input.value, 10) + parseInt(plusMinus.dataset.qtyChange, 10));
        changeLine(plusMinus.dataset.lineKey, next);
        return;
      }
      const remove = e.target.closest('[data-remove-line]');
      if (remove) {
        changeLine(remove.dataset.removeLine, 0);
        return;
      }
    });

    on(document, 'change', (e) => {
      const input = e.target.closest('[data-qty-input]');
      if (input) changeLine(input.dataset.lineKey, Math.max(0, parseInt(input.value, 10) || 0));
    });

    // Nota del pedido desde el drawer
    on(document, 'submit', (e) => {
      const form = e.target.closest('[data-cart-note-form]');
      if (!form) return;
      e.preventDefault();
      fetch((routes().cartUpdate || '/cart/update') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ note: form.note.value })
      })
        .then((r) => r.json())
        .then(() => toast('Nota guardada'))
        .catch(() => toast('No hemos podido guardar la nota', 'error'));
    });
  }

  /* ------------------------------------------------ añadir al carrito (AJAX) */
  function initAddToCart() {
    on(document, 'submit', (e) => {
      const form = e.target.closest('form[data-product-form], form[data-quick-add]');
      if (!form) return;
      e.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const original = button ? button.innerHTML : '';
      if (button) {
        button.classList.add('is-loading');
        button.disabled = true;
        button.innerHTML = '<span>' + ((Z.strings && Z.strings.adding) || 'Añadiendo...') + '</span>';
      }
      const data = new FormData(form);
      const items =
        form.dataset.quickAdd !== undefined
          ? [{ id: form.dataset.variantId, quantity: 1 }]
          : null;

      const body = items
        ? JSON.stringify({ items })
        : data;
      const headers = items
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };

      fetch((routes().cartAdd || '/cart/add') + '.js', { method: 'POST', headers, body })
        .then(async (r) => {
          const res = await r.json();
          if (!r.ok || res.status) throw new Error(res.description || res.message || 'error');
          return res;
        })
        .then(() => {
          const drawer = $('[data-drawer="cart"]');
          if (drawer) {
            return fetch((routes().cart || '/cart') + '.js', { headers: { Accept: 'application/json' } })
              .then((r) => r.json())
              .then((cart) => {
                cartRefresh(cart);
                openCart();
              });
          }
          window.location.href = routes().cart || '/cart';
        })
        .catch((err) => toast(err.message || (Z.strings && Z.strings.cartError), 'error'))
        .finally(() => {
          if (button) {
            button.classList.remove('is-loading');
            button.disabled = false;
            button.innerHTML = original;
          }
        });
    });
  }

  /* --------------------------------------------------- buscador predictivo */
  function initPredictiveSearch() {
    const modal = $('[data-search-modal]');
    if (!modal) return;
    const input = $('[data-search-input]', modal);
    const results = $('[data-search-results]', modal);
    const suggestions = $('[data-search-suggestions]', modal);
    let controller;

    const open = () => {
      modal.hidden = false;
      Overlay.ensure().classList.add('is-active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => input && input.focus(), 80);
    };

    on(document, 'click', (e) => {
      if (e.target.closest('[data-search-open]')) {
        e.preventDefault();
        open();
      }
      if (e.target.closest('[data-search-close]')) {
        Overlay.closeAll();
        document.body.style.overflow = '';
        if (modal) modal.hidden = true;
      }
    });

    const render = (data) => {
      const products = (data.resources && data.resources.results && data.resources.results.products) || [];
      const articles = (data.resources && data.resources.results && data.resources.results.articles) || [];
      const pages = (data.resources && data.resources.results && data.resources.results.pages) || [];
      let html = '';
      if (products.length) {
        html +=
          '<div class="predictive-search__group"><div class="predictive-search__group-title">Productos</div>' +
          products
            .map(
              (p) =>
                '<a class="predictive-search__item" href="' + p.url + '">' +
                '<span class="media">' + (p.featured_image && p.featured_image.url ? '<img src="' + p.featured_image.url + '&width=120" alt="" loading="lazy">' : '') + '</span>' +
                '<span><span class="predictive-search__item-title">' + p.title + '</span>' +
                '<span class="predictive-search__item-meta">' + (p.price ? formatMoney(parseInt(p.price, 10)) : '') + '</span></span>' +
                '<span class="link-arrow">Ver</span></a>'
            )
            .join('') +
          '</div>';
      }
      if (articles.length) {
        html +=
          '<div class="predictive-search__group"><div class="predictive-search__group-title">Recetas y guías</div>' +
          articles
            .map((a) => '<a class="predictive-search__item" href="' + a.url + '"><span class="media"></span><span><span class="predictive-search__item-title">' + a.title + '</span><span class="predictive-search__item-meta">' + (a.published_at ? new Date(a.published_at).toLocaleDateString('es-ES') : 'Blog') + '</span></span><span class="link-arrow">Leer</span></a>')
            .join('') +
          '</div>';
      }
      if (pages.length) {
        html +=
          '<div class="predictive-search__group"><div class="predictive-search__group-title">Páginas</div>' +
          pages.map((p) => '<a class="predictive-search__item" href="' + p.url + '"><span class="media"></span><span><span class="predictive-search__item-title">' + p.title + '</span></span><span class="link-arrow">Ver</span></a>').join('') +
          '</div>';
      }
      if (!html) {
        html = '<div class="predictive-search__empty">' + ((data.resources && data.resources.results && data.resources.results.none) || 'Sin resultados. Prueba con «matcha ceremonial», «chasen» o «kit».') + '</div>';
      }
      results.innerHTML = html;
      results.classList.remove('predictive-search__loading');
    };

    const search = debounce(function () {
      const q = input.value.trim();
      if (q.length < 2) {
        results.innerHTML = '';
        if (suggestions) suggestions.hidden = false;
        return;
      }
      if (suggestions) suggestions.hidden = true;
      results.classList.add('predictive-search__loading');
      if (controller) controller.abort();
      controller = new AbortController();
      const url =
        (routes().predictiveSearch || '/search/suggest') +
        '?q=' + encodeURIComponent(q) +
        '&resources[type]=product,article,page&resources[limit]=6&section_id=predictive-search';
      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then(render)
        .catch(() => {});
    }, 260);

    on(input, 'input', search);
    on(modal, 'submit', (e) => e.preventDefault());
  }

  /* ------------------------------------------------------- ficha de producto */
  function initProduct() {
    const info = $('[data-product-info]');
    if (!info) return;
    const pdp = $('[data-pdp]');
    const variants = window.ZenqaProductVariants || [];
    const form = $('form[data-product-form]');

    const getChecked = (name) => {
      const el = $('input[name="' + name + '"]:checked', form || document);
      return el ? el.value : null;
    };

    function currentVariant() {
      const options = $$('[data-option-input]', form || document)
        .filter((i) => i.checked)
        .map((i) => i.value);
      if (!variants.length) return null;
      return (
        variants.find((v) => v.options.every((o, idx) => o === options[idx])) ||
        variants.find((v) => v.options.join('/') === options.join('/')) ||
        null
      );
    }

    function updateUI(variant) {
      const priceEl = $('[data-product-price]');
      const compareEl = $('[data-product-compare]');
      const addBtn = $('[data-add-button]', form || document);
      const stickyPrice = $('[data-sticky-price]');
      const sku = $('[data-product-sku]');
      const availability = $('[data-product-availability]');

      if (!variant) {
        if (addBtn) {
          addBtn.disabled = true;
          addBtn.innerHTML = '<span>' + ((Z.strings && Z.strings.unavailable) || 'No disponible') + '</span>';
        }
        return;
      }
      $$('[data-variant-id]').forEach((i) => (i.value = variant.id));
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      if (stickyPrice) stickyPrice.textContent = formatMoney(variant.price);
      if (compareEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          compareEl.textContent = formatMoney(variant.compare_at_price);
          compareEl.hidden = false;
        } else {
          compareEl.hidden = true;
        }
      }
      if (sku) sku.textContent = variant.sku || '';
      if (availability) {
        availability.textContent = variant.available
          ? availability.dataset.textInStock || 'En stock'
          : availability.dataset.textOut || 'Sin stock';
        availability.className = 'stock-note ' + (variant.available ? '' : 'stock-note--out');
      }
      if (addBtn) {
        addBtn.disabled = !variant.available;
        addBtn.innerHTML = '<span>' + (variant.available ? addBtn.dataset.textAdd || 'Añadir al carrito' : (Z.strings && Z.strings.soldOut) || 'Agotado') + '</span>';
      }
      // Imagen asociada
      if (variant.featured_media_id && pdp) {
        const target = $('[data-media-id="' + variant.featured_media_id + '"]', pdp);
        if (target) {
          $$('[data-media-id]', pdp).forEach((m) => m.classList.remove('is-active'));
          target.classList.add('is-active');
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      if (history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        history.replaceState({}, '', url.toString());
      }
    }

    on(form || document, 'change', (e) => {
      if (e.target.matches('[data-option-input]')) updateUI(currentVariant());
      if (e.target.matches('[name="selling_plan"]') || e.target.matches('[data-plan-input]')) updatePlan();
    });

    // Selector de packs (cantidad con ahorro)
    $$('[data-pack-select]').forEach((group) => {
      on(group, 'change', (e) => {
        const qty = parseInt(e.target.value, 10) || 1;
        const qtyInput = $('[data-product-qty]', form || document);
        if (qtyInput) qtyInput.value = qty;
      });
    });

    // Cantidad
    on(document, 'click', (e) => {
      const step = e.target.closest('[data-product-qty-step]');
      if (!step) return;
      const input = $('[data-product-qty]', form || document);
      if (!input) return;
      const next = Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(step.dataset.productQtyStep, 10));
      input.value = next;
      $$('[data-pack-select] input').forEach((r) => (r.checked = r.value === String(next)));
    });

    // Suscripción: intercambia etiqueta de precio y campos
    function updatePlan() {
      const planInput = $('[data-plan-input]:checked');
      const isSub = planInput && planInput.value !== '';
      const freq = $('[data-frequency-wrap]');
      if (freq) freq.hidden = !isSub;
      const note = $('[data-plan-note]');
      if (note) note.hidden = !isSub;
    }
    updatePlan();

    // Barra fija de compra en móvil
    const sticky = $('[data-sticky-bar]');
    const mainBtn = $('[data-add-button]');
    if (sticky && mainBtn && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        ([entry]) => {
          sticky.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
        },
        { threshold: 0 }
      );
      io.observe(mainBtn);
      const stickyBtn = $('[data-sticky-add]');
      on(stickyBtn, 'click', () => {
        const btn = $('[data-add-button]', form || document);
        if (btn) btn.click();
      });
    }

    // Galería: miniaturas
    on(document, 'click', (e) => {
      const thumb = e.target.closest('[data-thumb-target]');
      if (!thumb) return;
      e.preventDefault();
      const target = $(thumb.getAttribute('data-thumb-target'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Acordeones / pestañas
    initDisclosure();

    // Vistos recientemente
    const id = info.dataset.productId;
    if (id) {
      try {
        const key = 'zenqa:viewed';
        const list = JSON.parse(localStorage.getItem(key) || '[]').filter((x) => x !== id);
        list.unshift(id);
        localStorage.setItem(key, JSON.stringify(list.slice(0, 12)));
        const container = $('[data-recently-viewed]');
        if (container) {
          const url = container.dataset.url;
          const excludes = list.map((v) => 'exclude[]=' + v).join('&');
          if (url) renderRecommendations(container, url + '?section_id=recently-viewed&' + excludes + '&limit=4');
        }
      } catch (err) {}
    }
  }

  function renderRecommendations(container, url) {
    fetch(url)
      .then((r) => r.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const inner = doc.querySelector('[data-recommendations-content]');
        if (inner) container.innerHTML = inner.innerHTML;
      })
      .catch(() => {});
  }
  Z.renderRecommendations = renderRecommendations;

  /* --------------------------------------------------------- acordeones/tabs */
  function initDisclosure() {
    $$('[data-accordion]').forEach((acc) => {
      $$('[data-accordion-trigger]', acc).forEach((btn) => {
        on(btn, 'click', () => {
          const item = btn.closest('.accordion__item');
          const open = btn.getAttribute('aria-expanded') === 'true';
          if (acc.dataset.accordion === 'single') {
            $$('.accordion__item', acc).forEach((i) => {
              i.classList.remove('is-open');
              const t = $('[data-accordion-trigger]', i);
              if (t) t.setAttribute('aria-expanded', 'false');
            });
          }
          item.classList.toggle('is-open', !open);
          btn.setAttribute('aria-expanded', String(!open));
        });
      });
    });

    $$('[data-tabs]').forEach((tabs) => {
      const btns = $$('[data-tab-btn]', tabs);
      btns.forEach((btn) => {
        on(btn, 'click', () => {
          const target = btn.dataset.tabBtn;
          btns.forEach((b) => {
            b.classList.toggle('is-active', b === btn);
            b.setAttribute('aria-selected', String(b === btn));
          });
          $$('[data-tab-panel]', tabs).forEach((p) => p.classList.toggle('is-active', p.dataset.tabPanel === target));
        });
      });
      if (btns.length && !btns.some((b) => b.classList.contains('is-active'))) btns[0].click();
    });
  }

  /* ----------------------------------------------------------- revelados */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
            // anima barras/graphs dentro del bloque revelado
            $$('[data-animate-width]', entry.target).forEach((el) => (el.style.width = el.dataset.animateWidth + '%'));
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    $$('[data-reveal]').forEach((el) => io.observe(el));

    // Contadores
    $$('[data-counter]').forEach((el) => {
      const target = parseFloat(el.dataset.counter);
      const decimals = parseInt(el.dataset.counterDecimals || '0', 10);
      let started = false;
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            const duration = 1200;
            const start = performance.now();
            const tick = (now) => {
              const p = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = (target * eased).toFixed(decimals).replace('.', ',');
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      });
      io2.observe(el);
    });
  }

  /* --------------------------------------------------------------- quiz */
  function initQuiz() {
    $$('[data-quiz]').forEach((quiz) => {
      const steps = $$('[data-quiz-step]', quiz);
      const progress = $('[data-quiz-progress]', quiz);
      const answers = {};
      let index = 0;

      const update = () => {
        steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
        if (progress) progress.style.width = ((index / (steps.length - 1)) * 100).toFixed(0) + '%';
      };

      on(quiz, 'click', (e) => {
        const option = e.target.closest('[data-quiz-option]');
        if (option) {
          answers[option.dataset.quizKey] = option.dataset.quizValue;
          index = Math.min(steps.length - 1, index + 1);
          if (index === steps.length - 1) runMatch();
          update();
          return;
        }
        if (e.target.closest('[data-quiz-restart]')) {
          index = 0;
          Object.keys(answers).forEach((k) => delete answers[k]);
          $$('.quiz__result-full', quiz).forEach((r) => r.classList.remove('is-active'));
          update();
        }
      });

      function score(product) {
        const goals = (product.dataset.goals || '').split(',').map((s) => s.trim());
        const uses = (product.dataset.uses || '').split(',').map((s) => s.trim());
        const levels = (product.dataset.levels || '').split(',').map((s) => s.trim());
        let points = 0;
        if (goals.includes(answers.goal)) points += 2;
        if (uses.includes(answers.use)) points += 2;
        if (levels.includes(answers.level)) points += 1;
        if (answers.level === 'expert' && product.dataset.quality === 'ceremonial') points += 1;
        if (answers.volume === 'high' && product.dataset.size === 'large') points += 1;
        return points;
      }

      function runMatch() {
        const products = $$('[data-quiz-product]', quiz);
        if (!products.length) return;
        let best = products[0];
        let bestScore = -1;
        products.forEach((p) => {
          const s = score(p);
          if (s > bestScore) {
            best = p;
            bestScore = s;
          }
        });
        $$('.quiz__result-slot', quiz).forEach((slot) => {
          slot.innerHTML = best.innerHTML;
          slot.dataset.match = 'true';
        });
        const link = $('[data-quiz-link]', quiz);
        if (link && best.dataset.url) link.href = best.dataset.url;
        const title = $('[data-quiz-match-title]', quiz);
        if (title && best.dataset.title) title.textContent = best.dataset.title;
        const price = $('[data-quiz-match-price]', quiz);
        if (price && best.dataset.price) price.textContent = best.dataset.price;
      }

      update();
    });
  }

  /* ----------------------------------------------------------- countdown */
  function initCountdown() {
    $$('[data-countdown]').forEach((el) => {
      const minutes = parseFloat(el.dataset.countdown) || 0;
      const endTime = new Date().setMinutes(new Date().getMinutes() + minutes);
      const target = el.dataset.countdownUntil ? new Date(el.dataset.countdownUntil).getTime() : endTime;
      const set = (unit, value) => {
        const node = $('[data-countdown-' + unit + ']', el);
        if (node) node.textContent = String(value).padStart(2, '0');
      };
      const tick = () => {
        const diff = Math.max(0, target - Date.now());
        const h = Math.floor(diff / 3.6e6);
        const m = Math.floor((diff % 3.6e6) / 6e4);
        const s = Math.floor((diff % 6e4) / 1000);
        set('hours', h);
        set('minutes', m);
        set('seconds', s);
      };
      tick();
      setInterval(tick, 1000);
    });
  }

  /* ------------------------------------------------------------- marquee */
  function initMarquee() {
    $$('[data-marquee]').forEach((marquee) => {
      const track = $('.marquee__track', marquee);
      if (!track) return;
      const speed = parseFloat(marquee.dataset.marquee) || 32;
      track.style.animationDuration = speed + 's';
      // duplica contenido si hace falta para cubrir el ancho
      if (track.scrollWidth < window.innerWidth * 1.2) {
        track.innerHTML += track.innerHTML;
      }
    });
  }

  /* ------------------------------------------------------ newsletter popup */
  function initPopup() {
    const popup = $('[data-popup]');
    if (!popup) return;
    const key = 'zenqa:popup:' + (popup.dataset.popup || '1');
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(key) === '1';
    } catch (e) {}
    if (dismissed) return;
    const delay = parseInt(popup.dataset.popupDelay || '12', 10) * 1000;
    const show = () => {
      if (popup.hidden === false) return;
      popup.hidden = false;
      Overlay.ensure().classList.add('is-active');
    };
    const timer = setTimeout(show, delay);
    const onExit = (e) => {
      if (e.clientY <= 0) {
        show();
        document.removeEventListener('mouseleave', onExit);
      }
    };
    on(document, 'mouseleave', onExit);
    on(document, 'click', (e) => {
      if (e.target.closest('[data-popup-close]') || e.target === popup) {
        clearTimeout(timer);
        popup.hidden = true;
        try {
          localStorage.setItem(key, '1');
        } catch (err) {}
        Overlay.closeAll();
      }
    });
    on(popup, 'submit', (e) => {
      const form = e.target.closest('form');
      if (!form) return;
      // El envío se hace vía Shopify (marketing). Cerramos después.
      try {
        localStorage.setItem(key, '1');
      } catch (err) {}
      setTimeout(() => {
        popup.hidden = true;
        Overlay.closeAll();
      }, 600);
    });
  }

  /* ------------------------------------------------------------ wishlist */
  function initWishlist() {
    const KEY = 'zenqa:wishlist';
    const read = () => {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
      } catch (e) {
        return [];
      }
    };
    const write = (list) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
      } catch (e) {}
    };
    const paint = () => {
      const list = read();
      $$('[data-wishlist-toggle]').forEach((btn) => {
        const active = list.includes(btn.dataset.wishlistToggle);
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
        btn.style.color = active ? 'var(--color-pink)' : '';
      });
    };
    on(document, 'click', (e) => {
      const btn = e.target.closest('[data-wishlist-toggle]');
      if (!btn) return;
      e.preventDefault();
      const id = btn.dataset.wishlistToggle;
      const list = read();
      const next = list.includes(id) ? list.filter((x) => x !== id) : list.concat(id);
      write(next);
      paint();
      toast(list.includes(id) ? 'Eliminado de favoritos' : 'Guardado en favoritos');
    });
    paint();
  }

  /* -------------------------------------------------- filtros en móvil */
  function initFilters() {
    on(document, 'click', (e) => {
      if (e.target.closest('[data-filters-open]')) {
        const panel = $('[data-filters]');
        if (panel) {
          panel.classList.add('is-open');
          Overlay.ensure().classList.add('is-active');
          document.body.style.overflow = 'hidden';
        }
      }
      if (e.target.closest('[data-filters-close]')) {
        const panel = $('[data-filters]');
        if (panel) panel.classList.remove('is-open');
        Overlay.closeAll();
      }
    });
    // autoenvía los filtros
    $$('[data-filter-form] input[type="checkbox"], [data-filter-form] select').forEach((el) => {
      on(el, 'change', debounce(() => el.form && el.form.submit(), 400));
    });
  }

  /* ------------------------------------------------------- volver arriba */
  function initMisc() {
    const toTop = $('[data-to-top]');
    if (toTop) {
      on(window, 'scroll', () => toTop.classList.toggle('is-visible', window.scrollY > 700), { passive: true });
      on(toTop, 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    // Año dinámico
    $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
    // Copiar enlace (compartir)
    on(document, 'click', (e) => {
      const btn = e.target.closest('[data-copy-link]');
      if (!btn) return;
      const url = btn.dataset.copyLink;
      const done = () => toast((Z.strings && Z.strings.copied) || '¡Enlace copiado!');
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(done);
      else done();
    });
  }

  /* ----------------------------------------------------------- arranque */
  function init() {
    initHeader();
    initCart();
    initAddToCart();
    initPredictiveSearch();
    initProduct();
    initDisclosure();
    initReveal();
    initQuiz();
    initCountdown();
    initMarquee();
    initPopup();
    initWishlist();
    initFilters();
    initMisc();
    cartRefresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
