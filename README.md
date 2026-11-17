# Boda J&M — invitación digital y RSVP

Sitio estático para **GitHub Pages** con las fotografías de Jesús y Miroslava, galería de 7 segundos, música de fondo, ubicación y formulario de confirmación por familia. El registro real de asistencia se conserva en **Google Sheets**.

> **Estado de entrega:** el diseño está listo para publicar. **El formulario todavía NO está conectado**: requiere configurar Cloudflare Worker y desplegar el `Code.gs` del backend. No envíes enlaces reales hasta completar las pruebas.

## Estructura

```text
Boda-JM/
├── index.html                 Página principal (sin banner de Apps Script)
├── styles.css                 Diseño responsive verde olivo y dorado
├── app.js                     Slider, música y formulario
├── config.js                  URL PÚBLICA del Worker (pendiente)
├── assets/
│   ├── fotos/foto-01.webp ... foto-05.webp
│   └── musica/piano.mp3
├── backend/
│   ├── apps-script/Code.gs    Backend conectado a Google Sheets
│   └── worker/
│       ├── src/index.js       API de Cloudflare
│       ├── wrangler.toml
│       └── package.json
├── .nojekyll
└── .gitignore
```

## Fase A. Publicar la parte visual en GitHub Pages

1. Descarga y **extrae** el ZIP. Sube **el contenido de `Boda-JM/`** a la raíz de tu repositorio (no la carpeta `Boda-JM` como carpeta interna).
2. GitHub → tu repositorio → **Add file → Upload files**, arrastra los archivos y carpetas, y confirma con **Commit changes**. Si la interfaz no permite subir carpetas, usa GitHub Desktop o `git`.
3. Repositorio → **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Branch: **main** y carpeta **/(root)** → **Save**.
5. Para `chuysilva/Boda-JM`, la dirección esperada es `https://chuysilva.github.io/Boda-JM/`. Si el nombre de tu repositorio es otro, cambia el tramo final.
6. Comprueba encabezado, fotos, slider de 7 s, música y «Cómo llegar». **La sección de confirmación mostrará “en preparación” hasta conectar la API**.

Las fotos y el archivo MP3 en un repositorio público son públicamente accesibles. Publica solo material sobre el que tengas derechos o permisos suficientes. El navegador puede bloquear la reproducción automática de audio con sonido: el script intenta iniciarla al abrir y tras la primera interacción; la pausa al ocultarse la pestaña y la reanuda al regresar cuando el navegador lo permite.

## Fase B. Respaldar Google Sheets y Apps Script (antes de cambiar código)

1. En el Google Sheets original, crea **Archivo → Hacer una copia**. No publiques la hoja.
2. En Apps Script copia `Código.gs` e `Index.html` actuales a archivos de respaldo locales.
3. Asegúrate de que existen las columnas: A Responsable, B WhatsApp, C Cupos, D Token, E Estado, F Confirmados, G Enlace, H Mensaje WhatsApp, I Enlace corto.
4. **No borres ni regeneres la columna D (Token)**. Mantendremos las mismas respuestas en E y F.

## Fase C. Preparar Apps Script como API

1. Desde tu **hoja original**, entra en **Extensiones → Apps Script**. Reemplaza **solo** el contenido de `Código.gs` por `backend/apps-script/Code.gs`, después de hacer respaldo. (En la migración final ya no usaremos `Index.html` allí.)
2. En la parte superior de ese código, verifica `URL_SITIO`. Si el repositorio tiene otro nombre, cambia a la dirección real de GitHub Pages terminada en `/`.
3. En **Configuración del proyecto → Propiedades del script**, crea `API_SHARED_SECRET`: una clave larga y aleatoria, idealmente 48 caracteres o más. **No la compartas, no la pegues en GitHub ni en `config.js`.**
4. Guarda. Ve a **Implementar → Administrar implementaciones → Editar** (la implementación pública existente) → **Nueva versión** → Ejecutar como **Yo**, Usuarios con acceso **Cualquiera**, y **Implementar**. Copia la URL **`https://script.google.com/macros/s/.../exec`** de esa implementación.
5. La API requiere `API_SHARED_SECRET` en todas las solicitudes. No basta con abrir `/exec` en el navegador sin clave: mostrará «No autorizado», que es lo esperado.

**Importante:** usa la implementación **`/exec`** que ya funcionaba sin pedir inicio de sesión. No uses `/dev`.

