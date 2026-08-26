document.addEventListener("DOMContentLoaded", () => {

    

    const hamburger = document.getElementById("hamburger");
    const navLinksContainer = document.getElementById("nav-links");

    if (hamburger && navLinksContainer) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navLinksContainer.classList.toggle("mobile-open");
        });

        // Close mobile menu when a link is clicked
        navLinksContainer.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                hamburger.classList.remove("active");
                navLinksContainer.classList.remove("mobile-open");
            });
        });

        // Close mobile menu on resize to desktop
        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) {
                hamburger.classList.remove("active");
                navLinksContainer.classList.remove("mobile-open");
            }
        });
    }



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




    const navbar = document.querySelector(".navbar");

    window.addEventListener("scroll", () => {

        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }

    });


    

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