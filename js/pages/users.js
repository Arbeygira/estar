initPage("users").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("user-form");
    const roleSelect = document.getElementById("role-select");
    const tbody = document.getElementById("users-body");
    let roles = [];

    async function loadData() {
        const [usersRes, rolesRes] = await Promise.all([
            supabaseClient.from("users").select("*").order("id", { ascending: true }),
            supabaseClient.from("roles").select("*").order("id", { ascending: true }),
        ]);
        if (usersRes.error) showFlash(usersRes.error.message, "error");
        if (rolesRes.error) showFlash(rolesRes.error.message, "error");
        roles = rolesRes.data || [];
        renderRoleOptions(roleSelect);
        renderUsers(usersRes.data || []);
    }

    function renderRoleOptions(select, selected) {
        select.innerHTML = roles
            .map(
                (role) =>
                    `<option value="${escapeHtml(role.name)}"${role.name === selected ? " selected" : ""}>${escapeHtml(role.name)}</option>`
            )
            .join("");
    }

    function renderUsers(users) {
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = "";
        users.forEach((user) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td data-label="ID">${user.id}</td>
                <td data-label="Usuario"><input type="text" name="username" value="${escapeHtml(user.username)}" required></td>
                <td data-label="Nombre"><input type="text" name="full_name" value="${escapeHtml(user.full_name || user.username)}"></td>
                <td data-label="Rol"><select name="role"></select></td>
                <td data-label="Acciones">
                    <div class="inline-actions">
                        <input type="password" name="password" placeholder="Nueva clave" class="compact-input">
                        <button type="button" class="small-button" data-update="${user.id}">Actualizar</button>
                        <button type="button" class="small-button danger" data-delete="${user.id}">Eliminar</button>
                    </div>
                </td>`;
            renderRoleOptions(tr.querySelector('select[name="role"]'), user.role);
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll("[data-update]").forEach((button) => {
            button.addEventListener("click", async () => {
                const tr = button.closest("tr");
                const username = tr.querySelector('input[name="username"]').value.trim();
                const fullName = tr.querySelector('input[name="full_name"]').value.trim();
                const role = tr.querySelector('select[name="role"]').value;
                const password = tr.querySelector('input[name="password"]').value.trim();
                if (!username) {
                    showFlash("El usuario necesita un nombre.", "error");
                    return;
                }
                const payload = { username, role, full_name: fullName || username };
                if (password) payload.password = password;
                const { error } = await supabaseClient
                    .from("users")
                    .update(payload)
                    .eq("id", button.dataset.update);
                if (error) {
                    showFlash(error.message, "error");
                } else {
                    flashAndGo("Usuario actualizado correctamente.", "success", "users.html");
                }
            });
        });

        tbody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                if (Number(button.dataset.delete) === Number(ctx.session.user_id)) {
                    showFlash("No puedes eliminar tu propio usuario actual.", "error");
                    return;
                }
                const { error } = await supabaseClient
                    .from("users")
                    .delete()
                    .eq("id", button.dataset.delete);
                if (error) {
                    showFlash(error.message, "error");
                } else {
                    flashAndGo("Usuario eliminado correctamente.", "success", "users.html");
                }
            });
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = form.username.value.trim();
        const password = form.password.value.trim();
        const role = roleSelect.value || "seller";
        if (!username || !password) {
            showFlash("Completa usuario y contraseña.", "error");
            return;
        }
        const { error } = await supabaseClient
            .from("users")
            .insert({ username, password, role, full_name: username, avatar_url: "" });
        if (error) {
            showFlash("El nombre de usuario ya existe.", "error");
        } else {
            flashAndGo("Usuario registrado correctamente.", "success", "users.html");
        }
    });

    await loadData();
});
