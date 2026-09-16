# ESTAR POS

Sistema de gestión comercial (ventas, gastos, encargos, clientes, inventario, usuarios y roles) como aplicación web estática conectada directamente a **Supabase**. Sin Python, sin servidor: solo HTML + CSS + JavaScript.

## Estructura

```
index.html            Redirige a login o dashboard
login.html            Inicio de sesión
dashboard.html        Resumen general
products.html         Inventario de productos
sales.html            Registro de ventas
clients.html          Clientes
expenses.html         Gastos
orders.html           Encargos
reports.html          Reportes (CSV y PDF)
users.html            Usuarios (admin)
roles.html            Roles y permisos (admin)
company.html          Perfil de la empresa
profile.html          Perfil del usuario
invoice.html          Factura (ver / descargar PDF)
access_denied.html    Acceso denegado
js/config.js          URL y llave publishable de Supabase
js/app.js             Núcleo: sesión, permisos, layout, utilidades
js/pages/             Lógica de cada página
static/style.css      Estilos
static/logo.svg       Logo
supabase_schema.sql   Esquema de base de datos para Supabase
```

## Configuración inicial (una sola vez)

1. Entra a tu proyecto en [supabase.com](https://supabase.com) (`chebwqmnbkllpcsvnlmm`).
2. Abre **SQL Editor** → **New query**.
3. Pega el contenido de [supabase_schema.sql](supabase_schema.sql) y ejecútalo (**Run**).
   Esto crea las tablas, las políticas de acceso y los datos iniciales.
4. Abre `login.html` (doble clic o con un servidor estático) e inicia sesión con:
   - Usuario: `admin`
   - Contraseña: `admin123`

## Ejecutar la app

Al ser estática, basta con abrir `login.html` en el navegador. Para mejores resultados (rutas relativas, caché), sirve la carpeta con cualquier servidor estático, por ejemplo:

```powershell
npx serve .
```

## Notas

- La autenticación usa la tabla `users` propia (igual que la versión anterior), no Supabase Auth.
- Las fotos de perfil y el logo de la empresa se guardan como data URL en la base de datos (redimensionadas en el navegador).
- La llave usada en `js/config.js` es la **publishable**, diseñada para el navegador. No uses la llave `secret` en el front-end.
- El archivo `.env` de la versión Python ya no se usa; puedes eliminarlo.
