/**
 * Main application logic and UI effects
 */

// Register GSAP Plugins immediately
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
    initLenis();
    initCursorFollower();
    initGsapAnimations();
    initParticles();
    initNavbarScroll();
    initLivePreview();
    init3DLogo();
    initLightningEffect();
});

/**
 * Creates an interactive lightning/beam effect from the logo to the stats
 */
function initLightningEffect() {
    const section = document.getElementById('stats-lightning-section');
    const logo = document.getElementById('logo-3d');
    const svg = document.getElementById('lightning-svg');
    const stats = document.querySelectorAll('.stat-item');
    
    if (!section || !logo || !svg || stats.length === 0) return;

    let activeBeams = {};

    // Continuous update loop using GSAP ticker
    gsap.ticker.add(() => {
        const logoRect = logo.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        
        const startX = (logoRect.left + logoRect.width / 2) - sectionRect.left;
        const startY = (logoRect.top + logoRect.height / 2) - sectionRect.top;

        Object.keys(activeBeams).forEach(id => {
            updateBeam(id, startX, startY, activeBeams[id].target, sectionRect);
        });
    });

    section.addEventListener('mousemove', (e) => {
        stats.forEach((stat, index) => {
            const statRect = stat.getBoundingClientRect();
            const statId = stat.getAttribute('data-stat-id') || index;
            
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const distToStat = Math.sqrt(Math.pow(mouseX - (statRect.left + statRect.width/2), 2) + Math.pow(mouseY - (statRect.top + statRect.height/2), 2));

            if (distToStat < 200) {
                if (!activeBeams[statId]) {
                    const logoRect = logo.getBoundingClientRect();
                    const sectionRect = section.getBoundingClientRect();
                    const startX = (logoRect.left + logoRect.width / 2) - sectionRect.left;
                    const startY = (logoRect.top + logoRect.height / 2) - sectionRect.top;
                    createBeam(statId, startX, startY, stat, sectionRect);
                }
            } else if (activeBeams[statId]) {
                removeBeam(statId);
            }
        });
    });

    section.addEventListener('mouseleave', () => {
        Object.keys(activeBeams).forEach(removeBeam);
    });

    function createBeam(id, startX, startY, target, sectionRect) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "rgba(0, 123, 255, 0.6)");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("filter", "drop-shadow(0 0 5px #007bff)");
        svg.appendChild(path);
        
        activeBeams[id] = { path, target };
        
        // Visual feedback on the target
        gsap.to(target, { scale: 1.1, color: "#007bff", duration: 0.3 });
    }

    function updateBeam(id, startX, startY, target, sectionRect) {
        const beam = activeBeams[id];
        const targetRect = target.getBoundingClientRect();
        const endX = (targetRect.left + targetRect.width / 2) - sectionRect.left;
        const endY = (targetRect.top + targetRect.height / 2) - sectionRect.top;

        // Generate a real jagged lightning path with multiple segments
        const segments = 8;
        let d = `M ${startX} ${startY}`;
        
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            let px = startX + (endX - startX) * t;
            let py = startY + (endY - startY) * t;
            
            const jitter = 15;
            px += (Math.random() - 0.5) * jitter * 2;
            py += (Math.random() - 0.5) * jitter * 2;
            
            d += ` L ${px} ${py}`;
        }
        
        d += ` L ${endX} ${endY}`;
        beam.path.setAttribute("d", d);
        
        const opacity = Math.random() > 0.1 ? (Math.random() * 0.5 + 0.5) : 0.1;
        beam.path.setAttribute("stroke-opacity", opacity);
        beam.path.setAttribute("stroke-width", Math.random() * 2 + 1);
    }

    function removeBeam(id) {
        const beam = activeBeams[id];
        if (beam) {
            svg.removeChild(beam.path);
            gsap.to(beam.target, { scale: 1, color: "white", duration: 0.5 });
            delete activeBeams[id];
        }
    }
}

/**
 * Adds a 3D tilt effect to the brand logo on mouse move
 */
function init3DLogo() {
    const logoContainer = document.querySelector('.logo-3d-container');
    const logo = document.getElementById('logo-3d');
    
    if (!logoContainer || !logo) return;

    logoContainer.addEventListener('mousemove', (e) => {
        const { left, top, width, height } = logoContainer.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;
        
        const tiltX = (y - 0.5) * 30; // Max 30 degrees tilt
        const tiltY = (x - 0.5) * -30;
        
        gsap.to(logo, {
            rotateX: tiltX,
            rotateY: tiltY,
            duration: 0.5,
            ease: "power2.out"
        });
    });

    logoContainer.addEventListener('mouseleave', () => {
        gsap.to(logo, {
            rotateX: 0,
            rotateY: 0,
            duration: 1,
            ease: "elastic.out(1, 0.3)"
        });
    });
}

