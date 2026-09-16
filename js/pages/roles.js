initPage("roles").then(async (ctx) => {
    if (!ctx) return;

    const PERMISSION_OPTIONS = [
        "dashboard", "products", "sales", "clients", "expenses",
        "orders", "reports", "users", "company", "profile",
    ];

    const form = document.getElementById("role-form");
    const createChecks = document.getElementById("permissions-checks");
    const tbody = document.getElementById("roles-body");

    function checkboxGrid(name, checkedValues) {
        const checked = new Set(checkedValues || []);
        return PERMISSION_OPTIONS.map(
            (option) => `
            <label class="checkbox-item">
                <input type="checkbox" name="${name}" value="${option}"${checked.has(option) ? " checked" : ""}>
                <span>${option}</span>
            </label>`
        ).join("");
    }

    createChecks.innerHTML = checkboxGrid("permissions");

    async function loadRoles() {
        const { data, error } = await supabaseClient
            .from("roles")
            .select("*")
            .order("id", { ascending: true });
        if (error) {
            showFlash(error.message, "error");
            return;
        }
        renderRoles(data || []);
    }

    function renderRoles(roles) {
        if (!roles.length) {
            tbody.innerHTML = '<tr><td colspan="4">No hay roles creados.</td></tr>';
            return;
        }
        tbody.innerHTML = "";
        roles.forEach((role) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td data-label="Nombre"><input type="text" name="name" value="${escapeHtml(role.name)}" required></td>
                <td data-label="Descripción"><input type="text" name="description" value="${escapeHtml(role.description || "")}"></td>
                <td data-label="Permisos">
                    <div class="checkbox-grid compact-checks">${checkboxGrid("permissions", (role.permissions || "").split(","))}</div>
                </td>
                <td data-label="Acciones">
                    <div class="inline-actions">
                        <button type="button" class="small-button" data-update="${role.id}">Guardar</button>
                        <button type="button" class="small-button danger" data-delete="${role.id}">Eliminar</button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll("[data-update]").forEach((button) => {
            button.addEventListener("click", async () => {
                const tr = button.closest("tr");
                const name = tr.querySelector('input[name="name"]').value.trim();
                const description = tr.querySelector('input[name="description"]').value.trim();
                const selected = [...tr.querySelectorAll('input[name="permissions"]:checked')].map(
                    (input) => input.value
                );
                if (!name) {
                    showFlash("El rol y su nombre son obligatorios.", "error");
                    return;
                }
                const { error } = await supabaseClient
                    .from("roles")
                    .update({
                        name,
                        description: description || `Rol ${name}`,
                        permissions: selected.join(","),
                    })
                    .eq("id", button.dataset.update);
                if (error) {
                    showFlash(error.message, "error");
                } else {
                    flashAndGo("Rol actualizado correctamente.", "success", "roles.html");
                }
            });
        });

        tbody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                const { error } = await supabaseClient
                    .from("roles")
                    .delete()
                    .eq("id", button.dataset.delete);
                if (error) {
                    showFlash(error.message, "error");
                } else {
                    flashAndGo("Rol eliminado correctamente.", "success", "roles.html");
                }
            });
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = form.name.value.trim();
        const description = form.description.value.trim();
        const selected = [...createChecks.querySelectorAll('input[name="permissions"]:checked')].map(
            (input) => input.value
        );
        if (!name) {
            showFlash("El nombre del rol es obligatorio.", "error");
            return;
        }
        const { error } = await supabaseClient.from("roles").insert({
            name,
            description: description || `Rol ${name}`,
            permissions: selected.join(","),
        });
        if (error) {
            showFlash(error.message, "error");
        } else {
            flashAndGo("Rol creado correctamente.", "success", "roles.html");
        }
    });

    await loadRoles();
});
