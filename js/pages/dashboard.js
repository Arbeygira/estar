initPage("dashboard").then(async (ctx) => {
    if (!ctx) return;

    const [salesTotal, ordersTotal, expensesTotal, productsCountRes, inventoryRes, recentRes] =
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
                <td><a href="invoice.html?id=${sale.id}">Ver</a></td>
            </tr>`
        )
        .join("");
});
