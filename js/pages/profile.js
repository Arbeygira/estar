initPage("profile").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("profile-form");
    const header = document.getElementById("profile-header");

    const { data: user, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", ctx.session.user_id)
        .maybeSingle();

    if (error || !user) {
        showFlash(error?.message || "No se pudo cargar el perfil.", "error");
        return;
    }

    const displayName = user.full_name || user.username;
    header.innerHTML = `
        ${user.avatar_url
            ? `<img src="${escapeHtml(user.avatar_url)}" alt="Avatar" class="profile-avatar">`
            : `<div class="profile-avatar placeholder">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>`}
        <div>
            <h2>${escapeHtml(displayName)}</h2>
            <p>Rol: ${escapeHtml(user.role)}</p>
        </div>`;

    form.full_name.value = displayName;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fullName = form.full_name.value.trim();
        const password = form.password.value.trim();
        if (!fullName) {
            showFlash("El nombre completo es obligatorio.", "error");
            return;
        }

        let avatarUrl = user.avatar_url || "";
        const avatarFile = form.avatar_file.files[0];
        if (avatarFile) {
            try {
                avatarUrl = await fileToDataUrl(avatarFile, 256);
            } catch {
                showFlash("No se pudo procesar la foto.", "error");
                return;
            }
        }

        const payload = { full_name: fullName, avatar_url: avatarUrl };
        if (password) payload.password = password;

        const { error: updateError } = await supabaseClient
            .from("users")
            .update(payload)
            .eq("id", user.id);
        if (updateError) {
            showFlash(updateError.message, "error");
            return;
        }

        setSession({ ...ctx.session, full_name: fullName, avatar_url: avatarUrl });
        flashAndGo("Perfil actualizado correctamente.", "success", "profile.html");
    });
});
