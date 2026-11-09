# api-specs

Sitio web en español para consultar y descargar dos especificaciones de API en formato **OpenAPI 3.0.3 (JSON)**:

- **API de Facturas**: `GET /facturas`, `POST /facturas`
- **API de Clientes**: `GET /clientes`, `GET /clientes/{id}`

Ambas APIs son **demostraciones**. Sus endpoints y datos son ficticios y solo se muestran como documentación.

## Estructura

```
api-specs/
├── index.html          # Página única con tres pantallas: #inicio, #facturas, #clientes
├── styles.css          # Estilos (adaptables a celular y escritorio)
├── app.js              # Navegación por hash y renderizado de la documentación
├── specs/
│   ├── facturas.json   # OpenAPI 3.0.3 de la API de Facturas
│   └── clientes.json   # OpenAPI 3.0.3 de la API de Clientes
└── README.md
```

Lo que se ve en las pantallas de Facturas y Clientes (nombre, versión, descripción, endpoints, parámetros y ejemplos) se lee directamente de los archivos de `specs/`. Si editas un JSON y recargas la página, la pantalla correspondiente se actualiza sola.

Los botones **Descargar JSON** usan enlaces relativos con el atributo `download` (`./specs/facturas.json` y `./specs/clientes.json`). Por eso funcionan tanto en `http://localhost:8000/` como en `https://<usuario>.github.io/api-specs/`.

## Probar en Windows

Necesitas Python instalado. El sitio carga los JSON con `fetch`, así que **no funciona abriendo `index.html` con doble clic**: hay que servirlo con un servidor web local.

1. Abre una terminal (PowerShell o CMD) en la carpeta del proyecto:
   ```
   cd C:\ruta\a\api-specs
   ```
2. Inicia el servidor:
   ```
   py -m http.server 8000
   ```
3. Abre en el navegador: <http://localhost:8000/>
4. Para detener el servidor, pulsa `Ctrl + C` en la terminal.

### Simular la ruta de GitHub Pages (`/api-specs/`)

En GitHub Pages el sitio vive en `https://<usuario>.github.io/api-specs/`. Para probar esa misma ruta en tu PC, inicia el servidor desde la carpeta **padre**:

```
cd C:\ruta\a
py -m http.server 8000
```

Luego abre <http://localhost:8000/api-specs/>.

## Publicar en GitHub Pages

1. Sube los archivos a la rama `main` del repositorio:
   ```
   git add .
   git commit -m "Sitio de documentación de APIs"
   git push
   ```
2. En GitHub, entra al repositorio y ve a **Settings → Pages**.
3. En **Build and deployment → Source**, elige **Deploy from a branch**.
4. En **Branch**, elige **`main`** y la carpeta **`/(root)`**. Luego pulsa **Save**.
5. Espera uno o dos minutos. La URL aparecerá en esa misma página, por ejemplo `https://<usuario>.github.io/api-specs/`.

> **Nota:** en cuentas gratuitas, GitHub Pages solo funciona con repositorios **públicos**. Si el repositorio es privado, cámbialo a público en **Settings → General → Danger Zone → Change visibility**, o usa un plan de pago.

## Comprobación final

Haz esta prueba en local (`http://localhost:8000/api-specs/`) y después en la URL de GitHub Pages:

| # | Paso | Resultado esperado |
|---|------|--------------------|
| 1 | Abre la URL del sitio sin `#` | Se muestra **Inicio** con el título «Documentación de APIs», la descripción y dos tarjetas. En el menú, **Inicio** aparece resaltado. La URL termina en `#inicio`. |
| 2 | Pulsa la tarjeta **API de Facturas** | Se abre la pantalla de Facturas (`#facturas`) con nombre, versión `v1.0.0`, descripción y los endpoints `GET /facturas` y `POST /facturas`, incluidos el ejemplo de solicitud y los de respuesta. **Facturas** aparece resaltado en el menú. |
| 3 | Pulsa **Descargar JSON** | Se descarga `facturas.json`. Al abrirlo empieza con `"openapi": "3.0.3"` y `"title": "API de Facturas"`. |
| 4 | Pulsa **Clientes** en el menú | Se abre la pantalla de Clientes (`#clientes`) con `GET /clientes` y `GET /clientes/{id}`, y sus ejemplos de respuesta. |
| 5 | Pulsa **Descargar JSON** | Se descarga `clientes.json`. Al abrirlo empieza con `"openapi": "3.0.3"` y `"title": "API de Clientes"`. |
| 6 | Pulsa el botón **Atrás** del navegador dos veces | Vuelve a Facturas y después a Inicio, y el menú activo cambia en cada paso. |
| 7 | Pega directamente `…/api-specs/#clientes` en una pestaña nueva | Se abre directamente la pantalla de Clientes. |
| 8 | Reduce la ventana a ancho de celular (o usa el modo dispositivo con F12) | El menú y el botón de descarga se ven completos, sin desplazamiento horizontal de la página. |
| 9 | Opcional: cambia `"version"` en `specs/clientes.json` a `1.1.0` y recarga | La pantalla de Clientes y su tarjeta de Inicio muestran `v1.1.0`. |

Para validar los JSON como OpenAPI, puedes pegarlos en <https://editor.swagger.io/>. No deberían aparecer errores.
