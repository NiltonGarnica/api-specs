(function () {
  "use strict";

  // Cada API se documenta a partir de su propio archivo OpenAPI.
  var SPECS = {
    facturas: "./specs/facturas.json",
    clientes: "./specs/clientes.json"
  };
  var ROUTES = ["inicio", "facturas", "clientes"];
  var cache = {};

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

  function loadSpec(name) {
    if (!cache[name]) {
      cache[name] = fetch(SPECS[name], { cache: "no-cache" }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " al cargar " + SPECS[name]);
        return res.json();
      });
    }
    return cache[name];
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

  // ---------- Renderizado ----------
  function renderParams(params) {
    if (!params || !params.length) return "";
    var rows = params.map(function (p) {
      var type = p.schema ? p.schema.type + (p.schema.enum ? " (" + p.schema.enum.join(", ") + ")" : "") : "";
      return "<tr>" +
        "<td><code>" + esc(p.name) + "</code></td>" +
        "<td>" + esc(p.in) + "</td>" +
        "<td>" + esc(type) + "</td>" +
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
    var methods = ["get", "post", "put", "patch", "delete"];
    var out = [];
    Object.keys(spec.paths || {}).forEach(function (path) {
      var item = spec.paths[path];
      methods.forEach(function (m) {
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

  function renderSpec(name) {
    var view = document.querySelector("[data-view=\"" + name + "\"]");
    if (!view || view.dataset.loaded) return;
    loadSpec(name).then(function (spec) {
      var info = spec.info || {};
      view.querySelector("[data-field=title]").textContent = info.title || name;
      view.querySelector("[data-field=version]").textContent = "v" + (info.version || "?");
      view.querySelector("[data-field=description]").textContent = info.description || "";
      var server = spec.servers && spec.servers[0];
      view.querySelector("[data-field=server]").innerHTML = server
        ? "Servidor base: <code>" + esc(server.url) + "</code>" + (server.description ? " — " + esc(server.description) : "")
        : "";
      view.querySelector("[data-field=endpoints]").innerHTML = renderEndpoints(spec);
      view.dataset.loaded = "1";
    }).catch(function (err) {
      delete cache[name];
      view.querySelector("[data-field=endpoints]").innerHTML =
        "<p class=\"error\">No se pudo cargar la especificación (" + esc(err.message) +
        "). Abre el sitio con un servidor web, por ejemplo <code>py -m http.server 8000</code>.</p>";
      view.querySelector("[data-field=description]").textContent = "";
    });
  }

  // Muestra la versión de cada API en las tarjetas de inicio.
  function renderHomeVersions() {
    Object.keys(SPECS).forEach(function (name) {
      loadSpec(name).then(function (spec) {
        var el = document.querySelector("[data-version=\"" + name + "\"]");
        if (el) el.textContent = "· v" + spec.info.version;
      }).catch(function () { /* la pantalla de la API mostrará el error */ });
    });
  }

  // ---------- Navegación por hash ----------
  function currentRoute() {
    var r = location.hash.replace(/^#/, "");
    return ROUTES.indexOf(r) >= 0 ? r : null;
  }

  function show(route, moveFocus) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.hidden = v.dataset.view !== route;
    });
    document.querySelectorAll(".menu__link").forEach(function (a) {
      if (a.dataset.route === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var titles = { inicio: "Documentación de APIs", facturas: "API de Facturas", clientes: "API de Clientes" };
    document.title = route === "inicio" ? titles.inicio : titles[route] + " · Documentación de APIs";
    if (route !== "inicio") renderSpec(route);
    window.scrollTo(0, 0);
    if (moveFocus) {
      var h1 = document.querySelector("[data-view=\"" + route + "\"] h1");
      if (h1) h1.focus({ preventScroll: true });
    }
  }

  function onHashChange() {
    var route = currentRoute();
    if (!route) {
      history.replaceState(null, "", "#inicio");
      route = "inicio";
    }
    show(route, true);
  }

  window.addEventListener("hashchange", onHashChange);

  // Arranque: respeta el enlace directo (#facturas, #clientes…).
  var initial = currentRoute();
  if (!initial) {
    history.replaceState(null, "", "#inicio");
    initial = "inicio";
  }
  show(initial, false);
  renderHomeVersions();
})();
