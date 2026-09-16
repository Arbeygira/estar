initPage("clients").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("client-form");
    const tbody = document.getElementById("clients-body");

    async function loadClients() {
        const { data, error } = await supabaseClient
            .from("clients")
            .select("*")
            .order("id", { ascending: false });
        if (error) {
            showFlash(error.message, "error");
            return;
        }
        const clients = data || [];
        tbody.innerHTML = clients.length
            ? clients
                  .map(
                      (client) => `
                <tr>
                    <td>${client.id}</td>
                    <td>${escapeHtml(client.name)}</td>
                    <td>${escapeHtml(client.phone || client.email || "-")}</td>
                </tr>`
                  )
                  .join("")
            : '<tr><td colspan="3">No hay clientes registrados.</td></tr>';
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const contact = form.contact.value.trim();
        if (!name) {
            showFlash("El nombre del cliente es obligatorio.", "error");
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
});
