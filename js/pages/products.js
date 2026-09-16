initPage("products").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("product-form");
    const formTitle = document.getElementById("form-title");
    const submitButton = document.getElementById("submit-button");
    const cancelLink = document.getElementById("cancel-edit");
    const skuField = document.getElementById("sku-field");
    const skuHint = document.getElementById("sku-hint");
    const tbody = document.getElementById("products-body");
    let products = [];

    async function loadProducts() {
        const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .order("id", { ascending: false });
        if (error) {
            showFlash(error.message, "error");
            return;
        }
        products = data || [];
        renderTable();
    }

    function renderTable() {
        if (!products.length) {
            tbody.innerHTML = '<tr><td colspan="8">Aún no hay productos registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = products
            .map(
                (product) => `
                <tr>
                    <td>${product.id}</td>
                    <td>${escapeHtml(product.name)}</td>
                    <td>${escapeHtml(product.sku || "-")}</td>
                    <td>${product.stock}</td>
                    <td>${formatCOP(product.cost_price)}</td>
                    <td>${formatCOP(product.price)}</td>
                    <td>${escapeHtml(product.category || "")}</td>
                    <td>
                        <div class="inline-actions">
                            <a class="button-link small-button" href="products.html?edit=${product.id}">Editar</a>
                            <button type="button" class="small-button danger" data-delete="${product.id}">Eliminar</button>
                        </div>
                    </td>
                </tr>`
            )
            .join("");

        tbody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                const { error } = await supabaseClient
                    .from("products")
                    .delete()
                    .eq("id", button.dataset.delete);
                if (error) {
                    showFlash(error.message, "error");
                } else {
                    flashAndGo("Producto eliminado correctamente.", "success", "products.html");
                }
            });
        });
    }

    function enterEditMode(product) {
        formTitle.textContent = "Editar producto";
        submitButton.textContent = "Guardar cambios";
        form.product_id.value = product.id;
        form.name.value = product.name;
        form.stock.value = product.stock;
        form.cost_price.value = product.cost_price;
        form.price.value = product.price;
        form.category.value = product.category || "General";
        skuField.style.display = "";
        skuHint.style.display = "none";
        form.sku.value = product.sku || "";
        cancelLink.style.display = "";
    }

    const editId = Number(getParam("edit") || 0);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const productId = Number(form.product_id.value || 0);
        const name = form.name.value.trim();
        const stock = parseInt(form.stock.value || "0", 10);
        const costPrice = parseFloat(form.cost_price.value || "0");
        const price = parseFloat(form.price.value || "0");
        const category = form.category.value.trim() || "General";

        if (productId) {
            if (!name) {
                showFlash("Debes seleccionar un producto válido para editar.", "error");
                return;
            }
            const { error } = await supabaseClient
                .from("products")
                .update({ name, stock, cost_price: costPrice, price, category })
                .eq("id", productId);
            if (error) {
                showFlash(error.message, "error");
            } else {
                flashAndGo("Producto actualizado correctamente.", "success", "products.html");
            }
            return;
        }

        if (!name) {
            showFlash("Debes ingresar el nombre del producto.", "error");
            return;
        }
        const { data: inserted, error } = await supabaseClient
            .from("products")
            .insert({ name, sku: null, stock, cost_price: costPrice, price, category })
            .select("id")
            .single();
        if (error) {
            showFlash(error.message, "error");
            return;
        }
        const sku = `PROD-${String(inserted.id || 0).padStart(4, "0")}`;
        await supabaseClient.from("products").update({ sku }).eq("id", inserted.id);
        flashAndGo("Producto registrado correctamente.", "success", "products.html");
    });

    await loadProducts();
    if (editId) {
        const product = products.find((p) => p.id === editId);
        if (product) enterEditMode(product);
    }
});