/**
 * Updates the Live Preview card on the home page with real data
 */
async function initLivePreview() {
    const card = document.getElementById('live-preview-card');
    if (!card) return;

    const storageData = localStorage.getItem('cs2_inventory_data');
    const inventory = storageData ? JSON.parse(storageData) : {};
    const inventoryArray = Object.values(inventory);

    const statusTag = document.getElementById('live-preview-status');
    const totalLabel = document.getElementById('live-preview-label');
    const totalVal = document.getElementById('live-preview-total');
    const progressBar = document.getElementById('live-preview-bar');
    const casesCount = document.getElementById('live-preview-cases');
    const profitVal = document.getElementById('live-preview-profit');

    if (inventoryArray.length === 0) {
        // No data state
        statusTag.innerText = "Esperando Datos";
        statusTag.className = "tag bg-warning text-dark";
        totalLabel.innerText = "Estado actual";
        totalVal.innerText = "¡Empieza ahora!";
        progressBar.style.width = "0%";
        casesCount.innerText = "0";
        profitVal.innerText = "€0.00";
        profitVal.className = "fw-bold text-secondary";
        
        // Add a subtle animation to the card to draw attention
        gsap.to(card, {
            boxShadow: "0 0 20px rgba(255, 193, 7, 0.2)",
            repeat: -1,
            yoyo: true,
            duration: 2
        });
        return;
    }

    try {
        const response = await fetch('data/cajas.json');
        const masterCases = await response.json();

        let totalCases = 0;
        let totalInvestedAllTime = 0;
        let totalCurrentValue = 0;
        let totalRealizedProfit = 0;
        let totalStockCost = 0;

        inventoryArray.forEach(item => {
            const master = masterCases.find(c => c.id === item.id) || {};
            
            const totalPurchasedQty = item.history.reduce((acc, h) => acc + h.quantity, 0);
            const totalPurchasedCost = item.history.reduce((acc, h) => acc + (h.quantity * h.price), 0);
            const avgPurchasePrice = totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : 0;
            
            const currentStockVal = item.total_quantity * (master.precio || 0);
            const salesRevenue = (item.sales || []).reduce((acc, s) => acc + (s.quantity * s.price), 0);
            const costOfSoldItems = (item.sales || []).reduce((acc, s) => acc + (s.quantity * avgPurchasePrice), 0);
            
            totalCases += item.total_quantity;
            totalInvestedAllTime += totalPurchasedCost;
            totalCurrentValue += currentStockVal;
            totalRealizedProfit += (salesRevenue - costOfSoldItems);
            totalStockCost += (item.total_quantity * avgPurchasePrice);
        });

        const potentialProfit = totalCurrentValue - totalStockCost;
        const totalProfit = potentialProfit + totalRealizedProfit;
        const profitPercent = totalStockCost > 0 ? (potentialProfit / totalStockCost) * 100 : 0;

        // Update UI
        statusTag.innerText = "Live";
        statusTag.className = "tag bg-success text-white";
        totalVal.innerText = `€${totalCurrentValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        const progressWidth = Math.min(100, Math.max(0, 50 + (profitPercent / 2)));
        progressBar.style.width = `${progressWidth}%`;
        
        casesCount.innerText = totalCases;
        profitVal.innerText = `${totalProfit >= 0 ? '+' : ''}€${Math.abs(totalProfit).toFixed(2)}`;
        profitVal.className = `fw-bold ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`;

    } catch (error) {
        console.warn("Could not load master data for live preview:", error);
    }
}

/**
 * Initializes Lenis for smooth scrolling
 */
function initLenis() {
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    lenis.on('scroll', ScrollTrigger.update);
    
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    
    gsap.ticker.lagSmoothing(0);
}

/**
 * Navbar scroll effect
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/**
 * Initializes a professional dual-cursor follower effect
 */
function initCursorFollower() {
    const dot = document.getElementById("cursor-dot");
    const outline = document.getElementById("cursor-outline");
    
    if (!dot || !outline) return;

    gsap.set([dot, outline], { xPercent: -50, yPercent: -50 });

    window.addEventListener("mousemove", (e) => {
        gsap.to(dot, {
            x: e.clientX,
            y: e.clientY,
            duration: 0
        });
        
        gsap.to(outline, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.15,
            ease: "power2.out"
        });
    });

    document.addEventListener("mouseover", (e) => {
        const target = e.target.closest('a, button, .glass-card, [role="button"]');
        if (target) {
            gsap.to(outline, {
                scale: 1.5,
                borderColor: "rgba(0, 123, 255, 0.8)",
                backgroundColor: "rgba(0, 123, 255, 0.05)",
                duration: 0.3
            });
            gsap.to(dot, {
                scale: 0.5,
                duration: 0.3
            });
        }
    });

    document.addEventListener("mouseout", (e) => {
        const target = e.target.closest('a, button, .glass-card, [role="button"]');
        if (target) {
            gsap.to(outline, {
                scale: 1,
                borderColor: "rgba(0, 123, 255, 0.5)",
                backgroundColor: "transparent",
                duration: 0.3
            });
            gsap.to(dot, {
                scale: 1,
                duration: 0.3
            });
        }
    });
}

/**
 * Simple and efficient particle system
 */
function initParticles() {
    const canvas = document.getElementById('bg-particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const particleCount = 60;

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }

        draw() {
            ctx.fillStyle = `rgba(0, 123, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();
}

/**
 * GSAP Animations for elements
 */
function initGsapAnimations() {
    // 1. Hero Entrance Animation (High Priority)
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
        const heroTl = gsap.timeline();
        
        heroTl.fromTo("#hero-section .tag", 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        )
        .fromTo("#hero-section .display-hero", 
            { opacity: 0, y: 40 }, 
            { opacity: 1, y: 0, duration: 1, ease: "power4.out" }, 
            "-=0.6"
        )
        .fromTo("#hero-section .lead", 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 
            "-=0.6"
        )
        .fromTo("#hero-section .btn-premium", 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power3.out" }, 
            "-=0.4"
        )
        .fromTo(".hero-preview-card", 
            { opacity: 0, y: 30 }, 
            { opacity: 1, y: 0, duration: 1.2, ease: "power4.out" }, 
            "-=0.8"
        );
    }

    // 2. Dynamic Ticker Loading (Independent)
    const ticker = document.getElementById("ticker");
    if (ticker) {
        fetch('data/cajas.json')
            .then(response => response.json())
            .then(cajas => {
                ticker.innerHTML = cajas.map(caja => `
                    <div class="ticker-item">${caja.nombre} <span>€${caja.precio.toFixed(2)}</span></div>
                `).join('');

                const tickerContent = ticker.innerHTML;
                ticker.innerHTML += tickerContent; 
                
                const totalWidth = ticker.scrollWidth / 2;
                
                gsap.to(ticker, {
                    x: -totalWidth,
                    repeat: -1,
                    duration: 120, // Much slower speed
                    ease: "none",
                    onRepeat: () => {
                        gsap.set(ticker, { x: 0 });
                    }
                });
            })
            .catch(err => console.warn("Ticker load fail, but UI continues."));
    }

    // 3. Scroll-triggered Animations
    const sectionTitles = document.querySelectorAll('section:not(#hero-section) h2');
    sectionTitles.forEach(title => {
        gsap.from(title, {
            scrollTrigger: {
                trigger: title,
                start: "top 90%",
            },
            y: 30,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        });
    });

    const cards = document.querySelectorAll('.glass-card:not(.hero-preview-card):not(.stat-card):not(.no-gsap)');
    cards.forEach((card, index) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 90%",
                toggleActions: "play none none none"
            },
            y: 30,
            opacity: 0,
            duration: 0.8,
            delay: index * 0.1,
            ease: "power2.out",
            clearProps: "all" // Asegura que los estilos de GSAP se eliminen al terminar
        });
    });

    // 4. Parallax Effect
    if (document.querySelector('.parallax-section')) {
        gsap.to("#parallax-bg", {
            scrollTrigger: {
                trigger: ".parallax-section",
                start: "top bottom",
                end: "bottom top",
                scrub: true
            },
            y: "20%",
            ease: "none"
        });

        gsap.to("#parallax-text", {
            scrollTrigger: {
                trigger: ".parallax-section",
                start: "top bottom",
                end: "bottom top",
                scrub: true
            },
            x: "-10%",
            ease: "none"
        });
    }

    // 5. Animated Counters
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        gsap.to(counter, {
            scrollTrigger: {
                trigger: counter,
                start: "top 90%",
            },
            innerText: target,
            duration: 2,
            snap: { innerText: 1 },
            ease: "power2.out",
            onUpdate: function() {
                if (target === 100) {
                    counter.innerText = Math.ceil(this.targets()[0].innerText) + "%";
                }
            }
        });
    });

    // 6. CTA Final Animation
    const cta = document.querySelector('.cta-section');
    if (cta) {
        gsap.from(cta, {
            scrollTrigger: {
                trigger: cta,
                start: "top 85%",
            },
            y: 50,
            opacity: 0,
            duration: 1.2,
            ease: "power4.out"
        });
    }
}
