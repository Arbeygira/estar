initPage(null).then(async (ctx) => {
    if (!ctx) return;

    const saleId = Number(getParam("id") || 0);
    if (!saleId) {
        flashAndGo("Factura no encontrada.", "error", "dashboard.html");
        return;
    }

    const [saleRes, company] = await Promise.all([
        supabaseClient
            .from("sales")
            .select("*,products(name,price),clients(name,phone,email)")
            .eq("id", saleId)
            .maybeSingle(),
        getCompanyProfile(),
    ]);

    if (saleRes.error || !saleRes.data) {
        flashAndGo("Factura no encontrada.", "error", "dashboard.html");
        return;
    }

    const sale = saleRes.data;
    const clientName = sale.clients?.name || "Cliente general";
    const clientPhone = sale.clients?.phone || "Sin teléfono";
    const clientEmail = sale.clients?.email || "Sin correo";
    const productName = sale.products?.name || "-";

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
        <p>${escapeHtml(clientEmail)}</p>`;
    document.getElementById("invoice-row").innerHTML = `
        <td>${escapeHtml(productName)}</td>
        <td>${sale.quantity}</td>
        <td>${formatCOP(sale.unit_price)}</td>
        <td>${formatCOP(sale.total)}</td>`;
    document.getElementById("invoice-date").textContent = formatDate(sale.created_at);
    document.getElementById("invoice-total").textContent = formatCOP(sale.total);

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
                    `${clientName}\n${clientPhone}\n${clientEmail}`,
                ],
            ],
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [["Producto", "Cantidad", "Precio unitario", "Total"]],
            body: [[productName, String(sale.quantity), formatCOP(sale.unit_price), formatCOP(sale.total)]],
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`Fecha: ${formatDate(sale.created_at)}`, 14, finalY);
        doc.text(`Total final: ${formatCOP(sale.total)}`, 14, finalY + 7);

        doc.save(`factura_${sale.id}.pdf`);
    });
});
