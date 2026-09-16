initPage("orders").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("order-form");
    const productSelect = document.getElementById("order-product-select");
    const quantityInput = document.getElementById("order-quantity");
    const unitPriceInput = document.getElementById("order-unit-price");
    const totalInput = document.getElementById("order-total");
    const clientInput = document.querySelector(".client-search-input");
    const optionsList = document.querySelector(".client-search-options");
    const tbody = document.getElementById("orders-body");

    const STATUS_LABELS = {
        pendiente: "Pendiente",
        en_proceso: "En proceso",
        terminado: "Terminado",
        entregado: "Entregado",
        pagado: "Pagado",
    };

    async function loadData() {
        const [clientsRes, productsRes, ordersRes] = await Promise.all([
            supabaseClient.from("clients").select("id,name").order("name", { ascending: true }),
            supabaseClient.from("products").select("id,name,price").order("name", { ascending: true }),
            supabaseClient
                .from("orders")
                .select("*,products(name)")
                .order("id", { ascending: false }),
        ]);

        if (clientsRes.error) showFlash(clientsRes.error.message, "error");
        if (productsRes.error) showFlash(productsRes.error.message, "error");
        if (ordersRes.error) showFlash(ordersRes.error.message, "error");

        optionsList.innerHTML = (clientsRes.data || [])
            .map(
                (client) =>
                    `<button type="button" class="client-search-option" data-value="${escapeHtml(client.name)}">${escapeHtml(client.name)}</button>`
            )
            .join("");
        bindClientSearch();

        productSelect.innerHTML =
            '<option value="">Selecciona un producto</option>' +
            (productsRes.data || [])
                .map(
                    (p) =>
                        `<option value="${p.id}" data-price="${p.price}">${escapeHtml(p.name)} - ${formatCOP(p.price)}</option>`
                )
                .join("");

        renderOrders(ordersRes.data || []);
    }

    function statusOptions(current) {
        return Object.entries(STATUS_LABELS)
            .map(
                ([value, label]) =>
                    `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`
            )
            .join("");
    }

    function renderOrders(orders) {
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="10">No hay encargos registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = orders
            .map((order) => {
                const pending = Number(order.total || 0) - Number(order.paid_amount || 0) > 0;
                return `
                <tr>
                    <td>${order.id}</td>
                    <td>${escapeHtml(order.client_name)}</td>
                    <td>${escapeHtml(order.products?.name || order.description || "Sin producto")}</td>
                    <td>${order.quantity || 1}</td>
                    <td>${formatCOP(order.total)}</td>
                    <td>${formatCOP(order.deposit)}</td>
                    <td>${formatCOP(order.paid_amount || 0)}</td>
                    <td>
                        <form class="order-status-form" data-order="${order.id}">
                            <select name="status">${statusOptions(order.status)}</select>
                            <input type="number" step="0.01" min="0" name="deposit" value="${order.deposit || 0}" placeholder="Anticipo">
                            <input type="number" step="0.01" min="0" name="paid_amount" value="${order.paid_amount || 0}" placeholder="Pagado">
                            <button type="submit" class="small-button">Guardar</button>
                        </form>
                    </td>
                    <td>${formatDate(order.created_at)}</td>
                    <td>
                        <div class="inline-actions">
                            <span>${pending ? "Debe" : "Pagado"}</span>
                            <button type="button" class="small-button danger" data-delete="${order.id}">Eliminar</button>
                        </div>
                    </td>
                </tr>`;
            })
            .join("");

        tbody.querySelectorAll(".order-status-form").forEach((rowForm) => {
            rowForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                const orderId = Number(rowForm.dataset.order);
                const status = rowForm.status.value;
                const deposit = parseFloat(rowForm.deposit.value || "0");
                const paidAmount = parseFloat(rowForm.paid_amount.value || "0");

                const { data: order, error: fetchError } = await supabaseClient
                    .from("orders")
                    .select("*")
                    .eq("id", orderId)
                    .maybeSingle();
                if (fetchError || !order) {
                    showFlash(fetchError?.message || "Encargo no encontrado.", "error");
                    return;
                }

                const { error } = await supabaseClient
                    .from("orders")
                    .update({ deposit, paid_amount: paidAmount, status })
                    .eq("id", orderId);
                if (error) {
                    showFlash(error.message, "error");
                    return;
                }

                if (status === "pagado") {
                    const { data: client } = await supabaseClient
                        .from("clients")
                        .select("id")
                        .eq("name", order.client_name)
                        .limit(1)
                        .maybeSingle();
                    const { data: existingSale } = await supabaseClient
                        .from("sales")
                        .select("id")
                        .eq("order_id", orderId)
                        .limit(1)
                        .maybeSingle();
                    if (!existingSale && order.product_id) {
                        await supabaseClient.from("sales").insert({
                            product_id: order.product_id,
                            client_id: client ? client.id : null,
                            order_id: orderId,
                            quantity: order.quantity,
                            unit_price: order.unit_price,
                            total: order.total,
                        });
                    }
                }

                flashAndGo("Estado del encargo actualizado.", "success", "orders.html");
            });
        });

        tbody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                const orderId = button.dataset.delete;
                await supabaseClient.from("sales").delete().eq("order_id", orderId);
                const { error } = await supabaseClient.from("orders").delete().eq("id", orderId);
                if (error) {
                    showFlash(error.message, "error");
                } else {
                    flashAndGo("Encargo eliminado correctamente.", "success", "orders.html");
                }
            });
        });
    }

    function updateTotal() {
        const selected = productSelect.options[productSelect.selectedIndex];
        const basePrice = selected ? parseFloat(selected.dataset.price || 0) : 0;
        const quantity = parseFloat(quantityInput.value || 1);
        const unitPrice = parseFloat(unitPriceInput.value || basePrice || 0);
        const total = quantity * unitPrice;
        totalInput.value = isNaN(total) ? "0" : total.toFixed(2);
        if (unitPriceInput.value === "" || Number(unitPriceInput.value) === 0) {
            unitPriceInput.value = basePrice.toFixed(2);
        }
    }

    productSelect.addEventListener("change", () => {
        const selected = productSelect.options[productSelect.selectedIndex];
        const price = selected && selected.dataset.price ? parseFloat(selected.dataset.price) : 0;
        unitPriceInput.value = price > 0 ? price.toFixed(2) : "0.00";
        updateTotal();
    });
    quantityInput.addEventListener("input", updateTotal);
    unitPriceInput.addEventListener("input", updateTotal);

    function bindClientSearch() {
        const options = [...optionsList.querySelectorAll(".client-search-option")];
        const filterOptions = () => {
            const term = clientInput.value.trim().toLowerCase();
            let visibleCount = 0;
            options.forEach((option) => {
                const matches = !term || option.dataset.value.toLowerCase().includes(term);
                option.style.display = matches ? "block" : "none";
                if (matches) visibleCount += 1;
            });
            optionsList.classList.toggle(
                "is-open",
                visibleCount > 0 && document.activeElement === clientInput
            );
        };

        clientInput.addEventListener("focus", filterOptions);
        clientInput.addEventListener("input", filterOptions);
        clientInput.addEventListener("blur", () => {
            setTimeout(() => optionsList.classList.remove("is-open"), 120);
        });
        options.forEach((option) => {
            option.addEventListener("mousedown", (event) => {
                event.preventDefault();
                clientInput.value = option.dataset.value;
                optionsList.classList.remove("is-open");
            });
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const clientName = clientInput.value.trim();
        const description = form.description.value.trim();
        const productId = Number(productSelect.value || 0);
        const quantity = parseInt(quantityInput.value || "1", 10);
        let unitPrice = parseFloat(unitPriceInput.value || "0");
        const deposit = parseFloat(form.deposit.value || "0");
        const paidAmount = parseFloat(form.paid_amount.value || "0");
        const status = form.status.value;

        let finalDescription = description;
        if (productId) {
            const { data: product } = await supabaseClient
                .from("products")
                .select("*")
                .eq("id", productId)
                .maybeSingle();
            if (product) {
                if (unitPrice <= 0) unitPrice = Number(product.price);
                finalDescription = finalDescription || product.name;
            }
        }

        const total = quantity * unitPrice;
        if (!clientName || !productId || quantity <= 0 || total <= 0) {
            showFlash("Selecciona cliente, producto, cantidad y precio válidos.", "error");
            return;
        }

        const { error } = await supabaseClient.from("orders").insert({
            client_name: clientName,
            description: finalDescription,
            product_id: productId,
            quantity,
            unit_price: unitPrice,
            total,
            deposit,
            paid_amount: paidAmount,
            status,
        });
        if (error) {
            showFlash(error.message, "error");
        } else {
            flashAndGo("Encargo guardado correctamente.", "success", "orders.html");
        }
    });

    await loadData();
});
