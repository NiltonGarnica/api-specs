# api-specs

Sitio web en español para consultar y descargar **10 especificaciones de API** en formato **OpenAPI 3.0.3 (JSON)**, con 68 endpoints en total.

| API | Archivo | Endpoints |
|-----|---------|-----------|
| Facturas | `specs/facturas.json` | `GET /facturas`, `POST /facturas` |
| Clientes | `specs/clientes.json` | `GET /clientes`, `GET /clientes/{id}` |
| Productos | `specs/productos.json` | CRUD de `/productos` + `GET /productos/{id}/stock`, `POST /productos/{id}/ajustes-stock` |
| Pedidos | `specs/pedidos.json` | CRUD de `/pedidos` + `POST /pedidos/{id}/confirmar`, `POST /pedidos/{id}/cancelar` |
| Proveedores | `specs/proveedores.json` | CRUD de `/proveedores` + `GET /proveedores/{id}/productos`, `POST /proveedores/{id}/evaluaciones` |
| Empleados | `specs/empleados.json` | CRUD de `/empleados` + `GET` y `POST /empleados/{id}/asistencias` |
| Citas | `specs/citas.json` | CRUD de `/citas` + `GET /citas/disponibilidad`, `POST /citas/{id}/reprogramar` |
| Envíos | `specs/envios.json` | CRUD de `/envios` + `GET /envios/{id}/seguimiento`, `POST /envios/{id}/eventos` |
| Cursos | `specs/cursos.json` | CRUD de `/cursos` + `GET` y `POST /cursos/{id}/inscripciones` |
| Tickets de soporte | `specs/tickets.json` | CRUD de `/tickets` + `GET` y `POST /tickets/{id}/comentarios` |

«CRUD» son 6 endpoints: `GET /recurso` (lista con filtros y paginación), `POST /recurso`, `GET`, `PUT`, `PATCH` y `DELETE /recurso/{id}`. Así, cada una de las 8 APIs nuevas tiene 8 endpoints.

Todas las APIs son **demostraciones**. Sus endpoints y datos son ficticios y solo se muestran como documentación. Los ejemplos están relacionados entre sí: por ejemplo, los pedidos usan clientes `CLI-001` y productos `PRD-0001` que existen en las otras APIs.

## Estructura

```
api-specs/
├── index.html            # Página única: pantalla de inicio y una pantalla que muestra cualquier API
├── styles.css            # Estilos (adaptables a celular y escritorio)
├── app.js                # Navegación por hash (#inicio, #facturas, #envios…) y renderizado de la documentación
├── specs/
│   ├── catalogo.json     # Lista de APIs: genera el menú y las tarjetas de inicio
│   ├── facturas.json     # Una especificación OpenAPI 3.0.3 por API…
│   ├── clientes.json
│   └── …                 # productos, pedidos, proveedores, empleados, citas, envios, cursos, tickets
└── README.md
```

Lo que se ve en cada pantalla (nombre, versión, descripción, endpoints, parámetros y ejemplos) se lee directamente de los archivos de `specs/`. Si editas un JSON y recargas la página, la pantalla correspondiente se actualiza sola.

### Agregar otra API

1. Copia su especificación a `specs/<id>.json` (por ejemplo `specs/inventario.json`).
2. Agrega una línea a `specs/catalogo.json`:
   ```json
   { "id": "inventario", "nombre": "Inventario", "resumen": "Texto corto para la tarjeta de inicio." }
   ```
3. Recarga la página: aparece en el menú, en Inicio y en `#inventario`.

Los botones **Descargar JSON** usan enlaces relativos con el atributo `download` (`./specs/<id>.json`). Por eso funcionan tanto en `http://localhost:8000/` como en `https://<usuario>.github.io/api-specs/`.

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
| 1 | Abre la URL del sitio sin `#` | Se muestra **Inicio** con el título «Documentación de APIs», la descripción y diez tarjetas, cada una con su versión y cantidad de endpoints. En el menú, **Inicio** aparece resaltado. La URL termina en `#inicio`. |
| 2 | Pulsa la tarjeta **API de Facturas** | Se abre la pantalla de Facturas (`#facturas`) con nombre, versión `v1.0.0`, descripción y los endpoints `GET /facturas` y `POST /facturas`, incluidos el ejemplo de solicitud y los de respuesta. **Facturas** aparece resaltado en el menú. |
| 3 | Pulsa **Descargar JSON** | Se descarga `facturas.json`. Al abrirlo empieza con `"openapi": "3.0.3"` y `"title": "API de Facturas"`. |
| 4 | Pulsa **Clientes** en el menú | Se abre la pantalla de Clientes (`#clientes`) con `GET /clientes` y `GET /clientes/{id}`, y sus ejemplos de respuesta. |
| 5 | Pulsa **Descargar JSON** | Se descarga `clientes.json`. Al abrirlo empieza con `"openapi": "3.0.3"` y `"title": "API de Clientes"`. |
| 6 | Pulsa el botón **Atrás** del navegador dos veces | Vuelve a Facturas y después a Inicio, y el menú activo cambia en cada paso. |
| 7 | Pega directamente `…/api-specs/#clientes` en una pestaña nueva | Se abre directamente la pantalla de Clientes. |
| 8 | Pulsa **Envíos** en el menú (desliza el menú si no se ve) | Se abre `#envios` con la insignia «8 endpoints» y los métodos `GET`, `POST`, `PUT`, `PATCH` y `DELETE` en colores distintos. |
| 9 | Reduce la ventana a ancho de celular (o usa el modo dispositivo con F12) | El menú se desliza hacia los lados y el botón de descarga se ve completo, sin desplazamiento horizontal de la página. |
| 10 | Con el teclado, pulsa `Tab` al cargar una API y luego `Enter` en «Saltar al contenido» | El foco pasa al contenido y sigues en la misma API. |
| 11 | Opcional: cambia `"version"` en `specs/clientes.json` a `1.1.0` y recarga | La pantalla de Clientes y su tarjeta de Inicio muestran `v1.1.0`. |

Para validar los JSON como OpenAPI, puedes pegarlos en <https://editor.swagger.io/>. No deberían aparecer errores.
