/* ============================================
   Dabudinwst — main.js
   Анимации при скролле, мобильное меню, форма
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

    /* ----- Мобильное меню ----- */
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function () {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('open');
        });

        // Закрытие меню при клике на ссылку
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                menuToggle.classList.remove('active');
                nav.classList.remove('open');
            });
        });

        // Закрытие меню при клике вне навигации
        document.addEventListener('click', function (e) {
            if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
                menuToggle.classList.remove('active');
                nav.classList.remove('open');
            }
        });
    }

    /* ----- Анимации при скролле (Intersection Observer) ----- */
    var animatedElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        animatedElements.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        // Фоллбэк для старых браузеров — показать всё сразу
        animatedElements.forEach(function (el) {
            el.classList.add('visible');
        });
    }

    /* ----- Контактная форма ----- */
    var contactForm = document.getElementById('contactForm');
    var formSuccess = document.getElementById('formSuccess');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Здесь можно добавить отправку данных на сервер (fetch/AJAX)
            // Пока — показываем сообщение об успехе
            contactForm.reset();

            if (formSuccess) {
                formSuccess.classList.add('visible');
                setTimeout(function () {
                    formSuccess.classList.remove('visible');
                }, 5000);
            }
        });
    }

    /* ----- Плавный скролл к якорям ----- */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;

            var target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                var headerHeight = document.querySelector('.header').offsetHeight;
                var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

});
