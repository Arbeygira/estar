document.addEventListener("DOMContentLoaded", () => {
    if (getSession()) {
        window.location.href = "dashboard.html";
        return;
    }

    initTheme();

    const form = document.getElementById("login-form");
    const button = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = form.username.value.trim();
        const password = form.password.value.trim();
        if (!username || !password) return;

        button.disabled = true;
        const { data: user, error } = await supabaseClient
            .from("users")
            .select("*")
            .eq("username", username)
            .eq("password", password)
            .maybeSingle();
        button.disabled = false;

        if (error) {
            showFlash(error.message, "error");
            return;
        }
        if (user) {
            setSession({
                user_id: user.id,
                username: user.username,
                role: user.role,
                full_name: user.full_name || user.username,
                avatar_url: user.avatar_url || "",
            });
            window.location.href = "dashboard.html";
        } else {
            showFlash("Credenciales inválidas.", "error");
        }
    });
});
