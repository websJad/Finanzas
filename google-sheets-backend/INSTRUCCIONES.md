# Cofre — Cómo conectar con Google Sheets

Con esta integración, tus datos se guardan automáticamente en un Google Sheets
tuyo y se sincronizan en tiempo real entre tu PC, celular y cualquier dispositivo.

---

## Paso 1: Crear el backend en Google Apps Script

1. Abre **script.google.com** en tu navegador (inicia sesión con tu cuenta de Google).
2. Haz clic en **"Nuevo proyecto"**.
3. Borra todo el contenido que hay en el editor.
4. Abre el archivo `google-sheets-backend/Code.gs` de este ZIP y copia todo su contenido.
5. Pégalo en el editor de Apps Script.
6. Haz clic en el ícono de **guardar** (o Ctrl+S). Ponle un nombre al proyecto, por ejemplo "Cofre Backend".

---

## Paso 2: Desplegar como aplicación web

1. En Apps Script, haz clic en **"Implementar"** (arriba a la derecha) → **"Nueva implementación"**.
2. Haz clic en el ícono de engranaje ⚙ junto a "Tipo" y selecciona **"Aplicación web"**.
3. Configura así:
   - **Descripción**: Cofre Backend
   - **Ejecutar como**: Yo (tu cuenta de Google)
   - **Quién tiene acceso**: Cualquier persona
4. Haz clic en **"Implementar"**.
5. Google te pedirá autorizar el acceso a tu cuenta — acepta todos los permisos.
6. Copia la **URL de implementación** que aparece (empieza con `https://script.google.com/macros/s/...`).

> ⚠️ Guarda esa URL — la necesitas para conectar la app.

---

## Paso 3: Conectar la app con tu Google Sheets

1. Abre `index.html` en tu navegador.
2. Ve a **Configuración** en el menú lateral.
3. Busca la sección **"Google Sheets (sincronización)"**.
4. Pega la URL que copiaste en el campo correspondiente.
5. Haz clic en **"Conectar y sincronizar"**.
6. Si la conexión es exitosa, verás un mensaje de confirmación verde.

A partir de ese momento:
- Cada cambio que hagas se guarda en tu Google Sheets automáticamente.
- Puedes abrir `index.html` desde cualquier dispositivo y los datos se cargarán de Google Sheets.
- La app también guarda una copia local (localStorage) por si no hay internet.

---

## Uso desde el celular

La forma más fácil de usar Cofre en tu celular sin instalar nada:

**Opción A — Google Drive + Chrome:**
1. Sube `index.html` y todos los archivos `.js` y `.css` a una carpeta de Google Drive.
2. Abre el archivo en Drive desde tu celular → "Abrir con" → Chrome.

**Opción B — Servidor local con VS Code:**
Si tienes VS Code con Live Server, cualquier dispositivo en tu misma red WiFi
puede acceder a `http://TU-IP:5500/index.html`.

**Opción C — Hosting gratuito (recomendado para uso permanente):**
1. Crea una cuenta en **GitHub** (github.com).
2. Crea un repositorio público y sube todos los archivos.
3. Activa **GitHub Pages** en la configuración del repositorio.
4. Tu app quedará disponible en `https://tu-usuario.github.io/cofre/` desde cualquier dispositivo.

---

## Estructura de los datos en Google Sheets

Los datos se guardan en formato JSON comprimido en la celda A2 de la hoja "Cofre_Data"
(que está oculta por defecto). La celda B2 registra la fecha y hora de la última actualización.

No edites la hoja directamente — siempre usa la app para modificar tus datos.

---

## Solución de problemas

**"Error de conexión"**: Verifica que la URL esté correctamente copiada y que el
despliegue tenga acceso "Cualquier persona".

**"Los datos no se sincronizan"**: Cada vez que hagas cambios desde un dispositivo
nuevo, espera unos segundos antes de abrir en otro dispositivo para que Google Sheets
procese el guardado.

**"Olvidé la URL"**: En Apps Script → "Implementar" → "Administrar implementaciones"
→ copia la URL de la implementación activa.
