(function () {
  "use strict";

  // La lista de APIs vive en specs/catalogo.json. Para agregar una API basta con
  // poner su archivo en specs/ y añadir una línea al catálogo.
  var CATALOGO = "./specs/catalogo.json";
  var SITE_TITLE = "Documentación de APIs";
  var METHODS = ["get", "post", "put", "patch", "delete"];

  var apis = [];      // [{ id, nombre, resumen }]
  var cache = {};     // url -> Promise<JSON>

  // ---------- Utilidades ----------
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pretty(obj) {
    return esc(JSON.stringify(obj, null, 2));
  }

  function specUrl(id) {
    return "./specs/" + id + ".json";
  }

  function loadJSON(url) {
    if (!cache[url]) {
      cache[url] = fetch(url, { cache: "no-cache" }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " al cargar " + url);
        return res.json();
      });
      cache[url].catch(function () { delete cache[url]; });
    }
    return cache[url];
  }

  function findApi(id) {
    for (var i = 0; i < apis.length; i++) if (apis[i].id === id) return apis[i];
    return null;
  }

  function countOperations(spec) {
    var n = 0;
    Object.keys(spec.paths || {}).forEach(function (path) {
      METHODS.forEach(function (m) { if (spec.paths[path][m]) n++; });
    });
    return n;
  }

  // Devuelve el primer ejemplo disponible de un objeto "content" de OpenAPI.
  function exampleOf(content) {
    if (!content) return undefined;
    var media = content["application/json"] || content[Object.keys(content)[0]];
    if (!media) return undefined;
    if (media.example !== undefined) return media.example;
    if (media.examples) {
      var first = media.examples[Object.keys(media.examples)[0]];
      return first && first.value;
    }
    return undefined;
  }

  // Texto corto para el tipo de un parámetro: "integer", "string (date)", "string (a, b)"…
  function typeText(schema) {
    if (!schema) return "";
    if (schema.$ref) return schema.$ref.split("/").pop();
    var t = schema.type || "";
    if (schema.enum) return t + " (" + schema.enum.join(", ") + ")";
    if (schema.format) return t + " (" + schema.format + ")";
    return t;
  }

  // ---------- Renderizado ----------
  function renderParams(params) {
    if (!params || !params.length) return "";
    var rows = params.map(function (p) {
      return "<tr>" +
        "<td><code>" + esc(p.name) + "</code></td>" +
        "<td>" + esc(p.in) + "</td>" +
        "<td>" + esc(typeText(p.schema)) + "</td>" +
        "<td>" + (p.required ? "Sí" : "No") + "</td>" +
        "<td>" + esc(p.description) + "</td>" +
        "</tr>";
    }).join("");
    return "<h3>Parámetros</h3><div class=\"table-wrap\"><table>" +
      "<thead><tr><th>Nombre</th><th>En</th><th>Tipo</th><th>Requerido</th><th>Descripción</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  function renderRequest(body) {
    if (!body) return "";
    var ex = exampleOf(body.content);
    return "<h3>Ejemplo de solicitud</h3>" +
      (body.description ? "<p>" + esc(body.description) + "</p>" : "") +
      (ex !== undefined ? "<pre><code>" + pretty(ex) + "</code></pre>" : "");
  }

  function renderResponses(responses) {
    if (!responses) return "";
    var html = Object.keys(responses).map(function (code) {
      var r = responses[code];
      var ok = /^2/.test(code);
      var ex = exampleOf(r.content);
      return "<div class=\"response\">" +
        "<div class=\"response__title\"><span class=\"status " + (ok ? "status--ok" : "status--err") + "\">" + esc(code) + "</span>" +
        "<span>" + esc(r.description) + "</span></div>" +
        (ex !== undefined ? "<pre><code>" + pretty(ex) + "</code></pre>" : "") +
        "</div>";
    }).join("");
    return "<h3>Ejemplos de respuesta</h3>" + html;
  }

  function renderEndpoints(spec) {
    var out = [];
    Object.keys(spec.paths || {}).forEach(function (path) {
      var item = spec.paths[path];
      METHODS.forEach(function (m) {
        var op = item[m];
        if (!op) return;
        var params = (item.parameters || []).concat(op.parameters || []);
        out.push(
          "<article class=\"endpoint\">" +
            "<div class=\"endpoint__head\">" +
              "<span class=\"method method--" + m + "\">" + m.toUpperCase() + "</span>" +
              "<span class=\"endpoint__path\">" + esc(path) + "</span>" +
              (op.summary ? "<span class=\"endpoint__summary\">" + esc(op.summary) + "</span>" : "") +
            "</div>" +
            "<div class=\"endpoint__body\">" +
              (op.description ? "<p>" + esc(op.description) + "</p>" : "") +
              renderParams(params) +
              renderRequest(op.requestBody) +
              renderResponses(op.responses) +
            "</div>" +
          "</article>"
        );
      });
    });
    return out.join("");
  }

  function renderSpec(api) {
    var view = document.querySelector("[data-view=api]");
    var field = function (name) { return view.querySelector("[data-field=" + name + "]"); };
    if (view.dataset.loaded === api.id) return;
    view.dataset.loaded = "";
    view.dataset.current = api.id;

    // Estado inicial mientras llega el JSON.
    field("title").textContent = "API de " + api.nombre;
    field("version").textContent = "v…";
    field("count").textContent = "";
    field("description").textContent = "Cargando especificación…";
    field("server").textContent = "";
    field("endpoints").innerHTML = "";
    var dl = field("download");
    dl.setAttribute("href", specUrl(api.id));
    dl.setAttribute("download", api.id + ".json");

    loadJSON(specUrl(api.id)).then(function (spec) {
      if (view.dataset.current !== api.id) return; // el usuario ya cambió de API
      var info = spec.info || {};
      var n = countOperations(spec);
      field("title").textContent = info.title || api.nombre;
      field("version").textContent = "v" + (info.version || "?");
      field("count").textContent = n + (n === 1 ? " endpoint" : " endpoints");
      field("description").textContent = info.description || "";
      var server = spec.servers && spec.servers[0];
      field("server").innerHTML = server
        ? "Servidor base: <code>" + esc(server.url) + "</code>" + (server.description ? " — " + esc(server.description) : "")
        : "";
      field("endpoints").innerHTML = renderEndpoints(spec);
      document.title = (info.title || api.nombre) + " · " + SITE_TITLE;
      view.dataset.loaded = api.id;
    }).catch(function (err) {
      if (view.dataset.current !== api.id) return;
      field("description").textContent = "";
      field("endpoints").innerHTML =
        "<p class=\"error\">No se pudo cargar la especificación (" + esc(err.message) +
        "). Abre el sitio con un servidor web, por ejemplo <code>py -m http.server 8000</code>.</p>";
    });
  }

  // Menú y tarjetas de inicio, a partir del catálogo.
  function renderCatalog() {
    var menu = document.querySelector("[data-menu]");
    var cards = document.querySelector("[data-cards]");
    apis.forEach(function (api) {
      var link = document.createElement("a");
      link.className = "menu__link";
      link.href = "#" + api.id;
      link.dataset.route = api.id;
      link.textContent = api.nombre;
      menu.appendChild(link);
    });
    cards.innerHTML = apis.map(function (api) {
      return "<a class=\"card\" href=\"#" + esc(api.id) + "\">" +
        "<span class=\"card__eyebrow\">OpenAPI <span data-version=\"" + esc(api.id) + "\">·</span></span>" +
        "<span class=\"card__title\">API de " + esc(api.nombre) + "</span>" +
        "<span class=\"card__text\">" + esc(api.resumen) + "</span>" +
        "<span class=\"card__cta\">Ver documentación →</span>" +
        "</a>";
    }).join("");

    // Versión y cantidad de endpoints de cada API en su tarjeta.
    apis.forEach(function (api) {
      loadJSON(specUrl(api.id)).then(function (spec) {
        var el = cards.querySelector("[data-version=\"" + api.id + "\"]");
        var n = countOperations(spec);
        if (el) el.textContent = "· v" + spec.info.version + " · " + n + " endpoints";
      }).catch(function () { /* la pantalla de la API mostrará el error */ });
    });
  }

  // ---------- Historial de cambios de Square ----------
  var CAMBIOS = "./specs/square-changelog.json";
  var ESTADOS = { nuevo: "Nuevo", obsoleto: "Obsoleto", retirado: "Retirado", beta: "Beta", actualizado: "Actualizado" };
  var cambiosListos = false;

  function slugApi(api) {
    return api.toLowerCase().replace(/\s+/g, "-");
  }
  function kebab(nombre) {
    return nombre.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }
  function refUrl(api, endpoint) {
    if (!/ API$/.test(api) || /^(v1 |Settlements|Cash Drawers)/.test(api)) return null;
    return "https://developer.squareup.com/reference/square/" + slugApi(api) + "/" + kebab(endpoint);
  }

  function renderVersion(v, q) {
    var n = 0;
    var grupos = v.endpoints.map(function (g) {
      n += g.endpoints.length;
      var items = g.endpoints.map(function (e) {
        var hit = q && (e.nombre.toLowerCase().indexOf(q) >= 0 || g.api.toLowerCase().indexOf(q) >= 0);
        var url = refUrl(g.api, e.nombre);
        var nombre = url
          ? "<a href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener\"><code>" + esc(e.nombre) + "</code></a>"
          : "<code>" + esc(e.nombre) + "</code>";
        return "<li" + (hit ? " class=\"cl-hit\"" : "") + ">" + nombre +
          " <span class=\"cl-estado cl-estado--" + esc(e.estado) + "\">" + esc(ESTADOS[e.estado] || e.estado) + "</span></li>";
      }).join("");
      return "<div class=\"cl-grupo\"><h4>" + esc(g.api) + "</h4><ul>" + items + "</ul></div>";
    }).join("");

    var apis = v.apis.map(function (a) { return "<span class=\"badge badge--muted\">" + esc(a) + "</span>"; }).join(" ");
    var etiquetas = v.etiquetas.map(function (t) { return "<span class=\"cl-tag\">" + esc(t) + "</span>"; }).join(" ");
    var objetos = v.objetos.length
      ? "<details class=\"cl-objetos\"><summary>Objetos modificados (" + v.objetos.length + ")</summary><p>" +
        v.objetos.map(function (o) { return "<code>" + esc(o) + "</code>"; }).join(" ") + "</p></details>"
      : "";

    return "<article class=\"cl-item\" id=\"v-" + esc(v.fecha) + "\">" +
      "<div class=\"cl-item__head\">" +
        "<time class=\"cl-fecha\" datetime=\"" + esc(v.fecha) + "\">" + esc(v.fecha) + "</time>" +
        "<span class=\"cl-cuenta\">" + (n ? n + (n === 1 ? " endpoint" : " endpoints") : "Sin endpoints") + "</span>" +
        etiquetas +
        "<a class=\"cl-link\" href=\"" + esc(v.url) + "\" target=\"_blank\" rel=\"noopener\">Ver nota original ↗</a>" +
      "</div>" +
      (apis ? "<p class=\"cl-apis\">" + apis + "</p>" : (n ? "" : "<p class=\"cl-apis cl-vacio\">Solo cambios de documentación.</p>")) +
      (grupos || (v.apis.length ? "<p class=\"cl-vacio\">Esta versión no menciona endpoints; los cambios son en objetos, campos o SDKs.</p>" : "")) +
      objetos +
    "</article>";
  }

  function initCambios() {
    if (cambiosListos) return;
    cambiosListos = true;
    var view = document.querySelector("[data-view=cambios]");
    var el = function (k) { return view.querySelector("[data-cl=" + k + "]"); };
    var lista = el("lista");
    lista.innerHTML = "<p class=\"lead\">Cargando historial…</p>";

    loadJSON(CAMBIOS).then(function (data) {
      var versiones = data.versiones || [];
      var anios = [];
      versiones.forEach(function (v) {
        var a = v.fecha.slice(0, 4);
        if (anios.indexOf(a) < 0) anios.push(a);
      });
      anios.sort().reverse();
      el("anio").innerHTML += anios.map(function (a) { return "<option>" + a + "</option>"; }).join("");

      function pintar() {
        var q = el("q").value.trim().toLowerCase();
        var anio = el("anio").value;
        var solo = el("solo").checked;
        var asc = el("orden").value === "asc";

        var filtradas = versiones.filter(function (v) {
          if (anio && v.fecha.slice(0, 4) !== anio) return false;
          if (solo && !v.endpoints.length) return false;
          if (!q) return true;
          var texto = v.apis.join(" ") + " " + v.endpoints.map(function (g) {
            return g.api + " " + g.endpoints.map(function (e) { return e.nombre; }).join(" ");
          }).join(" ");
          return texto.toLowerCase().indexOf(q) >= 0;
        }).sort(function (a, b) {
          return asc ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha);
        });

        var total = 0;
        filtradas.forEach(function (v) { v.endpoints.forEach(function (g) { total += g.endpoints.length; }); });
        el("resumen").textContent = filtradas.length + (filtradas.length === 1 ? " versión" : " versiones") +
          " · " + total + " menciones de endpoints";

        if (!filtradas.length) {
          lista.innerHTML = "<p class=\"cl-vacio\">No hay versiones que coincidan con el filtro.</p>";
          return;
        }
        var html = "", anioActual = "";
        filtradas.forEach(function (v) {
          var a = v.fecha.slice(0, 4);
          if (a !== anioActual) {
            if (anioActual) html += "</div>";
            html += "<h2 class=\"cl-anio\">" + a + "</h2><div class=\"cl-timeline\">";
            anioActual = a;
          }
          html += renderVersion(v, q);
        });
        lista.innerHTML = html + "</div>";
      }

      ["q", "anio", "orden", "solo"].forEach(function (k) {
        el(k).addEventListener(k === "q" ? "input" : "change", pintar);
      });
      pintar();
    }).catch(function (err) {
      cambiosListos = false;
      lista.innerHTML = "<p class=\"error\">No se pudo cargar el historial (" + esc(err.message) +
        "). Abre el sitio con un servidor web, por ejemplo <code>py -m http.server 8000</code>.</p>";
    });
  }

  // ---------- Navegación por hash ----------
  function currentRoute() {
    var r = location.hash.replace(/^#/, "");
    return r === "inicio" || r === "cambios" || findApi(r) ? r : null;
  }

  function show(route, moveFocus) {
    var api = route === "inicio" || route === "cambios" ? null : findApi(route);
    var vista = api ? "api" : route;
    document.querySelectorAll(".view").forEach(function (v) {
      v.hidden = v.dataset.view !== vista;
    });
    document.querySelectorAll(".menu__link").forEach(function (a) {
      if (a.dataset.route === route) {
        a.setAttribute("aria-current", "page");
        a.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else {
        a.removeAttribute("aria-current");
      }
    });
    document.title = api ? "API de " + api.nombre + " · " + SITE_TITLE
      : route === "cambios" ? "Historial de cambios · " + SITE_TITLE : SITE_TITLE;
    if (api) renderSpec(api);
    if (route === "cambios") initCambios();
    window.scrollTo(0, 0);
    if (moveFocus) {
      var h1 = document.querySelector("[data-view=\"" + vista + "\"] h1");
      if (h1) h1.focus({ preventScroll: true });
    }
  }

  function goHome() {
    history.replaceState(null, "", "#inicio");
    show("inicio", false);
  }

  function onHashChange() {
    var route = currentRoute();
    if (route) show(route, true);
    else goHome();
  }

  // "Saltar al contenido" mueve el foco sin cambiar de pantalla.
  document.querySelector("[data-skip]").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("contenido").focus();
  });

  // ---------- Arranque ----------
  loadJSON(CATALOGO).then(function (data) {
    apis = data.apis || [];
    renderCatalog();
    window.addEventListener("hashchange", onHashChange);
    // Respeta el enlace directo (#facturas, #envios…).
    var initial = currentRoute();
    if (initial) show(initial, false);
    else goHome();
  }).catch(function (err) {
    document.querySelector("[data-cards]").innerHTML =
      "<p class=\"error\">No se pudo cargar el catálogo de APIs (" + esc(err.message) +
      "). Abre el sitio con un servidor web, por ejemplo <code>py -m http.server 8000</code>.</p>";
  });
})();
