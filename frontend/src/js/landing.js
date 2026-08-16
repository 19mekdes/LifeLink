// LifeLink Landing Page JavaScript

document.addEventListener("DOMContentLoaded", () => {

    // ==============================
    // Smooth Scrolling
    // ==============================

    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            const targetId = link.getAttribute("href");
            const target = document.querySelector(targetId);

            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });


    // ==============================
    // Navbar Scroll Effect
    // ==============================

    const navbar = document.querySelector(".navbar");

    window.addEventListener("scroll", () => {

        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }

    });


    // ==============================
    // Section Reveal Animation
    // ==============================

    const sections = document.querySelectorAll(
        ".about, .how-it-works, .cta"
    );

    const observer = new IntersectionObserver(
        (entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }

            });

        },
        {
            threshold: 0.15
        }
    );

    sections.forEach(section => {
        observer.observe(section);
    });


    // ==============================
    // Hero Button Feedback
    // ==============================

    const donorButtons = document.querySelectorAll(
        'a[href="register.html"]'
    );

    donorButtons.forEach(button => {

        button.addEventListener("click", () => {
            console.log("Redirecting to donor registration...");
        });

    });


    const loginButtons = document.querySelectorAll(
        'a[href="login.html"]'
    );

    loginButtons.forEach(button => {

        button.addEventListener("click", () => {
            console.log("Opening LifeLink login...");
        });

    });

});