## Fase D. Crear el Worker de Cloudflare

1. Crea una cuenta gratuita en Cloudflare si no tienes. Instala Node.js en tu computadora si no lo tienes.
2. Abre una terminal dentro de `backend/worker/` y ejecuta:

```bash
npm install
npx wrangler login
npm run deploy
```

3. Edita `wrangler.toml` antes de desplegar si tu sitio no es `https://chuysilva.github.io`. `SITE_ORIGIN` es solo el **origen**, sin `/Boda-JM` ni barra final.
4. En Cloudflare → **Workers & Pages → boda-jm-api → Settings → Variables and Secrets**, agrega estos dos valores con tipo **Secret**:
   - `APPS_SCRIPT_URL`: URL `/exec` publicada en la fase C.
   - `API_SHARED_SECRET`: **la misma clave exacta** de las propiedades del script.
5. Despliega los secretos (y, si Cloudflare lo pide, redepliega). El Worker tendrá URL similar a `https://boda-jm-api.<tu-subdominio>.workers.dev`. **No adivines el subdominio: cópialo del panel**.
6. En `config.js`, sustituye `API_BASE: ""` por esa URL del Worker, sin `/api` y sin barra final, por ejemplo:

```js
window.BODA_CONFIG = {
  API_BASE: "https://boda-jm-api.TU-SUBDOMINIO.workers.dev"
};
```

7. Sube el `config.js` actualizado al repositorio. **No incluyas las claves privadas en ese archivo**.

El navegador consulta `GET /api/invitacion?t=TOKEN` y envía `POST /api/confirmar` con `{token,cantidad}`. El Worker se comunica con Apps Script y este lee/escribe la hoja. El token del enlace funciona como la llave de acceso a la invitación: quien tenga el enlace puede consultar y actualizar la respuesta de esa familia. Evita publicar esos enlaces en redes.

## Fase E. Probar primero con familias ficticias

1. Agrega una familia ficticia en la hoja con 1 lugar y otra con 3, usando números de prueba.
2. Si aún no tienen token, coloca uno único de 32 caracteres hexadecimales para probar, sin alterar los de tus invitados reales.
3. En el navegador abre `https://chuysilva.github.io/Boda-JM/?t=TOKEN_DE_PRUEBA` (cambiando el token real de prueba).
4. Verifica nombre, cupos, confirmación de 0, máximo de cupos, corrección de respuesta y escritura en E/F.
5. Verifica que en incógnito no pida cuenta de Google; revisa también celular y cambio de pestaña para la música.
6. **Solo después de todo lo anterior**, en Apps Script ejecuta `generarEnlaces()` para cambiar los destinos G/I y los mensajes H a GitHub Pages, sin modificar tokens o confirmaciones.

Los enlaces cortos anteriores seguirán apuntando a la aplicación vieja. Cuando verifiques la nueva, usa los de la columna I actualizada.

## Problemas frecuentes

- **El formulario dice “en preparación”**: falta configurar `API_BASE` en `config.js`.
- **Error al conectar**: revisar `APPS_SCRIPT_URL`, `API_SHARED_SECRET`, y permisos de publicación del `/exec`.
- **Error CORS**: revisar `SITE_ORIGIN` (ejemplo `https://chuysilva.github.io`, sin ruta).
- **Se abre la web pero no encuentra la familia**: confirma que el token existe en la columna D y que estás usando la hoja correcta.
- **No suena automáticamente**: limitación del navegador; no es posible garantizar audio automático con sonido en todos los dispositivos.
- **Las confirmaciones no cambian**: no distribuyas enlaces; prueba primero la respuesta de `/api/confirmar`, confirma que la clave sea igual en Worker y Apps Script, y que el script esté vinculado al Sheets original.

## Seguridad / privacidad

- No incluyas en GitHub el CSV de invitados, teléfonos, tokens reales, el ID de la hoja o claves privadas.
- Mantén los números y confirmaciones exclusivamente en tu Google Sheets privado.
- Aunque el Worker aplica origen permitido y validación de tokens, **un token es un enlace de acceso, no autenticación fuerte**: cualquier persona con él puede modificar esa confirmación.
- `API_SHARED_SECRET` protege el canal Worker ↔ Apps Script, no sirve para autenticar a las familias.
- Para un evento de 120 personas, normalmente caben en los planes gratuitos, sujetos a los límites vigentes de los proveedores.
