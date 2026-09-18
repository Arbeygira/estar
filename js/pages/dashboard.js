initPage("dashboard").then(async (ctx) => {
    if (!ctx) return;

    const [salesTotal, ordersTotal, expensesTotal, productsCountRes, inventoryRes, recentRes, activeOrdersRes] =
        await Promise.all([
            sumColumn("sales", "total"),
            sumColumn("orders", "total"),
            sumColumn("expenses", "amount"),
            supabaseClient.from("products").select("id", { count: "exact", head: true }),
            supabaseClient.from("products").select("stock,cost_price"),
            supabaseClient
                .from("sales")
                .select("id,total,quantity,created_at,products(name)")
                .order("id", { ascending: false })
                .limit(5),
            supabaseClient
                .from("orders")
                .select("id,quantity,client_name,status,products(name)")
                .neq("status", "pagado")
                .order("id", { ascending: false })
                .limit(10),
        ]);

    const inventoryValue = (inventoryRes.data || []).reduce(
        (acc, row) => acc + Number(row.stock || 0) * Number(row.cost_price || 0),
        0
    );
    const profit = salesTotal - expensesTotal;

    document.getElementById("stat-sales").textContent = formatCOP(salesTotal);
    document.getElementById("stat-orders").textContent = formatCOP(ordersTotal);
    document.getElementById("stat-expenses").textContent = formatCOP(expensesTotal);
    document.getElementById("stat-profit").textContent = formatCOP(profit);
    document.getElementById("stat-products").textContent = String(productsCountRes.count || 0);
    document.getElementById("inventory-value").textContent = formatCOP(inventoryValue);

    const ORDER_STATUS_LABELS = {
        pendiente: "Pendiente",
        en_proceso: "En proceso",
        terminado: "Terminado",
        entregado: "Entregado",
        pagado: "Pagado",
    };
    const activeOrdersBody = document.getElementById("active-orders-body");
    const activeOrders = activeOrdersRes.data || [];
    if (activeOrdersRes.error) {
        showFlash(activeOrdersRes.error.message, "error");
    }
    activeOrdersBody.innerHTML = activeOrders.length
        ? activeOrders
              .map(
                  (order) => `
            <tr>
                <td>${escapeHtml(order.products?.name || "Sin producto")}</td>
                <td>${order.quantity || 1}</td>
                <td>${escapeHtml(order.client_name || "-")}</td>
                <td>${ORDER_STATUS_LABELS[order.status] || order.status}</td>
            </tr>`
              )
              .join("")
        : '<tr><td colspan="4">No hay encargos activos.</td></tr>';

    const tbody = document.getElementById("recent-sales-body");
    const sales = recentRes.data || [];
    if (recentRes.error) {
        showFlash(recentRes.error.message, "error");
    }
    if (!sales.length) {
        tbody.innerHTML = '<tr><td colspan="6">No hay ventas registradas.</td></tr>';
        return;
    }
    tbody.innerHTML = sales
        .map(
            (sale) => `
            <tr>
                <td>${sale.id}</td>
                <td>${escapeHtml(sale.products?.name || "-")}</td>
                <td>${sale.quantity}</td>
                <td>${formatCOP(sale.total)}</td>
                <td>${formatDate(sale.created_at)}</td>
                <td><a class="small-button btn-icon" href="invoice.html?id=${sale.id}" title="Ver factura" aria-label="Ver factura">🧾</a></td>
            </tr>`
        )
        .join("");
});
