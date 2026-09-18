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
    const addItemButton = document.getElementById("add-order-item");
    const itemsList = document.getElementById("order-items-list");
    const searchInput = document.getElementById("order-search");
    const statusFilter = document.getElementById("order-status-filter");
    const pdfButton = document.getElementById("orders-pdf");

    let products = [];
    let allOrders = [];
    let salesOrderIds = new Set();
    const items = [];

    const STATUS_LABELS = {
        pendiente: "Pendiente",
        en_proceso: "En proceso",
        terminado: "Terminado",
        entregado: "Entregado",
        pagado: "Pagado",
    };

    async function loadData() {
        const [clientsRes, productsRes, ordersRes, salesRes] = await Promise.all([
            supabaseClient.from("clients").select("id,name").order("name", { ascending: true }),
            supabaseClient.from("products").select("id,name,price").order("name", { ascending: true }),
            supabaseClient
                .from("orders")
                .select("*,products(name)")
                .order("id", { ascending: false }),
            supabaseClient.from("sales").select("order_id"),
        ]);

        if (clientsRes.error) showFlash(clientsRes.error.message, "error");
        if (productsRes.error) showFlash(productsRes.error.message, "error");
        if (ordersRes.error) showFlash(ordersRes.error.message, "error");
        if (salesRes.error) showFlash(salesRes.error.message, "error");

        optionsList.innerHTML = (clientsRes.data || [])
            .map(
                (client) =>
                    `<button type="button" class="client-search-option" data-value="${escapeHtml(client.name)}">${escapeHtml(client.name)}</button>`
            )
            .join("");
        bindClientSearch();

        products = productsRes.data || [];
        productSelect.innerHTML =
            '<option value="">Selecciona un producto</option>' +
            products
                .map(
                    (p) =>
                        `<option value="${p.id}" data-price="${p.price}">${escapeHtml(p.name)} - ${formatCOP(p.price)}</option>`
                )
                .join("");

        allOrders = ordersRes.data || [];
        salesOrderIds = new Set(
            (salesRes.data || []).map((sale) => sale.order_id).filter(Boolean)
        );
        renderOrders();
    }

    function statusOptions(current) {
        return Object.entries(STATUS_LABELS)
            .map(
                ([value, label]) =>
                    `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`
            )
            .join("");
    }

    function getFilteredOrders() {
        const term = (searchInput.value || "").trim().toLowerCase();
        const statusValue = statusFilter ? statusFilter.value : "activos";
        let orders = allOrders;
        if (statusValue === "activos") {
            // Los encargos pagados que ya pasaron a ventas se retiran de este apartado
            orders = orders.filter(
                (order) => !(order.status === "pagado" && salesOrderIds.has(order.id))
            );
        } else if (statusValue !== "todos") {
            orders = orders.filter((order) => order.status === statusValue);
        }
        if (term) {
            orders = orders.filter((order) =>
                [order.client_name, order.products?.name, order.description]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(term))
            );
        }
        return orders;
    }

    function renderOrders() {
        const orders = getFilteredOrders();
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="10">No hay encargos para los filtros seleccionados.</td></tr>';
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
                    <td><span class="money-cell"><span class="money-badge badge-valor" title="Valor">V</span>${formatCOP(order.total)}</span></td>
                    <td><span class="money-cell"><span class="money-badge badge-abono" title="Abono">A</span>${formatCOP(order.deposit)}</span></td>
                    <td><span class="money-cell"><span class="money-badge badge-pago" title="Pago">P</span>${formatCOP(order.paid_amount || 0)}</span></td>
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
                        const { error: saleError } = await supabaseClient.from("sales").insert({
                            product_id: order.product_id,
                            client_id: client ? client.id : null,
                            order_id: orderId,
                            quantity: order.quantity,
                            unit_price: order.unit_price,
                            total: order.total,
                        });
                        if (saleError) {
                            showFlash(saleError.message, "error");
                            return;
                        }
                    }
                    // Liberar la referencia de la venta y retirar el encargo de este apartado
                    await supabaseClient.from("sales").update({ order_id: null }).eq("order_id", orderId);
                    const { error: deleteError } = await supabaseClient
                        .from("orders")
                        .delete()
                        .eq("id", orderId);
                    if (deleteError) {
                        showFlash(deleteError.message, "error");
                        return;
                    }
                    flashAndGo("Encargo pagado y movido a ventas.", "success", "orders.html");
                    return;
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
        const total = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
        totalInput.value = total.toFixed(2);
    }

    function renderItems() {
        itemsList.innerHTML = items.length
            ? items
                  .map(
                      (item, index) => `
                <li class="order-item">
                    <span>${item.quantity}× ${escapeHtml(item.name)} — ${formatCOP(item.quantity * item.unit_price)}</span>
                    <button type="button" class="small-button danger" data-remove="${index}">Quitar</button>
                </li>`
                  )
                  .join("")
            : '<li class="order-items-empty">No hay productos agregados.</li>';
        itemsList.querySelectorAll("[data-remove]").forEach((button) => {
            button.addEventListener("click", () => {
                items.splice(Number(button.dataset.remove), 1);
                renderItems();
                updateTotal();
            });
        });
    }

    addItemButton.addEventListener("click", () => {
        const productId = Number(productSelect.value || 0);
        const product = products.find((p) => p.id === productId);
        const quantity = parseInt(quantityInput.value || "1", 10);
        let unitPrice = parseFloat(unitPriceInput.value || "0");
        if (!product) {
            showFlash("Selecciona un producto para agregar.", "error");
            return;
        }
        if (quantity <= 0) {
            showFlash("La cantidad debe ser mayor a cero.", "error");
            return;
        }
        if (unitPrice <= 0) unitPrice = Number(product.price || 0);

        const existing = items.find(
            (item) => item.product_id === productId && item.unit_price === unitPrice
        );
        if (existing) {
            existing.quantity += quantity;
        } else {
            items.push({ product_id: productId, name: product.name, quantity, unit_price: unitPrice });
        }

        productSelect.value = "";
        quantityInput.value = 1;
        unitPriceInput.value = "0";
        renderItems();
        updateTotal();
    });

    productSelect.addEventListener("change", () => {
        const selected = productSelect.options[productSelect.selectedIndex];
        const price = selected && selected.dataset.price ? parseFloat(selected.dataset.price) : 0;
        unitPriceInput.value = price > 0 ? price.toFixed(2) : "0.00";
    });

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
        const deposit = parseFloat(form.deposit.value || "0");
        const paidAmount = parseFloat(form.paid_amount.value || "0");
        const status = form.status.value;

        if (!clientName || !items.length) {
            showFlash("Selecciona un cliente y agrega al menos un producto.", "error");
            return;
        }

        const summary = items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
        const rows = items.map((item, index) => ({
            client_name: clientName,
            description: description ? `${description} (${summary})` : summary,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
            deposit: index === 0 ? deposit : 0,
            paid_amount: index === 0 ? paidAmount : 0,
            status,
        }));

        const { error } = await supabaseClient.from("orders").insert(rows);
        if (error) {
            showFlash(error.message, "error");
        } else {
            flashAndGo("Encargo guardado correctamente.", "success", "orders.html");
        }
    });

    searchInput.addEventListener("input", renderOrders);
    statusFilter.addEventListener("change", renderOrders);

    pdfButton.addEventListener("click", async () => {
        const orders = getFilteredOrders();
        if (!orders.length) {
            showFlash("No hay encargos para exportar.", "error");
            return;
        }
        const company = await getCompanyProfile();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;

        if (company.logo_url && company.logo_url.startsWith("data:image")) {
            try {
                doc.addImage(company.logo_url, "PNG", 14, y, 20, 20);
            } catch {
                /* logo omitido */
            }
        }
        doc.setFontSize(18);
        doc.text(`${company.name} - Listado de encargos`, 40, y + 10);
        y += 30;
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, y);

        doc.autoTable({
            startY: y + 6,
            head: [["ID", "Cliente", "Producto", "Cant.", "Valor", "Abono", "Pago", "Estado", "Fecha"]],
            body: orders.map((order) => [
                order.id,
                order.client_name,
                order.products?.name || order.description || "Sin producto",
                order.quantity || 1,
                formatCOP(order.total),
                formatCOP(order.deposit),
                formatCOP(order.paid_amount || 0),
                STATUS_LABELS[order.status] || order.status,
                formatDate(order.created_at),
            ]),
            styles: { fontSize: 8 },
        });

        doc.save("encargos_estar.pdf");
    });

    renderItems();
    await loadData();
});
