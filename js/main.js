/* ОкноСервис — вся интерактивность на чистом JavaScript */
(function () {
  "use strict";

  var fmt = new Intl.NumberFormat("ru-RU");

  /* ── Появление блоков при прокрутке ─────────────────────────────────── */
  (function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("reveal-visible"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );
    els.forEach(function (el) { io.observe(el); });
  })();

  function lockBody(on) {
    document.body.style.overflow = on ? "hidden" : "";
  }

  /* ── Липкая шапка: тень при прокрутке ───────────────────────────────── */
  (function initHeaderShadow() {
    var header = document.getElementById("site-header");
    if (!header) return;
    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  })();

  /* ── Мобильное меню ─────────────────────────────────────────────────── */
  (function initMenu() {
    var menu = document.getElementById("mobile-menu");
    var openBtn = document.getElementById("menu-open");
    var closeBtn = document.getElementById("menu-close");
    if (!menu || !openBtn) return;

    function open() {
      menu.classList.remove("hidden");
      openBtn.setAttribute("aria-expanded", "true");
      lockBody(true);
    }
    function close() {
      menu.classList.add("hidden");
      openBtn.setAttribute("aria-expanded", "false");
      lockBody(false);
    }
    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.classList.contains("hidden")) close();
    });
  })();

  /* ── Модальное окно заявки ──────────────────────────────────────────── */
  var modal = document.getElementById("lead-modal");

  function openModal(data) {
    if (!modal) return;
    var title = modal.querySelector("#lead-title");
    var subtitle = modal.querySelector("#lead-subtitle");
    var service = modal.querySelector("#lead-service");
    var serviceVal = modal.querySelector("#lead-service-val");
    var sourceVal = modal.querySelector("#lead-source-val");
    var messageVal = modal.querySelector("#lead-message-val");
    var form = modal.querySelector("#lead-form");
    var success = modal.querySelector("#lead-success");

    title.textContent = data.title || "Оставить заявку";
    subtitle.textContent =
      data.subtitle ||
      "Перезвоним в течение 15 минут, ответим на вопросы и договоримся о бесплатном замере.";
    if (data.service) {
      service.textContent = data.service;
      service.classList.remove("hidden");
    } else {
      service.classList.add("hidden");
    }
    serviceVal.value = data.service || "";
    sourceVal.value = data.source || "site";
    messageVal.value = data.message || "";

    form.classList.remove("hidden");
    success.classList.add("hidden");
    modal.classList.remove("hidden");
    lockBody(true);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    lockBody(false);
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-lead]");
    if (trigger) {
      e.preventDefault();
      var data = {
        title: trigger.getAttribute("data-title"),
        subtitle: trigger.getAttribute("data-subtitle"),
        service: trigger.getAttribute("data-service"),
        message: trigger.getAttribute("data-message"),
        source: trigger.getAttribute("data-source"),
      };
      // Калькулятор подставляет сообщение динамически
      if (trigger.id === "calc-lead" && window.__calcMessage) {
        data.message = window.__calcMessage();
      }
      openModal(data);
      return;
    }
    if (e.target.closest(".js-modal-close") || e.target.closest(".js-modal-backdrop")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  /* ── Отправка форм ──────────────────────────────────────────────────── */
  document.addEventListener("submit", function (e) {
    var form = e.target.closest(".js-lead-form");
    if (!form) return;
    e.preventDefault();

    var error = form.querySelector(".lead-error");
    var submitBtn = form.querySelector(".lead-submit");
    var phoneInput = form.querySelector('[name="phone"]');
    var digits = (phoneInput.value || "").replace(/\D/g, "");

    function showError(text) {
      if (!error) return;
      error.textContent = text;
      error.classList.remove("hidden");
    }

    if (digits.length < 10) {
      showError("Введите корректный номер телефона — не менее 10 цифр.");
      phoneInput.focus();
      return;
    }
    if (error) error.classList.add("hidden");

    var btnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<svg class="js-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> <span>Отправляем…</span>';

    var payload = {
      name: (form.querySelector('[name="name"]') || {}).value || "",
      phone: phoneInput.value,
      message: (form.querySelector('[name="message"]') || {}).value || "",
      service: (form.querySelector('[name="service"]') || {}).value || "",
      source: (form.querySelector('[name="source"]') || {}).value || "site",
    };

    fetch("api/lead.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      })
      .then(function () {
        // Успех: модалка или встроенная форма (страница контактов)
        var inlineSuccess = form.querySelector(".js-inline-success");
        if (inlineSuccess) {
          var parts = form.children;
          for (var i = 0; i < parts.length; i++) {
            if (!parts[i].classList.contains("js-inline-success")) {
              parts[i].classList.add("hidden");
            }
          }
          inlineSuccess.classList.remove("hidden");
        } else {
          var success = document.getElementById("lead-success");
          if (success) {
            form.classList.add("hidden");
            success.classList.remove("hidden");
          }
        }
      })
      .catch(function () {
        showError(
          "Не получилось отправить заявку. Пожалуйста, позвоните нам: +7 933 170 82 07"
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = btnHtml;
      });
  });

  /* ── FAQ-аккордеон ──────────────────────────────────────────────────── */
  document.addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-faq-toggle]");
    if (!toggle) return;
    var item = toggle.closest(".faq-item");
    var answer = item.querySelector(".faq-answer");
    var open = item.classList.toggle("faq-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    answer.style.gridTemplateRows = open ? "1fr" : "0fr";
  });

  /* ── Калькулятор стоимости ──────────────────────────────────────────── */
  (function initCalculator() {
    var totalEl = document.getElementById("calc-total");
    if (!totalEl) return;
    var noteEl = document.getElementById("calc-note");
    var chipsEl = document.getElementById("calc-chips");
    var rows = Array.from(document.querySelectorAll(".calc-row"));

    var state = {};
    rows.forEach(function (row) {
      state[row.dataset.slug] = { on: false, qty: 1 };
    });

    var NOTE_EMPTY =
      "Отметьте галочками нужные услуги — итог посчитается мгновенно. Можно выбрать несколько позиций сразу.";
    var NOTE_FULL =
      "Это ориентировочная сумма «от». Точную цену мастер зафиксирует после бесплатного замера — и она не изменится.";

    function render() {
      var total = 0;
      var chosen = [];

      rows.forEach(function (row) {
        var slug = row.dataset.slug;
        var price = Number(row.dataset.price);
        var st = state[slug];

        row.classList.toggle("is-on", st.on);
        var input = row.querySelector(".calc-input");
        if (input.checked !== st.on) input.checked = st.on;

        row.querySelector(".calc-qty").textContent = st.qty;
        row.querySelector(".calc-minus").disabled = st.qty <= 1;
        row.querySelector(".calc-plus").disabled = st.qty >= 20;

        var sum = price * st.qty;
        row.querySelectorAll(".calc-sum").forEach(function (el) {
          if (st.on) {
            el.textContent =
              el.dataset.mode === "short"
                ? "= " + fmt.format(sum) + " ₽"
                : "Промежуточный итог: " + st.qty + " шт. = " + fmt.format(sum) + " ₽";
          } else {
            el.textContent = "";
          }
        });

        if (st.on) {
          total += sum;
          chosen.push({ row: row, qty: st.qty });
        }
      });

      totalEl.textContent = chosen.length ? fmt.format(total) + " ₽" : "0 ₽";
      noteEl.textContent = chosen.length ? NOTE_FULL : NOTE_EMPTY;

      if (chosen.length) {
        chipsEl.classList.remove("hidden");
        chipsEl.classList.add("flex");
        chipsEl.innerHTML = chosen
          .map(function (c) {
            return (
              '<span class="shrink-0 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-200 ring-1 ring-white/15">' +
              c.row.dataset.name + " × " + c.qty +
              "</span>"
            );
          })
          .join("");
      } else {
        chipsEl.classList.add("hidden");
        chipsEl.classList.remove("flex");
        chipsEl.innerHTML = "";
      }
      return { total: total, chosen: chosen };
    }

    // Текст заявки из калькулятора — подставляется в модалку при открытии
    window.__calcMessage = function () {
      var result = render();
      if (!result.chosen.length) {
        return "Здравствуйте! Хочу получить точный расчёт стоимости работ по окнам.";
      }
      var lines = result.chosen.map(function (c) {
        return (
          "• " + c.row.dataset.name + " — " + c.qty + " шт. × " +
          fmt.format(Number(c.row.dataset.price)) + " ₽"
        );
      });
      return (
        "Здравствуйте! Посчитал(а) в калькуляторе на сайте:\n" +
        lines.join("\n") +
        "\nПредварительный итог: " + fmt.format(result.total) + " ₽"
      );
    };

    rows.forEach(function (row) {
      var slug = row.dataset.slug;
      row.querySelector(".calc-input").addEventListener("change", function (e) {
        state[slug].on = e.target.checked;
        render();
      });
      row.querySelector(".calc-check").addEventListener("click", function (e) {
        // клик по декоративной галочке — синхронизируем (label сам переключит input)
        e.preventDefault();
        state[slug].on = !state[slug].on;
        render();
      });
      row.querySelectorAll(".calc-qty-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var delta = Number(btn.dataset.delta);
          var qty = Math.min(20, Math.max(1, state[slug].qty + delta));
          state[slug].qty = qty;
          state[slug].on = true;
          render();
        });
      });
    });

    render();
  })();
})();
