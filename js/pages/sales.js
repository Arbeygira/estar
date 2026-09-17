initPage("sales").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("sales-form");
    const clientSelect = document.getElementById("client-select");
    const productSelect = document.querySelector(".sale-product-select");
    const quantityInput = document.querySelector(".sale-quantity-input");
    const priceInput = document.querySelector(".sale-price-input");
    const previewTotal = document.getElementById("sale-preview-total");
    const container = document.getElementById("sale-items-container");
    const totalDisplay = document.getElementById("sale-total-display");
    const tbody = document.getElementById("recent-sales-body");
    const prevButton = document.getElementById("sales-prev");
    const nextButton = document.getElementById("sales-next");
    const pageInfo = document.getElementById("sales-page-info");
    let products = [];
    let allSales = [];
    let currentPage = 1;
    const PAGE_SIZE = 10;

    async function loadData() {
        const [clientsRes, productsRes, salesRes] = await Promise.all([
            supabaseClient.from("clients").select("id,name").order("name", { ascending: true }),
            supabaseClient.from("products").select("*").gt("stock", 0).order("name", { ascending: true }),
            supabaseClient
                .from("sales")
                .select("id,quantity,total,unit_price,created_at,products(name),clients(name)")
                .order("id", { ascending: false }),
        ]);

        if (clientsRes.error) showFlash(clientsRes.error.message, "error");
        if (productsRes.error) showFlash(productsRes.error.message, "error");
        if (salesRes.error) showFlash(salesRes.error.message, "error");

        (clientsRes.data || []).forEach((client) => {
            const option = document.createElement("option");
            option.value = client.id;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });

        products = productsRes.data || [];
        productSelect.innerHTML = products
            .map(
                (p) =>
                    `<option value="${p.id}" data-price="${p.price}">${escapeHtml(p.name)} (Stock: ${p.stock})</option>`
            )
            .join("");

        renderRecent(salesRes.data || []);
        syncPriceWithSelected();
        updatePreview();
    }

    function renderRecent(sales) {
        allSales = sales;
        const totalPages = Math.max(1, Math.ceil(allSales.length / PAGE_SIZE));
        currentPage = Math.min(Math.max(currentPage, 1), totalPages);
        const pageSales = allSales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

        if (pageInfo) {
            pageInfo.textContent = `Página ${currentPage} de ${totalPages} (${allSales.length} ventas)`;
        }
        if (prevButton) prevButton.disabled = currentPage <= 1;
        if (nextButton) nextButton.disabled = currentPage >= totalPages;

        if (!pageSales.length) {
            tbody.innerHTML = '<tr><td colspan="8">No hay ventas registradas.</td></tr>';
            return;
        }
        tbody.innerHTML = pageSales
            .map(
                (sale) => `
                <tr>
                    <td>${sale.id}</td>
                    <td>${escapeHtml(sale.clients?.name || "General")}</td>
                    <td>${escapeHtml(sale.products?.name || "-")}</td>
                    <td>${sale.quantity}</td>
                    <td>${formatCOP(sale.unit_price)}</td>
                    <td>${formatCOP(sale.total)}</td>
                    <td>${formatDate(sale.created_at)}</td>
                    <td>
                        <div class="inline-actions">
                            <a class="small-button" href="invoice.html?id=${sale.id}">Factura</a>
                            <button type="button" class="small-button danger" data-delete="${sale.id}">Eliminar</button>
                        </div>
                    </td>
                </tr>`
            )
            .join("");

        tbody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                const saleId = button.dataset.delete;
                await supabaseClient.from("sale_items").delete().eq("sale_id", saleId);
                const { error } = await supabaseClient.from("sales").delete().eq("id", saleId);
                if (error) {
                    showFlash(error.message, "error");
                } else {
                    flashAndGo("Venta eliminada correctamente.", "success", "sales.html");
                }
            });
        });
    }

    function selectedPrice() {
        const selected = productSelect.options[productSelect.selectedIndex];
        return parseFloat(selected?.dataset?.price || 0);
    }

    function syncPriceWithSelected() {
        const price = selectedPrice();
        if (priceInput && (!priceInput.value || Number(priceInput.value) === 0)) {
            priceInput.value = price.toFixed(2);
        }
    }

    function updatePreview() {
        const quantity = parseFloat(quantityInput.value || 1);
        const unitPrice = parseFloat(priceInput.value || selectedPrice() || 0);
        previewTotal.textContent = formatCOP(quantity * unitPrice);
    }

    function updateSummary() {
        let total = 0;
        container.querySelectorAll(".sale-item").forEach((item) => {
            total += parseFloat(item.dataset.quantity || 0) * parseFloat(item.dataset.price || 0);
        });
        totalDisplay.textContent = formatCOP(total);
    }

    document.querySelector(".add-product-item").addEventListener("click", () => {
        const productId = productSelect.value;
        const productName = productSelect.options[productSelect.selectedIndex]?.text || "";
        const quantity = parseInt(quantityInput.value || "1", 10);
        const actualPrice = parseFloat(priceInput.value || selectedPrice() || 0);
        if (!productId || quantity <= 0) return;

        const item = document.createElement("div");
        item.className = "sale-item";
        item.dataset.quantity = String(quantity);
        item.dataset.price = String(actualPrice);
        item.innerHTML = `
            <span>${escapeHtml(productName)}</span>
            <span>Cantidad: ${quantity}</span>
            <span>Precio: ${formatCOP(actualPrice)}</span>
            <span>Total: ${formatCOP(quantity * actualPrice)}</span>
            <input type="hidden" name="product_ids" value="${productId}">
            <input type="hidden" name="quantities" value="${quantity}">
            <input type="hidden" name="unit_prices" value="${actualPrice}">
            <button type="button" class="small-button danger remove-sale-item">Quitar</button>`;
        container.appendChild(item);
        item.querySelector(".remove-sale-item").addEventListener("click", () => {
            item.remove();
            updateSummary();
        });
        updateSummary();
        quantityInput.value = "1";
        priceInput.value = selectedPrice().toFixed(2);
        updatePreview();
    });

    productSelect.addEventListener("change", () => {
        priceInput.value = selectedPrice().toFixed(2);
        updatePreview();
    });
    quantityInput.addEventListener("input", updatePreview);
    priceInput.addEventListener("input", updatePreview);

    if (prevButton) {
        prevButton.addEventListener("click", () => {
            currentPage -= 1;
            renderRecent(allSales);
        });
    }
    if (nextButton) {
        nextButton.addEventListener("click", () => {
            currentPage += 1;
            renderRecent(allSales);
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const clientId = clientSelect.value || null;
        const ids = [...container.querySelectorAll('input[name="product_ids"]')].map((i) => Number(i.value));
        const quantities = [...container.querySelectorAll('input[name="quantities"]')].map((i) => Number(i.value));
        const prices = [...container.querySelectorAll('input[name="unit_prices"]')].map((i) => Number(i.value));

        if (!ids.length) {
            showFlash("Debes agregar al menos un producto a la venta.", "error");
            return;
        }

        const items = [];
        let totalSale = 0;
        for (let idx = 0; idx < ids.length; idx++) {
            const product = products.find((p) => p.id === ids[idx]);
            if (!product) {
                showFlash("Producto no encontrado.", "error");
                return;
            }
            const quantity = quantities[idx] || 0;
            let unitPrice = prices[idx] || 0;
            if (quantity <= 0) {
                showFlash("La cantidad debe ser mayor a cero.", "error");
                return;
            }
            if (quantity > product.stock) {
                showFlash(`No hay suficiente stock para ${product.name}.`, "error");
                return;
            }
            if (unitPrice <= 0) unitPrice = Number(product.price);
            const itemTotal = quantity * unitPrice;
            items.push({ product_id: product.id, quantity, unit_price: unitPrice, total: itemTotal });
            totalSale += itemTotal;
        }

        const primary = items[0];
        const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

        const { data: sale, error: saleError } = await supabaseClient
            .from("sales")
            .insert({
                product_id: primary.product_id,
                client_id: clientId,
                quantity: totalQuantity,
                unit_price: primary.unit_price,
                total: totalSale,
            })
            .select("id")
            .single();
        if (saleError) {
            showFlash(saleError.message, "error");
            return;
        }

        const { error: itemsError } = await supabaseClient.from("sale_items").insert(
            items.map((item) => ({ sale_id: sale.id, ...item }))
        );
        if (itemsError) {
            showFlash(itemsError.message, "error");
            return;
        }

        for (const item of items) {
            const product = products.find((p) => p.id === item.product_id);
            await supabaseClient
                .from("products")
                .update({ stock: Number(product.stock) - item.quantity })
                .eq("id", item.product_id);
        }

        flashAndGo("Venta registrada con éxito.", "success", "sales.html");
    });

    await loadData();
});
