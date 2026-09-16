// Núcleo compartido: sesión, permisos, layout y utilidades
const DEFAULT_ROLE_PERMISSIONS = {
    admin: ["dashboard", "products", "sales", "clients", "expenses", "orders", "reports", "users", "roles", "company", "profile"],
    seller: ["dashboard", "products", "sales", "clients", "orders", "profile"],
    accountant: ["dashboard", "clients", "expenses", "orders", "reports", "company", "profile"],
};

const MENU_ITEMS = [
    { key: "dashboard", label: "Dashboard", href: "dashboard.html" },
    { key: "products", label: "Productos", href: "products.html" },
    { key: "sales", label: "Ventas", href: "sales.html" },
    { key: "clients", label: "Clientes", href: "clients.html" },
    { key: "expenses", label: "Gastos", href: "expenses.html" },
    { key: "orders", label: "Encargos", href: "orders.html" },
    { key: "reports", label: "Reportes", href: "reports.html" },
    { key: "users", label: "Usuarios", href: "users.html" },
    { key: "roles", label: "Roles", href: "roles.html" },
    { key: "company", label: "Empresa", href: "company.html" },
    { key: "profile", label: "Perfil", href: "profile.html" },
];

const DEFAULT_COMPANY = {
    name: "ESTAR",
    document: "NIT: 900000000-1",
    phone: "+57 300 000 0000",
    email: "soporte@estar.local",
    address: "Calle Principal 123, Medellín",
    logo_url: "",
};

function formatCOP(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date)) return String(value);
    return date.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ---------- Sesión ----------
function getSession() {
    try {
        return JSON.parse(localStorage.getItem("estar-session") || "null");
    } catch {
        return null;
    }
}

