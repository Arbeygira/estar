initPage("reports").then(async (ctx) => {
    if (!ctx) return;

    const [salesTotal, expensesTotal, ordersTotal, company] = await Promise.all([
        sumColumn("sales", "total"),
        sumColumn("expenses", "amount"),
        sumColumn("orders", "total"),
        getCompanyProfile(),
    ]);
    const balance = salesTotal - expensesTotal;

    document.getElementById("stat-sales").textContent = formatCOP(salesTotal);
    document.getElementById("stat-expenses").textContent = formatCOP(expensesTotal);
    document.getElementById("stat-balance").textContent = formatCOP(balance);
    document.getElementById("stat-orders").textContent = formatCOP(ordersTotal);

    const companyCard = document.getElementById("company-card");
    companyCard.innerHTML = `
        ${company.logo_url ? `<img src="${escapeHtml(company.logo_url)}" alt="Logo de la empresa" class="company-logo-mini">` : ""}
        <div>
            <strong>${escapeHtml(company.name)}</strong>
            <p>${escapeHtml(company.document || "")}</p>
            <p>${escapeHtml(company.phone || "")}</p>
            <p>${escapeHtml(company.email || "")}</p>
            <p>${escapeHtml(company.address || "")}</p>
        </div>`;

    document.getElementById("export-csv").addEventListener("click", (event) => {
        event.preventDefault();
        const csv =
            "Tipo,Valor\n" +
            `Ventas,${salesTotal}\n` +
            `Gastos,${expensesTotal}\n` +
            `Encargos,${ordersTotal}\n` +
            `Balance,${balance}\n`;
        const blob = new Blob([csv], { type: "text/csv; charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "reporte_estar.csv";
        link.click();
        URL.revokeObjectURL(link.href);
    });

    document.getElementById("export-pdf").addEventListener("click", (event) => {
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
        doc.text(`${company.name} - Resumen financiero`, 40, y + 10);
        y += 30;
        doc.setFontSize(11);
        doc.text(`NIT: ${company.document || "No registrado"}`, 14, y);
        doc.text(`Teléfono: ${company.phone || "No registrado"}`, 14, y + 7);
        doc.text(`Email: ${company.email || "No registrado"}`, 14, y + 14);
        doc.text(`Dirección: ${company.address || "No registrada"}`, 14, y + 21);
        y += 34;
        doc.text("Reporte generado del sistema de ventas, gastos y encargos.", 14, y);
        y += 10;

        doc.autoTable({
            startY: y,
            head: [["Concepto", "Monto"]],
            body: [
                ["Ventas totales", formatCOP(salesTotal)],
                ["Gastos totales", formatCOP(expensesTotal)],
                ["Encargos", formatCOP(ordersTotal)],
                ["Balance", formatCOP(balance)],
            ],
        });

        doc.save("reporte_financiero_estar.pdf");
    });
});
