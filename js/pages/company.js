initPage("company").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("company-form");
    const hero = document.getElementById("company-hero");
    const logoBox = document.getElementById("company-logo-box");

    const company = await getCompanyProfile();

    hero.innerHTML = `
        <div class="company-hero-brand">
            ${company.logo_url ? `<img src="${escapeHtml(company.logo_url)}" alt="Logo de la empresa" class="company-logo-preview">` : ""}
            <div>
                <span class="eyebrow">Perfil comercial</span>
                <h2>${escapeHtml(company.name)}</h2>
            </div>
        </div>
        <div class="company-hero-meta">
            <div><span>Documento</span><strong>${escapeHtml(company.document || "")}</strong></div>
            <div><span>Contacto</span><strong>${escapeHtml(company.phone || "")}</strong></div>
            <div><span>Correo</span><strong>${escapeHtml(company.email || "")}</strong></div>
        </div>`;

    form.name.value = company.name || "ESTAR";
    form.document.value = company.document || "";
    form.phone.value = company.phone || "";
    form.email.value = company.email || "";
    form.address.value = company.address || "";

    if (company.logo_url) {
        logoBox.innerHTML = `<img src="${escapeHtml(company.logo_url)}" alt="Logo de la empresa" class="company-logo-preview large">`;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = form.name.value.trim() || "ESTAR";
        const payload = {
            name,
            document: form.document.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim(),
            address: form.address.value.trim(),
            logo_url: company.logo_url,
        };

        const logoFile = form.logo_file.files[0];
        if (logoFile) {
            try {
                payload.logo_url = await fileToDataUrl(logoFile, 512);
            } catch {
                showFlash("No se pudo procesar el logo.", "error");
                return;
            }
        }

        let error;
        if (company.id) {
            ({ error } = await supabaseClient
                .from("company_profile")
                .update(payload)
                .eq("id", company.id));
        } else {
            ({ error } = await supabaseClient.from("company_profile").insert(payload));
        }

        if (error) {
            showFlash(error.message, "error");
        } else {
            flashAndGo("Información de la empresa actualizada correctamente.", "success", "company.html");
        }
    });
});