function setSession(session) {
    localStorage.setItem("estar-session", JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem("estar-session");
}

function logout() {
    clearSession();
    window.location.href = "login.html";
}

// ---------- Permisos ----------
async function getRolePermissions(roleName) {
    const permissions = new Set(DEFAULT_ROLE_PERMISSIONS[roleName] || []);
    if (!roleName) return [];
    const { data } = await supabaseClient
        .from("roles")
        .select("permissions")
        .eq("name", roleName)
        .maybeSingle();
    if (data && data.permissions) {
        data.permissions.split(",").forEach((p) => {
            const clean = p.trim();
            if (clean) permissions.add(clean);
        });
    }
    return [...permissions].sort();
}

// ---------- Empresa ----------
async function getCompanyProfile() {
    const { data } = await supabaseClient
        .from("company_profile")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
    const company = data ? { ...DEFAULT_COMPANY, ...data } : { ...DEFAULT_COMPANY };
    if (!company.logo_url) company.logo_url = "static/logo.svg";
    return company;
}

// ---------- Mensajes flash ----------
function flash(message, category = "success") {
    sessionStorage.setItem("estar-flash", JSON.stringify({ message, category }));
}

function flashAndGo(message, category, href) {
    flash(message, category);
    window.location.href = href;
}

function consumeFlash() {
    const raw = sessionStorage.getItem("estar-flash");
    if (!raw) return;
    sessionStorage.removeItem("estar-flash");
    try {
        const { message, category } = JSON.parse(raw);
        showFlash(message, category);
    } catch {
        /* noop */
    }
}

function showFlash(message, category = "success") {
    let container = document.querySelector(".messages");
    if (!container) {
        container = document.createElement("div");
        container.className = "messages";
        const main = document.querySelector(".main-content");
        if (main) {
            const topbar = main.querySelector(".topbar-actions");
            main.insertBefore(container, topbar ? topbar.nextSibling : main.firstChild);
        } else {
            document.body.prepend(container);
        }
    }
    const div = document.createElement("div");
    div.className = `flash ${category}`;
    div.textContent = message;
    container.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

// ---------- Layout ----------
function renderShell(session, permissions, activePage) {
    const shell = document.querySelector(".app-shell");
    const main = document.querySelector(".main-content");
    if (!shell || !main) return;

    const links = MENU_ITEMS
        .filter((item) => permissions.includes(item.key))
        .map(
            (item) =>
                `<a href="${item.href}"${item.key === activePage ? ' class="active"' : ""}>${item.label}</a>`
        )
        .join("");

    const displayName = session.full_name || session.username || "Usuario";
    const initial = displayName.charAt(0).toUpperCase();
    const avatar = session.avatar_url
        ? `<img src="${escapeHtml(session.avatar_url)}" alt="Avatar de ${escapeHtml(displayName)}" class="avatar">`
        : `<div class="avatar-placeholder">${escapeHtml(initial)}</div>`;

    const aside = document.createElement("aside");
    aside.className = "sidebar";
    aside.innerHTML = `
        <div class="sidebar-header">
            <div class="brand-block" aria-label="Logo de la empresa">
                <img src="static/logo.svg" alt="Logo ESTAR" class="brand-logo-img">
                <div class="brand-copy">
                    <strong>ESTAR</strong>
                    <small>Gestión comercial</small>
                </div>
            </div>
            <button class="mobile-menu-toggle" type="button" aria-label="Abrir menú">☰</button>
        </div>
        <nav id="sidebarNav">
            ${links}
            <a href="#" id="logoutLink">Cerrar sesión</a>
        </nav>
        <div class="sidebar-user-footer">
            <div class="user-profile">
                ${avatar}
                <div class="user-meta">
                    <strong>${escapeHtml(displayName)}</strong>
                    <span>${escapeHtml(session.role || "")}</span>
                </div>
            </div>
        </div>`;
    shell.insertBefore(aside, main);

    const topbar = document.createElement("div");
    topbar.className = "topbar-actions";
    topbar.innerHTML = `
        <div class="theme-switcher compact" aria-label="Selector de tema">
            <button type="button" class="theme-toggle" aria-label="Cambiar tema" aria-pressed="true">
                <span class="theme-toggle-track">
                    <span class="theme-toggle-thumb">
                        <span class="theme-toggle-icon">🌙</span>
                    </span>
                </span>
            </button>
        </div>`;
    main.prepend(topbar);

    const messages = document.createElement("div");
    messages.className = "messages";
    main.insertBefore(messages, topbar.nextSibling);

    document.getElementById("logoutLink").addEventListener("click", (event) => {
        event.preventDefault();
        logout();
    });

    const toggle = aside.querySelector(".mobile-menu-toggle");
    const nav = aside.querySelector("#sidebarNav");
    if (toggle && nav) {
        toggle.addEventListener("click", () => {
            nav.classList.toggle("open");
            toggle.classList.toggle("active");
        });
    }
}

function initTheme() {
    const body = document.body;
    const themeToggle = document.querySelector(".theme-toggle");
    const themeIcon = document.querySelector(".theme-toggle-icon");

    const applyTheme = (mode) => {
        const isLight = mode === "light";
        body.classList.toggle("theme-light", isLight);
        body.classList.toggle("theme-dark", !isLight);
        if (themeToggle) themeToggle.setAttribute("aria-pressed", String(isLight));
        if (themeIcon) themeIcon.textContent = isLight ? "☀️" : "🌙";
        localStorage.setItem("estar-theme", mode);
    };

    applyTheme(localStorage.getItem("estar-theme") || "dark");

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            applyTheme(body.classList.contains("theme-light") ? "dark" : "light");
        });
    }
}

// Guardia de página: exige sesión y permiso, pinta el layout y devuelve el contexto.
async function initPage(pageKey) {
    const session = getSession();
    if (!session) {
        window.location.href = "login.html";
        return null;
    }
    const permissions = await getRolePermissions(session.role);
    if (pageKey && !permissions.includes(pageKey)) {
        window.location.href = "access_denied.html";
        return null;
    }
    renderShell(session, permissions, pageKey);
    consumeFlash();
    initTheme();
    return { session, permissions };
}

// ---------- Utilidades ----------
async function sumColumn(table, column) {
    const { data, error } = await supabaseClient.from(table).select(column);
    if (error) {
        showFlash(error.message, "error");
        return 0;
    }
    return (data || []).reduce((acc, row) => acc + Number(row[column] || 0), 0);
}

function fileToDataUrl(file, maxSize = 512) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}
