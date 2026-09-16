initPage("expenses").then(async (ctx) => {
    if (!ctx) return;

    const form = document.getElementById("expense-form");
    const tbody = document.getElementById("expenses-body");

    async function loadExpenses() {
        const { data, error } = await supabaseClient
            .from("expenses")
            .select("*")
            .order("id", { ascending: false });
        if (error) {
            showFlash(error.message, "error");
            return;
        }
        const expenses = data || [];
        tbody.innerHTML = expenses.length
            ? expenses
                  .map(
                      (expense) => `
                <tr>
                    <td>${expense.id}</td>
                    <td>${escapeHtml(expense.description)}</td>
                    <td>${escapeHtml(expense.category || "")}</td>
                    <td>${formatCOP(expense.amount)}</td>
                    <td>${formatDate(expense.created_at)}</td>
                </tr>`
                  )
                  .join("")
            : '<tr><td colspan="5">No hay gastos registrados.</td></tr>';
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const description = form.description.value.trim();
        const amount = parseFloat(form.amount.value || "0");
        const category = form.category.value.trim() || "General";
        if (!description || amount <= 0) {
            showFlash("Completa la descripción y un monto válido.", "error");
            return;
        }
        const { error } = await supabaseClient
            .from("expenses")
            .insert({ description, amount, category });
        if (error) {
            showFlash(error.message, "error");
        } else {
            flashAndGo("Gasto registrado correctamente.", "success", "expenses.html");
        }
    });

    await loadExpenses();
});
