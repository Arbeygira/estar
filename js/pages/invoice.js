initPage(null).then(async (ctx) => {
    if (!ctx) return;

    const saleId = Number(getParam("id") || 0);
    if (!saleId) {
        flashAndGo("Factura no encontrada.", "error", "dashboard.html");
        return;
    }

    const [saleRes, itemsRes, company] = await Promise.all([
        supabaseClient
            .from("sales")
            .select("*,products(name,price),clients(name,phone,email)")
            .eq("id", saleId)
            .maybeSingle(),
        supabaseClient
            .from("sale_items")
            .select("quantity,unit_price,total,products(name)")
            .eq("sale_id", saleId),
        getCompanyProfile(),
    ]);

    if (saleRes.error || !saleRes.data) {
        flashAndGo("Factura no encontrada.", "error", "dashboard.html");
        return;
    }

    const sale = saleRes.data;
    const clientName = sale.clients?.name || "Cliente general";
    const clientPhone = sale.clients?.phone || "Sin teléfono";
    const clientEmail = sale.clients?.email || "";
    const productName = sale.products?.name || "-";
    const items = (itemsRes.data || []).length
        ? itemsRes.data.map((item) => ({
              name: item.products?.name || "-",
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
          }))
        : [{ name: productName, quantity: sale.quantity, unit_price: sale.unit_price, total: sale.total }];

    document.getElementById("invoice-number").textContent = `#${sale.id}`;
    document.getElementById("invoice-biller").innerHTML = `
        <h3>Emisor</h3>
        ${company.logo_url ? `<img src="${escapeHtml(company.logo_url)}" alt="Logo de ${escapeHtml(company.name)}" class="company-logo-invoice">` : ""}
        <p><strong>${escapeHtml(company.name)}</strong></p>
        <p>${escapeHtml(company.document || "")}</p>
        <p>${escapeHtml(company.phone || "")}</p>
        <p>${escapeHtml(company.email || "")}</p>
        <p>${escapeHtml(company.address || "")}</p>`;
    document.getElementById("invoice-client").innerHTML = `
        <h3>Cliente</h3>
        <p><strong>${escapeHtml(clientName)}</strong></p>
        <p>${escapeHtml(clientPhone)}</p>
        ${clientEmail ? `<p>${escapeHtml(clientEmail)}</p>` : ""}`;
    document.getElementById("invoice-items-body").innerHTML = items
        .map(
            (item) => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${formatCOP(item.unit_price)}</td>
            <td>${formatCOP(item.total)}</td>
        </tr>`
        )
        .join("");
    document.getElementById("invoice-date").textContent = formatDate(sale.created_at);
    document.getElementById("invoice-total").textContent = formatCOP(sale.total);

    document.getElementById("print-invoice").addEventListener("click", () => {
        window.print();
    });

    document.getElementById("download-pdf").addEventListener("click", (event) => {
        event.preventDefault();
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
        doc.text(`Factura ${company.name}`, 40, y + 8);
        doc.setFontSize(11);
        doc.text(`Número: #${sale.id}`, 40, y + 16);
        y += 30;

        doc.autoTable({
            startY: y,
            head: [["Emisor", "Cliente"]],
            body: [
                [
                    `${company.name}\n${company.document || ""}\n${company.phone || ""}\n${company.email || ""}\n${company.address || ""}`,
                    `${clientName}\n${clientPhone}${clientEmail ? `\n${clientEmail}` : ""}`,
                ],
            ],
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [["Producto", "Cantidad", "Precio unitario", "Total"]],
            body: items.map((item) => [
                item.name,
                String(item.quantity),
                formatCOP(item.unit_price),
                formatCOP(item.total),
            ]),
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`Fecha: ${formatDate(sale.created_at)}`, 14, finalY);
        doc.text(`Total final: ${formatCOP(sale.total)}`, 14, finalY + 7);

        doc.save(`factura_${sale.id}.pdf`);
    });
});
