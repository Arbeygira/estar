initPage("clients").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("client-form");
    const formTitle = document.getElementById("form-title");
    const submitButton = document.getElementById("submit-button");
    const cancelLink = document.getElementById("cancel-edit");
    const tbody = document.getElementById("clients-body");
    let clients = [];

    async function loadClients() {
        const { data, error } = await supabaseClient
            .from("clients")
            .select("*")
            .order("id", { ascending: false });
        if (error) {
            showFlash(error.message, "error");
            return;
        }
        clients = data || [];
        renderTable();
    }

    function renderTable() {
        tbody.innerHTML = clients.length
            ? clients
                  .map(
                      (client) => `
                <tr>
                    <td>${client.id}</td>
                    <td>${escapeHtml(client.name)}</td>
                    <td>${escapeHtml(client.phone || client.email || "-")}</td>
                    <td>
                        <div class="inline-actions">
                            <a class="button-link small-button" href="clients.html?edit=${client.id}">Editar</a>
                            <button type="button" class="small-button danger" data-delete="${client.id}">Eliminar</button>
                        </div>
                    </td>
                </tr>`
                  )
                  .join("")
            : '<tr><td colspan="4">No hay clientes registrados.</td></tr>';

        tbody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                const client = clients.find((c) => c.id === Number(button.dataset.delete));
                const label = client ? client.name : "este cliente";
                if (!confirm(`¿Eliminar a ${label}? Esta acción no se puede deshacer.`)) return;
                const { error } = await supabaseClient
                    .from("clients")
                    .delete()
                    .eq("id", button.dataset.delete);
                if (error) {
                    const message =
                        error.code === "23503"
                            ? "No se puede eliminar: el cliente tiene ventas asociadas."
                            : error.message;
                    showFlash(message, "error");
                } else {
                    flashAndGo("Cliente eliminado correctamente.", "success", "clients.html");
                }
            });
        });
    }

    function enterEditMode(client) {
        formTitle.textContent = "Editar cliente";
        submitButton.textContent = "Guardar cambios";
        form.client_id.value = client.id;
        form.name.value = client.name;
        form.phone.value = client.phone || "";
        form.contact.value = "";
        cancelLink.style.display = "";
    }

    const editId = Number(getParam("edit") || 0);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const clientId = Number(form.client_id.value || 0);
        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const contact = form.contact.value.trim();
        if (!name) {
            showFlash("El nombre del cliente es obligatorio.", "error");
            return;
        }

        if (clientId) {
            const { error } = await supabaseClient
                .from("clients")
                .update({ name, phone: contact || phone || null })
                .eq("id", clientId);
            if (error) {
                showFlash(error.message, "error");
            } else {
                flashAndGo("Cliente actualizado correctamente.", "success", "clients.html");
            }
            return;
        }

        const { error } = await supabaseClient
            .from("clients")
            .insert({ name, phone: contact || phone || null, email: null });
        if (error) {
            showFlash(error.message, "error");
        } else {
            flashAndGo("Cliente registrado correctamente.", "success", "clients.html");
        }
    });

    await loadClients();
    if (editId) {
        const client = clients.find((c) => c.id === editId);
        if (client) enterEditMode(client);
    }
});
